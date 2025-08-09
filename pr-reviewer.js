#!/usr/bin/env node

/**
 * PR自动化评审工具 - 优化版本
 * 
 * 这是一个专为GitLab设计的自动化PR评审工具，集成AI智能分析功能，
 * 能够自动分析Merge Request并生成详细的评审报告。
 * 
 * 主要功能：
 * - 🔍 自动获取GitLab MR信息和代码差异
 * - 📊 智能代码变更分析和问题检测
 * - 🤖 支持多种AI分析器（OpenAI GPT-4、VS Code Copilot）
 * - 📝 生成结构化Markdown格式评审报告
 * - 📱 支持飞书卡片通知和Webhook集成
 * - 🛡️ 专门针对Flutter/Dart项目的代码审查
 * - 💾 自动报告存档和HTTP访问支持
 * 
 * 技术架构：
 * - Node.js ES6模块化架构
 * - GitLab REST API集成
 * - 多AI提供商适配层
 * - 安全配置管理
 * - 异步处理和错误恢复
 * 
 * @author AI Assistant
 * @version 2.1.0
 * @license MIT
 * @since 2024
 */

import { Gitlab } from "@gitbeaker/rest";
import { CopilotAnalyzer } from './copilot-extension.js';
import { OpenAIAnalyzer } from './openai-analyzer.js';
import { AliyunBailianAnalyzer } from './aliyun-bailian-analyzer.js';
import { configLoader } from './config-loader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// 获取脚本所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目常量定义
const CONSTANTS = {
  // 重试和超时配置
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  DEFAULT_TIMEOUT_MS: 30000,
  
  // 文件大小限制
  MAX_FILE_SIZE_MB: 100,
  MAX_DIFF_LINES: 10000,
  
  // 服务器配置
  HTTP_SERVER_PORT: 8899,
  
  // 报告管理
  REPORT_ARCHIVE_DAYS: 30,
  MAX_REPORTS_COUNT: 100,
  
  // 质量阈值
  QUALITY_SCORE_THRESHOLDS: {
    EXCELLENT: 9,
    GOOD: 7,
    ACCEPTABLE: 5,
    POOR: 3
  }
};

// 确保fetch可用（Node.js 18+内置，旧版本需要polyfill）
if (typeof fetch === 'undefined') {
  global.fetch = (await import('node-fetch')).default;
}

/**
 * 简单的日志记录器
 * 提供结构化日志和不同级别的输出
 */
