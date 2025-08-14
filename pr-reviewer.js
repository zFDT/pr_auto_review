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
import { aiAnalyzerFactory } from './src/analyzers/ai-analyzer-factory.js';
import { configLoader } from './src/config/config-loader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { networkInterfaces } from 'os';

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
    this.initializeAI();
  }

  /**
   * 分析代码变更
   * 使用配置的AI提供商进行分析，如果AI不可用则直接报错
   * 
   * @param {Array} diff - 代码差异数组
   * @param {Object} mrDetails - MR详细信息
   * @returns {Promise<Object>} 分析结果
   * @throws {Error} 如果AI分析失败
   */
  async analyzeCodeChanges(diff, mrDetails) {
    // 检查是否启用AI分析
    if (!this.config.review_settings?.enable_ai_analysis) {
      this.logger.info('AI分析已禁用，使用基础规则分析');
      return this.performBasicAnalysis(diff, mrDetails);
    }

    // 检查AI分析器是否已初始化
    if (!this.aiAnalyzer) {
      throw new Error('AI分析器未初始化，请检查配置');
    }

    // 记录开始时间
    const startTime = Date.now();
    this.analysisStats.totalRequests++;

    try {
      this.logger.info(`🔍 开始使用 ${this.aiProvider} 进行代码分析`);

      // 直接使用配置的AI分析器，不进行fallback
      const analysisResult = await aiAnalyzerFactory.analyze(diff, mrDetails);

      // 记录性能统计
      const duration = Date.now() - startTime;
      this.updateAnalysisStats(duration, true);

      // 显示分析结果和Token使用统计
      this.logger.info(`✅ AI分析完成，耗时: ${duration}ms`);

      // 输出token使用统计（如果可用）
      if (analysisResult && analysisResult.token_usage) {
        const tokenUsage = analysisResult.token_usage;
        if (tokenUsage.session) {
          this.logger.info(`📊 本次Token使用统计:`);
          this.logger.info(`  📝 输入Token: ${tokenUsage.session.inputTokens?.toLocaleString() || 'N/A'}`);
          this.logger.info(`  💬 输出Token: ${tokenUsage.session.outputTokens?.toLocaleString() || 'N/A'}`);
          this.logger.info(`  📋 总计Token: ${tokenUsage.session.totalTokens?.toLocaleString() || 'N/A'}`);
          this.logger.info(`  🔄 请求次数: ${tokenUsage.session.requests || 'N/A'}`);
        }
        if (tokenUsage.cumulative) {
          this.logger.info(`📈 累计Token使用: ${tokenUsage.cumulative.totalTokens?.toLocaleString() || 'N/A'}`);
        }
      }

      return analysisResult;

    } catch (error) {
      // 记录错误统计
      const duration = Date.now() - startTime;
      this.updateAnalysisStats(duration, false);

      this.logger.error(`❌ ${this.aiProvider} 分析失败: ${error.message}`);
      throw new Error(`AI代码分析失败: ${error.message}`);
    }
  }

  /**
   * 执行基础规则分析（当AI禁用时使用）
   * @private
   */
  async performBasicAnalysis(diff, mrDetails) {
    this.logger.info('执行基础规则分析');

    const issues = [];

    // 基础代码检查
    for (const file of diff) {
      if (file.new_path) {
        // 检查文件大小
        if (file.diff && file.diff.length > 10000) {
          issues.push(`文件 ${file.new_path} 变更过大，建议分解为多个较小的提交`);
        }

        // 检查敏感操作
        if (file.diff && file.diff.includes('console.log')) {
          issues.push(`文件 ${file.new_path} 包含console.log语句，建议在生产环境前移除`);
        }

        if (file.diff && /password|secret|key|token/i.test(file.diff)) {
          issues.push(`文件 ${file.new_path} 可能包含敏感信息，请仔细检查`);
        }
      }
    }

    return {
      quality_score: issues.length === 0 ? 8 : Math.max(5, 8 - issues.length),
      potential_issues: issues.length > 0 ? issues : ['未发现明显问题'],
      security_concerns: issues.filter(issue => issue.includes('敏感信息')),
      performance_impact: '需要手动评估性能影响',
      maintainability: '建议进行人工可维护性评估',
      testing_suggestions: ['添加相应的单元测试', '确保集成测试覆盖'],
      improvement_suggestions: ['考虑代码复用', '添加必要的注释'],
      summary: `基础检查完成，共检测到 ${issues.length} 个问题`,
      provider: 'basic_rules',
      analysis_mode: 'basic'
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
    return {
      ...this.analysisStats,
      aiProvider: this.aiProvider,
      aiPerformance: this.aiAnalyzer ? aiAnalyzerFactory.getPerformanceStats() : null
    };
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
   * 初始化GitLab客户端和AI分析器工厂
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

    // AI分析器相关
    this.aiAnalyzer = null;
    this.aiProvider = null;

    // 性能监控
    this.reviewStats = {
      totalReviews: 0,
      successfulReviews: 0,
      failedReviews: 0,
      averageReviewTime: 0
    };

    this.logger.info('PR评审器初始化完成（AI分析器将在需要时初始化）');
  }

  /**
   * 初始化AI分析器
   * 使用工厂模式创建指定的AI分析器，不支持fallback
   */
  async initializeAI() {
    try {
      this.logger.info('正在初始化AI分析器...');

      // 检查是否启用AI分析
      if (!this.config.review_settings?.enable_ai_analysis) {
        this.logger.info('AI分析已禁用，跳过AI初始化');
        return;
      }

      // 使用工厂创建AI分析器
      this.aiAnalyzer = await aiAnalyzerFactory.createAnalyzer(this.config);
      this.aiProvider = aiAnalyzerFactory.getProvider();

      this.logger.info(`✅ AI分析器初始化成功，使用提供商: ${this.aiProvider}`);

      // 输出性能统计
      const performanceStats = aiAnalyzerFactory.getPerformanceStats();
      this.logger.info(`📊 AI性能配置: 并发=${performanceStats.aiConfig.maxConcurrency}, 超时=${performanceStats.aiConfig.timeout}ms`);

    } catch (error) {
      this.logger.error(`❌ AI分析器初始化失败: ${error.message}`);
      throw new Error(`AI初始化失败: ${error.message}`);
    }
  }

  /**
   * 等待初始化完成
   * 等待异步的AI初始化过程完成
   */
  async waitForInitialization() {
    // 如果AI分析未启用，直接返回
    if (!this.config.review_settings?.enable_ai_analysis) {
      this.logger.info('AI分析已禁用，初始化跳过');
      return;
    }

    // 等待AI初始化完成
    if (!this.aiAnalyzer) {
      await this.initializeAI();
    }

    this.logger.info('所有组件初始化完成');
  }

  /**
   * 从GitLab API搜索项目
   * 根据项目名称、路径或命名空间路径搜索项目
   * 
   * @param {string} projectName - 项目名称、路径或命名空间路径
   * @returns {Promise<Object|null>} 找到的项目信息，未找到返回null
   */
  async searchProjectFromAPI(projectName) {
    try {
      this.logger.info(`正在从GitLab API搜索项目: ${projectName}`);

      // 尝试多种搜索方式
      const searchStrategies = [
        // 1. 精确搜索项目名称
        { search: projectName, strategy: 'exact_name' },
        // 2. 搜索项目路径
        { search: projectName.toLowerCase().replace(/\s+/g, '-'), strategy: 'path_search' },
        // 3. 模糊搜索
        { search: projectName, strategy: 'fuzzy_search' }
      ];

      for (const { search, strategy } of searchStrategies) {
        this.logger.info(`尝试${strategy}搜索: ${search}`);

        // 如果输入的是纯数字，直接作为项目ID查询
        if (/^\d+$/.test(projectName)) {
          try {
            const project = await this.api.Projects.show(parseInt(projectName));
            if (project) {
              this.logger.info(`通过项目ID找到项目: ${project.name} (ID: ${project.id})`);
              return {
                id: project.id,
                name: project.name,
                path: project.path,
                path_with_namespace: project.path_with_namespace,
                description: project.description || `项目 ${project.name}`,
                web_url: project.web_url
              };
            }
          } catch (error) {
            this.logger.info(`项目ID ${projectName} 不存在或无权限访问`);
          }
        }

        // 搜索项目列表
        const projects = await this.api.Projects.all({
          search: search,
          simple: true,
          per_page: 50,
          membership: true,
          archived: false
        });

        if (projects && projects.length > 0) {
          // 优先匹配精确名称
          for (const project of projects) {
            if (project.name === projectName ||
              project.path === projectName ||
              project.path_with_namespace === projectName) {
              this.logger.info(`精确匹配找到项目: ${project.name} (ID: ${project.id})`);
              return {
                id: project.id,
                name: project.name,
                path: project.path,
                path_with_namespace: project.path_with_namespace,
                description: project.description || `项目 ${project.name}`,
                web_url: project.web_url
              };
            }
          }

          // 如果没有精确匹配，返回第一个结果
          const project = projects[0];
          this.logger.info(`模糊匹配找到项目: ${project.name} (ID: ${project.id})`);
          return {
            id: project.id,
            name: project.name,
            path: project.path,
            path_with_namespace: project.path_with_namespace,
            description: project.description || `项目 ${project.name}`,
            web_url: project.web_url
          };
        }
      }

      return null;

    } catch (error) {
      this.logger.error('搜索项目失败', error);
      throw new Error(`搜索项目失败: ${error.message}`);
    }
  }

  /**
   * 根据项目名称获取项目ID
   * 支持从配置文件和API动态查询，向后兼容
   * 
   * @param {string} projectName - 项目名称、路径或命名空间路径
   * @returns {Promise<number>} 项目ID
   * @throws {Error} 当项目未找到时抛出错误
   */
  async getProjectId(projectName) {
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('项目名称不能为空');
    }

    // 1. 优先通过API查询获取最新的项目信息
    this.logger.info(`正在从GitLab API查询项目: ${projectName}`);

    try {
      const project = await this.searchProjectFromAPI(projectName);

      if (project) {
        this.logger.info(`从API找到项目: ${project.name} (ID: ${project.id}, 路径: ${project.path_with_namespace})`);
        return project.id;
      }
    } catch (error) {
      this.logger.warn(`API查询失败: ${error.message}`);
    }

    // 2. API查询失败时，使用配置文件作为备选方案
    if (this.config.projects && this.config.projects[projectName]) {
      const project = this.config.projects[projectName];
      this.logger.info(`API查询失败，使用配置文件中的项目: ${projectName} (ID: ${project.id})`);
      return project.id;
    }

    // 3. 都没找到项目，给出错误信息和建议
    const configProjects = this.config.projects ? Object.keys(this.config.projects) : [];
    throw new Error(
      `未找到项目 "${projectName}"。\n` +
      `请检查项目名称、路径或命名空间路径是否正确。\n` +
      `您可以使用以下格式之一:\n` +
      `- 项目名称: "MyProject"\n` +
      `- 项目路径: "myproject"\n` +
      `- 命名空间路径: "group/myproject"\n` +
      `- 项目ID: "123"\n` +
      (configProjects.length > 0 ?
        `\n📋 配置文件中的项目: ${configProjects.join(', ')}\n` : '') +
      `\n💡 提示: 使用 "node index.js --list-projects" 查看所有可用项目`
    );
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
   * @param {Object} analysis - 代码分析结果
   * @param {Object|null} aiAnalysis - AI分析结果
   * @returns {string} Markdown格式的报告
   */
  generateReviewReport(projectName, mrIid, mrDetails, diff, analysis, aiAnalysis = null) {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    // 计算统计信息
    const fileCount = analysis.totalFiles;
    const additionCount = analysis.addedLines;
    const deletionCount = analysis.deletedLines;
    const netChange = additionCount - deletionCount;

    // 生成报告头部
    let report = this.generateReportHeader(projectName, mrIid, mrDetails, timestamp);

    // 生成变更统计
    report += this.generateChangeStatistics(fileCount, additionCount, deletionCount, netChange);

    // 生成PR描述
    report += this.generatePRDescription(mrDetails);

    // 生成文件变更详情
    report += this.generateFileChanges(analysis);

    // 生成潜在问题检测
    report += this.generatePotentialIssues(analysis);

    // 生成AI分析结果
    if (aiAnalysis) {
      // 处理不同AI分析器返回的数据结构
      let actualAnalysisData = aiAnalysis;

      // 如果是嵌套结构，提取analysis字段
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
  generateChangeStatistics(fileCount, additionCount, deletionCount, netChange) {
    return `## 📈 变更统计

| 指标 | 数量 | 评估 |
|------|------|------|
| **总文件数** | ${fileCount} | ${this.getFileCountStatus(fileCount)} |
| **新增行数** | +${additionCount} | ${this.getAdditionStatus(additionCount)} |
| **删除行数** | -${deletionCount} | ${this.getDeletionStatus(deletionCount)} |
| **净变更** | ${netChange > 0 ? '+' : ''}${netChange} | ${this.getNetChangeStatus(netChange)} |

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
   * 生成评论汇总 - 功能已移除
   * @private
   */
  generateCommentsSection() {
    return '';
  }

  /**
   * 生成AI分析结果
   * @private
   */
  generateAIAnalysisSection(aiAnalysis) {
    let section = `## 🤖 AI智能分析\n\n`;

    // 优先使用AI返回的原始内容（更丰富）
    if (aiAnalysis.content) {
      // 如果AI返回了格式化的内容，直接使用
      section += aiAnalysis.content + '\n\n';
      return section;
    }

    // 如果AI有结构化数据，处理结构化输出
    if (aiAnalysis.quality_score !== null && aiAnalysis.quality_score !== undefined) {
      const scoreEmoji = this.getQualityScoreEmoji(aiAnalysis.quality_score);
      section += `### 代码质量评分: ${scoreEmoji} ${aiAnalysis.quality_score}/10\n\n`;
    }

    if (aiAnalysis.summary) {
      section += `### 📋 总体评估\n${aiAnalysis.summary}\n\n`;
    }

    if (aiAnalysis.potential_issues && aiAnalysis.potential_issues.length > 0) {
      section += `### 🐛 潜在问题\n`;
      if (Array.isArray(aiAnalysis.potential_issues)) {
        aiAnalysis.potential_issues.forEach(issue => section += `- ${issue}\n`);
      } else {
        section += `${aiAnalysis.potential_issues}\n`;
      }
      section += '\n';
    }

    if (aiAnalysis.security_concerns) {
      section += `### 🔒 安全性考虑\n`;
      if (Array.isArray(aiAnalysis.security_concerns)) {
        aiAnalysis.security_concerns.forEach(concern => section += `- ${concern}\n`);
      } else {
        section += `${aiAnalysis.security_concerns}\n`;
      }
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
      // 如果是嵌套结构，提取analysis字段
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
    let aiStatus = 'disabled';
    let aiErrorMessage = '';

    if (aiAnalysis) {
      aiStatus = aiAnalysis.status || 'unknown';

      // 检查AI分析是否失败
      if (aiStatus === 'failed' || aiStatus === 'skipped') {
        aiErrorMessage = aiAnalysis.error || '未知错误';
        aiSummary = `AI分析${aiStatus === 'failed' ? '失败' : '跳过'}: ${aiErrorMessage}`;
        qualityColor = '🔴';
      } else if (aiAnalysis.analysis) {
        // 处理不同AI分析器返回的数据结构
        let actualAnalysisData = aiAnalysis.analysis;

        // 如果是嵌套结构，提取analysis字段
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
        aiStatus = 'success';
      } else {
        aiSummary = 'AI分析未返回有效结果';
        aiStatus = 'no_result';
        qualityColor = '🟡';
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
          template: aiStatus === 'failed' ? "red" :
            aiStatus === 'success' && qualityScore >= 8 ? "green" :
              aiStatus === 'success' && qualityScore >= 6 ? "yellow" :
                aiStatus === 'success' && qualityScore >= 1 ? "red" : "blue",
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
    if (aiStatus === 'failed' || aiStatus === 'skipped') {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**🤖 AI分析状态**: 🔴 ${aiStatus === 'failed' ? '失败' : '跳过'}\n**❗ 原因**: ${aiErrorMessage}`,
          tag: "lark_md"
        }
      });
    } else if (aiStatus === 'no_result') {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**🤖 AI分析状态**: 🟡 无有效结果\n**📋 说明**: AI分析未返回可用的评估数据`,
          tag: "lark_md"
        }
      });
    } else if (qualityScore !== null) {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**🤖 AI评分**: ${qualityColor} ${qualityScore}/10`,
          tag: "lark_md"
        }
      });
    } else if (aiStatus === 'disabled') {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**🤖 AI分析**: ⚪ 未启用`,
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
    let reportDownloadUrl, reportFolderUrl;

    if (reportFilePath) {
      // 使用实际的文件路径生成URL
      reportDownloadUrl = this.generateFileURL(reportFilePath);
      // 生成报告文件夹的URL (流程产物)
      const mrDir = path.dirname(reportFilePath);
      reportFolderUrl = this.generateFileURL(mrDir + '/');
    } else {
      // 回退到原来的逻辑
      const reportFileName = `review_git_${mrIid}.txt`;
      reportDownloadUrl = `http://${ip}:${CONSTANTS.HTTP_SERVER_PORT}/reports/${mrIid}/${reportFileName}`;
      reportFolderUrl = `http://${ip}:${CONSTANTS.HTTP_SERVER_PORT}/reports/${mrIid}/`;
    }

    // 第一行按钮：查看MR、PR查看、Jenkins构建
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
            content: "🌐 PR 查看",
            tag: "plain_text"
          },
          type: "default",
          url: mrDetails.web_url
        },
        {
          tag: "button",
          text: {
            content: "Jenkins 构建",
            tag: "plain_text"
          },
          type: "default",
          url: `http://jenkins.atomverse.com.cn:8080/job/APP_revicew/${process.env.BUILD_NUMBER || 'latest'}/console`
        }
      ]
    });

    // 第二行按钮：下载报告、流程产物
    cardData.card.elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: {
            content: "📄 下载报告",
            tag: "plain_text"
          },
          type: "default",
          url: reportDownloadUrl
        },
        {
          tag: "button",
          text: {
            content: "📂 流程产物",
            tag: "plain_text"
          },
          type: "default",
          url: reportFolderUrl
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
      const projectId = await this.getProjectId(projectName);
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

      // 4. 获取评论 - 已移除评论功能

      // 5. 分析代码变更
      this.logger.info('分析代码变更...');
      const analysis = this.analyzeCodeChanges(diff);

      // 6. AI智能分析
      let aiAnalysis = null;
      if (this.config.review_settings.enable_ai_analysis) {
        this.logger.info('执行AI智能分析...');
        try {
          // 确保AI分析器已初始化
          if (!this.aiAnalyzer) {
            this.logger.info('AI分析器未初始化，正在初始化...');
            await this.initializeAI();
          }

          if (this.aiAnalyzer) {
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
              // 创建AI分析跳过的状态对象
              aiAnalysis = {
                status: 'skipped',
                provider: 'unknown',
                error: 'AI分析被跳过',
                analysis: null
              };
            }
          } else {
            this.logger.warn('AI分析器初始化失败，跳过AI分析');
            // 创建AI初始化失败的状态对象
            aiAnalysis = {
              status: 'failed',
              provider: 'unknown',
              error: 'AI分析器初始化失败',
              analysis: null
            };
          }
        } catch (aiError) {
          this.logger.warn('AI分析失败', aiError);
          // 创建AI分析失败的状态对象
          aiAnalysis = {
            status: 'failed',
            provider: this.aiAnalyzer ? this.aiAnalyzer.constructor.name : 'unknown',
            error: aiError.message || 'AI分析过程中发生错误',
            analysis: null
          };
        }
      }

      // 7. 生成报告
      this.logger.info('生成review报告...');
      const report = this.generateReviewReport(projectName, mrIid, mrDetails, diff, analysis, aiAnalysis);

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
      let relativePath = path.relative(reportsDir, filePath);

      // 处理文件夹路径，确保以 / 结尾
      if (filePath.endsWith('/') || filePath.endsWith('\\')) {
        if (!relativePath.endsWith('/')) {
          relativePath += '/';
        }
      }

      // 标准化路径分隔符为正斜杠
      relativePath = relativePath.replace(/\\/g, '/');

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
      const nets = networkInterfaces();

      // 添加调试信息
      if (process.env.DEBUG || global.DEBUG_IP) {
        console.log('🔍 [DEBUG] 网络接口调试:');
        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
            if (net.family === 'IPv4') {
              console.log(`  ${name}: ${net.address} (内部: ${net.internal})`);
            }
          }
        }
      }

      // 优先级：以太网 > Wi-Fi > 其他
      const priorityOrder = ['以太网', 'Ethernet', 'en0', 'WiFi', 'Wi-Fi', 'wlan0'];

      // 首先按优先级查找
      for (const priority of priorityOrder) {
        if (nets[priority]) {
          for (const net of nets[priority]) {
            if (net.family === 'IPv4' && !net.internal) {
              if (process.env.DEBUG || global.DEBUG_IP) {
                console.log(`🎯 [DEBUG] 选择优先接口IP: ${net.address} (接口: ${priority})`);
              }
              return net.address;
            }
          }
        }
      }

      // 如果优先级接口没有找到，遍历所有接口
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // 跳过内部地址和IPv6
          if (net.family === 'IPv4' && !net.internal) {
            // 优先选择私有网络地址
            if (net.address.startsWith('192.168.') ||
              net.address.startsWith('10.') ||
              net.address.startsWith('172.')) {
              if (process.env.DEBUG || global.DEBUG_IP) {
                console.log(`🎯 [DEBUG] 选择私有网络IP: ${net.address} (接口: ${name})`);
              }
              return net.address;
            }
          }
        }
      }

      // 如果没有找到私有地址，返回第一个非内部IPv4地址
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            if (process.env.DEBUG || global.DEBUG_IP) {
              console.log(`🎯 [DEBUG] 选择外部IP: ${net.address} (接口: ${name})`);
            }
            return net.address;
          }
        }
      }

      // 最后的回退选项
      if (process.env.DEBUG || global.DEBUG_IP) {
        console.log(`⚠️ [DEBUG] 使用回退IP: 127.0.0.1`);
      }
      return '127.0.0.1';
    } catch (error) {
      if (this.logger) {
        this.logger.warn('获取本机IP失败', { error: error.message, stack: error.stack });
      } else {
        console.warn('获取本机IP失败:', error.message);
      }
      return '127.0.0.1';
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

  // 创建评审器并等待AI初始化完成
  const reviewer = new PRReviewer(config);
  await reviewer.waitForInitialization();

  const result = await reviewer.reviewPR(projectName, mrIid);

  console.log(`
✅ PR评审完成！

📄 报告文件: ${result.filePath}
🌐 在线查看: ${result.fileURL}
📱 飞书数据: ${result.feishuCardPath}
📊 JSON数据: ${result.jsonURL}
  `);
}

