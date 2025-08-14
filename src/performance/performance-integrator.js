#!/usr/bin/env node

/**
 * 性能优化集成器 - 整合所有性能优化组件
 * 
 * 将性能优化功能集成到现有的PR评审系统中：
 * - 性能监控和分析
 * - 智能缓存管理
 * - 并发控制优化
 * - AI分析器性能提升
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @license MIT
 */

import PerformanceOptimizer from './performance-optimizer.js';
import ConcurrencyManager from './concurrency-manager.js';
import CacheManager from './cache-manager.js';
import PerformanceMonitor from './performance-monitor.js';
import OptimizedAIAnalyzer from './optimized-ai-analyzer.js';

/**
 * 性能优化集成器
 */
class PerformanceIntegrator {
  constructor(options = {}) {
    this.config = {
      // 全局性能配置
      enableOptimization: options.enableOptimization !== false,
      enableMonitoring: options.enableMonitoring !== false,
      enableCaching: options.enableCaching !== false,

      // 性能目标
      targetResponseTime: options.targetResponseTime || 5000, // 5秒
      targetThroughput: options.targetThroughput || 10, // 10 req/min
      targetErrorRate: options.targetErrorRate || 0.05, // 5%
      targetCacheHitRate: options.targetCacheHitRate || 0.8, // 80%

      // 优化策略
      aggressiveOptimization: options.aggressiveOptimization === true,
      adaptiveOptimization: options.adaptiveOptimization !== false,

      // 监控配置
      monitoringInterval: options.monitoringInterval || 60000, // 1分钟
      reportingInterval: options.reportingInterval || 3600000, // 1小时

      // 组件配置
      performanceOptimizer: options.performanceOptimizer || {},
      concurrencyManager: options.concurrencyManager || {},
      cacheManager: options.cacheManager || {},
      performanceMonitor: options.performanceMonitor || {}
    };

    // 初始化组件
    this.components = {};
    this.metrics = {
      integrationStartTime: Date.now(),
      optimizationEvents: [],
      performanceGains: {},
      systemHealth: 'healthy'
    };

    this.initialize();
  }

  /**
   * 初始化性能优化系统
   */
  async initialize() {
    try {
      console.log('🚀 启动性能优化集成器...');

      // 初始化性能监控器
      if (this.config.enableMonitoring) {
        this.components.monitor = new PerformanceMonitor({
          enableRealTimeMonitoring: true,
          monitoringInterval: this.config.monitoringInterval,
          reportInterval: this.config.reportingInterval,
          ...this.config.performanceMonitor
        });
      }

      // 初始化缓存管理器
      if (this.config.enableCaching) {
        this.components.cache = new CacheManager({
          enabled: true,
          l1: { enabled: true, maxSize: 1000, ttl: 300000 },
          l2: { enabled: false }, // Redis可选
          l3: { enabled: true, directory: './cache/performance' },
          ...this.config.cacheManager
        });

        await this.components.cache.initialize();
      }

      // 初始化并发管理器
      this.components.concurrency = new ConcurrencyManager({
        maxConcurrency: 5,
        batchSize: 3,
        adaptiveConcurrency: this.config.adaptiveOptimization,
        autoTuning: this.config.aggressiveOptimization,
        ...this.config.concurrencyManager
      });

      // 初始化性能优化器
      this.components.optimizer = new PerformanceOptimizer({
        maxConcurrency: 5,
        enableCache: this.config.enableCaching,
        cacheManager: this.components.cache,
        ...this.config.performanceOptimizer
      });

      // 设置组件间的事件通信
      this.setupComponentCommunication();

      // 启动性能调优
      if (this.config.adaptiveOptimization) {
        this.startAdaptiveOptimization();
      }

      console.log('✅ 性能优化集成器启动完成');

    } catch (error) {
      console.error('❌ 性能优化集成器启动失败:', error.message);
      throw error;
    }
  }

  /**
   * 设置组件间通信
   */
  setupComponentCommunication() {
    // 监控器事件处理
    if (this.components.monitor) {
      this.components.monitor.on?.('performance:alerts', (alerts) => {
        this.handlePerformanceAlerts(alerts);
      });
    }

    // 优化器事件处理
    this.components.optimizer.on?.('bottlenecks:detected', (bottlenecks) => {
      this.handleBottlenecks(bottlenecks);
    });

    // 并发管理器事件处理
    this.components.concurrency.on?.('metrics:updated', (metrics) => {
      this.handleConcurrencyMetrics(metrics);
    });
  }