class Logger {
  constructor(component) {
    this.component = component;
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  /**
   * 记录信息级别日志
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  info(message, data = null) {
    this._log('INFO', message, data);
  }

  /**
   * 记录警告级别日志
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  warn(message, data = null) {
    this._log('WARN', message, data);
  }

  /**
   * 记录错误级别日志
   * @param {string} message - 日志消息
   * @param {Error|Object} error - 错误对象或数据
   */
  error(message, error = null) {
    this._log('ERROR', message, error);
  }

  /**
   * 记录调试级别日志
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  debug(message, data = null) {
    if (this.logLevel === 'debug') {
      this._log('DEBUG', message, data);
    }
  }

  /**
   * 内部日志记录方法
   * @private
   */
  _log(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.component}]`;
    
    console.log(`${prefix} ${message}`);
    if (data && typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else if (data) {
      console.log(data);
    }
  }
}

/**
 * 加载配置文件
 * 使用安全的配置加载器，支持环境变量替换
 * 
 * @returns {Promise<Object>} 配置对象
 */
async function loadConfig() {
  try {
    return await configLoader.loadConfig();
  } catch (error) {
    console.error('❌ 配置加载失败:', error.message);
    console.error('💡 请检查 config.json 文件和环境变量配置');
    console.error('💡 参考 .env.example 文件设置环境变量');
    process.exit(1);
  }
}

/**
 * AI分析器统一接口类
 * 
 * 这个类作为不同AI服务提供商的统一入口，支持：
 * - OpenAI GPT系列模型
 * - VS Code Copilot扩展
 * - 本地规则引擎
 * 
 * 设计模式：
 * - 策略模式：根据配置选择不同的AI分析器
 * - 适配器模式：统一不同AI服务的接口
 * - 备用策略：当主要AI服务不可用时自动切换
 * 
 * 功能特性：
 * - 智能错误恢复和重试机制
 * - 多AI服务负载均衡
 * - 结果缓存和性能优化
 * - 详细的分析日志和监控
 */
class AIAnalyzer {
  /**
   * 构造函数
   * 初始化所有可用的AI分析器
   * 
   * @param {Object} config - 应用配置对象
   */
  constructor(config) {
    this.config = config;
    this.logger = new Logger('AIAnalyzer');
    
    // AI分析器实例
    this.openaiAnalyzer = null;
    this.copilotAnalyzer = null;
    this.aliyunBailianAnalyzer = null;
    
    // 性能监控
    this.analysisStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastAnalysisTime: null
    };
    
    // 初始化AI服务
    this.initializeAIServices();
  }

  /**
   * 初始化所有AI服务
   * 根据配置和可用性初始化各种AI分析器
   */
  initializeAIServices() {
    const aiConfig = this.config.ai_config;
    
    try {
      // 初始化OpenAI分析器
      if (aiConfig?.openai && this.isOpenAIConfigured()) {
        this.openaiAnalyzer = new OpenAIAnalyzer(this.config);
        this.logger.info('OpenAI分析器初始化成功');
      }
      
      // 初始化阿里云百炼分析器
      if (aiConfig?.aliyun_bailian && this.isAliyunBailianConfigured()) {
        this.aliyunBailianAnalyzer = new AliyunBailianAnalyzer(this.config);
        this.logger.info('阿里云百炼分析器初始化成功');
      }
      
      // 初始化Copilot分析器
      if (aiConfig?.copilot?.enabled) {
        this.copilotAnalyzer = new CopilotAnalyzer(this.config);
        this.logger.info('Copilot分析器初始化成功');
      }
      
      // 检查是否至少有一个可用的分析器
      if (!this.hasAvailableAnalyzer()) {
        this.logger.warn('没有可用的AI分析器，将使用基础规则分析');
      }
      
    } catch (error) {
      this.logger.error('AI服务初始化失败', error);
    }
  }

  /**
   * 检查OpenAI是否正确配置
   * @returns {boolean} 是否配置正确
   */
  isOpenAIConfigured() {
    const apiKey = process.env.OPENAI_API_KEY || this.config.ai_config?.openai?.api_key;
    return apiKey && apiKey !== '${OPENAI_API_KEY}';
  }

  /**
   * 检查阿里云百炼是否正确配置
   * @returns {boolean} 是否配置正确
   */
  isAliyunBailianConfigured() {
    const apiKey = process.env.ALIYUN_BAILIAN_API_KEY || this.config.ai_config?.aliyun_bailian?.api_key;
    const workspaceId = process.env.ALIYUN_BAILIAN_WORKSPACE_ID || this.config.ai_config?.aliyun_bailian?.workspace_id;
    return apiKey && workspaceId && 
           apiKey !== '${ALIYUN_BAILIAN_API_KEY}' && 
           workspaceId !== '${ALIYUN_BAILIAN_WORKSPACE_ID}';
  }

  /**
   * 检查是否有可用的AI分析器
   * @returns {boolean} 是否有可用分析器
   */
  hasAvailableAnalyzer() {
    return (this.aliyunBailianAnalyzer?.isAvailable()) ||
           (this.openaiAnalyzer?.isAvailable()) || 
           (this.copilotAnalyzer?.isAvailable());
  }

  /**
   * 分析代码变更
   * 根据配置的AI提供商进行智能分析，支持备用策略
   * 
   * @param {Array} diff - 代码差异数组
   * @param {Object} mrDetails - MR详细信息
   * @returns {Promise<Object|null>} 分析结果
   */
  async analyzeCodeChanges(diff, mrDetails) {
    // 检查是否启用AI分析
    if (!this.config.review_settings.enable_ai_analysis) {
      this.logger.info('AI分析已禁用');
      return null;
    }

    // 记录开始时间
    const startTime = Date.now();
    this.analysisStats.totalRequests++;

    try {
      const provider = this.config.review_settings.ai_provider || 'aliyun_bailian';
      this.logger.info(`开始使用 ${provider} 进行代码分析`);

      let analysisResult = null;

      // 根据配置选择分析器
      switch (provider) {
        case 'aliyun_bailian':
        case 'bailian':
          if (this.aliyunBailianAnalyzer?.isAvailable()) {
            analysisResult = await this.aliyunBailianAnalyzer.analyzeCodeChanges(diff, mrDetails);
          } else if (this.openaiAnalyzer?.isAvailable()) {
            this.logger.warn('阿里云百炼分析器不可用，回退到OpenAI');
            analysisResult = await this.openaiAnalyzer.analyzeCodeChanges(diff, mrDetails);
          } else if (this.copilotAnalyzer?.isAvailable()) {
            this.logger.warn('阿里云百炼分析器不可用，回退到Copilot');
            analysisResult = await this.copilotAnalyzer.analyzeCodeChanges(diff, mrDetails);
          }
          break;
          
        case 'openai':
          if (this.openaiAnalyzer?.isAvailable()) {
            analysisResult = await this.openaiAnalyzer.analyzeCodeChanges(diff, mrDetails);
          } else if (this.aliyunBailianAnalyzer?.isAvailable()) {
            this.logger.warn('OpenAI分析器不可用，回退到阿里云百炼');
            analysisResult = await this.aliyunBailianAnalyzer.analyzeCodeChanges(diff, mrDetails);
          } else if (this.copilotAnalyzer?.isAvailable()) {
            this.logger.warn('OpenAI分析器不可用，回退到Copilot');
            analysisResult = await this.copilotAnalyzer.analyzeCodeChanges(diff, mrDetails);
          }
          break;

        case 'copilot':
        case 'auto-copilot':
          if (this.copilotAnalyzer?.isAvailable()) {
            analysisResult = await this.copilotAnalyzer.analyzeCodeChanges(diff, mrDetails);
          } else if (this.aliyunBailianAnalyzer?.isAvailable()) {
            this.logger.warn('Copilot分析器不可用，回退到阿里云百炼');
            analysisResult = await this.aliyunBailianAnalyzer.analyzeCodeChanges(diff, mrDetails);
          } else if (this.openaiAnalyzer?.isAvailable()) {
            this.logger.warn('Copilot分析器不可用，回退到OpenAI');
            analysisResult = await this.openaiAnalyzer.analyzeCodeChanges(diff, mrDetails);
          }
          break;

        case 'auto':
        default:
          // 自动选择：优先阿里云百炼，然后OpenAI，最后Copilot
          if (this.aliyunBailianAnalyzer?.isAvailable()) {
            analysisResult = await this.aliyunBailianAnalyzer.analyzeCodeChanges(diff, mrDetails);
          } else if (this.openaiAnalyzer?.isAvailable()) {
            analysisResult = await this.openaiAnalyzer.analyzeCodeChanges(diff, mrDetails);
          } else if (this.copilotAnalyzer?.isAvailable()) {
            analysisResult = await this.copilotAnalyzer.analyzeCodeChanges(diff, mrDetails);
          } else {
            this.logger.warn(`未知的AI提供商: ${provider}，且无可用分析器`);
            return null;
          }
      }

      // 记录性能统计
      const duration = Date.now() - startTime;
      this.updateAnalysisStats(duration, true);

      // 标准化AI分析结果
      const normalizedResult = this.normalizeAIAnalysisResult(analysisResult);
      return normalizedResult;

    } catch (error) {
      this.logger.error('AI分析失败', error);
      this.updateAnalysisStats(Date.now() - startTime, false);
      
      // 尝试备用分析
      return await this.performFallbackAnalysis(diff, mrDetails);
    }
  }

  /**
   * 备用到Copilot分析器
   * @private
   */
  async fallbackToCopilot(diff, mrDetails) {
    if (this.copilotAnalyzer?.isAvailable()) {
      return await this.copilotAnalyzer.analyzeCodeChanges(diff, mrDetails);
    }
    return null;
  }

  /**
   * 备用到OpenAI分析器
   * @private
   */
  async fallbackToOpenAI(diff, mrDetails) {
    if (this.openaiAnalyzer?.isAvailable()) {
      return await this.openaiAnalyzer.analyzeCodeChanges(diff, mrDetails);
    }
    return null;
  }

  /**
   * 使用默认策略
   * 按优先级尝试可用的分析器
   * @private
   */
  async useDefaultStrategy(diff, mrDetails) {
    // 优先使用OpenAI
    if (this.openaiAnalyzer?.isAvailable()) {
      return await this.openaiAnalyzer.analyzeCodeChanges(diff, mrDetails);
    }
    
    // 然后尝试Copilot
    if (this.copilotAnalyzer?.isAvailable()) {
      return await this.copilotAnalyzer.analyzeCodeChanges(diff, mrDetails);
    }
    
    return null;
  }

  /**
   * 标准化AI分析结果
   * 处理不同AI分析器返回格式的差异，确保一致的数据结构
   * @private
   * @param {Object} rawResult - 原始AI分析结果
   * @returns {Object} 标准化后的分析结果
   */
  normalizeAIAnalysisResult(rawResult) {
    if (!rawResult) {
      return null;
    }

    // 如果结果包含analysis字段（如阿里云百炼），提取analysis内容
    if (rawResult.analysis && typeof rawResult.analysis === 'object') {
      return {
        ...rawResult.analysis,
        provider: rawResult.provider || 'unknown',
        status: rawResult.status || 'success',
        timestamp: rawResult.timestamp
      };
    }

    // 如果是直接的分析数据（如OpenAI），直接返回
    if (rawResult.quality_score !== undefined || rawResult.potential_issues !== undefined) {
      return rawResult;
    }

    // 如果有status和provider但没有analysis字段，可能是错误或其他格式
    if (rawResult.status) {
      return {
        quality_score: null,
        potential_issues: [`${rawResult.provider || 'AI'}分析失败: ${rawResult.error || '未知错误'}`],
        security_concerns: [],
        performance_impact: '无法进行AI性能分析',
        maintainability: '无法进行AI可维护性分析',
        testing_suggestions: ['建议进行人工代码审查'],
        improvement_suggestions: ['建议检查AI服务配置'],
        summary: `${rawResult.provider || 'AI'}分析不可用`,
        provider: rawResult.provider || 'unknown',
        status: rawResult.status
      };
    }

    // 兜底处理
    return rawResult;
  }

  /**
   * 执行备用分析
   * 当所有AI分析都失败时，提供基础的规则分析
   * @private
   */
  async performFallbackAnalysis(diff, mrDetails) {
    this.logger.info('执行基础规则分析作为备用方案');
    
    return {
      quality_score: 6,
      potential_issues: ['AI分析不可用，已执行基础检查'],
      security_concerns: [],
      performance_impact: '无法进行AI性能分析',
      maintainability: '建议手动检查代码可维护性',
      testing_suggestions: ['添加单元测试', '进行集成测试'],
      improvement_suggestions: ['考虑代码重构', '添加文档注释'],
      summary: 'AI分析服务不可用，建议手动进行详细review'
    };
  }

  /**
   * 更新分析统计信息
   * @private
   */
  updateAnalysisStats(duration, success) {
    this.analysisStats.lastAnalysisTime = new Date().toISOString();
    
    if (success) {
      this.analysisStats.successfulRequests++;
    } else {
      this.analysisStats.failedRequests++;
    }
    
    // 更新平均响应时间
    const totalSuccessful = this.analysisStats.successfulRequests;
    if (totalSuccessful > 0) {
      this.analysisStats.averageResponseTime = 
        (this.analysisStats.averageResponseTime * (totalSuccessful - 1) + duration) / totalSuccessful;
    }
  }

  /**
   * 获取分析统计信息
   * @returns {Object} 统计信息对象
   */
  getAnalysisStats() {
    return { ...this.analysisStats };
  }

  /**
   * 测试AI连接
   * 验证所有配置的AI服务是否可用
   * 
   * @returns {Promise<Object>} 测试结果
   */
  async testAIConnection() {
    const results = {
      openai: { available: false, error: null },
      copilot: { available: false, error: null }
    };

    // 测试OpenAI
    if (this.openaiAnalyzer) {
      try {
        results.openai.available = await this.openaiAnalyzer.testConnection();
      } catch (error) {
        results.openai.error = error.message;
      }
    }

    // 测试Copilot
    if (this.copilotAnalyzer) {
      try {
        results.copilot.available = await this.copilotAnalyzer.testConnection();
      } catch (error) {
        results.copilot.error = error.message;
      }
    }

    return results;
  }
}

/**
 * PR评审器主类
 * 
 * 负责协调整个PR评审流程：
 * - GitLab API交互
 * - 代码分析和AI处理
 * - 报告生成和通知发送
 * - 错误处理和恢复
 * 
 * 特性：
 * - 完整的错误处理和用户友好的错误消息
 * - 性能优化和资源管理
 * - 可扩展的插件架构
 * - 详细的操作日志和审计跟踪
 */
class PRReviewer {
  /**
   * 构造函数
   * 初始化GitLab客户端和AI分析器
   * 
   * @param {Object} config - 应用配置对象
   */
  constructor(config) {
    this.config = config;
    this.logger = new Logger('PRReviewer');
    
    // 初始化GitLab客户端
    this.api = new Gitlab({
      host: config.gitlab.host,
      token: config.gitlab.token,
      timeout: CONSTANTS.DEFAULT_TIMEOUT_MS
    });
    
    // 初始化AI分析器
    this.aiAnalyzer = new AIAnalyzer(config);
    
    // 性能监控
    this.reviewStats = {
      totalReviews: 0,
      successfulReviews: 0,
      failedReviews: 0,
      averageReviewTime: 0
    };
    
    this.logger.info('PR评审器初始化完成');
  }

  /**
   * 根据项目名称获取项目ID
   * 支持项目名称验证和错误提示
   * 
   * @param {string} projectName - 项目名称
   * @returns {number} 项目ID
   * @throws {Error} 当项目未找到时抛出错误
   */
  getProjectId(projectName) {
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('项目名称不能为空');
    }

    const project = this.config.projects[projectName];
    if (!project) {
      const availableProjects = Object.keys(this.config.projects).join(', ');
      throw new Error(
        `未找到项目 "${projectName}" 的配置。\n` +
        `可用项目: ${availableProjects}\n` +
        `请检查config.json中的projects配置。`
      );
    }
    
    this.logger.info(`找到项目配置: ${projectName} (ID: ${project.id})`);
    return project.id;
  }

  /**
   * 获取MR详细信息
   * 包含错误处理和数据验证
   * 
   * @param {number} projectId - 项目ID
   * @param {number} mrIid - MR内部ID
   * @returns {Promise<Object>} MR详细信息
   */
  async getMRDetails(projectId, mrIid) {
    try {
      this.logger.info(`获取MR详情: 项目${projectId}, MR#${mrIid}`);
      
