#!/usr/bin/env node

/**
 * 优化后的AI分析器基类
 * 
 * 提供统一的AI分析器接口和性能优化功能：
 * - 智能请求调度和负载均衡
 * - 自适应超时和重试机制
 * - 连接池管理和资源复用
 * - 实时性能监控和异常处理
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @license MIT
 */

import { EventEmitter } from 'events';
import PerformanceOptimizer from './performance-optimizer.js';

/**
 * AI分析器基类
 */
class OptimizedAIAnalyzer extends EventEmitter {
  constructor(config = {}, analyzerType = 'base') {
    super();

    this.analyzerType = analyzerType;
    this.config = config;

    // 性能优化器
    this.performanceOptimizer = new PerformanceOptimizer({
      maxConcurrency: config.maxConcurrency || 3,
      batchSize: config.batchSize || 2,
      requestTimeout: config.timeout || 30000,
      enableCache: config.enableCache !== false,
      cacheMaxSize: config.cacheMaxSize || 500,
      cacheTTL: config.cacheTTL || 1800000 // 30分钟
    });

    // 分析状态
    this.analysisStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastAnalysisTime: null,
      errorsByType: new Map(),
      performanceHistory: []
    };

    // 请求队列和限流
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrentRequests = config.maxConcurrent || 3;

    // 错误追踪
    this.errorTracker = new ErrorTracker();

    // 设置性能监控
    this.setupPerformanceMonitoring();

