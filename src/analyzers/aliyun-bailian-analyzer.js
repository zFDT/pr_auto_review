#!/usr/bin/env node

/**
 * 阿里云百炼大模型分析器
 * 
 * 基于阿里云百炼大模型服务平台的代码审查模块，提供：
 * - 智能代码质量分析
 * - 多语言支持的bug检测
 * - 安全漏洞扫描
 * - 性能优化建议
 * - 架构设计评估
 * 
 * 支持的模型：
 * - qwen-max: 通义千问最强版本
 * - qwen-plus: 通义千问增强版
 * - qwen-turbo: 通义千问标准版
 * - baichuan2-13b-chat-v1: 百川大模型
 * - chatglm3-6b: ChatGLM3模型
 * 
 * @author AI Assistant  
 * @version 1.0.0
 * @license MIT
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import ReviewStandardsManager from '../utils/review-standards-manager.js';

/**
 * 阿里云百炼分析器类
 */
class AliyunBailianAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.bailianConfig = this.getBailianConfig();
    this.isConfigured = this.checkConfiguration();
    
    // 初始化Review标准管理器
    this.reviewStandardsManager = new ReviewStandardsManager();
    
    // 请求控制配置
    this.requestQueue = [];
    this.processing = false;
    this.maxConcurrent = this.bailianConfig.max_concurrent || 5; // 提高并发数
    this.retryAttempts = this.bailianConfig.retry_attempts || 3;
    this.retryDelay = this.bailianConfig.retry_delay || 1000;
    
    // 请求计数器（用于文件命名）
    this.requestCounter = 0;
    
    // Token使用统计
    this.tokenStats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      requestCount: 0,
      averageTokensPerRequest: 0
    };
  }

  /**
   * 获取百炼配置
   */
  getBailianConfig() {
    const envConfig = {
      api_key: process.env.ALIYUN_BAILIAN_API_KEY,
      workspace_id: process.env.ALIYUN_BAILIAN_WORKSPACE_ID,
      model: process.env.ALIYUN_BAILIAN_MODEL || 'qwen-max',
      base_url: process.env.ALIYUN_BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1'
    };

    const configFile = this.config.ai_config?.aliyun_bailian || {};
    
    return {
      api_key: envConfig.api_key || configFile.api_key,
      workspace_id: envConfig.workspace_id || configFile.workspace_id,
      model: envConfig.model || configFile.model || 'qwen-max',
      base_url: envConfig.base_url || configFile.base_url || 'https://dashscope.aliyuncs.com/api/v1',
      
      // 性能优化配置
      timeout: configFile.timeout || 45000,  // 增加到45秒，处理复杂分析
      max_tokens: configFile.max_tokens || 8000,  // 增加到8000，获得更详细分析
      temperature: configFile.temperature || 0.2,  // 提高创造性，更好的建议
      
      // 并发控制
      max_concurrent: configFile.max_concurrent || 5,
      retry_attempts: configFile.retry_attempts || 3,
      retry_delay: configFile.retry_delay || 1000,
      
      // 分块处理配置
      max_chunk_size: configFile.max_chunk_size || 8,  // 减少分块大小，提高处理速度
      max_diff_length: configFile.max_diff_length || 15000  // 单个diff最大长度
    };
  }

  /**
   * 检查配置是否完整
   */
  checkConfiguration() {
    const { api_key, workspace_id } = this.bailianConfig;
    
    if (!api_key || api_key === '${ALIYUN_BAILIAN_API_KEY}') {
      console.warn('⚠️ 阿里云百炼API密钥未配置');
      return false;
    }
    
    if (!workspace_id || workspace_id === '${ALIYUN_BAILIAN_WORKSPACE_ID}') {
      console.warn('⚠️ 阿里云百炼工作空间ID未配置');
      return false;
    }
    
    return true;
  }

  /**
   * 保存API请求和响应数据
   * @param {Object} requestData - 请求数据
   * @param {Object} responseData - 响应数据
   * @param {number} chunkIndex - 分块索引
   */
  async saveRequestResponse(requestData, responseData, chunkIndex = null) {
    try {
      // 增加请求计数器
      this.requestCounter++;
      
      // 生成MR专属目录
      const mrIid = global.currentMrIid || 'unknown';
      const reportsDir = path.join(process.cwd(), 'reports');
      const mrDir = path.join(reportsDir, mrIid.toString());
      
      // 确保目录存在
      await fs.mkdir(mrDir, { recursive: true });
      
      // 生成文件名
      const suffix = chunkIndex !== null ? `_chunk_${chunkIndex}` : '';
      const requestFileName = `request_al_${this.requestCounter}${suffix}.json`;
      const responseFileName = `response_al_${this.requestCounter}${suffix}.json`;
      
      // 保存请求数据
      const requestPath = path.join(mrDir, requestFileName);
      await fs.writeFile(requestPath, JSON.stringify(requestData, null, 2), 'utf8');
      
      // 保存响应数据
      const responsePath = path.join(mrDir, responseFileName);
      await fs.writeFile(responsePath, JSON.stringify(responseData, null, 2), 'utf8');
      
      console.log(`💾 已保存请求响应: ${requestFileName}, ${responseFileName}`);
      
    } catch (error) {
      console.warn('⚠️ 保存请求响应失败:', error.message);
    }
  }

  /**
   * 更新Token使用统计
   * @param {Object} usage - token使用信息
   */
  updateTokenStats(usage) {
    if (!usage) return;
    
    const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
    const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || (inputTokens + outputTokens);
    
    this.tokenStats.totalInputTokens += inputTokens;
    this.tokenStats.totalOutputTokens += outputTokens;
    this.tokenStats.totalTokens += totalTokens;
    this.tokenStats.requestCount += 1;
    this.tokenStats.averageTokensPerRequest = this.tokenStats.totalTokens / this.tokenStats.requestCount;
    
    console.log(`📊 Token使用: 输入=${inputTokens}, 输出=${outputTokens}, 总计=${totalTokens}`);
  }

  /**
   * 获取账户Token使用情况（如果API支持的话）
   * 注意：此功能可能需要特定的API权限
   */
  async getAccountTokenUsage() {
    const { api_key, base_url } = this.bailianConfig;
    
    try {
      // 方法1: 尝试获取账户使用情况
      let response = await fetch(`${base_url}/account/usage`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const usageInfo = await response.json();
        return usageInfo;
      }

      // 方法2: 尝试获取模型列表，有时候这个API会返回配额信息
      response = await fetch(`${base_url}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const modelsInfo = await response.json();
        // 检查是否包含配额信息
        if (modelsInfo.usage || modelsInfo.quota) {
          return modelsInfo.usage || modelsInfo.quota;
        }
      }

      // 方法3: 发送一个最小的测试请求来检查rate limiting headers
      const testRequest = {
        model: this.bailianConfig.model,
        input: {
          messages: [
            {
              role: 'user',
              content: '测试'
            }
          ]
        },
        parameters: {
          max_tokens: 1,
          temperature: 0.1
        }
      };

      response = await fetch(`${base_url}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testRequest)
      });

      // 检查响应头中的rate limiting信息
      const rateLimitHeaders = {
        remaining: response.headers.get('x-ratelimit-remaining'),
        limit: response.headers.get('x-ratelimit-limit'),
        resetTime: response.headers.get('x-ratelimit-reset'),
        tokensRemaining: response.headers.get('x-tokens-remaining'),
        tokensLimit: response.headers.get('x-tokens-limit')
      };

      // 如果找到了rate limiting信息
      if (Object.values(rateLimitHeaders).some(val => val !== null)) {
        return {
          rate_limit_info: rateLimitHeaders,
          source: 'rate_limit_headers'
        };
      }

      return null;

    } catch (error) {
      // 静默处理错误，因为这个功能可能不被支持
      return null;
    }
  }

  /**
   * 主要的代码分析方法
   */
  async analyzeCodeChanges(diff, mrDetails) {
    if (!this.isConfigured) {
      throw new Error('阿里云百炼配置不完整，无法进行分析');
    }

    console.log('🤖 使用阿里云百炼大模型进行代码分析...');

    try {
      // 检测主要编程语言和项目类型
      const detectedLanguage = this.detectPrimaryLanguage(diff);
      const projectType = this.detectProjectType(diff, mrDetails);
      
      console.log(`🔍 检测到主要语言: ${detectedLanguage || '未知'}`);
      console.log(`📁 检测到项目类型: ${projectType || '通用'}`);
      
      // 预处理：过滤和优化diff
      const optimizedDiff = this.preprocessDiff(diff);
      
      // 构建分析请求（传递语言和项目类型信息）
      const analysisResult = await this.performAnalysis(optimizedDiff, mrDetails, detectedLanguage, projectType);
      
      return analysisResult;
      
    } catch (error) {
      console.error('❌ 阿里云百炼分析失败:', error.message);
      throw error;
    }
  }

  /**
   * 执行实际的分析
   */
  async performAnalysis(diff, mrDetails, language = null, projectType = null) {
    const analysisPrompt = this.buildAnalysisPrompt(diff, mrDetails);
    
    // 重置本次分析的token统计
    const sessionStartTokens = { ...this.tokenStats };
    
    // 分块处理大型差异
    const chunks = this.chunkDiff(diff);
    const analyses = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkPrompt = this.buildChunkPrompt(chunk, mrDetails);
      const chunkResult = await this.callBailianAPI(chunkPrompt, 1, i + 1, language, projectType); // 传递语言和项目类型
      analyses.push(chunkResult);
    }
    
    // 合并分析结果
    const mergedAnalysis = this.mergeAnalyses(analyses);
    
    // 计算本次分析使用的token
    const sessionTokensUsed = {
      inputTokens: this.tokenStats.totalInputTokens - sessionStartTokens.totalInputTokens,
      outputTokens: this.tokenStats.totalOutputTokens - sessionStartTokens.totalOutputTokens,
      totalTokens: this.tokenStats.totalTokens - sessionStartTokens.totalTokens,
      requests: this.tokenStats.requestCount - sessionStartTokens.requestCount
    };
    
    // 输出本次分析的token使用统计
    console.log('\n📊 阿里云百炼Token使用统计:');
    console.log(`🔄 本次分析请求数: ${sessionTokensUsed.requests}`);
    console.log(`📝 本次输入Token: ${sessionTokensUsed.inputTokens.toLocaleString()}`);
    console.log(`💬 本次输出Token: ${sessionTokensUsed.outputTokens.toLocaleString()}`);
    console.log(`📋 本次总计Token: ${sessionTokensUsed.totalTokens.toLocaleString()}`);
    console.log(`📈 累计总Token使用: ${this.tokenStats.totalTokens.toLocaleString()}`);
    console.log(`⚡ 平均每次请求Token: ${Math.round(this.tokenStats.averageTokensPerRequest).toLocaleString()}`);
  
    
    return {
      status: 'success',
      provider: 'aliyun-bailian',
      model: this.bailianConfig.model,
      analysis: {
        summary: mergedAnalysis.summary,
        quality_score: mergedAnalysis.score,
        risk_level: mergedAnalysis.risk_level,
        potential_issues: mergedAnalysis.issues || [],
        security_concerns: mergedAnalysis.security_notes || [],
        improvement_suggestions: mergedAnalysis.suggestions || [],
        strengths: mergedAnalysis.strengths || [],
        raw_response: mergedAnalysis.raw_response
      },
      timestamp: new Date().toISOString(),
      chunks_analyzed: analyses.length,
      token_usage: {
        session: sessionTokensUsed,
        cumulative: { ...this.tokenStats }
      }
    };
  }

  /**
   * 调用阿里云百炼API（带重试机制）
   */
  async callBailianAPI(prompt, attempt = 1, chunkIndex = null, language = null, projectType = null) {
    const { api_key, model, base_url, max_tokens, temperature, timeout } = this.bailianConfig;
    
    const requestBody = {
      model: model,
      input: {
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(language, projectType)
          },
          {
            role: 'user', 
            content: prompt
          }
        ]
      },
      parameters: {
        max_tokens: max_tokens,
        temperature: temperature,
        result_format: 'message',
        // 优化参数
        top_p: 0.8,  // 核采样参数，提高输出质量
        repetition_penalty: 1.05  // 减少重复
      }
    };

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.log(`🔄 调用阿里云百炼API (尝试 ${attempt}/${this.retryAttempts})${chunkIndex !== null ? ` - 分块 ${chunkIndex}` : ''}`);
      
      const response = await fetch(`${base_url}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API调用失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.code && result.code !== '200') {
        throw new Error(`API错误: ${result.code} - ${result.message}`);
      }
      
      // 保存请求和响应数据
      await this.saveRequestResponse(requestBody, result, chunkIndex);
      
      console.log('✅ 阿里云百炼API调用成功');
      return this.parseAPIResponse(result);
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`API调用超时 (${timeout}ms)`);
      }
      
      // 重试逻辑
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        console.warn(`⚠️ API调用失败，${this.retryDelay}ms后重试: ${error.message}`);
        await this.delay(this.retryDelay * attempt); // 指数退避
        return this.callBailianAPI(prompt, attempt + 1, chunkIndex);
      }
      
      throw error;
    }
  }

  /**
   * 构建系统提示词（使用统一的review标准）
   * @param {string} language - 检测到的主要编程语言
   * @param {string} projectType - 项目类型
   * @returns {string} 系统提示词
   */
  getSystemPrompt(language = null, projectType = null) {
    // 使用统一的review标准管理器生成系统提示词
    return this.reviewStandardsManager.getSystemPrompt(language, projectType);
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(diff, mrDetails) {
    const diffText = diff.map(file => {
      const filePath = file.new_path || file.old_path;
      const changeType = file.new_file ? '新增文件' : 
                        file.deleted_file ? '删除文件' : '修改文件';
      
      return `📁 ${filePath} (${changeType})\n${file.diff || ''}`;
    }).join('\n\n' + '='.repeat(50) + '\n\n');

    return `请对以下代码变更进行专业的代码审查：

📋 **MR信息**
- 标题: ${mrDetails.title || '无标题'}
- 描述: ${mrDetails.description || '无描述'}
- 文件数量: ${diff.length}

📝 **代码变更**
${diffText}

🔍 **请从以下维度进行详细分析：**

1. **代码质量** (权重: 25%)
   - 代码风格和规范性
   - 函数和类的设计合理性
   - 注释和文档完整性
   
2. **功能正确性** (权重: 30%)
   - 逻辑错误检测
   - 边界条件处理
   - 异常处理机制
   
3. **安全性** (权重: 20%)
   - 安全漏洞识别
   - 数据验证和过滤
   - 权限控制检查
   
4. **性能** (权重: 15%)
   - 算法复杂度分析
   - 内存使用优化
   - 数据库查询效率
   
5. **可维护性** (权重: 10%)
   - 代码复杂度
   - 模块化程度
   - 测试覆盖率

📊 **输出格式：**
请按照以下格式提供分析报告：

## 总体评分
- 综合评分: X/10分
- 风险等级: [低/中/高]

## 详细分析
### ✅ 优点
- [列出代码的优点]

### ⚠️ 问题发现
- [按严重程度列出问题]

### 💡 改进建议
- [提供具体的改进建议]

### 🔒 安全建议
- [如有安全相关建议]

## 总结
[简要总结本次代码审查的核心发现和建议]`;
  }

  /**
   * 构建代码块提示词
   */
  buildChunkPrompt(chunk, mrDetails) {
    return this.buildAnalysisPrompt(chunk, mrDetails);
  }

  /**
   * 分割大型差异（优化版）
   */
  chunkDiff(diff) {
    const maxChunkSize = this.bailianConfig.max_chunk_size || 8;
    const maxDiffLength = this.bailianConfig.max_diff_length || 15000;
    const chunks = [];
    
    let currentChunk = [];
    let currentLength = 0;
    
    for (const file of diff) {
      const fileDiffLength = (file.diff || '').length;
      
      // 如果单个文件太大，截断处理
      if (fileDiffLength > maxDiffLength) {
        const truncatedFile = {
          ...file,
          diff: file.diff.substring(0, maxDiffLength) + '\n... (文件过大，已截断)'
        };
        
        // 大文件单独成块
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentLength = 0;
        }
        chunks.push([truncatedFile]);
        continue;
      }
      
      // 检查是否需要新建块
      if (currentChunk.length >= maxChunkSize || 
          (currentLength + fileDiffLength > maxDiffLength && currentChunk.length > 0)) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentLength = 0;
      }
      
      currentChunk.push(file);
      currentLength += fileDiffLength;
    }
    
    // 添加最后一个块
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    console.log(`📊 代码分块: ${diff.length} 个文件分为 ${chunks.length} 个块进行分析`);
    return chunks;
  }

  /**
   * 解析API响应
   */
  parseAPIResponse(result) {
    const output = result.output || {};
    const usage = result.usage || {};
    
    // 更新Token统计
    this.updateTokenStats(usage);
    
    const content = output.choices?.[0]?.message?.content || output.text || '分析完成';
    
    // 解析结构化信息
    const analysis = this.extractStructuredAnalysis(content);
    
    return {
      ...analysis,
      raw_response: content,
      usage: {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        total_tokens: usage.total_tokens || 0
      }
    };
  }

  /**
   * 提取结构化分析信息
   */
  extractStructuredAnalysis(content) {
    const analysis = {
      summary: '',
      score: 7,
      risk_level: 'medium',
      strengths: [],
      issues: [],
      suggestions: [],
      security_notes: []
    };

    try {
      // 提取评分
      const scoreMatch = content.match(/综合评分[：:]\s*(\d+(?:\.\d+)?)\s*[\/\/]?\s*10/);
      if (scoreMatch) {
        analysis.score = Math.min(10, Math.max(1, parseFloat(scoreMatch[1])));
      }

      // 提取风险等级
      const riskMatch = content.match(/风险等级[：:]\s*[【\[]*([低中高])[】\]]*/);
      if (riskMatch) {
        const riskMap = { '低': 'low', '中': 'medium', '高': 'high' };
        analysis.risk_level = riskMap[riskMatch[1]] || 'medium';
      }

      // 提取各个部分
      analysis.summary = this.extractSection(content, '总结') || 
                        content.substring(0, 200) + '...';
      analysis.strengths = this.extractListItems(content, '优点');
      analysis.issues = this.extractListItems(content, '问题发现');
      analysis.suggestions = this.extractListItems(content, '改进建议');
      analysis.security_notes = this.extractListItems(content, '安全建议');

    } catch (error) {
      console.warn('⚠️ 解析分析结果时出错:', error.message);
    }

    return analysis;
  }

  /**
   * 提取内容部分
   */
  extractSection(content, sectionName) {
    const regex = new RegExp(`${sectionName}[\\s\\S]*?([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * 提取列表项
   */
  extractListItems(content, sectionName) {
    const section = this.extractSection(content, sectionName);
    if (!section) return [];
    
    const items = section.split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(item => item.length > 0);
    
    return items;
  }

  /**
   * 合并多个分析结果
   */
  mergeAnalyses(analyses) {
    if (analyses.length === 0) {
      return { summary: '无分析结果', score: 5, risk_level: 'medium' };
    }
    
    if (analyses.length === 1) {
      return analyses[0];
    }

    // 合并分析结果
    const merged = {
      summary: '',
      score: 0,
      risk_level: 'low',
      strengths: [],
      issues: [],
      suggestions: [],
      security_notes: []
    };

    // 计算平均评分
    const scores = analyses.map(a => a.score || 7);
    merged.score = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // 确定最高风险等级
    const riskLevels = analyses.map(a => a.risk_level || 'medium');
    if (riskLevels.includes('high')) merged.risk_level = 'high';
    else if (riskLevels.includes('medium')) merged.risk_level = 'medium';

    // 合并各个字段
    for (const analysis of analyses) {
      if (analysis.strengths) merged.strengths.push(...analysis.strengths);
      if (analysis.issues) merged.issues.push(...analysis.issues);
      if (analysis.suggestions) merged.suggestions.push(...analysis.suggestions);
      if (analysis.security_notes) merged.security_notes.push(...analysis.security_notes);
    }

    // 去重
    merged.strengths = [...new Set(merged.strengths)];
    merged.issues = [...new Set(merged.issues)];
    merged.suggestions = [...new Set(merged.suggestions)];
    merged.security_notes = [...new Set(merged.security_notes)];

    // 生成综合总结
    merged.summary = `共分析 ${analyses.length} 个代码块，发现 ${merged.issues.length} 个问题，${merged.suggestions.length} 条建议。总体评分 ${merged.score.toFixed(1)}/10，风险等级：${merged.risk_level}`;

    return merged;
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND', 
      'ECONNREFUSED',
      'ETIMEDOUT',
      '429', // 限流
      '500', // 服务器错误
      '502', // 网关错误
      '503', // 服务不可用
      '504'  // 网关超时
    ];
    
    return retryableErrors.some(pattern => 
      error.message.includes(pattern) || error.code === pattern
    );
  }

  /**
   * 预处理diff，过滤无关文件和优化内容
   */
  preprocessDiff(diff) {
    const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.pdf', '.zip', '.tar', '.gz'];
    const ignoredPaths = ['/node_modules/', '/vendor/', '/.git/', '/dist/', '/build/', '/coverage/'];
    
    return diff.filter(file => {
      const filePath = file.new_path || file.old_path || '';
      
      // 跳过二进制文件
      if (ignoredExtensions.some(ext => filePath.toLowerCase().endsWith(ext))) {
        return false;
      }
      
      // 跳过不重要的目录
      if (ignoredPaths.some(path => filePath.includes(path))) {
        return false;
      }
      
      // 跳过空的diff
      if (!file.diff || file.diff.trim().length === 0) {
        return false;
      }
      
      return true;
    }).map(file => {
      // 优化diff内容，移除过长的连续空行
      const optimizedDiff = file.diff
        .replace(/\n\s*\n\s*\n/g, '\n\n')  // 压缩多个空行
        .replace(/^.*\/\/ TODO.*$/gm, '')   // 移除TODO注释
        .replace(/^.*\/\* DEBUG.*?\*\//gm, ''); // 移除DEBUG注释
      
      return {
        ...file,
        diff: optimizedDiff
      };
    });
  }

  /**
   * 延时工具方法
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 测试连接
   */
  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        message: '阿里云百炼配置不完整',
        details: {
          api_key_configured: !!this.bailianConfig.api_key,
          workspace_id_configured: !!this.bailianConfig.workspace_id
        }
      };
    }

    try {
      const testPrompt = '请简单回复"连接测试成功"';
      const result = await this.callBailianAPI(testPrompt);
      
      return {
        success: true,
        message: '阿里云百炼连接成功',
        model: this.bailianConfig.model,
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: `阿里云百炼连接失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 检查是否可用
   */
  isAvailable() {
    return this.isConfigured;
  }

  /**
   * 获取配置信息（增强版）
   */
  getConfigInfo() {
    return {
      provider: 'aliyun-bailian',
      model: this.bailianConfig.model,
      configured: this.isConfigured,
      base_url: this.bailianConfig.base_url,
      performance: {
        timeout: this.bailianConfig.timeout,
        max_tokens: this.bailianConfig.max_tokens,
        max_concurrent: this.bailianConfig.max_concurrent,
        retry_attempts: this.bailianConfig.retry_attempts,
        cache_size: this.analysisCache.size,
        max_cache_size: this.maxCacheSize
      }
    };
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const cacheHitRate = this.totalRequests > 0 
      ? ((this.cacheHits || 0) / this.totalRequests * 100).toFixed(2)
      : '0.00';
    
    return {
      cache_hit_rate: `${cacheHitRate}%`,
      cache_size: this.analysisCache.size,
      total_requests: this.totalRequests || 0,
      cache_hits: this.cacheHits || 0,
      avg_response_time: this.avgResponseTime || 0,
      token_usage: {
        total_input_tokens: this.tokenStats.totalInputTokens,
        total_output_tokens: this.tokenStats.totalOutputTokens,
        total_tokens: this.tokenStats.totalTokens,
        request_count: this.tokenStats.requestCount,
        average_tokens_per_request: Math.round(this.tokenStats.averageTokensPerRequest)
      }
    };
  }

  /**
   * 清理所有缓存
   */
  clearCache() {
    const oldSize = this.analysisCache.size;
    this.analysisCache.clear();
    console.log(`🗑️ 清理所有缓存，释放 ${oldSize} 个缓存项`);
  }

  /**
   * 重置Token统计
   */
  resetTokenStats() {
    this.tokenStats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      requestCount: 0,
      averageTokensPerRequest: 0
    };
    console.log('🔄 Token统计已重置');
  }

  /**
   * 获取Token统计信息
   */
  getTokenStats() {
    return {
      ...this.tokenStats,
      formatted: {
        totalInputTokens: this.tokenStats.totalInputTokens.toLocaleString(),
        totalOutputTokens: this.tokenStats.totalOutputTokens.toLocaleString(),
        totalTokens: this.tokenStats.totalTokens.toLocaleString(),
        averageTokensPerRequest: Math.round(this.tokenStats.averageTokensPerRequest).toLocaleString()
      }
    };
  }

  /**
   * 检测主要编程语言
   * @param {Array} diff - 代码变更差异
   * @returns {string} 检测到的主要语言
   */
  detectPrimaryLanguage(diff) {
    const languageExtensions = {
      'javascript': ['.js', '.jsx', '.mjs'],
      'typescript': ['.ts', '.tsx'],
      'dart': ['.dart'],
      'python': ['.py', '.pyw'],
      'java': ['.java'],
      'kotlin': ['.kt', '.kts'],
      'swift': ['.swift'],
      'c++': ['.cpp', '.cxx', '.cc', '.c++'],
      'c': ['.c', '.h'],
      'go': ['.go'],
      'rust': ['.rs'],
      'php': ['.php'],
      'ruby': ['.rb'],
      'csharp': ['.cs'],
      'html': ['.html', '.htm'],
      'css': ['.css', '.scss', '.sass'],
      'vue': ['.vue'],
      'react': ['.jsx', '.tsx']
    };

    const langCounts = {};
    
    diff.forEach(file => {
      const filePath = file.new_path || file.old_path || '';
      const extension = path.extname(filePath).toLowerCase();
      
      for (const [lang, exts] of Object.entries(languageExtensions)) {
        if (exts.includes(extension)) {
          langCounts[lang] = (langCounts[lang] || 0) + 1;
          break;
        }
      }
    });

    // 返回出现次数最多的语言
    const primaryLang = Object.entries(langCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return primaryLang ? primaryLang[0] : null;
  }

  /**
   * 检测项目类型
   * @param {Array} diff - 代码变更差异
   * @param {Object} mrDetails - MR详情
   * @returns {string} 检测到的项目类型
   */
  detectProjectType(diff, mrDetails) {
    const projectIndicators = {
      'mobile_app': {
        files: ['pubspec.yaml', 'android/', 'ios/', '.flutter-plugins'],
        patterns: ['flutter', 'dart', 'android', 'ios', 'mobile']
      },
      'web_application': {
        files: ['package.json', 'index.html', 'webpack.config.js', 'vite.config.js'],
        patterns: ['web', 'frontend', 'react', 'vue', 'angular']
      },
      'backend_api': {
        files: ['pom.xml', 'requirements.txt', 'Gemfile', 'go.mod'],
        patterns: ['api', 'backend', 'server', 'service']
      },
      'microservices': {
        files: ['docker-compose.yml', 'Dockerfile', 'k8s/', 'kubernetes/'],
        patterns: ['microservice', 'docker', 'kubernetes', 'service-mesh']
      }
    };

    for (const [projectType, indicators] of Object.entries(projectIndicators)) {
      // 检查文件存在
      const hasFiles = indicators.files.some(filePattern => 
        diff.some(file => {
          const filePath = file.new_path || file.old_path || '';
          return filePath.includes(filePattern);
        })
      );

      // 检查MR标题和描述中的模式
      const title = (mrDetails.title || '').toLowerCase();
      const description = (mrDetails.description || '').toLowerCase();
      const hasPatterns = indicators.patterns.some(pattern => 
        title.includes(pattern) || description.includes(pattern)
      );

      if (hasFiles || hasPatterns) {
        return projectType;
      }
    }

    return null;
  }
}

export { AliyunBailianAnalyzer };