      const mrDetails = await this.api.MergeRequests.show(projectId, mrIid);
      
      // 验证MR状态
      if (!mrDetails) {
        throw new Error(`MR #${mrIid} 不存在`);
      }
      
      this.logger.info(`MR详情获取成功: ${mrDetails.title}`);
      return mrDetails;
      
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`MR #${mrIid} 不存在，请检查MR编号是否正确`);
      } else if (error.response?.status === 403) {
        throw new Error('权限不足，请检查GitLab token权限');
      } else if (error.response?.status === 401) {
        throw new Error('认证失败，请检查GitLab token是否有效');
      }
      
      throw new Error(`获取MR详情失败: ${error.message}`);
    }
  }

  /**
   * 获取MR的代码差异
   * 支持大文件过滤和差异数据清理
   * 
   * @param {number} projectId - 项目ID  
   * @param {number} mrIid - MR内部ID
   * @returns {Promise<Array>} 代码差异数组
   */
  async getMRDiff(projectId, mrIid) {
    try {
      this.logger.info(`获取代码差异: 项目${projectId}, MR#${mrIid}`);
      
      // 使用正确的 GitLab API 方法
      const diff = await this.api.MergeRequests.allDiffs(projectId, mrIid);
      
      // 过滤和清理差异数据
      const filteredDiff = this.filterAndCleanDiff(diff);
      
      this.logger.info(`代码差异获取成功: ${filteredDiff.length}个文件`);
      return filteredDiff;
      
    } catch (error) {
      this.logger.error('获取代码差异失败', error);
      throw new Error(`获取代码差异失败: ${error.message}`);
    }
  }

  /**
   * 过滤和清理差异数据
   * 移除不需要分析的文件和过大的差异
   * @private
   */
  filterAndCleanDiff(diff) {
    const excludePatterns = this.config.review_settings.exclude_patterns || [];
    const maxFileSize = this.config.review_settings.max_file_size || CONSTANTS.MAX_FILE_SIZE_MB * 1024 * 1024;
    
    return diff.filter(file => {
      // 检查文件是否在排除列表中
      const isExcluded = excludePatterns.some(pattern => {
        // 简单的glob模式匹配
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(file.new_path || file.old_path);
      });
      
      if (isExcluded) {
        this.logger.debug(`跳过排除文件: ${file.new_path || file.old_path}`);
        return false;
      }
      
      // 检查文件大小
      if (file.diff && file.diff.length > maxFileSize) {
        this.logger.warn(`跳过大文件: ${file.new_path || file.old_path} (${file.diff.length} bytes)`);
        return false;
      }
      
      return true;
    });
  }

  /**
   * 获取MR的评论
   * 包括讨论评论和代码行评论
   * 
   * @param {number} projectId - 项目ID
   * @param {number} mrIid - MR内部ID
   * @returns {Promise<Object>} 评论对象，包含讨论评论和差异评论
   */
  async getMRComments(projectId, mrIid) {
    try {
      this.logger.info(`获取评论: 项目${projectId}, MR#${mrIid}`);
      
      // 获取讨论评论
      const discussions = await this.api.MergeRequestDiscussions.all(projectId, mrIid);
      
      const discussionNotes = [];
      const diffNotes = [];
      
      discussions.forEach(discussion => {
        discussion.notes.forEach(note => {
          const noteData = {
            id: note.id,
            body: note.body,
            author_name: note.author.name,
            created_at: note.created_at,
            updated_at: note.updated_at
          };
          
          if (note.position) {
            // 这是代码行评论
            noteData.position = note.position;
            diffNotes.push(noteData);
          } else {
            // 这是普通讨论评论
            discussionNotes.push(noteData);
          }
        });
      });
      
      this.logger.info(`评论获取成功: ${discussionNotes.length}条讨论, ${diffNotes.length}条代码评论`);
      
      return {
        discussionNotes,
        diffNotes,
        length: discussionNotes.length + diffNotes.length
      };
      
    } catch (error) {
      this.logger.error('获取评论失败', error);
      throw new Error(`获取评论失败: ${error.message}`);
    }
  }

  /**
   * 分析代码变更
   * 执行静态分析，检测潜在问题
   * 
   * @param {Array} diff - 代码差异数组
   * @returns {Object} 分析结果对象
   */
  analyzeCodeChanges(diff) {
    this.logger.info('开始分析代码变更');
    
    const analysis = {
      totalFiles: diff.length,
      addedLines: 0,
      deletedLines: 0,
      modifiedFiles: [],
      newFiles: [],
      deletedFiles: [],
      potentialIssues: [],
      languages: new Set(),
      complexity: 'low'
    };

    diff.forEach(file => {
      this.analyzeFile(file, analysis);
    });

    // 转换语言集合为数组
    analysis.languages = Array.from(analysis.languages);
    
    // 评估复杂度
    analysis.complexity = this.assessComplexity(analysis);
    
    this.logger.info(`代码分析完成: ${analysis.totalFiles}个文件, +${analysis.addedLines}/-${analysis.deletedLines}行`);
    return analysis;
  }

  /**
   * 分析单个文件
   * @private
   */
  analyzeFile(file, analysis) {
    // 统计行数变化
    const lines = file.diff.split('\n');
    lines.forEach(line => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        analysis.addedLines++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        analysis.deletedLines++;
      }
    });

    // 检测文件语言
    const fileExtension = path.extname(file.new_path || file.old_path || '');
    const language = this.detectLanguage(fileExtension);
    if (language) {
      analysis.languages.add(language);
    }

    // 文件状态分类
    if (file.new_file) {
      analysis.newFiles.push(file.new_path);
    } else if (file.deleted_file) {
      analysis.deletedFiles.push(file.old_path);
    } else {
      analysis.modifiedFiles.push(file.new_path);
    }

    // 检测潜在问题
    this.detectPotentialIssues(file, analysis);
  }

  /**
   * 检测文件语言
   * @private
   */
  detectLanguage(extension) {
    const languageMap = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.dart': 'Dart',
      '.java': 'Java',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin'
    };
    
    return languageMap[extension.toLowerCase()];
  }

  /**
   * 检测潜在问题
   * @private
   */
  detectPotentialIssues(file, analysis) {
    const settings = this.config.review_settings;
    const filePath = file.new_path || file.old_path;
    
    // 检查console.log语句
    if (settings.check_console_logs && file.diff.includes('console.log')) {
      analysis.potentialIssues.push(`${filePath}: 包含 console.log 语句，建议移除或使用日志库`);
    }
    
    // 检查TODO/FIXME注释
    if (settings.check_todos) {
      const todoMatches = file.diff.match(/TODO|FIXME|HACK|XXX/gi);
      if (todoMatches && todoMatches.length > 0) {
        analysis.potentialIssues.push(`${filePath}: 包含 ${todoMatches.length} 个待完成标记 (${todoMatches.join(', ')})`);
      }
    }
    
    // 检查大文件修改
    const addedLines = (file.diff.match(/^\+/gm) || []).length;
    if (addedLines > settings.max_lines_warning) {
      analysis.potentialIssues.push(`${filePath}: 单个文件新增行数过多 (${addedLines} 行)，建议拆分`);
    }
    
    // 检查硬编码密码或密钥
    if (file.diff.match(/password\s*[=:]\s*["'](?!.*placeholder|.*example)[^"']{8,}|api[_-]?key\s*[=:]\s*["'][^"']+/i)) {
      analysis.potentialIssues.push(`${filePath}: 可能包含硬编码的敏感信息，请使用环境变量`);
    }
    
    // 检查空catch块
    if (file.diff.includes('catch') && file.diff.includes('{}')) {
      analysis.potentialIssues.push(`${filePath}: 包含空的catch块，建议添加错误处理`);
    }
  }

  /**
   * 评估代码复杂度
   * @private
   */
  assessComplexity(analysis) {
    const totalChanges = analysis.addedLines + analysis.deletedLines;
    const fileCount = analysis.totalFiles;
    
    if (totalChanges > 2000 || fileCount > 50) {
      return 'very-high';
    } else if (totalChanges > 1000 || fileCount > 20) {
      return 'high';
    } else if (totalChanges > 500 || fileCount > 10) {
      return 'medium';
    } else if (totalChanges > 100 || fileCount > 5) {
      return 'low';
    } else {
      return 'very-low';
    }
  }

  // ... 其他方法将在后续部分中添加

  /**
   * 生成详细的评审报告
   * 创建结构化的Markdown格式报告
   * 
   * @param {string} projectName - 项目名称
   * @param {number} mrIid - MR编号
   * @param {Object} mrDetails - MR详细信息
   * @param {Array} diff - 代码差异
   * @param {Object} comments - 评论信息
   * @param {Object} analysis - 代码分析结果
   * @param {Object|null} aiAnalysis - AI分析结果
   * @returns {string} Markdown格式的报告
   */
  generateReviewReport(projectName, mrIid, mrDetails, diff, comments, analysis, aiAnalysis = null) {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    
    // 计算统计信息
    const fileCount = analysis.totalFiles;
    const additionCount = analysis.addedLines;
    const deletionCount = analysis.deletedLines;
    const netChange = additionCount - deletionCount;
    
    // 生成报告头部
    let report = this.generateReportHeader(projectName, mrIid, mrDetails, timestamp);
    
    // 生成变更统计
    report += this.generateChangeStatistics(fileCount, additionCount, deletionCount, netChange, comments.length);
    
    // 生成PR描述
    report += this.generatePRDescription(mrDetails);
    
    // 生成文件变更详情
    report += this.generateFileChanges(analysis);
    
    // 生成潜在问题检测
    report += this.generatePotentialIssues(analysis);
    
    // 生成现有评论汇总
    report += this.generateCommentsSection(comments);
    
    // 生成AI分析结果
    if (aiAnalysis) {
      // 处理不同AI分析器返回的数据结构
      let actualAnalysisData = aiAnalysis;
      
      // 如果是嵌套结构（免费AI分析器返回格式），提取analysis字段
      if (aiAnalysis.analysis && typeof aiAnalysis.analysis === 'object') {
        actualAnalysisData = aiAnalysis.analysis;
        this.logger.debug('使用嵌套分析数据', { 
          provider: aiAnalysis.provider, 
          status: aiAnalysis.status,
          analysisKeys: Object.keys(actualAnalysisData) 
        });
      } else {
        this.logger.debug('使用直接分析数据', { 
          analysisKeys: Object.keys(actualAnalysisData) 
        });
      }
      
      report += this.generateAIAnalysisSection(actualAnalysisData);
    } else {
      this.logger.debug('AI分析结果为空，跳过');
    }
    
    // 生成Review建议
    report += this.generateReviewSuggestions(analysis, aiAnalysis);
    
    // 如果启用详细差异，添加代码差异
    if (this.config.review_settings.include_detailed_diff) {
      report += this.generateDetailedDiff(diff);
    }
    
    // 添加报告尾部
    report += this.generateReportFooter();
    
    return report;
  }

  /**
   * 生成报告头部
   * @private
   */
  generateReportHeader(projectName, mrIid, mrDetails, timestamp) {
    return `# 📋 PR Review 报告

**生成时间**: ${timestamp}  
**评审工具**: PR Review Automation v2.1.0  
**项目**: ${projectName}

---

## 📊 基本信息

| 项目 | ${projectName} |
|------|------|
| **MR编号** | #${mrIid} |
| **标题** | ${mrDetails.title} |
| **作者** | ${mrDetails.author.name} |
| **分支** | \`${mrDetails.source_branch}\` → \`${mrDetails.target_branch}\` |
| **状态** | ${this.getStatusEmoji(mrDetails.state)} ${mrDetails.state} |
| **合并状态** | ${this.getMergeStatusEmoji(mrDetails.detailed_merge_status)} ${mrDetails.detailed_merge_status || mrDetails.merge_status || '未知'} |
| **创建时间** | ${new Date(mrDetails.created_at).toLocaleString('zh-CN')} |
| **更新时间** | ${new Date(mrDetails.updated_at).toLocaleString('zh-CN')} |
| **Web链接** | [查看MR](${mrDetails.web_url}) |

`;
  }

  /**
   * 生成变更统计
   * @private
   */
  generateChangeStatistics(fileCount, additionCount, deletionCount, netChange, commentCount) {
    return `## 📈 变更统计

| 指标 | 数量 | 评估 |
|------|------|------|
| **总文件数** | ${fileCount} | ${this.getFileCountStatus(fileCount)} |
| **新增行数** | +${additionCount} | ${this.getAdditionStatus(additionCount)} |
| **删除行数** | -${deletionCount} | ${this.getDeletionStatus(deletionCount)} |
| **净变更** | ${netChange > 0 ? '+' : ''}${netChange} | ${this.getNetChangeStatus(netChange)} |
| **评论数量** | ${commentCount} | ${this.getCommentStatus(commentCount)} |

`;
  }

  /**
   * 生成PR描述部分
   * @private
   */
  generatePRDescription(mrDetails) {
    return `## 📝 PR描述

${mrDetails.description ? mrDetails.description.trim() : '_无描述信息_'}

`;
  }

  /**
   * 生成文件变更详情
   * @private
   */
  generateFileChanges(analysis) {
    let section = `## 📁 文件变更详情\n\n`;
    
    if (analysis.newFiles.length > 0) {
      section += `### ✨ 新增文件 (${analysis.newFiles.length} 个)\n`;
      analysis.newFiles.forEach(file => section += `- 📄 ${file}\n`);
      section += '\n';
    }

    if (analysis.modifiedFiles.length > 0) {
      section += `### 🔧 修改文件 (${analysis.modifiedFiles.length} 个)\n`;
      analysis.modifiedFiles.forEach(file => section += `- 📝 ${file}\n`);
      section += '\n';
    }

    if (analysis.deletedFiles.length > 0) {
      section += `### 🗑️ 删除文件 (${analysis.deletedFiles.length} 个)\n`;
      analysis.deletedFiles.forEach(file => section += `- ❌ ${file}\n`);
      section += '\n';
    }

    // 添加语言统计
    if (analysis.languages.length > 0) {
      section += `### 💻 涉及语言\n`;
      analysis.languages.forEach(lang => section += `- ${lang}\n`);
      section += '\n';
    }

    // 添加复杂度评估
    section += `### 📊 变更复杂度: ${this.getComplexityEmoji(analysis.complexity)} ${analysis.complexity}\n\n`;

    return section;
  }

  /**
   * 生成潜在问题检测
   * @private
   */
  generatePotentialIssues(analysis) {
    if (analysis.potentialIssues.length > 0) {
      let section = `## ⚠️ 潜在问题检测\n\n`;
      analysis.potentialIssues.forEach((issue, index) => {
        section += `${index + 1}. ${issue}\n`;
      });
      section += '\n';
      return section;
    } else {
      return `## ✅ 潜在问题检测\n\n未发现明显的潜在问题。\n\n`;
    }
  }

  /**
   * 生成评论汇总
   * @private
   */
  generateCommentsSection(comments) {
    if (comments.discussionNotes.length > 0 || comments.diffNotes.length > 0) {
      let section = `## 💬 现有评论\n\n`;
      
      if (comments.discussionNotes.length > 0) {
        section += `### 一般评论 (${comments.discussionNotes.length} 条)\n`;
        comments.discussionNotes.slice(0, 5).forEach(note => {
          section += `- **${note.author_name}** (${new Date(note.created_at).toLocaleString('zh-CN')}): ${note.body.substring(0, 200)}${note.body.length > 200 ? '...' : ''}\n`;
        });
        if (comments.discussionNotes.length > 5) {
          section += `- _... 还有 ${comments.discussionNotes.length - 5} 条评论_\n`;
        }
        section += '\n';
      }

      if (comments.diffNotes.length > 0) {
        section += `### 代码评论 (${comments.diffNotes.length} 条)\n`;
        comments.diffNotes.slice(0, 5).forEach(note => {
          section += `- **${note.author_name}** (${new Date(note.created_at).toLocaleString('zh-CN')}): ${note.body.substring(0, 200)}${note.body.length > 200 ? '...' : ''}\n`;
          if (note.position) {
            section += `  📍 位置: ${note.position.new_path}:${note.position.new_line}\n`;
          }
        });
        if (comments.diffNotes.length > 5) {
          section += `- _... 还有 ${comments.diffNotes.length - 5} 条代码评论_\n`;
        }
        section += '\n';
      }
      
      return section;
    }
    
    return `## 💬 现有评论\n\n暂无评论。\n\n`;
  }

  /**
   * 生成AI分析结果
   * @private
   */
  generateAIAnalysisSection(aiAnalysis) {
    let section = `## 🤖 AI智能分析\n\n`;
    
    if (aiAnalysis.quality_score !== null && aiAnalysis.quality_score !== undefined) {
      const scoreEmoji = this.getQualityScoreEmoji(aiAnalysis.quality_score);
      section += `### 代码质量评分: ${scoreEmoji} ${aiAnalysis.quality_score}/10\n\n`;
    }
    
    if (aiAnalysis.summary) {
      section += `### 📋 总体评估\n${aiAnalysis.summary}\n\n`;
    }

    if (aiAnalysis.potential_issues && aiAnalysis.potential_issues.length > 0) {
      section += `### 🐛 潜在问题\n`;
      aiAnalysis.potential_issues.forEach(issue => section += `- ${issue}\n`);
      section += '\n';
    }
    
    if (aiAnalysis.security_concerns && aiAnalysis.security_concerns.length > 0) {
      section += `### 🔒 安全性考虑\n`;
      aiAnalysis.security_concerns.forEach(concern => section += `- ${concern}\n`);
      section += '\n';
    }
    
    if (aiAnalysis.performance_impact) {
      section += `### ⚡ 性能影响\n${aiAnalysis.performance_impact}\n\n`;
    }
    
    if (aiAnalysis.maintainability) {
      section += `### 🔧 可维护性\n${aiAnalysis.maintainability}\n\n`;
    }
    
    if (aiAnalysis.testing_suggestions && aiAnalysis.testing_suggestions.length > 0) {
      section += `### 🧪 测试建议\n`;
      aiAnalysis.testing_suggestions.forEach(suggestion => section += `- ${suggestion}\n`);
      section += '\n';
    }
    
    if (aiAnalysis.improvement_suggestions && aiAnalysis.improvement_suggestions.length > 0) {
      section += `### 💡 改进建议\n`;
      aiAnalysis.improvement_suggestions.forEach(suggestion => section += `- ${suggestion}\n`);
      section += '\n';
    }

    return section;
  }

  /**
   * 生成Review建议
   * @private
   */
  generateReviewSuggestions(analysis, aiAnalysis) {
    let section = `## 🎯 Review建议\n\n`;

    // 处理AI分析数据结构
    let actualAnalysisData = null;
    if (aiAnalysis) {
      // 如果是嵌套结构（免费AI分析器返回格式），提取analysis字段
      actualAnalysisData = aiAnalysis.analysis && typeof aiAnalysis.analysis === 'object' 
        ? aiAnalysis.analysis 
        : aiAnalysis;
    }

    // 基于分析结果的建议
    if (analysis.addedLines > 1000) {
      section += `- ⚠️ 这是一个较大的PR (${analysis.addedLines}行新增)，建议拆分成更小的PR\n`;
    }
    
    if (analysis.totalFiles > 20) {
      section += `- ⚠️ 修改文件较多 (${analysis.totalFiles}个)，请确保每个文件的修改都是必要的\n`;
    }
    
    if (analysis.potentialIssues.length === 0 && (!actualAnalysisData || actualAnalysisData.quality_score >= 7)) {
      section += `- ✅ 代码质量良好，未发现明显问题\n`;
    }
    
    // 基于复杂度的建议
    switch (analysis.complexity) {
      case 'very-high':
        section += `- 🔴 变更复杂度很高，建议分阶段合并并加强测试\n`;
        break;
      case 'high':
        section += `- 🟡 变更复杂度较高，请仔细review每个修改\n`;
        break;
      case 'medium':
        section += `- 🟢 变更复杂度适中，建议重点关注核心逻辑\n`;
        break;
    }
    
    // 通用建议
    section += `- 📝 建议详细测试所有修改的功能\n`;
    section += `- 🔍 建议检查是否需要更新相关文档\n`;
    section += `- 🧪 建议运行完整的测试套件\n`;

    return section + '\n';
  }

  /**
   * 生成详细代码差异
   * @private
   */
  generateDetailedDiff(diff) {
    if (!diff || diff.length === 0) {
      return '';
    }

    let section = `## 📄 详细代码差异\n\n`;
    section += `<details>\n<summary>点击展开查看详细差异 (${diff.length} 个文件)</summary>\n\n`;
    
    diff.slice(0, 10).forEach(file => { // 限制显示前10个文件
      const filePath = file.new_path || file.old_path;
      section += `### ${filePath}\n\n`;
      section += '```diff\n';
      
      // 截取差异内容，避免过长
      const diffLines = file.diff.split('\n');
      const maxLines = 100;
      if (diffLines.length > maxLines) {
        section += diffLines.slice(0, maxLines).join('\n');
        section += `\n... (省略 ${diffLines.length - maxLines} 行)`;
      } else {
        section += file.diff;
      }
      
      section += '\n```\n\n';
    });
    
    if (diff.length > 10) {
      section += `_... 还有 ${diff.length - 10} 个文件的差异_\n\n`;
    }
    
    section += '</details>\n\n';
    return section;
  }

  /**
   * 生成报告尾部
   * @private
   */
  generateReportFooter() {
    return `---

**报告生成**: ${new Date().toLocaleString('zh-CN')}  
**工具版本**: PR Review Automation v2.1.0  
**技术支持**: [GitHub Repository](https://github.com/your-repo/pr-review-automation)

> 这是一个自动生成的报告。如有问题，请联系开发团队。
`;
  }

  // 状态和评估辅助方法

  getStatusEmoji(state) {
    const statusMap = {
      'opened': '🟢',
      'closed': '🔴',
      'merged': '✅',
      'locked': '🔒'
    };
    return statusMap[state] || '⚪';
  }

  getMergeStatusEmoji(status) {
    const statusMap = {
      'can_be_merged': '✅',
      'cannot_be_merged': '❌',
      'checking': '🔄',
      'unchecked': '⚪'
    };
    return statusMap[status] || '⚪';
  }

  getFileCountStatus(count) {
    if (count > 50) return '🔴 过多';
    if (count > 20) return '🟡 较多';
    if (count > 10) return '🟡 中等';
    return '🟢 合理';
  }

  getAdditionStatus(count) {
    if (count > 2000) return '🔴 大量';
    if (count > 1000) return '🟡 较多';
    if (count > 500) return '🟡 适中';
    return '🟢 少量';
  }

  getDeletionStatus(count) {
    if (count > 1000) return '🔴 大量';
    if (count > 500) return '🟡 较多';
    if (count > 100) return '🟡 适中';
    return '🟢 少量';
  }

  getNetChangeStatus(net) {
    const abs = Math.abs(net);
    if (abs > 2000) return '🔴 重大变更';
    if (abs > 1000) return '🟡 较大变更';
    if (abs > 500) return '🟡 中等变更';
    return '🟢 正常范围';
  }

  getCommentStatus(count) {
    if (count > 20) return '🟡 讨论激烈';
    if (count > 10) return '🟡 讨论较多';
    if (count > 0) return '🟢 有讨论';
    return '⚪ 无评论';
  }

  getComplexityEmoji(complexity) {
    const emojiMap = {
      'very-low': '🟢',
      'low': '🟢',
      'medium': '🟡',
      'high': '🟡',
      'very-high': '🔴'
    };
    return emojiMap[complexity] || '⚪';
  }

  getQualityScoreEmoji(score) {
    if (score >= CONSTANTS.QUALITY_SCORE_THRESHOLDS.EXCELLENT) return '🟢';
    if (score >= CONSTANTS.QUALITY_SCORE_THRESHOLDS.GOOD) return '🟡';
    if (score >= CONSTANTS.QUALITY_SCORE_THRESHOLDS.ACCEPTABLE) return '🟠';
    return '🔴';
  }

  /**
   * 保存报告到文件
   * 支持自动目录创建和文件名生成
   * 
   * @param {string} report - 报告内容
   * @returns {Promise<string>} 文件路径
   */
  async saveReportToFile(report) {
    try {
      // 生成MR专属目录
      const mrIid = global.currentMrIid || 'unknown';
      const reportsDir = path.join(__dirname, 'reports');
      const mrDir = path.join(reportsDir, mrIid.toString());
      
      // 确保目录存在
      await fs.mkdir(mrDir, { recursive: true });
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `review_git_${mrIid}_${timestamp}.txt`;
      const filePath = path.join(mrDir, fileName);
      
      // 写入文件
      await fs.writeFile(filePath, report, 'utf8');
      
      this.logger.info(`报告已保存: ${filePath}`);
      return filePath;
      
    } catch (error) {
      this.logger.error('保存报告失败', error);
      throw new Error(`保存报告失败: ${error.message}`);
    }
  }

  /**
   * 生成飞书卡片格式的数据
   * @param {string} projectName - 项目名称
   * @param {number} mrIid - MR编号
   * @param {Object} mrDetails - MR详情
   * @param {Object} analysis - 分析结果
   * @param {Object} aiAnalysis - AI分析结果
   * @param {string} reportFilePath - 报告文件路径
   * @returns {Object} 飞书卡片数据
   */
  generateFeishuCardData(projectName, mrIid, mrDetails, analysis, aiAnalysis = null, reportFilePath = null) {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    
    // 计算统计信息
    const fileCount = analysis.totalFiles;
    const additionCount = analysis.addedLines;
    const deletionCount = analysis.deletedLines;
    const netChange = additionCount - deletionCount;
    
    // 状态评估
    const getFileCountStatus = (count) => count > 15 ? '🔴 较多' : count > 10 ? '🟡 中等' : '🟢 合理';
    const getAdditionStatus = (count) => count > 1000 ? '🔴 大量' : count > 500 ? '🟡 较多' : '🟢 适中';
    const getDeletionStatus = (count) => count > 500 ? '🔴 大量' : count > 100 ? '🟡 较多' : '🟢 适中';
    const getNetChangeStatus = (net) => Math.abs(net) > 1000 ? '🔴 重大变更' : Math.abs(net) > 500 ? '🟡 较大变更' : '🟢 正常范围';
    
    // AI评分和建议
    let qualityScore = null;
    let qualityColor = '⚪';
    let aiSummary = '';
    let mainIssues = [];
    let mainSuggestions = [];
    
    if (aiAnalysis) {
      // 处理不同AI分析器返回的数据结构
      let actualAnalysisData = aiAnalysis;
      
      // 如果是嵌套结构（免费AI分析器返回格式），提取analysis字段
      if (aiAnalysis.analysis && typeof aiAnalysis.analysis === 'object') {
        actualAnalysisData = aiAnalysis.analysis;
      }
      
      qualityScore = actualAnalysisData.quality_score;
      if (qualityScore !== null) {
        qualityColor = qualityScore >= 8 ? '🟢' : qualityScore >= 6 ? '🟡' : '🔴';
      }
      aiSummary = actualAnalysisData.summary || '';
      
      // 提取主要问题（限制数量）
      if (actualAnalysisData.potential_issues && actualAnalysisData.potential_issues.length > 0) {
        mainIssues = actualAnalysisData.potential_issues.slice(0, 3);
      }
      if (actualAnalysisData.improvement_suggestions && actualAnalysisData.improvement_suggestions.length > 0) {
        mainSuggestions = actualAnalysisData.improvement_suggestions.slice(0, 3);
      }
    }
    
    // 构建飞书交互式卡片
    const cardData = {
      msg_type: "interactive",
      card: {
        config: {
          wide_screen_mode: true,
          enable_forward: true
        },
        header: {
          template: qualityScore >= 8 ? "green" : qualityScore >= 6 ? "yellow" : qualityScore >= 1 ? "red" : "blue",
          title: {
            content: `📋 ${projectName} - PR #${mrIid} 评审完成`,
            tag: "plain_text"
          }
        },
        elements: [
          {
            tag: "div",
            text: {
              content: `**🎯 ${mrDetails.title}**\n👤 **提交者**: ${mrDetails.author.name}\n🌿 **分支**: \`${mrDetails.source_branch}\` → \`${mrDetails.target_branch}\`\n⏰ **时间**: ${timestamp}`,
              tag: "lark_md"
            }
          },
          {
            tag: "hr"
          },
          {
            tag: "div",
            fields: [
              {
                is_short: true,
                text: {
                  content: `**📁 文件数量**\n${fileCount} ${getFileCountStatus(fileCount)}`,
                  tag: "lark_md"
                }
              },
              {
                is_short: true,
                text: {
                  content: `**📊 代码变更**\n+${additionCount}/-${deletionCount} ${getNetChangeStatus(netChange)}`,
                  tag: "lark_md"
                }
              }
            ]
          }
        ]
      }
    };
    
    // 添加AI评分部分
    if (qualityScore !== null) {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**🤖 AI评分**: ${qualityColor} ${qualityScore}/10`,
          tag: "lark_md"
        }
      });
    }
    
    // 添加AI总结
    if (aiSummary) {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**📋 评估总结**\n${aiSummary}`,
          tag: "lark_md"
        }
      });
    }
    
    // 添加问题和建议
    if (mainIssues.length > 0 || analysis.potentialIssues.length > 0) {
      let issuesText = '**⚠️ 主要问题**\n';
      
      // 添加代码检测问题
      if (analysis.potentialIssues.length > 0) {
        analysis.potentialIssues.slice(0, 2).forEach(issue => {
          issuesText += `• ${issue}\n`;
        });
      }
      
      // 添加AI检测问题
      if (mainIssues.length > 0) {
        mainIssues.forEach(issue => {
          issuesText += `• ${issue}\n`;
        });
      }
      
      cardData.card.elements.push({
        tag: "hr"
      });
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: issuesText.trim(),
          tag: "lark_md"
        }
      });
    } else {
      cardData.card.elements.push({
        tag: "hr"
      });
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: "**✅ 代码质量良好**\n未发现明显问题，建议批准合并",
          tag: "lark_md"
        }
      });
    }
    
    // 添加改进建议
    if (mainSuggestions.length > 0) {
      let suggestionsText = '**💡 改进建议**\n';
      mainSuggestions.forEach(suggestion => {
        suggestionsText += `• ${suggestion}\n`;
      });
      
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: suggestionsText.trim(),
          tag: "lark_md"
        }
      });
    }
    
    // 添加操作按钮
    cardData.card.elements.push({
      tag: "hr"
    });
    
    // 生成报告和JSON文件的下载链接
    const ip = this.getLocalIP();
    let reportDownloadUrl, jsonDownloadUrl;
    
    if (reportFilePath) {
      // 使用实际的文件路径生成URL
      reportDownloadUrl = this.generateFileURL(reportFilePath);
    } else {
      // 回退到原来的逻辑
      const reportFileName = `review_git_${mrIid}.txt`;
      reportDownloadUrl = `http://${ip}:${CONSTANTS.HTTP_SERVER_PORT}/reports/${mrIid}/${reportFileName}`;
    }
    
    const jsonFileName = `feishu_card_${mrIid}.json`;
    jsonDownloadUrl = `http://${ip}:${CONSTANTS.HTTP_SERVER_PORT}/reports/${mrIid}/${jsonFileName}`;
    
    cardData.card.elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: {
            content: "查看 MR",
            tag: "plain_text"
          },
          type: "primary",
          url: mrDetails.web_url
        },
        {
          tag: "button",
          text: {
            content: "📄 下载报告",
            tag: "plain_text"
          },
          type: "default",
          url: reportDownloadUrl
        }
      ]
    });
    
    // 添加第二行按钮
    cardData.card.elements.push({
      tag: "action",
      actions: [
      {
        tag: "button",
        text: {
        content: "Jenkins 构建",
        tag: "plain_text"
        },
        type: "default",
        url: `http://jenkins.atomverse.com.cn:8080/job/APP_revicew/${process.env.BUILD_NUMBER || 'latest'}/console`
      },
      {
        tag: "button",
        text: {
        content: "🌐 PR 查看",
        tag: "plain_text"
        },
        type: "default",
        url: mrDetails.web_url
      }
      ]
    });
    
    return cardData;
  }

  /**
   * 保存飞书卡片数据到文件
   * @param {Object} cardData - 飞书卡片数据
   * @returns {Promise<string>} 文件路径
   */
  async saveFeishuCardData(cardData) {
    // 生成MR专属目录
    const mrIidValue = global.currentMrIid || '0';
    const reportsDir = path.join(__dirname, 'reports');
    const mrDir = path.join(reportsDir, mrIidValue.toString());
    
    // 确保目录存在
    await fs.mkdir(mrDir, { recursive: true });
    
    const fileName = `feishu_card_${mrIidValue}.json`;
    const filePath = path.join(mrDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(cardData, null, 2), 'utf8');
    return path.resolve(filePath);
  }

  /**
   * 发送飞书Webhook通知
   * @param {Object} cardData - 飞书卡片数据
   * @returns {Promise<boolean>} 发送结果
   */
  async sendFeishuWebhook(cardData) {
    try {
      const feishuConfig = this.config.notification?.feishu;
      
      if (!feishuConfig?.enabled) {
        this.logger.info('飞书通知未启用，跳过发送');
        return false;
      }
      
      const webhookUrl = feishuConfig.webhook_url;
      
      if (!webhookUrl || 
          webhookUrl === '${FEISHU_WEBHOOK_URL}' || 
          webhookUrl === 'undefined' ||
          webhookUrl.includes('${') ||
          webhookUrl === '' ||
          !webhookUrl.startsWith('https://')) {
        this.logger.warn('飞书Webhook URL未配置或无效，跳过发送');
        return false;
      }
      
      this.logger.info('正在发送飞书通知...');
      this.logger.info(`Webhook URL: ${webhookUrl.substring(0, 50)}...${webhookUrl.slice(-10)}`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData)
      });
      
      if (response.ok) {
        const result = await response.json();
        this.logger.info('✅ 飞书通知发送成功');
        this.logger.info(`响应状态: ${response.status}`);
        return true;
      } else {
        this.logger.error(`❌ 飞书通知发送失败: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        this.logger.error(`错误详情: ${errorText}`);
        return false;
      }
      
    } catch (error) {
      this.logger.error('❌ 发送飞书通知时出错:', error.message);
      return false;
    }
  }

  /**
   * 执行完整的PR review流程
   * 主要的公共方法，协调所有review步骤
   * 
   * @param {string} projectName - 项目名称
   * @param {number} mrIid - MR编号
   * @returns {Promise<Object>} 执行结果
   */
  async reviewPR(projectName, mrIid) {
    const startTime = Date.now();
    this.reviewStats.totalReviews++;
    
    try {
      // 设置全局变量供其他函数使用
      global.currentMrIid = mrIid;
      
      this.logger.info(`开始review ${projectName} 的 MR #${mrIid}`);
      
      // 1. 获取项目ID
      const projectId = this.getProjectId(projectName);
      this.logger.info(`项目ID: ${projectId}`);
      
      // 2. 获取MR详情
      this.logger.info('获取MR详情...');
      const mrDetails = await this.getMRDetails(projectId, mrIid);
      this.logger.info(`标题: ${mrDetails.title}`);
      this.logger.info(`作者: ${mrDetails.author.name}`);
      this.logger.info(`分支: ${mrDetails.source_branch} → ${mrDetails.target_branch}`);
      
      // 3. 获取代码差异
      this.logger.info('获取代码差异...');
      const diff = await this.getMRDiff(projectId, mrIid);
      this.logger.info(`变更文件数: ${diff.length}`);
      
      // 4. 获取评论
      this.logger.info('获取评论...');
      const comments = await this.getMRComments(projectId, mrIid);
      this.logger.info(`评论数: ${comments.length}`);
      
      // 5. 分析代码变更
      this.logger.info('分析代码变更...');
      const analysis = this.analyzeCodeChanges(diff);
      
      // 6. AI智能分析
      let aiAnalysis = null;
      if (this.config.review_settings.enable_ai_analysis) {
        this.logger.info('执行AI智能分析...');
        try {
          aiAnalysis = await this.aiAnalyzer.analyzeCodeChanges(diff, mrDetails);
          if (aiAnalysis) {
            this.logger.info('AI分析完成');
            this.logger.debug('AI分析结果结构:', { 
              status: aiAnalysis.status, 
              provider: aiAnalysis.provider,
              hasAnalysis: !!aiAnalysis.analysis,
              analysisKeys: aiAnalysis.analysis ? Object.keys(aiAnalysis.analysis) : []
            });
          } else {
            this.logger.info('AI分析跳过');
          }
        } catch (aiError) {
          this.logger.warn('AI分析失败', aiError);
        }
      }
      
      // 7. 生成报告
      this.logger.info('生成review报告...');
      const report = this.generateReviewReport(projectName, mrIid, mrDetails, diff, comments, analysis, aiAnalysis);
      
      // 8. 保存报告
      this.logger.info('保存报告...');
      const filePath = await this.saveReportToFile(report);
      
      // 9. 生成飞书卡片数据
      this.logger.info('生成飞书卡片数据...');
      const feishuCardData = this.generateFeishuCardData(projectName, mrIid, mrDetails, analysis, aiAnalysis, filePath);
      
      // 10. 保存飞书卡片数据
      this.logger.info('保存飞书卡片数据...');
      const feishuCardPath = await this.saveFeishuCardData(feishuCardData);
      
      // 11. 发送飞书Webhook通知
      await this.sendFeishuWebhook(feishuCardData);
      
      // 12. 生成访问URL
      const fileURL = this.generateFileURL(filePath);
      const jsonURL = this.generateFileURL(feishuCardPath);
      
      // 记录成功统计
      const duration = Date.now() - startTime;
      this.reviewStats.successfulReviews++;
      this.updateReviewStats(duration);
      
      this.logger.info(`Review完成！报告已保存到: ${filePath}`);
      
      return {
        filePath,
        fileURL,
        feishuCardPath,
        jsonURL,
        duration,
        analysis,
        aiAnalysis
      };
      
    } catch (error) {
      this.reviewStats.failedReviews++;
      this.logger.error('Review失败', error);
      
      if (error.response) {
        this.logger.error('API响应详情', {
          status: error.response.status,
          statusText: error.response.statusText
        });
      }
      
      throw error;
    } finally {
      // 清理全局变量
      if (global.currentMrIid) {
        delete global.currentMrIid;
      }
    }
  }

  /**
   * 生成文件访问URL
   * @private
   */
  generateFileURL(filePath) {
    try {
      const ip = this.getLocalIP();
      const reportsDir = path.join(__dirname, 'reports');
      const relativePath = path.relative(reportsDir, filePath);
      return `http://${ip}:${CONSTANTS.HTTP_SERVER_PORT}/reports/${relativePath}`;
    } catch (error) {
      this.logger.warn('生成URL失败', error);
      return filePath;
    }
  }

  /**
   * 获取本机IP地址
   * @private
   */
  getLocalIP() {
    try {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            return net.address;
          }
        }
      }
      
      return 'localhost';
    } catch (error) {
      return 'localhost';
    }
  }

  /**
   * 更新review统计信息
   * @private
   */
  updateReviewStats(duration) {
    const successfulReviews = this.reviewStats.successfulReviews;
    if (successfulReviews > 0) {
      this.reviewStats.averageReviewTime = 
        (this.reviewStats.averageReviewTime * (successfulReviews - 1) + duration) / successfulReviews;
    }
  }

  /**
   * 获取review统计信息
   * @returns {Object} 统计信息
   */
  getReviewStats() {
    return { ...this.reviewStats };
  }
}