    console.log(`🚀 ${analyzerType} AI分析器已初始化`);
  }

  /**
   * 设置性能监控
   */
  setupPerformanceMonitoring() {
    this.performanceOptimizer.on('bottlenecks:detected', (bottlenecks) => {
      console.warn(`⚠️ ${this.analyzerType} 检测到性能瓶颈:`, bottlenecks);
      this.emit('performance:bottlenecks', {
        analyzer: this.analyzerType,
        bottlenecks
      });
    });

    this.performanceOptimizer.on('performance:alert', (alert) => {
      console.warn(`🚨 ${this.analyzerType} 性能告警:`, alert);
      this.emit('performance:alert', {
        analyzer: this.analyzerType,
        alert
      });
    });
  }

  /**
   * 主要分析方法（需要子类实现）
   */
  async analyze(diff, mrDetails, options = {}) {
    throw new Error('analyze方法需要在子类中实现');
  }

  /**
   * 智能并发分析
   */
  async analyzeWithOptimization(diffs, mrDetails, options = {}) {
    const startTime = Date.now();

    try {
      // 预处理：过滤和优化分析任务
      const tasks = await this.preprocessAnalysisTasks(diffs, mrDetails, options);

      if (tasks.length === 0) {
        return this.createEmptyAnalysisResult();
      }

      // 使用性能优化器进行并发处理
      const results = await this.performanceOptimizer.processTasksConcurrently(
        tasks,
        async (task) => {
          const cacheKey = this.generateCacheKey(task.diff, mrDetails);

          // 尝试从缓存获取
          const cached = await this.performanceOptimizer.getCached(cacheKey);
          if (cached) {
            this.performanceOptimizer.recordCacheHit();
            return cached;
          }

          this.performanceOptimizer.recordCacheMiss();

          // 执行实际分析
          const result = await this.executeAnalysis(task.diff, mrDetails, task.options);

          // 缓存结果
          if (result && !result.error) {
            await this.performanceOptimizer.setCached(cacheKey, result, this.config.cacheTTL);
          }

          return result;
        }
      );

      // 合并和后处理结果
      const finalResult = await this.postprocessAnalysisResults(results, mrDetails);

      // 更新性能指标
      const duration = Date.now() - startTime;
      this.updateAnalysisStats(duration, true);
      this.performanceOptimizer.recordRequest(true, duration);

      return finalResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateAnalysisStats(duration, false, error);
      this.performanceOptimizer.recordRequest(false, duration, error);

      console.error(`❌ ${this.analyzerType} 分析失败:`, error.message);

      // 返回错误结果而不是抛出异常
      return this.createErrorAnalysisResult(error);
    }
  }

  /**
   * 预处理分析任务
   */
  async preprocessAnalysisTasks(diffs, mrDetails, options) {
    if (!Array.isArray(diffs)) {
      diffs = [diffs];
    }

    const tasks = [];

    for (const diff of diffs) {
      // 过滤无效或空的diff
      if (!diff || !diff.content || diff.content.trim().length === 0) {
        continue;
      }

      // 跳过过大的文件
      if (diff.content.length > (options.maxDiffSize || 50000)) {
        console.warn(`⚠️ 跳过过大文件: ${diff.fileName} (${diff.content.length} 字符)`);
        continue;
      }

      // 跳过二进制文件
      if (this.isBinaryFile(diff.fileName || '')) {
        continue;
      }

      tasks.push({
        diff: diff,
        options: { ...options, fileName: diff.fileName }
      });
    }

    return tasks;
  }

  /**
   * 后处理分析结果
   */
  async postprocessAnalysisResults(results, mrDetails) {
    const successfulResults = results
      .filter(r => r.status === 'fulfilled' && r.value && !r.value.error)
      .map(r => r.value);

    const failedResults = results
      .filter(r => r.status === 'rejected' || (r.value && r.value.error));

    // 记录失败结果
    failedResults.forEach(result => {
      const error = result.error || result.value?.error;
      this.errorTracker.recordError(error);
    });

    if (successfulResults.length === 0) {
      return this.createEmptyAnalysisResult();
    }

    // 合并所有成功的分析结果
    return this.mergeAnalysisResults(successfulResults, mrDetails);
  }

  /**
   * 合并分析结果
   */
  mergeAnalysisResults(results, mrDetails) {
    const merged = {
      qualityScore: 0,
      riskLevel: 'low',
      issues: [],
      suggestions: [],
      summary: '',
      analysisTime: Date.now(),
      filesAnalyzed: results.length,
      analyzer: this.analyzerType
    };

    // 计算平均质量分数
    const scores = results.map(r => r.qualityScore || 7).filter(s => s > 0);
    merged.qualityScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
      : 7;

    // 合并问题和建议
    results.forEach(result => {
      if (result.issues) {
        merged.issues.push(...result.issues);
      }
      if (result.suggestions) {
        merged.suggestions.push(...result.suggestions);
      }
    });

    // 去重并限制数量
    merged.issues = this.deduplicateArray(merged.issues).slice(0, 20);
    merged.suggestions = this.deduplicateArray(merged.suggestions).slice(0, 15);

    // 确定风险级别
    merged.riskLevel = this.calculateRiskLevel(merged.qualityScore, merged.issues.length);

    // 生成总结
    merged.summary = this.generateSummary(merged, mrDetails);

    return merged;
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(diff, mrDetails) {
    const content = diff.content || '';
    const fileName = diff.fileName || '';
    const hash = require('crypto')
      .createHash('md5')
      .update(`${this.analyzerType}_${fileName}_${content}`)
      .digest('hex');

    return `analysis_${hash}`;
  }

  /**
   * 执行分析（需要子类实现具体逻辑）
   */
  async executeAnalysis(diff, mrDetails, options) {
    // 默认实现，子类应该重写此方法
    return {
      qualityScore: 7,
      riskLevel: 'medium',
      issues: [],
      suggestions: ['请在子类中实现具体的分析逻辑'],
      summary: '基础分析完成',
      analyzer: this.analyzerType
    };
  }

  /**
   * 智能重试机制
   */
  async executeWithRetry(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          break;
        }

        // 检查是否应该重试
        if (!this.shouldRetry(error)) {
          break;
        }

        // 指数退避延迟
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`🔄 ${this.analyzerType} 重试 ${attempt}/${maxRetries}，延迟 ${delay}ms`);

        await this.delay(delay);
      }
    }

    throw lastError;
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
      'timeout',
      '429', // Rate limit
      '500', // Server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504'  // Gateway timeout
    ];

    return retryableErrors.some(pattern =>
      error.message.toLowerCase().includes(pattern.toLowerCase()) ||
      error.code === pattern ||
      (error.status && error.status.toString() === pattern)
    );
  }

  /**
   * 更新分析统计
   */
  updateAnalysisStats(duration, success, error = null) {
    this.analysisStats.totalRequests++;
    this.analysisStats.lastAnalysisTime = Date.now();

    if (success) {
      this.analysisStats.successfulRequests++;
    } else {
      this.analysisStats.failedRequests++;

      if (error) {
        const errorType = error.constructor.name;
        this.analysisStats.errorsByType.set(errorType,
          (this.analysisStats.errorsByType.get(errorType) || 0) + 1);
      }
    }

    // 更新平均响应时间
    const totalTime = this.analysisStats.averageResponseTime *
      (this.analysisStats.totalRequests - 1) + duration;
    this.analysisStats.averageResponseTime = totalTime / this.analysisStats.totalRequests;

    // 记录性能历史
    this.analysisStats.performanceHistory.push({
      timestamp: Date.now(),
      duration,
      success,
      error: error ? error.message : null
    });

    // 保持最近100条记录
    if (this.analysisStats.performanceHistory.length > 100) {
      this.analysisStats.performanceHistory =
        this.analysisStats.performanceHistory.slice(-100);
    }
  }

  /**
   * 检查是否为二进制文件
   */
  isBinaryFile(fileName) {
    const binaryExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico',
      '.pdf', '.zip', '.tar', '.gz', '.rar',
      '.exe', '.dll', '.so', '.dylib',
      '.mp3', '.mp4', '.avi', '.mov',
      '.woff', '.woff2', '.ttf', '.eot'
    ];

    return binaryExtensions.some(ext =>
      fileName.toLowerCase().endsWith(ext)
    );
  }

  /**
   * 数组去重
   */
  deduplicateArray(array) {
    return Array.from(new Set(array.map(item =>
      typeof item === 'string' ? item : JSON.stringify(item)
    ))).map(item => {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    });
  }

  /**
   * 计算风险级别
   */
  calculateRiskLevel(qualityScore, issueCount) {
    if (qualityScore >= 8 && issueCount <= 2) {
      return 'low';
    } else if (qualityScore >= 6 && issueCount <= 5) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * 生成分析总结
   */
  generateSummary(analysis, mrDetails) {
    const { qualityScore, issues, suggestions, filesAnalyzed } = analysis;

    const parts = [
      `${this.analyzerType}分析完成`,
      `分析了${filesAnalyzed}个文件`,
      `代码质量评分: ${qualityScore}/10`,
      `发现${issues.length}个问题`,
      `提供${suggestions.length}条建议`
    ];

    if (qualityScore >= 8) {
      parts.push('代码质量良好');
    } else if (qualityScore >= 6) {
      parts.push('代码质量一般，建议优化');
    } else {
      parts.push('代码质量需要改进');
    }

    return parts.join('，');
  }

  /**
   * 创建空分析结果
   */
  createEmptyAnalysisResult() {
    return {
      qualityScore: 7,
      riskLevel: 'low',
      issues: [],
      suggestions: ['没有发现明显问题'],
      summary: '未发现需要分析的代码变更',
      analysisTime: Date.now(),
      filesAnalyzed: 0,
      analyzer: this.analyzerType
    };
  }

  /**
   * 创建错误分析结果
   */
  createErrorAnalysisResult(error) {
    return {
      qualityScore: 5,
      riskLevel: 'medium',
      issues: [`分析过程中发生错误: ${error.message}`],
      suggestions: ['建议检查代码变更或联系管理员'],
      summary: `${this.analyzerType}分析失败`,
      analysisTime: Date.now(),
      filesAnalyzed: 0,
      analyzer: this.analyzerType,
      error: error.message
    };
  }

  /**
   * 获取分析器状态
   */
  getStatus() {
    return {
      analyzer: this.analyzerType,
      stats: { ...this.analysisStats },
      performance: this.performanceOptimizer.getPerformanceReport(),
      errors: this.errorTracker.getErrorSummary(),
      health: this.getHealthStatus()
    };
  }

  /**
   * 获取健康状态
   */
  getHealthStatus() {
    const stats = this.analysisStats;
    const successRate = stats.totalRequests > 0
      ? stats.successfulRequests / stats.totalRequests
      : 1;

    let status = 'healthy';
    const issues = [];

    if (successRate < 0.8) {
      status = 'degraded';
      issues.push(`成功率较低: ${(successRate * 100).toFixed(1)}%`);
    }

    if (stats.averageResponseTime > 10000) {
      status = 'degraded';
      issues.push(`响应时间过长: ${Math.round(stats.averageResponseTime)}ms`);
    }

    if (this.errorTracker.getRecentErrorRate() > 0.2) {
      status = 'unhealthy';
      issues.push('近期错误率过高');
    }

    return {
      status,
      successRate,
      averageResponseTime: stats.averageResponseTime,
      issues
    };
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      // 子类应该实现具体的连接测试逻辑
      return true;
    } catch (error) {
      console.error(`${this.analyzerType} 连接测试失败:`, error.message);
      return false;
    }
  }

  /**
   * 延迟工具方法
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 关闭分析器
   */
  async shutdown() {
    this.performanceOptimizer.shutdown();
    console.log(`🛑 ${this.analyzerType} AI分析器已关闭`);
  }
}

