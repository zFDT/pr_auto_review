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

    // 高性能并发控制配置
    this.requestQueue = [];
    this.processing = false;
    this.maxConcurrent = this.bailianConfig.maxConcurrency || 10; // 统一使用maxConcurrency
    this.retryAttempts = this.bailianConfig.maxRetries || 3; // 确保使用配置文件中的重试次数
    this.retryDelay = this.bailianConfig.retryDelay || 1000; // 确保使用配置文件中的重试延迟

    // 请求计数器（用于文件命名）
    this.requestCounter = 0;

    // 性能监控
    this.performanceMetrics = {
      concurrentRequests: 0,
      maxConcurrentReached: 0,
      totalRequests: 0,
      averageResponseTime: 0
    };

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

      // 高性能配置
      timeout: configFile.timeout || 120000,  // 120秒超时，适应复杂分析
      max_tokens: configFile.max_tokens || configFile.maxTokens || 8192,  // 支持更大token
      temperature: configFile.temperature || 0.1,  // 降低随机性提高一致性

      // 高并发控制（配置项统一）
      maxConcurrency: configFile.maxConcurrency || 10,
      maxRetries: configFile.maxRetries || 3,
      retryDelay: configFile.retryDelay || 1000,

      // 优化的分块处理配置
      maxChunkSize: configFile.maxChunkSize || 6,  // 减少分块提高速度
      maxDiffLength: configFile.maxDiffLength || 20000,  // 增加diff长度

      // 流处理配置（禁用以提高吞吐量）
      streamMode: false,
      enableCache: false  // 明确禁用缓存
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
      const chunkResult = await this.callBailianAPI(chunkPrompt, 1, i + 1, language, projectType, false); // 明确指定非合并模式
      analyses.push(chunkResult);
    }

    // 智能合并分析结果
    const mergedAnalysis = await this.mergeAnalyses(analyses);

    // 计算本次分析使用的token（包括智能合并的token）
    const sessionTokensUsed = {
      inputTokens: this.tokenStats.totalInputTokens - sessionStartTokens.totalInputTokens,
      outputTokens: this.tokenStats.totalOutputTokens - sessionStartTokens.totalOutputTokens,
      totalTokens: this.tokenStats.totalTokens - sessionStartTokens.totalTokens,
      requests: this.tokenStats.requestCount - sessionStartTokens.requestCount
    };

    // 输出本次分析的token使用统计（包括智能合并）
    const mergeRequests = mergedAnalysis.merge_method === 'ai_intelligent' ? 1 : 0;
    console.log('\n📊 阿里云百炼Token使用统计:');
    console.log(`🔄 本次分析请求数: ${sessionTokensUsed.requests} (包含${analyses.length}个分块分析${mergeRequests ? ' + 1个智能合并' : ''})`);
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
      merge_method: mergedAnalysis.merge_method || 'unknown',
      token_usage: {
        session: sessionTokensUsed,
        cumulative: { ...this.tokenStats },
        breakdown: {
          chunk_analysis_requests: analyses.length,
          merge_requests: mergedAnalysis.merge_method === 'ai_intelligent' ? 1 : 0,
          total_requests: sessionTokensUsed.requests
        }
      }
    };
  }

  /**
   * 调用阿里云百炼API（带重试机制）
   */
  async callBailianAPI(prompt, attempt = 1, chunkIndex = null, language = null, projectType = null, isMergeMode = false) {
    const { api_key, model, base_url, max_tokens, temperature, timeout } = this.bailianConfig;

    const requestBody = {
      model: model,
      input: {
        messages: [
          {
            role: 'system',
            content: isMergeMode ? this.getMergeSystemPrompt() : this.getSystemPrompt(language, projectType)
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      parameters: {
        max_tokens: isMergeMode ? Math.min(max_tokens * 1.5, 12288) : max_tokens, // 合并模式使用更多token
        temperature: isMergeMode ? 0.05 : temperature, // 合并模式使用更低温度确保一致性
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

      // 处理超时错误，保持原始错误信息以便重试判断
      let processedError = error;
      if (error.name === 'AbortError') {
        processedError = new Error(`API调用超时 (${timeout}ms)`);
        processedError.isTimeout = true;
        processedError.originalError = error;
      }

      // 重试逻辑
      if (attempt < this.retryAttempts && this.shouldRetry(processedError)) {
        console.warn(`⚠️ API调用失败，${this.retryDelay * attempt}ms后重试 (${attempt}/${this.retryAttempts}): ${processedError.message}`);
        await this.delay(this.retryDelay * attempt); // 指数退避
        return this.callBailianAPI(prompt, attempt + 1, chunkIndex, language, projectType, isMergeMode);
      }

      throw processedError;
    }
  }

  /**
   * 获取合并模式的系统提示词
   */
  getMergeSystemPrompt() {
    return `你是一位资深的代码审查专家，专门负责整合和合并多个代码分析结果。

你的任务是：
1. 分析多个代码审查结果，识别重复和相似内容
2. 按重要程度和严重程度对问题进行分类排序
3. 将相关的问题和建议进行智能分组
4. 生成清晰、专业、有条理的综合分析报告
5. 确保最终结果比原始分析更加精准和有价值

输出要求：
- 使用结构化的格式
- 避免信息冗余
- 突出重点问题
- 提供可操作的建议
- 保持专业和客观的语调

请严格按照用户指定的格式输出结果。`;
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

    // 获取输出格式要求
    const outputRequirements = this.reviewStandardsManager.standards?.unified_flutter_review_config?.ai_analysis_config?.output_requirements;

    const formatRequirements = outputRequirements ? `

📄 **输出格式要求：**
${outputRequirements.requirements?.map(req => `- ${req}`).join('\n') || ''}

📋 **必须遵循以下结构：**
${outputRequirements.sections?.join('\n\n') || ''}

⚠️ **注意：** ${outputRequirements.style || '专业、详细、实用'}
` : '';

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

${formatRequirements}

📊 **输出要求：**
- 必须包含具体的代码示例和改进建议
- 使用markdown格式，包含emoji使报告更易读
- 提供详细的问题分析和解决方案
- 对每个问题说明影响程度和修复优先级

请确保分析详细、实用，并提供可操作的改进建议。`;
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
    const maxChunkSize = this.bailianConfig.maxChunkSize || 6;
    const maxDiffLength = this.bailianConfig.maxDiffLength || 20000;
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
      content: content, // 保留AI返回的完整原始内容
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
   * 合并多个分析结果（AI智能合并版）
   */
  async mergeAnalyses(analyses) {
    if (analyses.length === 0) {
      return { summary: '无分析结果', score: 5, risk_level: 'medium' };
    }

    if (analyses.length === 1) {
      return analyses[0];
    }

    console.log(`🧠 开始AI智能合并 ${analyses.length} 个分析结果...`);

    try {
      // 使用AI进行智能合并
      const aiMergedResult = await this.performAIMerge(analyses);
      console.log('✅ AI智能合并完成');
      return aiMergedResult;
    } catch (error) {
      console.warn('⚠️ AI智能合并失败，使用简单合并方法:', error.message);
      return this.performSimpleMerge(analyses);
    }
  }

  /**
   * 使用AI进行智能合并分析结果
   */
  async performAIMerge(analyses) {
    // 记录合并前的token统计
    const mergeStartTokens = { ...this.tokenStats };

    // 构建合并提示词
    const mergePrompt = this.buildMergePrompt(analyses);

    console.log(`🔄 开始调用AI进行智能合并...`);

    // 调用AI进行合并
    const mergedResult = await this.callBailianAPI(mergePrompt, 1, null, null, null, true);

    // 计算合并阶段使用的token
    const mergeTokensUsed = {
      inputTokens: this.tokenStats.totalInputTokens - mergeStartTokens.totalInputTokens,
      outputTokens: this.tokenStats.totalOutputTokens - mergeStartTokens.totalOutputTokens,
      totalTokens: this.tokenStats.totalTokens - mergeStartTokens.totalTokens
    };

    console.log(`🧠 智能合并Token使用: 输入=${mergeTokensUsed.inputTokens}, 输出=${mergeTokensUsed.outputTokens}, 总计=${mergeTokensUsed.totalTokens}`);

    // 计算基础评分和风险等级（作为AI结果的补充）
    const avgScore = analyses.reduce((sum, a) => sum + (a.score || 7), 0) / analyses.length;
    const maxRiskLevel = this.determineMaxRiskLevel(analyses);

    return {
      summary: mergedResult.summary || mergedResult.raw_response.substring(0, 500),
      score: mergedResult.score || avgScore,
      risk_level: mergedResult.risk_level || maxRiskLevel,
      strengths: mergedResult.strengths || [],
      issues: mergedResult.issues || [],
      suggestions: mergedResult.suggestions || [],
      security_notes: mergedResult.security_notes || [],
      raw_response: mergedResult.raw_response,
      merge_method: 'ai_intelligent',
      chunks_merged: analyses.length,
      merge_token_usage: mergeTokensUsed  // 添加合并阶段的token使用信息
    };
  }  /**
   * 构建AI合并提示词
   */
  buildMergePrompt(analyses) {
    const analysisTexts = analyses.map((analysis, index) => {
      return `
### 分析结果 ${index + 1}
**评分**: ${analysis.score || 7}/10
**风险等级**: ${analysis.risk_level || 'medium'}

**优点**:
${(analysis.strengths || []).map(s => `- ${s}`).join('\n')}

**问题**:
${(analysis.issues || []).map(i => `- ${i}`).join('\n')}

**建议**:
${(analysis.suggestions || []).map(s => `- ${s}`).join('\n')}

**安全建议**:
${(analysis.security_notes || []).map(s => `- ${s}`).join('\n')}

**原始分析**:
${analysis.raw_response ? analysis.raw_response.substring(0, 1000) : '无详细分析'}
`;
    }).join('\n' + '='.repeat(80) + '\n');

    return `请将以下 ${analyses.length} 个代码审查分析结果进行智能合并整合，生成一个统一、清晰、专业的综合分析报告。

📋 **需要合并的分析结果**:
${analysisTexts}

🎯 **合并要求**:

1. **去重和整合**: 
   - 识别并合并相似或重复的问题、建议
   - 保留最具代表性和重要性的内容
   - 避免信息冗余

2. **优先级排序**:
   - 按严重程度对问题进行排序
   - 按影响程度对建议进行排序
   - 突出最关键的安全问题

3. **智能分类**:
   - 将相关问题归类合并
   - 将相关建议进行分组
   - 识别问题之间的关联性

4. **综合评估**:
   - 重新评估整体代码质量评分（1-10分）
   - 确定综合风险等级（low/medium/high）
   - 生成准确的综合总结

📊 **输出格式**:
## 综合评分
- 综合评分: X/10分
- 风险等级: [low/medium/high]

## 优点总结
- [整合后的主要优点，避免重复]

## 问题汇总
### 🔴 高优先级问题
- [最严重的问题]

### 🟡 中优先级问题  
- [中等严重问题]

### 🟢 低优先级问题
- [轻微问题]

## 改进建议
### 💡 核心建议
- [最重要的改进建议]

### 🔧 优化建议
- [性能和代码质量优化建议]

## 安全建议
- [安全相关的重要建议]

## 综合总结
[专业总结，包含：整体代码质量评价、主要风险点、关键改进方向]

请确保合并结果比原始分析更加清晰、专业、有条理。`;
  }

  /**
   * 简单合并方法（作为AI合并失败时的备选方案）
   */
  performSimpleMerge(analyses) {
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
    merged.risk_level = this.determineMaxRiskLevel(analyses);

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
    merged.merge_method = 'simple_fallback';
    merged.chunks_merged = analyses.length;

    return merged;
  }

  /**
   * 确定最高风险等级
   */
  determineMaxRiskLevel(analyses) {
    const riskLevels = analyses.map(a => a.risk_level || 'medium');
    if (riskLevels.includes('high')) return 'high';
    else if (riskLevels.includes('medium')) return 'medium';
    return 'low';
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

    // 检查是否是超时错误
    if (error.isTimeout || error.name === 'AbortError') {
      return true;
    }

    // 检查其他可重试的错误
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
        maxConcurrency: this.bailianConfig.maxConcurrency,
        maxRetries: this.bailianConfig.maxRetries,
        maxChunkSize: this.bailianConfig.maxChunkSize,
        maxDiffLength: this.bailianConfig.maxDiffLength
      }
    };
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return {
      token_usage: {
        total_input_tokens: this.tokenStats.totalInputTokens,
        total_output_tokens: this.tokenStats.totalOutputTokens,
        total_tokens: this.tokenStats.totalTokens,
        request_count: this.tokenStats.requestCount,
        average_tokens_per_request: Math.round(this.tokenStats.averageTokensPerRequest)
      },
      performance_metrics: {
        concurrent_requests: this.performanceMetrics.concurrentRequests,
        max_concurrent_reached: this.performanceMetrics.maxConcurrentReached,
        total_requests: this.performanceMetrics.totalRequests,
        average_response_time: this.performanceMetrics.averageResponseTime
      }
    };
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
      .sort(([, a], [, b]) => b - a)[0];

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