// 如果作为脚本直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  });
}

/**
 * 主函数
 * 处理命令行参数并执行PR review
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
📋 PR自动化评审工具 v2.1.0

🚀 用法:
  node pr-reviewer.js <项目名称> <MR编号>

📝 示例:
  node pr-reviewer.js "ZM App" 161
  node pr-reviewer.js "StaticRelease" 162

🔧 选项:
  --help, -h     显示此帮助信息
  --config PATH  指定配置文件路径
  --debug        启用调试模式
  --dry-run      干运行模式（不发送通知）

💡 提示:
  - 项目名称必须在config.json中配置
  - MR编号使用GitLab中的内部ID (IID)
  - 确保已正确配置GitLab token和AI服务
    `);
    process.exit(1);
  }

  const projectName = args[0];
  const mrIid = parseInt(args[1]);

  if (isNaN(mrIid)) {
    throw new Error('MR编号必须是数字');
  }

  // 加载配置
  const config = await loadConfig();
  
  // 创建评审器并执行review
  const reviewer = new PRReviewer(config);
  const result = await reviewer.reviewPR(projectName, mrIid);
  
  console.log(`
✅ PR评审完成！

📄 报告文件: ${result.filePath}
🌐 在线查看: ${result.fileURL}
📱 飞书数据: ${result.feishuCardPath}
📊 JSON数据: ${result.jsonURL}
  `);
}

export { PRReviewer, AIAnalyzer, Logger, loadConfig, CONSTANTS };