  /**
   * 处理性能告警
   */
  handlePerformanceAlerts(alerts) {
    console.warn('⚠️ 收到性能告警:', alerts.length);

    alerts.forEach(alert => {
      switch (alert.type) {
        case 'high_response_time':
          this.optimizeResponseTime();
          break;
        case 'high_error_rate':
          this.optimizeErrorHandling();
          break;
        case 'high_memory_usage':
          this.optimizeMemoryUsage();
          break;
        case 'low_cache_hit_rate':
          this.optimizeCaching();
          break;
      }
    });
  }

  /**
   * 处理瓶颈
   */
  handleBottlenecks(bottlenecks) {
    console.warn('🔍 检测到性能瓶颈:', bottlenecks.length);

    bottlenecks.forEach(bottleneck => {
      this.metrics.optimizationEvents.push({
        timestamp: Date.now(),
        type: 'bottleneck',
        severity: bottleneck.severity,
        metric: bottleneck.type,
        value: bottleneck.metric,
        actions: bottleneck.recommendations
      });
    });
  }

  /**
   * 处理并发指标
   */
  handleConcurrencyMetrics(metrics) {
    // 记录并发性能指标
    if (this.components.monitor) {
      this.components.monitor.recordBusinessMetrics?.('concurrency', {
        throughput: metrics.throughput,
        utilization: metrics.concurrencyUtilization,
        errorRate: metrics.errorRate
      });
    }
  }

  /**
   * 启动自适应优化
   */
  startAdaptiveOptimization() {
    console.log('🧠 启动自适应性能优化...');

    // 每5分钟进行一次性能评估和调优
    setInterval(() => {
      this.performAdaptiveOptimization();
    }, 300000);
  }

  /**
   * 执行自适应优化
   */
  async performAdaptiveOptimization() {
    try {
      console.log('🔄 执行自适应性能优化...');

      const currentMetrics = this.getCurrentPerformanceMetrics();
      const optimizations = this.analyzeOptimizationOpportunities(currentMetrics);

      for (const optimization of optimizations) {
        await this.applyOptimization(optimization);
      }

      console.log(`✅ 自适应优化完成，应用了 ${optimizations.length} 项优化`);

    } catch (error) {
      console.error('自适应优化失败:', error.message);
    }
  }

  /**
   * 获取当前性能指标
   */
  getCurrentPerformanceMetrics() {
    const metrics = {};

    // 从监控器获取实时状态
    if (this.components.monitor) {
      const status = this.components.monitor.getRealTimeStatus?.();
      if (status) {
        metrics.responseTime = status.stats.averageResponseTime;
        metrics.errorRate = status.stats.errorRate;
        metrics.memoryUsage = status.stats.memoryUsage;
        metrics.cacheHitRate = status.stats.cacheHitRate;
      }
    }

    // 从并发管理器获取状态
    const concurrencyStatus = this.components.concurrency.getStatus?.();
    if (concurrencyStatus) {
      metrics.throughput = concurrencyStatus.metrics.throughput;
      metrics.concurrencyUtilization = concurrencyStatus.metrics.concurrencyUtilization;
    }

    // 从优化器获取报告
    const optimizerReport = this.components.optimizer.getPerformanceReport?.();
    if (optimizerReport) {
      metrics.requestsPerMinute = optimizerReport.summary.totalRequests;
      metrics.successRate = optimizerReport.summary.successRate;
    }

    return metrics;
  }

  /**
   * 分析优化机会
   */
  analyzeOptimizationOpportunities(metrics) {
    const optimizations = [];

    // 响应时间优化
    if (metrics.responseTime > this.config.targetResponseTime) {
      optimizations.push({
        type: 'response_time',
        priority: 'high',
        currentValue: metrics.responseTime,
        targetValue: this.config.targetResponseTime,
        action: 'increase_concurrency'
      });
    }

    // 吞吐量优化
    if (metrics.throughput < this.config.targetThroughput) {
      optimizations.push({
        type: 'throughput',
        priority: 'medium',
        currentValue: metrics.throughput,
        targetValue: this.config.targetThroughput,
        action: 'optimize_batching'
      });
    }

    // 错误率优化
    if (metrics.errorRate > this.config.targetErrorRate) {
      optimizations.push({
        type: 'error_rate',
        priority: 'high',
        currentValue: metrics.errorRate,
        targetValue: this.config.targetErrorRate,
        action: 'enhance_retry_logic'
      });
    }

    // 缓存命中率优化
    if (metrics.cacheHitRate < this.config.targetCacheHitRate) {
      optimizations.push({
        type: 'cache_hit_rate',
        priority: 'medium',
        currentValue: metrics.cacheHitRate,
        targetValue: this.config.targetCacheHitRate,
        action: 'optimize_cache_strategy'
      });
    }

    return optimizations;
  }

