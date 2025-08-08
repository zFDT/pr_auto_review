#!/usr/bin/env node

/**
 * OpenAI 代码分析器 - 优化版本
 * 
 * 这是一个专业的AI驱动代码审查模块，基于OpenAI GPT模型提供：
 * - 深度语义分析和上下文理解
 * - 多语言代码质量评估
 * - 智能bug检测和性能优化建议
 * - 安全漏洞扫描和修复建议
 * - 架构设计评估和重构建议
 * 
 * 核心特性：
 * - 🧠 基于GPT-4的智能分析
 * - 🔄 自适应重试和错误恢复
 * - 📊 量化的代码质量评分
 * - 🛡️ 安全的API调用管理
 * - ⚡ 高性能并发处理
 * - 📝 结构化分析报告
 * 
 * @author AI Assistant
 * @version 2.0.0
 * @license MIT
 * @since 2024
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

/**
 * OpenAI分析器配置常量
 */
const ANALYZER_CONSTANTS = {
  // API调用限制
  MAX_TOKENS_PER_REQUEST: 8000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  REQUEST_TIMEOUT_MS: 120000,
  
  // 代码分析限制
  MAX_CODE_LENGTH: 50000,
  MAX_FILES_PER_BATCH: 10,
  MIN_CODE_LENGTH: 50,
  
  // 质量评分阈值
  QUALITY_THRESHOLDS: {
    EXCELLENT: 9,
    GOOD: 7,
    ACCEPTABLE: 5,
    POOR: 3
  },
  
  // 支持的编程语言
  SUPPORTED_LANGUAGES: [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust',
    'dart', 'flutter', 'swift', 'kotlin', 'c', 'cpp', 'csharp',
    'php', 'ruby', 'scala', 'html', 'css', 'sql', 'yaml', 'json'
  ]
};

/**
 * OpenAI API错误类
 * 专门处理OpenAI API相关的错误
 */
class OpenAIError extends Error {
  constructor(message, code = null, statusCode = null) {
    super(message);
    this.name = 'OpenAIError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * 高级OpenAI代码分析器
 * 
 * 提供专业级的AI代码审查功能，包括：
 * - 智能代码质量分析和评分
 * - 深度bug检测和性能优化建议
 * - 安全漏洞扫描和修复指导
 * - 架构设计评估和重构建议
 * - 多语言代码规范检查
 * - 可维护性和可读性评估
 */
class OpenAIAnalyzer {
  /**
   * 构造函数
   * 初始化OpenAI客户端和分析配置
   * 
   * @param {Object} config - 应用配置对象
   */
  constructor(config) {
    this.config = config;
    this.aiConfig = config.ai_config?.openai || {};
    this.reviewPrompts = config.ai_config?.review_prompts || {};
    
    // OpenAI客户端
    this.openai = null;
    
    // 分析统计
    this.analysisStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageResponseTime: 0,
      cacheHits: 0
    };
    
    // 结果缓存
    this.resultCache = new Map();
    this.maxCacheSize = 100;
    
    // 日志器
    this.logger = console;
    
    // 初始化客户端
    this.setupOpenAI();
  }

  /**
   * 初始化 OpenAI 客户端
   * 配置API密钥、基础URL和超时设置
   */
  setupOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY || this.aiConfig.api_key;
    
    if (!apiKey || apiKey === '${OPENAI_API_KEY}') {
      this.logger.warn('⚠️ 未配置 OpenAI API 密钥，OpenAI 分析将不可用');
      this.logger.info('💡 请设置 OPENAI_API_KEY 环境变量或在配置文件中配置 api_key');
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: this.aiConfig.base_url || 'https://api.openai.com/v1',
        timeout: this.aiConfig.timeout || ANALYZER_CONSTANTS.REQUEST_TIMEOUT_MS,
        maxRetries: ANALYZER_CONSTANTS.MAX_RETRIES,
        dangerouslyAllowBrowser: false
      });

