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
import { createHash } from 'crypto';

/**
 * 阿里云百炼分析器类
 */
class AliyunBailianAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.bailianConfig = this.getBailianConfig();
    this.isConfigured = this.checkConfiguration();
    
    // 分析缓存
    this.analysisCache = new Map();
    this.maxCacheSize = 100;
    
    // 请求限制
    this.requestQueue = [];
    this.processing = false;
    this.maxConcurrent = 3;
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
      timeout: configFile.timeout || 30000,
      max_tokens: configFile.max_tokens || 4000,
      temperature: configFile.temperature || 0.1
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
   * 主要的代码分析方法
   */
  async analyzeCodeChanges(diff, mrDetails) {
    if (!this.isConfigured) {
      throw new Error('阿里云百炼配置不完整，无法进行分析');
    }

    console.log('🤖 使用阿里云百炼大模型进行代码分析...');

    try {
      // 生成缓存键
      const cacheKey = this.generateCacheKey(diff, mrDetails);
      
      // 检查缓存
      if (this.analysisCache.has(cacheKey)) {
        console.log('📋 使用缓存的分析结果');
        return this.analysisCache.get(cacheKey);
      }

      // 构建分析请求
      const analysisResult = await this.performAnalysis(diff, mrDetails);
      
      // 缓存结果
      this.cacheAnalysisResult(cacheKey, analysisResult);
      
      return analysisResult;
      
    } catch (error) {
      console.error('❌ 阿里云百炼分析失败:', error.message);
      throw error;
    }
  }

  /**
   * 执行实际的分析
   */
  async performAnalysis(diff, mrDetails) {
    const analysisPrompt = this.buildAnalysisPrompt(diff, mrDetails);
    
    // 分块处理大型差异
    const chunks = this.chunkDiff(diff);
    const analyses = [];
    
    for (const chunk of chunks) {
      const chunkPrompt = this.buildChunkPrompt(chunk, mrDetails);
      const chunkResult = await this.callBailianAPI(chunkPrompt);
      analyses.push(chunkResult);
    }
    
    // 合并分析结果
    const mergedAnalysis = this.mergeAnalyses(analyses);
    
    return {
      status: 'success',
      provider: 'aliyun-bailian',
      model: this.bailianConfig.model,
      analysis: mergedAnalysis,
      timestamp: new Date().toISOString(),
      chunks_analyzed: analyses.length
    };
  }

  /**
   * 调用阿里云百炼API
   */
  async callBailianAPI(prompt) {
    const { api_key, model, base_url, max_tokens, temperature, timeout } = this.bailianConfig;
    
    const requestBody = {
      model: model,
      input: {
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
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
        result_format: 'message'
      }
    };

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
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
        throw new Error(`阿里云百炼API调用失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.code && result.code !== '200') {
        throw new Error(`阿里云百炼API错误: ${result.code} - ${result.message}`);
      }
      
      return this.parseAPIResponse(result);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`阿里云百炼API调用超时 (${timeout}ms)`);
      }
      
      throw error;
    }
  }

  /**
   * 构建系统提示词
   */
  getSystemPrompt() {
    return `你是一个专业的代码审查专家，具有丰富的软件开发和代码质量评估经验。你的职责是：

1. 深入分析代码变更的质量和安全性
2. 识别潜在的bug、性能问题和安全漏洞
3. 提供具体、可执行的改进建议
4. 评估代码的可维护性和可读性
5. 检查是否遵循最佳实践和编码规范

请用中文回复，提供详细且专业的分析报告。`;
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
   * 分割大型差异
   */
  chunkDiff(diff) {
    const maxChunkSize = 10; // 每块最多10个文件
    const chunks = [];
    
    for (let i = 0; i < diff.length; i += maxChunkSize) {
      chunks.push(diff.slice(i, i + maxChunkSize));
    }
    
    return chunks;
  }

  /**
   * 解析API响应
   */
  parseAPIResponse(result) {
    const output = result.output || {};
    const usage = result.usage || {};
    
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
   * 生成缓存键
   */
  generateCacheKey(diff, mrDetails) {
    const diffHash = createHash('md5')
      .update(JSON.stringify(diff))
      .digest('hex');
    const mrHash = createHash('md5')
      .update(`${mrDetails.title || ''}-${mrDetails.description || ''}`)
      .digest('hex');
    
    return `${diffHash}-${mrHash}`;
  }

  /**
   * 缓存分析结果
   */
  cacheAnalysisResult(key, result) {
    // 限制缓存大小
    if (this.analysisCache.size >= this.maxCacheSize) {
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
    
    this.analysisCache.set(key, result);
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
   * 获取配置信息
   */
  getConfigInfo() {
    return {
      provider: 'aliyun-bailian',
      model: this.bailianConfig.model,
      configured: this.isConfigured,
      base_url: this.bailianConfig.base_url
    };
  }
}

export { AliyunBailianAnalyzer };