  /**
   * 应用优化措施
   */
  async applyOptimization(optimization) {
    console.log(`🔧 应用优化: ${optimization.type} (${optimization.priority})`);

    switch (optimization.action) {
      case 'increase_concurrency':
        this.increaseConcurrency();
        break;
      case 'optimize_batching':
        this.optimizeBatching();
        break;
      case 'enhance_retry_logic':
        this.enhanceRetryLogic();
        break;
      case 'optimize_cache_strategy':
        this.optimizeCacheStrategy();
        break;
    }

    // 记录优化事件
    this.metrics.optimizationEvents.push({
      timestamp: Date.now(),
      type: 'optimization_applied',
      optimization: optimization.type,
      action: optimization.action,
      priority: optimization.priority
    });
  }

  /**
   * 优化响应时间
   */
  optimizeResponseTime() {
    console.log('⚡ 优化响应时间...');

    // 增加并发数
    if (this.components.concurrency.config.maxConcurrency < 8) {
      this.components.concurrency.config.maxConcurrency++;
      console.log(`📈 增加并发数到 ${this.components.concurrency.config.maxConcurrency}`);
    }

    // 启用更积极的缓存策略
    if (this.components.cache) {
      this.components.cache.config.l1.maxSize = Math.min(2000,
        this.components.cache.config.l1.maxSize * 1.2);
      console.log('💾 增加L1缓存大小');
    }
  }

  /**
   * 优化错误处理
   */
  optimizeErrorHandling() {
    console.log('🛡️ 优化错误处理...');

    // 增加重试次数
    if (this.components.concurrency.config.maxRetries < 5) {
      this.components.concurrency.config.maxRetries++;
      console.log(`🔄 增加重试次数到 ${this.components.concurrency.config.maxRetries}`);
    }

    // 延长超时时间
    if (this.components.concurrency.config.defaultTimeout < 60000) {
      this.components.concurrency.config.defaultTimeout *= 1.2;
      console.log(`⏰ 增加超时时间到 ${this.components.concurrency.config.defaultTimeout}ms`);
    }
  }