/**
 * 错误追踪器
 */
class ErrorTracker {
  constructor() {
    this.errors = [];
    this.errorCounts = new Map();
    this.maxErrors = 1000;
  }

  recordError(error) {
    const errorInfo = {
      timestamp: Date.now(),
      message: error?.message || String(error),
      type: error?.constructor?.name || 'Unknown',
      stack: error?.stack
    };

    this.errors.push(errorInfo);

    // 保持最近的错误记录
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // 统计错误类型
    this.errorCounts.set(errorInfo.type,
      (this.errorCounts.get(errorInfo.type) || 0) + 1);
  }

  getRecentErrorRate(timeWindow = 300000) { // 5分钟
    const now = Date.now();
    const recentErrors = this.errors.filter(e =>
      now - e.timestamp < timeWindow
    );

    // 简化计算：假设在时间窗口内有固定数量的请求
    const estimatedRequests = Math.max(10, recentErrors.length * 2);
    return recentErrors.length / estimatedRequests;
  }

  getErrorSummary() {
    const recentErrors = this.errors.slice(-10);

    return {
      totalErrors: this.errors.length,
      recentErrors: recentErrors.length,
      errorsByType: Object.fromEntries(this.errorCounts),
      recentErrorRate: this.getRecentErrorRate(),
      lastError: this.errors.length > 0 ? this.errors[this.errors.length - 1] : null
    };
  }
}

export { OptimizedAIAnalyzer };
export default OptimizedAIAnalyzer;