      this.logger.info('✅ OpenAI 客户端初始化成功');
      this.logger.info(`🤖 使用模型: ${this.aiConfig.model || 'gpt-4o'}`);
      this.logger.info(`🌐 API端点: ${this.aiConfig.base_url || 'https://api.openai.com/v1'}`);
      
    } catch (error) {
      this.logger.error('❌ OpenAI 客户端初始化失败:', error.message);
      this.openai = null;
    }
  }

  /**
   * 检查 OpenAI 是否可用
   * 验证客户端配置和网络连接
   * 
   * @returns {boolean} 是否可用
   */
  isAvailable() {
    return this.openai !== null;
  }

  /**
   * 测试连接
   * 发送测试请求验证API连接
   * 
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testConnection() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      this.logger.info('🔍 测试 OpenAI API 连接...');
      
      const response = await this.openai.chat.completions.create({
        model: this.aiConfig.model || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: 'Test connection. Please respond with "OK".'
          }
        ],
        max_tokens: 10,
        temperature: 0
      });

      const isSuccess = response.choices?.[0]?.message?.content?.includes('OK');
      
      if (isSuccess) {
        this.logger.info('✅ OpenAI API 连接测试成功');
      } else {
        this.logger.warn('⚠️ OpenAI API 连接测试异常');
      }
      
      return isSuccess;
      
    } catch (error) {
      this.logger.error('❌ OpenAI API 连接测试失败:', error.message);
      return false;
    }
  }

  /**
   * 分析代码变更
   * 主要的分析入口方法，协调整个分析流程
   * 
   * @param {Array} diff - 代码差异数组
   * @param {Object} mrDetails - MR详细信息
   * @returns {Promise<Object|null>} 分析结果
   */
  async analyzeCodeChanges(diff, mrDetails) {
    if (!this.isAvailable()) {
      return this.createFailureReport('OpenAI 客户端未初始化或不可用');
    }

    const startTime = Date.now();
    this.analysisStats.totalRequests++;

    try {
      this.logger.info('🤖 开始 OpenAI 代码分析...');
      this.logger.info(`📄 分析文件数: ${diff.length}`);
      
      // 预处理代码差异
      const processedDiff = this.preprocessDiff(diff);
      if (!processedDiff || processedDiff.length === 0) {
        return this.createFailureReport('没有有效的代码差异可供分析');
      }
      
      // 检查缓存
      const cacheKey = this.generateCacheKey(processedDiff, mrDetails);
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.analysisStats.cacheHits++;
        this.logger.info('📋 使用缓存的分析结果');
        return cachedResult;
      }
      
      // 构建分析请求
      const analysisPrompt = this.buildComprehensivePrompt(processedDiff, mrDetails);
      
      // 执行AI分析
      const response = await this.executeAnalysisWithRetry(analysisPrompt);
      
      // 解析和验证结果
      const analysisResult = this.parseAndValidateResult(response);
      
      // 后处理和增强
      const enhancedResult = await this.enhanceAnalysisResult(analysisResult, processedDiff, mrDetails);
      
      // 缓存结果
      this.cacheResult(cacheKey, enhancedResult);
      
      // 更新统计信息
      const duration = Date.now() - startTime;
      this.updateAnalysisStats(duration, response.usage, true);
      
      this.logger.info(`✅ OpenAI 分析完成 (${duration}ms)`);
      this.logger.info(`📊 分析质量评分: ${enhancedResult.quality_score}/10`);
      
      return enhancedResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateAnalysisStats(duration, null, false);
      
      this.logger.error('❌ OpenAI 分析失败:', error.message);
      
      if (error instanceof OpenAIError) {
        return this.createFailureReport(`OpenAI API 错误: ${error.message}`);
      }
      
      return this.createFailureReport(`分析过程出错: ${error.message}`);
    }
  }

  /**
   * 预处理代码差异
   * 清理、过滤和格式化代码差异数据
   * @private
   */
  preprocessDiff(diff) {
    if (!Array.isArray(diff) || diff.length === 0) {
      return null;
    }

    return diff
      .filter(file => this.isValidFileForAnalysis(file))
      .map(file => this.processFileData(file))
      .filter(file => file.codeContent && file.codeContent.length > ANALYZER_CONSTANTS.MIN_CODE_LENGTH)
      .slice(0, ANALYZER_CONSTANTS.MAX_FILES_PER_BATCH); // 限制文件数量
  }

  /**
   * 检查文件是否适合分析
   * @private
   */
  isValidFileForAnalysis(file) {
    const filePath = file.new_path || file.old_path || '';
    
    // 排除不需要分析的文件类型
    const excludeExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
    const excludePatterns = [
      /node_modules/,
      /\.min\./,
      /\.map$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /\.git/
    ];
    
    // 检查文件扩展名
    const extension = path.extname(filePath).toLowerCase();
    if (excludeExtensions.includes(extension)) {
      return false;
    }
    
    // 检查文件路径模式
    if (excludePatterns.some(pattern => pattern.test(filePath))) {
      return false;
    }
    
    // 检查文件大小
    if (file.diff && file.diff.length > ANALYZER_CONSTANTS.MAX_CODE_LENGTH) {
      this.logger.warn(`⚠️ 文件过大，跳过分析: ${filePath} (${file.diff.length} 字符)`);
      return false;
    }
    
    return true;
  }

  /**
   * 处理单个文件数据
   * @private
   */
  processFileData(file) {
    const filePath = file.new_path || file.old_path || '';
    const language = this.detectLanguage(filePath);
    
    // 提取实际的代码内容
    const codeContent = this.extractCodeContent(file.diff);
    
    return {
      path: filePath,
      language,
      codeContent,
      changeType: this.getChangeType(file),
      linesAdded: this.countLines(file.diff, '+'),
      linesRemoved: this.countLines(file.diff, '-'),
      complexity: this.estimateComplexity(codeContent)
    };
  }

  /**
   * 检测编程语言
   * @private
   */
  detectLanguage(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const languageMap = {
      '.js': 'javascript',
      '.mjs': 'javascript', 
      '.cjs': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.dart': 'dart',
      '.py': 'python',
      '.java': 'java',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.sql': 'sql',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.xml': 'xml',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'shell',
      '.fish': 'shell'
    };
    
    return languageMap[extension] || 'unknown';
  }

  /**
   * 提取代码内容
   * @private
   */
  extractCodeContent(diffText) {
    if (!diffText) return '';
    
    const lines = diffText.split('\n');
    const codeLines = [];
    
    for (const line of lines) {
      // 跳过diff头部信息
      if (line.startsWith('@@') || line.startsWith('+++') || line.startsWith('---')) {
        continue;
      }
      
      // 提取新增和修改的行
      if (line.startsWith('+')) {
        codeLines.push(line.substring(1));
      } else if (!line.startsWith('-')) {
        codeLines.push(line);
      }
    }
    
    return codeLines.join('\n').trim();
  }

  /**
   * 获取变更类型
   * @private
   */
  getChangeType(file) {
    if (file.new_file) return 'added';
    if (file.deleted_file) return 'deleted';
    if (file.renamed_file) return 'renamed';
    return 'modified';
  }

  /**
   * 统计行数
   * @private
   */
  countLines(diffText, prefix) {
    if (!diffText) return 0;
    
    return diffText
      .split('\n')
      .filter(line => line.startsWith(prefix) && !line.startsWith(`${prefix}${prefix}`))
      .length;
  }

  /**
   * 估算代码复杂度
   * @private
   */
  estimateComplexity(code) {
    if (!code) return 'low';
    
    const cyclomaticKeywords = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'catch', 'try',
      '&&', '||', '?', ':', 'forEach', 'map', 'filter', 'reduce'
    ];
    
    let complexity = 1; // 基础复杂度
    
    for (const keyword of cyclomaticKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      complexity += matches ? matches.length : 0;
    }
    
    if (complexity <= 5) return 'low';
    if (complexity <= 10) return 'medium';
    if (complexity <= 20) return 'high';
    return 'very-high';
  }

  /**
   * 构建综合分析提示词
   * 创建结构化的、针对性的分析请求
   * @private
   */
  buildComprehensivePrompt(processedDiff, mrDetails) {
    const systemPrompt = this.getAdvancedSystemPrompt();
    const codeAnalysisPrompt = this.buildCodeAnalysisPrompt(processedDiff);
    const contextPrompt = this.buildContextPrompt(mrDetails);
    const outputFormat = this.getOutputFormatSpecification();
    
    return {
      systemPrompt,
      userPrompt: `${contextPrompt}\n\n${codeAnalysisPrompt}\n\n${outputFormat}`
    };
  }

  /**
   * 获取高级系统提示词
   * @private
   */
  getAdvancedSystemPrompt() {
    const customPrompt = this.reviewPrompts.system_prompt;
    const analysisFocus = this.reviewPrompts.analysis_focus || [];
    
    return `${customPrompt || '你是一个世界级的代码审查专家和软件架构师'}

你拥有以下专业技能：
- 深度代码质量分析和架构设计评估
- 多语言编程规范和最佳实践掌握
- 安全漏洞检测和性能优化经验
- 大型项目重构和可维护性设计
- 现代开发工具链和DevOps实践

分析重点：
${analysisFocus.map(focus => `- ${focus}`).join('\n')}

请以专业、客观、建设性的态度进行代码审查，提供具体可行的改进建议。`;
  }

  /**
   * 构建代码分析提示词
   * @private
   */
  buildCodeAnalysisPrompt(processedDiff) {
    let prompt = `# 代码变更分析\n\n`;
    
    prompt += `## 变更概览\n`;
    prompt += `- 总文件数: ${processedDiff.length}\n`;
    prompt += `- 涉及语言: ${[...new Set(processedDiff.map(f => f.language))].join(', ')}\n`;
    prompt += `- 变更类型: ${[...new Set(processedDiff.map(f => f.changeType))].join(', ')}\n\n`;
    
    prompt += `## 详细文件分析\n\n`;
    
    processedDiff.forEach((file, index) => {
      prompt += `### 文件 ${index + 1}: ${file.path}\n`;
      prompt += `- **语言**: ${file.language}\n`;
      prompt += `- **变更类型**: ${file.changeType}\n`;
      prompt += `- **新增行数**: ${file.linesAdded}\n`;
      prompt += `- **删除行数**: ${file.linesRemoved}\n`;
      prompt += `- **复杂度**: ${file.complexity}\n\n`;
      
      if (file.codeContent) {
        prompt += `**代码内容**:\n\`\`\`${file.language}\n${file.codeContent}\n\`\`\`\n\n`;
      }
      
      prompt += `---\n\n`;
    });
    
    return prompt;
  }

  /**
   * 构建上下文提示词
   * @private
   */
  buildContextPrompt(mrDetails) {
    return `# Merge Request 上下文信息

**标题**: ${mrDetails.title}
**描述**: ${mrDetails.description || '无描述'}
**作者**: ${mrDetails.author?.name || '未知'}
**源分支**: ${mrDetails.source_branch}
**目标分支**: ${mrDetails.target_branch}
**状态**: ${mrDetails.state}
**创建时间**: ${mrDetails.created_at}
**更新时间**: ${mrDetails.updated_at}`;
  }

  /**
   * 获取输出格式规范
   * @private
   */
  getOutputFormatSpecification() {
    return `# 分析输出要求

请按照以下 JSON 格式提供分析结果：

\`\`\`json
{
  "quality_score": <1-10的质量评分>,
  "potential_issues": [
    "具体问题描述1",
    "具体问题描述2"
  ],
  "security_concerns": [
    "安全问题1",
    "安全问题2"
  ],
  "performance_impact": "性能影响的详细分析",
  "maintainability": "可维护性评估",
  "testing_suggestions": [
    "测试建议1",
    "测试建议2"
  ],
  "improvement_suggestions": [
    "具体改进建议1",
    "具体改进建议2"
  ],
  "summary": "整体分析总结",
  "language_specific_insights": {
    "语言名": "针对特定语言的见解"
  },
  "architecture_feedback": "架构设计反馈",
  "code_complexity_analysis": "代码复杂度分析",
  "best_practices_adherence": "最佳实践遵循程度评估"
}
\`\`\`

要求：
1. quality_score 必须是 1-10 的整数
2. 所有数组字段提供具体、可操作的建议
3. 文本字段提供详细、专业的分析
4. 针对不同编程语言提供专门的建议
5. 考虑项目的整体架构和设计模式`;
  }

  /**
   * 执行带重试的分析
   * 实现智能重试机制和错误恢复
   * @private
   */
  async executeAnalysisWithRetry(prompt) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= ANALYZER_CONSTANTS.MAX_RETRIES; attempt++) {
      try {
        this.logger.info(`🔄 执行分析请求 (尝试 ${attempt}/${ANALYZER_CONSTANTS.MAX_RETRIES})`);
        
        const response = await this.openai.chat.completions.create({
          model: this.aiConfig.model || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: prompt.systemPrompt
            },
            {
              role: 'user',
              content: prompt.userPrompt
            }
          ],
          max_tokens: Math.min(
            this.aiConfig.max_tokens || ANALYZER_CONSTANTS.MAX_TOKENS_PER_REQUEST,
            ANALYZER_CONSTANTS.MAX_TOKENS_PER_REQUEST
          ),
          temperature: this.aiConfig.temperature || 0.1,
          response_format: { type: "json_object" },
          stream: false
        });

        if (!response.choices || response.choices.length === 0) {
          throw new OpenAIError('API返回空响应');
        }

        return response;

      } catch (error) {
        lastError = error;
        
        this.logger.warn(`⚠️ 分析请求失败 (尝试 ${attempt}/${ANALYZER_CONSTANTS.MAX_RETRIES}): ${error.message}`);
        
        // 检查是否应该重试
        if (!this.shouldRetry(error, attempt)) {
          break;
        }
        
        // 等待后重试
        if (attempt < ANALYZER_CONSTANTS.MAX_RETRIES) {
          const delay = ANALYZER_CONSTANTS.RETRY_DELAY_MS * Math.pow(2, attempt - 1); // 指数退避
          this.logger.info(`⏳ 等待 ${delay}ms 后重试...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new OpenAIError(`所有重试均失败: ${lastError.message}`, lastError.code, lastError.status);
  }

  /**
   * 判断是否应该重试
   * @private
   */
  shouldRetry(error, attempt) {
    // 达到最大重试次数
    if (attempt >= ANALYZER_CONSTANTS.MAX_RETRIES) {
      return false;
    }
    
    // 客户端错误通常不需要重试
    if (error.status && error.status >= 400 && error.status < 500) {
      // 除了429 (Rate Limit) 和 408 (Timeout)
      return error.status === 429 || error.status === 408;
    }
    
    // 服务器错误和网络错误可以重试
    return true;
  }

  /**
   * 解析和验证分析结果
   * @private
   */
  parseAndValidateResult(response) {
    try {
      const content = response.choices[0].message.content;
      const result = JSON.parse(content);
      
      // 验证必需字段
      const requiredFields = [
        'quality_score', 'potential_issues', 'security_concerns',
        'performance_impact', 'maintainability', 'testing_suggestions',
        'improvement_suggestions', 'summary'
      ];
      
      for (const field of requiredFields) {
        if (!(field in result)) {
          this.logger.warn(`⚠️ 分析结果缺少字段: ${field}`);
          result[field] = this.getDefaultValue(field);
        }
      }
      
      // 验证质量评分
      if (typeof result.quality_score !== 'number' || 
          result.quality_score < 1 || 
          result.quality_score > 10) {
        this.logger.warn('⚠️ 质量评分无效，使用默认值');
        result.quality_score = 5;
      }
      
      // 确保数组字段是数组
      const arrayFields = ['potential_issues', 'security_concerns', 'testing_suggestions', 'improvement_suggestions'];
      for (const field of arrayFields) {
        if (!Array.isArray(result[field])) {
          result[field] = [];
        }
      }
      
      return result;
      
    } catch (parseError) {
      this.logger.error('❌ 解析AI响应失败:', parseError.message);
      
      // 尝试从原始响应中提取信息
      const fallbackResult = this.extractFallbackResult(response.choices[0].message.content);
      return fallbackResult;
    }
  }

  /**
   * 获取字段默认值
   * @private
   */
  getDefaultValue(field) {
    const defaults = {
      quality_score: 5,
      potential_issues: [],
      security_concerns: [],
      performance_impact: '无法评估性能影响',
      maintainability: '无法评估可维护性',
      testing_suggestions: ['建议添加单元测试'],
      improvement_suggestions: ['建议进行人工代码审查'],
      summary: 'AI分析结果解析失败，建议进行人工审查'
    };
    
    return defaults[field] || '';
  }

  /**
   * 提取备用分析结果
   * @private
   */
  extractFallbackResult(content) {
    return {
      quality_score: 5,
      potential_issues: ['AI分析结果格式异常'],
      security_concerns: [],
      performance_impact: '需要人工评估',
      maintainability: '需要人工评估',
      testing_suggestions: ['建议添加测试'],
      improvement_suggestions: ['建议进行人工审查'],
      summary: content ? content.substring(0, 500) + '...' : 'AI分析失败',
      raw_response: content
    };
  }

  /**
   * 增强分析结果
   * 添加额外的分析维度和见解
   * @private
   */
  async enhanceAnalysisResult(result, processedDiff, mrDetails) {
    try {
      // 添加统计信息
      result.statistics = this.calculateStatistics(processedDiff);
      
      // 添加语言特定见解
      result.language_insights = this.generateLanguageInsights(processedDiff);
      
      // 添加复杂度分析
      result.complexity_analysis = this.analyzeComplexity(processedDiff);
      
      // 添加变更模式分析
      result.change_patterns = this.analyzeChangePatterns(processedDiff, mrDetails);
      
      // 添加风险评估
      result.risk_assessment = this.assessRisk(result, processedDiff);
      
      // 生成优先级建议
      result.prioritized_recommendations = this.prioritizeRecommendations(result);
      
      return result;
      
    } catch (error) {
      this.logger.warn('⚠️ 结果增强失败:', error.message);
      return result;
    }
  }

  /**
   * 计算代码统计信息
   * @private
   */
  calculateStatistics(processedDiff) {
    const stats = {
      total_files: processedDiff.length,
      total_lines_added: 0,
      total_lines_removed: 0,
      languages: {},
      change_types: {},
      complexity_distribution: { low: 0, medium: 0, high: 0, 'very-high': 0 }
    };
    
    processedDiff.forEach(file => {
      stats.total_lines_added += file.linesAdded;
      stats.total_lines_removed += file.linesRemoved;
      
      // 语言统计
      stats.languages[file.language] = (stats.languages[file.language] || 0) + 1;
      
      // 变更类型统计
      stats.change_types[file.changeType] = (stats.change_types[file.changeType] || 0) + 1;
      
      // 复杂度分布
      stats.complexity_distribution[file.complexity]++;
    });
    
    return stats;
  }

  /**
   * 生成语言特定见解
   * @private
   */
  generateLanguageInsights(processedDiff) {
    const insights = {};
    
    const languageGroups = processedDiff.reduce((groups, file) => {
      if (!groups[file.language]) {
        groups[file.language] = [];
      }
      groups[file.language].push(file);
      return groups;
    }, {});
    
    for (const [language, files] of Object.entries(languageGroups)) {
      insights[language] = this.generateLanguageSpecificInsight(language, files);
    }
    
    return insights;
  }

  /**
   * 生成特定语言的见解
   * @private
   */
  generateLanguageSpecificInsight(language, files) {
    const insight = {
      file_count: files.length,
      total_changes: files.reduce((sum, file) => sum + file.linesAdded + file.linesRemoved, 0),
      recommendations: []
    };
    
    // 语言特定的建议
    switch (language) {
      case 'dart':
      case 'flutter':
        insight.recommendations = [
          '检查Widget的const使用情况',
          '验证dispose方法的正确实现',
          '考虑使用StateManagement解决方案',
          '检查空安全(null safety)的使用'
        ];
        break;
      
      case 'javascript':
      case 'typescript':
        insight.recommendations = [
          '检查异步操作的错误处理',
          '验证TypeScript类型定义',
          '考虑使用现代ES6+语法',
          '检查内存泄漏和闭包使用'
        ];
        break;
      
      case 'python':
        insight.recommendations = [
          '检查PEP 8代码风格遵循',
          '验证异常处理的完整性',
          '考虑使用类型提示',
          '检查资源管理和上下文管理器'
        ];
        break;
      
      default:
        insight.recommendations = [
          '遵循语言特定的最佳实践',
          '确保代码风格一致性',
          '添加适当的错误处理',
          '考虑性能优化机会'
        ];
    }
    
    return insight;
  }

  /**
   * 分析代码复杂度
   * @private
   */
  analyzeComplexity(processedDiff) {
    const totalFiles = processedDiff.length;
    const complexityDistribution = processedDiff.reduce((dist, file) => {
      dist[file.complexity] = (dist[file.complexity] || 0) + 1;
      return dist;
    }, {});
    
    const highComplexityFiles = processedDiff.filter(
      file => file.complexity === 'high' || file.complexity === 'very-high'
    );
    
    return {
      overall_complexity: this.calculateOverallComplexity(complexityDistribution, totalFiles),
      distribution: complexityDistribution,
      high_complexity_files: highComplexityFiles.map(file => ({
        path: file.path,
        complexity: file.complexity,
        lines_changed: file.linesAdded + file.linesRemoved
      })),
      recommendations: this.getComplexityRecommendations(complexityDistribution, totalFiles)
    };
  }

  /**
   * 计算总体复杂度
   * @private
   */
  calculateOverallComplexity(distribution, totalFiles) {
    const weights = { 'low': 1, 'medium': 2, 'high': 3, 'very-high': 4 };
    let weightedSum = 0;
    
    for (const [complexity, count] of Object.entries(distribution)) {
      weightedSum += (weights[complexity] || 1) * count;
    }
    
    const average = weightedSum / totalFiles;
    
    if (average <= 1.5) return 'low';
    if (average <= 2.5) return 'medium';
    if (average <= 3.5) return 'high';
    return 'very-high';
  }

  /**
   * 获取复杂度建议
   * @private
   */
  getComplexityRecommendations(distribution, totalFiles) {
    const recommendations = [];
    const highComplexityRatio = ((distribution.high || 0) + (distribution['very-high'] || 0)) / totalFiles;
    
    if (highComplexityRatio > 0.3) {
      recommendations.push('建议重构高复杂度的代码文件');
      recommendations.push('考虑将复杂函数拆分为更小的函数');
    }
    
    if (distribution['very-high'] > 0) {
      recommendations.push('存在极高复杂度代码，强烈建议立即重构');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('代码复杂度在可接受范围内');
    }
    
    return recommendations;
  }

  /**
   * 分析变更模式
   * @private
   */
  analyzeChangePatterns(processedDiff, mrDetails) {
    const patterns = {
      change_size: this.categorizeChangeSize(processedDiff),
      file_types: this.analyzeFileTypes(processedDiff),
      change_distribution: this.analyzeChangeDistribution(processedDiff),
      commit_pattern: this.analyzeCommitPattern(mrDetails),
      recommendations: []
    };
    
    // 基于模式生成建议
    if (patterns.change_size === 'large') {
      patterns.recommendations.push('这是一个大型变更，建议拆分为多个小的MR');
    }
    
    if (patterns.change_distribution.uneven) {
      patterns.recommendations.push('变更分布不均，建议检查是否有遗漏的测试或文档');
    }
    
    return patterns;
  }

  /**
   * 分类变更大小
   * @private
   */
  categorizeChangeSize(processedDiff) {
    const totalChanges = processedDiff.reduce(
      (sum, file) => sum + file.linesAdded + file.linesRemoved, 0
    );
    
    if (totalChanges < 50) return 'small';
    if (totalChanges < 200) return 'medium';
    if (totalChanges < 500) return 'large';
    return 'very-large';
  }

  /**
   * 分析文件类型
   * @private
   */
  analyzeFileTypes(processedDiff) {
    const types = processedDiff.reduce((acc, file) => {
      const category = this.categorizeFileType(file.path);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    return types;
  }

  /**
   * 分类文件类型
   * @private
   */
  categorizeFileType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    
    if (['.test.js', '.spec.js', '.test.ts', '.spec.ts', '_test.dart'].some(suffix => filePath.includes(suffix))) {
      return 'test';
    }
    
    if (['.md', '.txt', '.rst'].includes(extension)) {
      return 'documentation';
    }
    
    if (['.json', '.yaml', '.yml', '.xml', '.toml'].includes(extension)) {
      return 'configuration';
    }
    
    if (['.js', '.ts', '.dart', '.py', '.java', '.go', '.rs'].includes(extension)) {
      return 'source';
    }
    
    if (['.css', '.scss', '.sass', '.less'].includes(extension)) {
      return 'style';
    }
    
    return 'other';
  }

  /**
   * 分析变更分布
   * @private
   */
  analyzeChangeDistribution(processedDiff) {
    const changes = processedDiff.map(file => file.linesAdded + file.linesRemoved);
    const total = changes.reduce((sum, change) => sum + change, 0);
    const average = total / changes.length;
    
    // 检查是否存在不均匀分布
    const largeChanges = changes.filter(change => change > average * 3);
    const uneven = largeChanges.length > 0 && largeChanges.length < changes.length * 0.3;
    
    return {
      average_changes_per_file: Math.round(average),
      largest_change: Math.max(...changes),
      smallest_change: Math.min(...changes),
      uneven
    };
  }

  /**
   * 分析提交模式
   * @private
   */
  analyzeCommitPattern(mrDetails) {
    const title = mrDetails.title || '';
    const description = mrDetails.description || '';
    
    return {
      has_conventional_commit: this.hasConventionalCommitFormat(title),
      has_description: description.length > 0,
      estimated_effort: this.estimateEffort(title, description),
      type: this.inferChangeType(title, description)
    };
  }

  /**
   * 检查是否使用约定式提交格式
   * @private
   */
  hasConventionalCommitFormat(title) {
    const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?\s*:\s*.+/;
    return conventionalPattern.test(title);
  }

  /**
   * 估算工作量
   * @private
   */
  estimateEffort(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const complexityKeywords = ['refactor', 'architecture', 'migration', 'major', 'breaking'];
    const simpleKeywords = ['fix', 'typo', 'update', 'minor', 'small'];
    
    if (complexityKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }
    
    if (simpleKeywords.some(keyword => text.includes(keyword))) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * 推断变更类型
   * @private
   */
  inferChangeType(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('feat') || text.includes('feature') || text.includes('add')) {
      return 'feature';
    }
    
    if (text.includes('fix') || text.includes('bug') || text.includes('issue')) {
      return 'bugfix';
    }
    
    if (text.includes('refactor') || text.includes('improve') || text.includes('optimize')) {
      return 'refactor';
    }
    
    if (text.includes('test') || text.includes('spec')) {
      return 'test';
    }
    
    if (text.includes('doc') || text.includes('readme')) {
      return 'documentation';
    }
    
    return 'other';
  }

  /**
   * 评估风险
   * @private
   */
  assessRisk(result, processedDiff) {
    let riskScore = 0;
    const riskFactors = [];
    
    // 质量评分风险
    if (result.quality_score < 5) {
      riskScore += 3;
      riskFactors.push('代码质量评分较低');
    }
    
    // 安全问题风险
    if (result.security_concerns && result.security_concerns.length > 0) {
      riskScore += 2;
      riskFactors.push('存在安全隐患');
    }
    
    // 复杂度风险
    const highComplexityFiles = processedDiff.filter(
      file => file.complexity === 'high' || file.complexity === 'very-high'
    );
    if (highComplexityFiles.length > 0) {
      riskScore += 1;
      riskFactors.push('存在高复杂度代码');
    }
    
    // 变更规模风险
    const totalChanges = processedDiff.reduce(
      (sum, file) => sum + file.linesAdded + file.linesRemoved, 0
    );
    if (totalChanges > 500) {
      riskScore += 1;
      riskFactors.push('变更规模较大');
    }
    
    return {
      score: Math.min(riskScore, 5), // 最高5分
      level: this.categorizeRiskLevel(riskScore),
      factors: riskFactors,
      mitigation_suggestions: this.getRiskMitigationSuggestions(riskFactors)
    };
  }

  /**
   * 分类风险等级
   * @private
   */
  categorizeRiskLevel(score) {
    if (score === 0) return 'very-low';
    if (score === 1) return 'low';
    if (score === 2) return 'medium';
    if (score <= 3) return 'high';
    return 'very-high';
  }

  /**
   * 获取风险缓解建议
   * @private
   */
  getRiskMitigationSuggestions(riskFactors) {
    const suggestions = [];
    
    if (riskFactors.includes('代码质量评分较低')) {
      suggestions.push('进行更彻底的代码审查');
      suggestions.push('添加或改进单元测试');
    }
    
    if (riskFactors.includes('存在安全隐患')) {
      suggestions.push('进行安全审查');
      suggestions.push('运行安全扫描工具');
    }
    
    if (riskFactors.includes('存在高复杂度代码')) {
      suggestions.push('重构复杂函数');
      suggestions.push('增加代码注释');
    }
    
    if (riskFactors.includes('变更规模较大')) {
      suggestions.push('分阶段部署');
      suggestions.push('增加测试覆盖率');
    }
    
    return suggestions;
  }

  /**
   * 优先级排序建议
   * @private
   */
  prioritizeRecommendations(result) {
    const recommendations = [];
    
    // 高优先级：安全问题
    if (result.security_concerns && result.security_concerns.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'security',
        items: result.security_concerns
      });
    }
    
    // 高优先级：严重问题
    if (result.potential_issues && result.potential_issues.length > 0) {
      const criticalIssues = result.potential_issues.filter(issue => 
        issue.toLowerCase().includes('error') || 
        issue.toLowerCase().includes('crash') ||
        issue.toLowerCase().includes('leak')
      );
      
      if (criticalIssues.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'bugs',
          items: criticalIssues
        });
      }
    }
    
    // 中优先级：性能问题
    if (result.performance_impact && 
        result.performance_impact !== '无法评估性能影响' &&
        result.performance_impact.toLowerCase().includes('问题')) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        items: [result.performance_impact]
      });
    }
    
    // 低优先级：改进建议
    if (result.improvement_suggestions && result.improvement_suggestions.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'improvements',
        items: result.improvement_suggestions
      });
    }
    
    return recommendations;
  }

  /**
   * 生成缓存键
   * @private
   */
  generateCacheKey(processedDiff, mrDetails) {
    const contentHash = createHash('md5')
      .update(JSON.stringify(processedDiff))
      .update(mrDetails.title || '')
      .update(mrDetails.updated_at || '')
      .digest('hex');
    
    return `analysis_${contentHash}`;
  }

  /**
   * 获取缓存结果
   * @private
   */
  getCachedResult(cacheKey) {
    if (this.resultCache.has(cacheKey)) {
      const cached = this.resultCache.get(cacheKey);
      
      // 检查缓存是否过期（24小时）
      const now = Date.now();
      if (now - cached.timestamp < 24 * 60 * 60 * 1000) {
        return cached.result;
      }
      
      // 删除过期缓存
      this.resultCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * 缓存结果
   * @private
   */
  cacheResult(cacheKey, result) {
    // 限制缓存大小
    if (this.resultCache.size >= this.maxCacheSize) {
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }
    
    this.resultCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * 创建失败报告
   * @private
   */
  createFailureReport(message) {
    return {
      quality_score: null,
      potential_issues: [`AI分析失败: ${message}`],
      security_concerns: [],
      performance_impact: '无法进行AI性能分析',
      maintainability: '无法进行AI可维护性分析',
      testing_suggestions: ['建议进行人工代码审查'],
      improvement_suggestions: ['建议检查AI服务配置'],
      summary: `OpenAI分析不可用: ${message}`,
      analysis_status: 'failed',
      failure_reason: message
    };
  }

  /**
   * 更新分析统计
   * @private
   */
  updateAnalysisStats(duration, usage, success) {
    if (success) {
      this.analysisStats.successfulRequests++;
      
      // 更新平均响应时间
      const total = this.analysisStats.successfulRequests;
      this.analysisStats.averageResponseTime = 
        (this.analysisStats.averageResponseTime * (total - 1) + duration) / total;
    } else {
      this.analysisStats.failedRequests++;
    }
    
    // 更新token使用统计
    if (usage) {
      this.analysisStats.totalTokensUsed += usage.total_tokens || 0;
      
      // 估算成本（基于GPT-4o定价）
      const inputCost = (usage.prompt_tokens || 0) * 0.005 / 1000;
      const outputCost = (usage.completion_tokens || 0) * 0.015 / 1000;
      this.analysisStats.totalCost += inputCost + outputCost;
    }
  }

  /**
   * 休眠函数
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取分析统计信息
   * 
   * @returns {Object} 统计信息对象
   */
  getAnalysisStats() {
    return {
      ...this.analysisStats,
      cache_size: this.resultCache.size,
      success_rate: this.analysisStats.totalRequests > 0 ? 
        (this.analysisStats.successfulRequests / this.analysisStats.totalRequests * 100).toFixed(2) + '%' : '0%',
      estimated_cost: `$${this.analysisStats.totalCost.toFixed(4)}`
    };
  }

  /**
   * 清理资源
   * 清除缓存和重置统计信息
   */
  cleanup() {
    this.resultCache.clear();
    this.analysisStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageResponseTime: 0,
      cacheHits: 0
    };
    
    this.logger.info('🧹 OpenAI分析器资源已清理');
  }

  /**
   * 保存分析结果到文件
   * 将分析结果保存为JSON格式用于后续分析
   * 
   * @param {Object} result - 分析结果
   * @param {string} outputDir - 输出目录
   * @returns {Promise<string>} 保存的文件路径
   */
  async saveAnalysisResult(result, outputDir = './reports') {
    try {
      // 确保输出目录存在
      await fs.mkdir(outputDir, { recursive: true });
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `openai_analysis_${timestamp}.json`;
      const filepath = path.join(outputDir, filename);
      
      // 保存结果
      await fs.writeFile(filepath, JSON.stringify(result, null, 2), 'utf8');
      
      this.logger.info(`📄 分析结果已保存: ${filepath}`);
      return filepath;
      
    } catch (error) {
      this.logger.error('❌ 保存分析结果失败:', error.message);
      throw error;
    }
  }
}

// 导出类和常量
export { OpenAIAnalyzer, OpenAIError, ANALYZER_CONSTANTS };

// 如果作为脚本直接运行，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  async function testOpenAIAnalyzer() {
    try {
      console.log('🧪 OpenAI分析器测试\n');
      
      // 模拟配置
      const testConfig = {
        ai_config: {
          openai: {
            api_key: process.env.OPENAI_API_KEY,
            model: 'gpt-4o',
            max_tokens: 2000,
            temperature: 0.1
          }
        }
      };
      
      // 创建分析器实例
      const analyzer = new OpenAIAnalyzer(testConfig);
      
      // 测试连接
      console.log('🔍 测试API连接...');
      const isConnected = await analyzer.testConnection();
      console.log(`连接状态: ${isConnected ? '✅ 成功' : '❌ 失败'}\n`);
      
      if (!isConnected) {
        console.log('💡 请检查OPENAI_API_KEY环境变量是否正确设置');
        return;
      }
      
      // 模拟代码差异
      const mockDiff = [
        {
          new_path: 'test.js',
          diff: `+function testFunction() {
+  console.log('Hello World');
+  if (true) {
+    return 'test';
+  }
+}`
        }
      ];
      
      const mockMRDetails = {
        title: '测试功能添加',
        description: '添加测试函数',
        author: { name: 'Test User' },
        source_branch: 'feature/test',
        target_branch: 'main',
        state: 'opened',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // 执行分析
      console.log('🤖 执行代码分析...');
      const result = await analyzer.analyzeCodeChanges(mockDiff, mockMRDetails);
      
      if (result) {
        console.log('✅ 分析完成\n');
        console.log('📊 分析结果:');
        console.log(`- 质量评分: ${result.quality_score}/10`);
        console.log(`- 潜在问题: ${result.potential_issues?.length || 0} 个`);
        console.log(`- 安全问题: ${result.security_concerns?.length || 0} 个`);
        console.log(`- 改进建议: ${result.improvement_suggestions?.length || 0} 个`);
        
        if (result.summary) {
          console.log(`\n📝 总结: ${result.summary.substring(0, 200)}...`);
        }
      } else {
        console.log('❌ 分析失败');
      }
      
      // 显示统计信息
      console.log('\n📈 统计信息:');
      const stats = analyzer.getAnalysisStats();
      console.log(`- 总请求数: ${stats.totalRequests}`);
      console.log(`- 成功率: ${stats.success_rate}`);
      console.log(`- 平均响应时间: ${stats.averageResponseTime.toFixed(0)}ms`);
      console.log(`- Token使用: ${stats.totalTokensUsed}`);
      console.log(`- 估算成本: ${stats.estimated_cost}`);
      
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    }
  }
  
  testOpenAIAnalyzer();
}