  /**
   * 优化内存使用
   */
  optimizeMemoryUsage() {
    console.log('🧹 优化内存使用...');

    // 减少缓存大小
    if (this.components.cache) {
      this.components.cache.config.l1.maxSize = Math.max(500,
        this.components.cache.config.l1.maxSize * 0.8);
      console.log('💾 减少L1缓存大小');

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
        console.log('🗑️ 执行垃圾回收');
      }
    }
  }

  /**
   * 优化缓存策略
   */
  optimizeCaching() {
    console.log('💾 优化缓存策略...');

    if (this.components.cache) {
      // 延长缓存TTL
      this.components.cache.config.l1.ttl = Math.min(1800000,
        this.components.cache.config.l1.ttl * 1.2);

      // 增加缓存容量
      this.components.cache.config.l1.maxSize = Math.min(2000,
        this.components.cache.config.l1.maxSize * 1.1);

      console.log('💾 优化缓存TTL和容量');
    }
  }

  /**
   * 增加并发数
   */
  increaseConcurrency() {
    if (this.components.concurrency.config.maxConcurrency < 10) {
      this.components.concurrency.config.maxConcurrency++;
      console.log(`📈 增加最大并发数到 ${this.components.concurrency.config.maxConcurrency}`);
    }
  }

  /**
   * 优化批处理
   */
  optimizeBatching() {
    if (this.components.concurrency.config.batchSize < 5) {
      this.components.concurrency.config.batchSize++;
      console.log(`📦 增加批处理大小到 ${this.components.concurrency.config.batchSize}`);
    }
  }

  /**
   * 增强重试逻辑
   */
  enhanceRetryLogic() {
    if (this.components.concurrency.config.maxRetries < 5) {
      this.components.concurrency.config.maxRetries++;
      console.log(`🔄 增加最大重试次数到 ${this.components.concurrency.config.maxRetries}`);
    }
  }

  /**
   * 优化缓存策略
   */
  optimizeCacheStrategy() {
    if (this.components.cache) {
      // 启用预热功能
      this.components.cache.config.prewarming.enabled = true;

      // 增加缓存大小
      if (this.components.cache.config.l1.maxSize < 2000) {
        this.components.cache.config.l1.maxSize = Math.min(2000,
          this.components.cache.config.l1.maxSize * 1.2);
      }

      console.log('💾 优化缓存策略完成');
    }
  }

  /**
   * 创建优化的AI分析器
   */
  createOptimizedAnalyzer(analyzerType, config) {
    return new OptimizedAIAnalyzer({
      ...config,
      maxConcurrency: this.components.concurrency.config.maxConcurrency,
      enableCache: this.config.enableCaching,
      cacheManager: this.components.cache,
      performanceOptimizer: this.components.optimizer
    }, analyzerType);
  }

  /**
   * 包装现有的分析器以提供性能优化
   */
  wrapAnalyzer(originalAnalyzer, analyzerType) {
    const optimizedAnalyzer = this.createOptimizedAnalyzer(analyzerType, {});

    // 重写analyze方法
    optimizedAnalyzer.executeAnalysis = async (diff, mrDetails, options) => {
      // 使用原始分析器的逻辑
      return await originalAnalyzer.analyze(diff, mrDetails, options);
    };

    return optimizedAnalyzer;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const stats = {
      integrationUptime: Date.now() - this.metrics.integrationStartTime,
      systemHealth: this.metrics.systemHealth,
      optimizationEvents: this.metrics.optimizationEvents.length,
      components: {}
    };

    // 收集各组件统计
    if (this.components.monitor) {
      stats.components.monitor = this.components.monitor.getRealTimeStatus?.() || {};
    }

    if (this.components.cache) {
      stats.components.cache = this.components.cache.getStats?.() || {};
    }

    if (this.components.concurrency) {
      stats.components.concurrency = this.components.concurrency.getStatus?.() || {};
    }

    if (this.components.optimizer) {
      stats.components.optimizer = this.components.optimizer.getPerformanceReport?.() || {};
    }

    return stats;
  }

  /**
   * 生成优化报告
   */
  async generateOptimizationReport() {
    const stats = this.getPerformanceStats();
    const currentMetrics = this.getCurrentPerformanceMetrics();

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        uptime: Math.round(stats.integrationUptime / 1000),
        optimizationEvents: stats.optimizationEvents,
        systemHealth: stats.systemHealth
      },
      performance: currentMetrics,
      targets: {
        responseTime: this.config.targetResponseTime,
        throughput: this.config.targetThroughput,
        errorRate: this.config.targetErrorRate,
        cacheHitRate: this.config.targetCacheHitRate
      },
      achievements: this.calculatePerformanceGains(currentMetrics),
      recommendations: this.generateOptimizationRecommendations(currentMetrics)
    };

    return report;
  }

  /**
   * 计算性能收益
   */
  calculatePerformanceGains(currentMetrics) {
    const gains = {};

    // 响应时间改善
    if (currentMetrics.responseTime < this.config.targetResponseTime) {
      gains.responseTime = {
        target: this.config.targetResponseTime,
        current: currentMetrics.responseTime,
        improvement: this.config.targetResponseTime - currentMetrics.responseTime,
        percentage: ((this.config.targetResponseTime - currentMetrics.responseTime) / this.config.targetResponseTime * 100).toFixed(1)
      };
    }

    // 缓存命中率改善
    if (currentMetrics.cacheHitRate > this.config.targetCacheHitRate) {
      gains.cacheHitRate = {
        target: this.config.targetCacheHitRate,
        current: currentMetrics.cacheHitRate,
        improvement: currentMetrics.cacheHitRate - this.config.targetCacheHitRate,
        percentage: ((currentMetrics.cacheHitRate - this.config.targetCacheHitRate) / this.config.targetCacheHitRate * 100).toFixed(1)
      };
    }

    return gains;
  }

  /**
   * 生成优化建议
   */
  generateOptimizationRecommendations(currentMetrics) {
    const recommendations = [];

    Object.keys(currentMetrics).forEach(metric => {
      const target = this.config[`target${metric.charAt(0).toUpperCase() + metric.slice(1)}`];
      if (target && currentMetrics[metric] > target) {
        recommendations.push({
          metric,
          current: currentMetrics[metric],
          target,
          suggestion: this.getOptimizationSuggestion(metric, currentMetrics[metric], target)
        });
      }
    });

    return recommendations;
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestion(metric, current, target) {
    switch (metric) {
      case 'responseTime':
        return '考虑增加并发数、启用缓存或优化AI分析逻辑';
      case 'errorRate':
        return '增强重试机制、检查网络连接、验证AI服务配置';
      case 'memoryUsage':
        return '减少缓存大小、优化数据结构、增加垃圾回收频率';
      case 'cacheHitRate':
        return '增加缓存容量、优化缓存策略、延长缓存TTL';
      default:
        return '需要进一步分析和优化';
    }
  }

  /**
   * 关闭性能优化系统
   */
  async shutdown() {
    console.log('🛑 关闭性能优化集成器...');

    try {
      // 关闭各个组件
      if (this.components.optimizer) {
        this.components.optimizer.shutdown();
      }

      if (this.components.cache) {
        await this.components.cache.shutdown();
      }

      if (this.components.monitor) {
        await this.components.monitor.shutdown?.();
      }

      console.log('✅ 性能优化集成器已关闭');

    } catch (error) {
      console.error('关闭性能优化集成器时出错:', error.message);
    }
  }
}

export { PerformanceIntegrator };
export default PerformanceIntegrator;
