#!/usr/bin/env node

/**
 * 性能优化管理器
 * 
 * 提供全面的性能监控、分析和优化功能：
 * - 实时性能监控和瓶颈识别
 * - 智能并发控制和资源池管理
 * - 多层缓存策略和内存优化
 * - 动态负载均衡和故障转移
 * - 性能基准测试和报告生成
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @license MIT
 */

import { EventEmitter } from 'events';
import os from 'os';

/**
 * 性能优化器类
 * 提供全方位的性能监控和优化功能
 */
class PerformanceOptimizer extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // 并发控制
      maxConcurrency: config.maxConcurrency || 5,
      batchSize: config.batchSize || 3,
      requestTimeout: config.requestTimeout || 30000,

      // 缓存配置
      enableCache: config.enableCache !== false,
      cacheMaxSize: config.cacheMaxSize || 1000,
      cacheTTL: config.cacheTTL || 3600000, // 1小时

      // 性能阈值
      responseTimeThreshold: config.responseTimeThreshold || 5000,
      errorRateThreshold: config.errorRateThreshold || 0.1,
      memoryThreshold: config.memoryThreshold || 0.8,

      // 监控配置
      metricsRetentionDays: config.metricsRetentionDays || 7,
      alertEnabled: config.alertEnabled !== false
    };

    // 性能指标
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0
      },
      timing: {
        responseTimes: [],
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      },
      resources: {
        memoryUsage: [],
        cpuUsage: [],
        activeConnections: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0
      },
      errors: {
        byType: new Map(),
        byService: new Map(),
        total: 0
      }
    };

    // 并发控制
    this.concurrencyManager = new ConcurrencyManager(this.config);

    // 缓存管理器
    this.cacheManager = new CacheManager(this.config);

    // 负载均衡器
    this.loadBalancer = new LoadBalancer(this.config);

    // 资源池管理器
    this.resourcePool = new ResourcePoolManager(this.config);

    // 启动监控
    this.startMonitoring();

    console.log('🚀 性能优化器已启动');
  }

  /**
   * 启动性能监控
   */
  startMonitoring() {
    // 每分钟收集一次系统指标
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);

    // 每5分钟分析性能并发出告警
    setInterval(() => {
      this.analyzePerformance();
    }, 300000);

    // 每小时清理过期数据
    setInterval(() => {
      this.cleanupExpiredData();
    }, 3600000);
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const loadAvg = os.loadavg();

    // 内存使用率
    const memoryUsage = memUsage.heapUsed / memUsage.heapTotal;
    this.metrics.resources.memoryUsage.push({
      timestamp: Date.now(),
      usage: memoryUsage,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    });

    // CPU负载
    this.metrics.resources.cpuUsage.push({
      timestamp: Date.now(),
      load1m: loadAvg[0],
      load5m: loadAvg[1],
      load15m: loadAvg[2]
    });

    // 保持最近1000个数据点
    if (this.metrics.resources.memoryUsage.length > 1000) {
      this.metrics.resources.memoryUsage = this.metrics.resources.memoryUsage.slice(-1000);
    }

    if (this.metrics.resources.cpuUsage.length > 1000) {
      this.metrics.resources.cpuUsage = this.metrics.resources.cpuUsage.slice(-1000);
    }

    // 发出指标事件
    this.emit('metrics:collected', {
      memory: memoryUsage,
      cpu: loadAvg[0],
      timestamp: Date.now()
    });
  }

  /**
   * 分析性能并识别瓶颈
   */
  analyzePerformance() {
    const bottlenecks = [];

    // 分析响应时间
    if (this.metrics.timing.averageResponseTime > this.config.responseTimeThreshold) {
      bottlenecks.push({
        type: 'slow_response',
        severity: 'high',
        metric: this.metrics.timing.averageResponseTime,
        threshold: this.config.responseTimeThreshold,
        recommendations: [
          '增加并发处理能力',
          '优化AI分析器性能',
          '启用更积极的缓存策略',
          '考虑使用更快的AI模型'
        ]
      });
    }

    // 分析错误率
    const errorRate = this.metrics.requests.total > 0 ?
      this.metrics.requests.failed / this.metrics.requests.total : 0;

    if (errorRate > this.config.errorRateThreshold) {
      bottlenecks.push({
        type: 'high_error_rate',
        severity: 'critical',
        metric: errorRate,
        threshold: this.config.errorRateThreshold,
        recommendations: [
          '检查AI服务连接状态',
          '增强错误重试机制',
          '优化服务降级策略',
          '检查网络配置'
        ]
      });
    }

    // 分析内存使用
    const latestMemory = this.metrics.resources.memoryUsage.slice(-1)[0];
    if (latestMemory && latestMemory.usage > this.config.memoryThreshold) {
      bottlenecks.push({
        type: 'memory_pressure',
        severity: 'high',
        metric: latestMemory.usage,
        threshold: this.config.memoryThreshold,
        recommendations: [
          '减少缓存大小',
          '增加垃圾回收频率',
          '优化内存使用模式',
          '考虑横向扩展'
        ]
      });
    }

    // 分析缓存效率
    if (this.metrics.cache.hitRate < 0.7 && this.metrics.cache.hits + this.metrics.cache.misses > 100) {
      bottlenecks.push({
        type: 'low_cache_efficiency',
        severity: 'medium',
        metric: this.metrics.cache.hitRate,
        threshold: 0.7,
        recommendations: [
          '增加缓存大小',
          '优化缓存策略',
          '延长缓存TTL',
          '预热常用缓存'
        ]
      });
    }

    if (bottlenecks.length > 0) {
      this.emit('bottlenecks:detected', bottlenecks);

      if (this.config.alertEnabled) {
        this.sendPerformanceAlert(bottlenecks);
      }
    }
  }

  /**
   * 智能并发处理
   */
  async processTasksConcurrently(tasks, processor) {
    return this.concurrencyManager.process(tasks, processor);
  }

  /**
   * 缓存管理
   */
  async getCached(key) {
    return this.cacheManager.get(key);
  }

  async setCached(key, value, ttl) {
    return this.cacheManager.set(key, value, ttl);
  }

  /**
   * 负载均衡
   */
  selectOptimalService(services) {
    return this.loadBalancer.select(services);
  }

  /**
   * 获取资源连接
   */
  async acquireResource(type) {
    return this.resourcePool.acquire(type);
  }

  /**
   * 释放资源连接
   */
  releaseResource(type, resource) {
    this.resourcePool.release(type, resource);
  }

  /**
   * 记录请求指标
   */
  recordRequest(success, responseTime, error = null) {
    this.metrics.requests.total++;

    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;

      if (error) {
        const errorType = error.constructor.name;
        this.metrics.errors.byType.set(errorType,
          (this.metrics.errors.byType.get(errorType) || 0) + 1);
        this.metrics.errors.total++;
      }
    }

    // 记录响应时间
    this.metrics.timing.responseTimes.push({
      timestamp: Date.now(),
      responseTime
    });

    // 保持最近1000个响应时间
    if (this.metrics.timing.responseTimes.length > 1000) {
      this.metrics.timing.responseTimes = this.metrics.timing.responseTimes.slice(-1000);
    }

    // 更新平均响应时间
    this.updateResponseTimeMetrics();
  }

  /**
   * 更新响应时间指标
   */
  updateResponseTimeMetrics() {
    const times = this.metrics.timing.responseTimes.map(r => r.responseTime);

    if (times.length === 0) return;

    // 平均响应时间
    this.metrics.timing.averageResponseTime = times.reduce((a, b) => a + b) / times.length;

    // P95响应时间
    const sortedTimes = times.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    this.metrics.timing.p95ResponseTime = sortedTimes[p95Index];

    // P99响应时间
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    this.metrics.timing.p99ResponseTime = sortedTimes[p99Index];
  }

  /**
   * 记录缓存指标
   */
  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? this.metrics.cache.hits / total : 0;
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    return {
      summary: {
        totalRequests: this.metrics.requests.total,
        successRate: this.metrics.requests.total > 0 ?
          this.metrics.requests.successful / this.metrics.requests.total : 0,
        averageResponseTime: this.metrics.timing.averageResponseTime,
        cacheHitRate: this.metrics.cache.hitRate
      },
      detailed: {
        requests: { ...this.metrics.requests },
        timing: { ...this.metrics.timing },
        resources: {
          currentMemoryUsage: this.getCurrentMemoryUsage(),
          currentCpuLoad: this.getCurrentCpuLoad(),
          activeConnections: this.metrics.resources.activeConnections
        },
        cache: { ...this.metrics.cache },
        errors: {
          total: this.metrics.errors.total,
          byType: Object.fromEntries(this.metrics.errors.byType),
          byService: Object.fromEntries(this.metrics.errors.byService)
        }
      },
      recommendations: this.generateOptimizationRecommendations()
    };
  }

  /**
   * 生成优化建议
   */
  generateOptimizationRecommendations() {
    const recommendations = [];

    // 响应时间优化
    if (this.metrics.timing.averageResponseTime > 3000) {
      recommendations.push({
        category: 'response_time',
        priority: 'high',
        title: '响应时间优化',
        description: `当前平均响应时间 ${Math.round(this.metrics.timing.averageResponseTime)}ms 偏高`,
        actions: [
          '增加并发处理能力',
          '启用智能缓存',
          '优化AI模型选择',
          '使用更快的网络连接'
        ]
      });
    }

    // 缓存优化
    if (this.metrics.cache.hitRate < 0.8 && this.metrics.cache.hits + this.metrics.cache.misses > 50) {
      recommendations.push({
        category: 'cache',
        priority: 'medium',
        title: '缓存效率提升',
        description: `当前缓存命中率 ${Math.round(this.metrics.cache.hitRate * 100)}% 较低`,
        actions: [
          '增加缓存容量',
          '延长缓存TTL',
          '优化缓存键策略',
          '实现缓存预热'
        ]
      });
    }

    // 内存优化
    const memUsage = this.getCurrentMemoryUsage();
    if (memUsage > 0.7) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        title: '内存使用优化',
        description: `当前内存使用率 ${Math.round(memUsage * 100)}% 偏高`,
        actions: [
          '减少缓存大小',
          '增加垃圾回收频率',
          '优化数据结构',
          '考虑横向扩展'
        ]
      });
    }

    // 错误率优化
    const errorRate = this.metrics.requests.total > 0 ?
      this.metrics.requests.failed / this.metrics.requests.total : 0;

    if (errorRate > 0.05) {
      recommendations.push({
        category: 'reliability',
        priority: 'critical',
        title: '可靠性提升',
        description: `当前错误率 ${Math.round(errorRate * 100)}% 偏高`,
        actions: [
          '增强重试机制',
          '改进错误处理',
          '添加熔断器模式',
          '监控服务健康状态'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 获取当前内存使用率
   */
  getCurrentMemoryUsage() {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / memUsage.heapTotal;
  }

  /**
   * 获取当前CPU负载
   */
  getCurrentCpuLoad() {
    return os.loadavg()[0];
  }

  /**
   * 发送性能告警
   */
  sendPerformanceAlert(bottlenecks) {
    const alert = {
      timestamp: new Date().toISOString(),
      severity: Math.max(...bottlenecks.map(b => this.getSeverityLevel(b.severity))),
      message: `检测到 ${bottlenecks.length} 个性能瓶颈`,
      bottlenecks: bottlenecks.map(b => ({
        type: b.type,
        severity: b.severity,
        value: b.metric,
        threshold: b.threshold,
        recommendations: b.recommendations.slice(0, 2) // 只取前2个建议
      }))
    };

    console.warn('⚠️ 性能告警:', JSON.stringify(alert, null, 2));
    this.emit('performance:alert', alert);
  }

  /**
   * 获取严重性级别数值
   */
  getSeverityLevel(severity) {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * 清理过期数据
   */
  cleanupExpiredData() {
    const retentionTime = this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionTime;

    // 清理响应时间数据
    this.metrics.timing.responseTimes = this.metrics.timing.responseTimes.filter(
      r => r.timestamp > cutoffTime
    );

    // 清理资源使用数据
    this.metrics.resources.memoryUsage = this.metrics.resources.memoryUsage.filter(
      r => r.timestamp > cutoffTime
    );

    this.metrics.resources.cpuUsage = this.metrics.resources.cpuUsage.filter(
      r => r.timestamp > cutoffTime
    );

    console.log('🧹 清理过期性能数据完成');
  }

  /**
   * 重置所有指标
   */
  resetMetrics() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, pending: 0 },
      timing: { responseTimes: [], averageResponseTime: 0, p95ResponseTime: 0, p99ResponseTime: 0 },
      resources: { memoryUsage: [], cpuUsage: [], activeConnections: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0, size: 0 },
      errors: { byType: new Map(), byService: new Map(), total: 0 }
    };

    console.log('🔄 性能指标已重置');
  }

  /**
   * 关闭优化器
   */
  shutdown() {
    this.cacheManager.shutdown();
    this.resourcePool.shutdown();
    console.log('🛑 性能优化器已关闭');
  }
}

/**
 * 并发管理器
 */
class ConcurrencyManager {
  constructor(config) {
    this.maxConcurrency = config.maxConcurrency || 5;
    this.batchSize = config.batchSize || 3;
    this.requestTimeout = config.requestTimeout || 30000;
    this.activeRequests = 0;
    this.queue = [];
  }

  async process(tasks, processor) {
    const results = [];

    // 分批处理
    for (let i = 0; i < tasks.length; i += this.batchSize) {
      const batch = tasks.slice(i, i + this.batchSize);

      // 限制并发数
      const concurrentBatch = batch.slice(0, this.maxConcurrency - this.activeRequests);

      const batchPromises = concurrentBatch.map(async (task) => {
        this.activeRequests++;

        try {
          const result = await Promise.race([
            processor(task),
            this.createTimeout()
          ]);

          return { status: 'fulfilled', value: result };
        } catch (error) {
          return { status: 'rejected', error };
        } finally {
          this.activeRequests--;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // 短暂延迟，避免过载
      if (i + this.batchSize < tasks.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  createTimeout() {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout);
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 缓存管理器
 */
class CacheManager {
  constructor(config) {
    this.enabled = config.enableCache !== false;
    this.maxSize = config.cacheMaxSize || 1000;
    this.defaultTTL = config.cacheTTL || 3600000;

    this.cache = new Map();
    this.ttls = new Map();

    if (this.enabled) {
      // 定期清理过期缓存
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 60000); // 每分钟清理一次
    }
  }

  async get(key) {
    if (!this.enabled) return null;

    // 检查是否过期
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.enabled) return;

    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    this.cache.set(key, value);
    this.ttls.set(key, Date.now() + ttl);
  }

  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  isExpired(key) {
    const ttl = this.ttls.get(key);
    return ttl && Date.now() > ttl;
  }

  cleanup() {
    for (const [key] of this.ttls) {
      if (this.isExpired(key)) {
        this.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      enabled: this.enabled
    };
  }

  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * 负载均衡器
 */
class LoadBalancer {
  constructor(config) {
    this.strategy = config.loadBalanceStrategy || 'round_robin';
    this.healthChecks = new Map();
    this.currentIndex = 0;
  }

  select(services) {
    if (!services || services.length === 0) {
      return null;
    }

    // 过滤健康的服务
    const healthyServices = services.filter(service =>
      this.isHealthy(service.id || service.name)
    );

    if (healthyServices.length === 0) {
      // 如果没有健康的服务，返回第一个服务作为降级
      console.warn('⚠️ 没有健康的服务可用，使用降级策略');
      return services[0];
    }

    switch (this.strategy) {
      case 'random':
        return this.randomSelect(healthyServices);
      case 'least_loaded':
        return this.leastLoadedSelect(healthyServices);
      case 'round_robin':
      default:
        return this.roundRobinSelect(healthyServices);
    }
  }

  roundRobinSelect(services) {
    const service = services[this.currentIndex % services.length];
    this.currentIndex++;
    return service;
  }

  randomSelect(services) {
    const index = Math.floor(Math.random() * services.length);
    return services[index];
  }

  leastLoadedSelect(services) {
    return services.reduce((least, current) => {
      const leastLoad = this.getServiceLoad(least.id || least.name);
      const currentLoad = this.getServiceLoad(current.id || current.name);
      return currentLoad < leastLoad ? current : least;
    });
  }

  markUnhealthy(serviceId, duration = 60000) {
    this.healthChecks.set(serviceId, {
      healthy: false,
      unhealthySince: Date.now(),
      recoveryTime: Date.now() + duration
    });
  }

  markHealthy(serviceId) {
    this.healthChecks.set(serviceId, {
      healthy: true,
      lastChecked: Date.now()
    });
  }

  isHealthy(serviceId) {
    const health = this.healthChecks.get(serviceId);

    if (!health) {
      return true; // 默认健康
    }

    if (!health.healthy && Date.now() > health.recoveryTime) {
      // 恢复时间已到，标记为健康
      this.markHealthy(serviceId);
      return true;
    }

    return health.healthy;
  }

  getServiceLoad(serviceId) {
    // 简单的负载指标，可以扩展
    return Math.random(); // 模拟负载
  }
}

/**
 * 资源池管理器
 */
class ResourcePoolManager {
  constructor(config) {
    this.pools = new Map();
    this.config = config;
  }

  async acquire(type) {
    let pool = this.pools.get(type);

    if (!pool) {
      pool = this.createPool(type);
      this.pools.set(type, pool);
    }

    return pool.acquire();
  }

  release(type, resource) {
    const pool = this.pools.get(type);
    if (pool) {
      pool.release(resource);
    }
  }

  createPool(type) {
    return new ResourcePool({
      type,
      maxSize: this.config.maxPoolSize || 10,
      minSize: this.config.minPoolSize || 2,
      createResource: () => this.createResource(type),
      validateResource: (resource) => this.validateResource(resource),
      destroyResource: (resource) => this.destroyResource(resource)
    });
  }

  createResource(type) {
    // 根据类型创建不同的资源
    switch (type) {
      case 'http':
        return { id: Date.now(), type: 'http', active: true };
      case 'ai_connection':
        return { id: Date.now(), type: 'ai_connection', active: true };
      default:
        return { id: Date.now(), type, active: true };
    }
  }

  validateResource(resource) {
    return resource && resource.active;
  }

  destroyResource(resource) {
    if (resource) {
      resource.active = false;
    }
  }

  shutdown() {
    for (const [, pool] of this.pools) {
      pool.shutdown();
    }
    this.pools.clear();
  }
}

/**
 * 资源池
 */
class ResourcePool {
  constructor(options) {
    this.type = options.type;
    this.maxSize = options.maxSize || 10;
    this.minSize = options.minSize || 2;
    this.createResource = options.createResource;
    this.validateResource = options.validateResource;
    this.destroyResource = options.destroyResource;

    this.available = [];
    this.busy = [];
    this.waitingQueue = [];

    // 初始化最小连接数
    this.initializeMinConnections();
  }

  async initializeMinConnections() {
    for (let i = 0; i < this.minSize; i++) {
      try {
        const resource = await this.createResource();
        this.available.push(resource);
      } catch (error) {
        console.error(`创建 ${this.type} 资源失败:`, error.message);
      }
    }
  }

  async acquire() {
    // 检查可用资源
    if (this.available.length > 0) {
      const resource = this.available.pop();

      // 验证资源是否有效
      if (this.validateResource(resource)) {
        this.busy.push(resource);
        return resource;
      } else {
        this.destroyResource(resource);
        return this.acquire(); // 递归获取有效资源
      }
    }

    // 如果可以创建新资源
    if (this.available.length + this.busy.length < this.maxSize) {
      try {
        const resource = await this.createResource();
        this.busy.push(resource);
        return resource;
      } catch (error) {
        console.error(`创建 ${this.type} 资源失败:`, error.message);
      }
    }

    // 等待资源可用
    return new Promise((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  release(resource) {
    const busyIndex = this.busy.indexOf(resource);

    if (busyIndex > -1) {
      this.busy.splice(busyIndex, 1);

      // 检查等待队列
      if (this.waitingQueue.length > 0) {
        const resolve = this.waitingQueue.shift();
        this.busy.push(resource);
        resolve(resource);
      } else {
        this.available.push(resource);
      }
    }
  }

  getStats() {
    return {
      type: this.type,
      available: this.available.length,
      busy: this.busy.length,
      waiting: this.waitingQueue.length,
      total: this.available.length + this.busy.length
    };
  }

  shutdown() {
    // 销毁所有资源
    [...this.available, ...this.busy].forEach(resource => {
      this.destroyResource(resource);
    });

    this.available = [];
    this.busy = [];

    // 拒绝所有等待的请求
    this.waitingQueue.forEach(resolve => {
      resolve(null);
    });
    this.waitingQueue = [];
  }
}

export { PerformanceOptimizer };
export default PerformanceOptimizer;