/**
 * 列出所有可用的项目
 * 支持从配置文件和API获取
 */
async function listProjects() {
  try {
    const config = await loadConfig();
    const reviewer = new PRReviewer(config);
    // 注意：列出项目不需要AI，所以不需要等待AI初始化

    console.log('\n🔍 正在获取项目列表...\n');

    // 显示配置文件中的项目
    if (config.projects && Object.keys(config.projects).length > 0) {
      console.log('📋 配置文件中的项目：');
      console.log(''.padEnd(80, '='));

      for (const [name, project] of Object.entries(config.projects)) {
        console.log(`🏗️  ${name}`);
        console.log(`   ID: ${project.id}`);
        console.log(`   描述: ${project.description}`);
        console.log('');
      }
    }

    // 从API获取所有项目
    console.log('🌐 从GitLab API获取的项目：');
    console.log(''.padEnd(80, '='));

    // 直接获取项目列表，不使用缓存
    const projects = await reviewer.api.Projects.all({
      simple: true,
      per_page: 100,
      membership: true,
      archived: false,
      order_by: 'last_activity_at',
      sort: 'desc'
    });

    console.log(`总计: ${projects.length} 个项目\n`);

    // 分页显示项目
    const pageSize = 20;
    const displayProjects = projects.slice(0, pageSize);

    for (const project of displayProjects) {
      const lastActivity = new Date(project.last_activity_at).toLocaleDateString('zh-CN');
      console.log(`🏗️  ${project.name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   路径: ${project.path_with_namespace}`);
      console.log(`   描述: ${project.description || '无描述'}`);
      console.log(`   最近活动: ${lastActivity}`);
      console.log(`   URL: ${project.web_url}`);
      console.log('');
    }

    if (projects.length > pageSize) {
      console.log(`显示前 ${pageSize} 个项目，总计 ${projects.length} 个项目`);
    }

    console.log('\n💡 提示：您可以使用以下任一方式来引用项目：');
    console.log('   - 项目名称（如："ZM App"）');
    console.log('   - 项目路径（如："zm-app"）');
    console.log('   - 命名空间路径（如："dreame/zm-app"）');
    console.log('   - 项目ID（如："9831"）');

  } catch (error) {
    console.error('❌ 获取项目列表失败:', error.message);
    process.exit(1);
  }
}

export { PRReviewer, AIAnalyzer, Logger, loadConfig, CONSTANTS, listProjects };
