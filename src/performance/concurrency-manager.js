#!/usr/bin/env node

/**
 * 智能并发管理器 - 优化版本
 * 
 * 提供高效的并发控制和异步任务管理：
 * - 自适应并发控制和负载均衡
 * - 智能队列管理和优先级调度
 * - 动态超时管理和错误恢复
 * - 实时性能监控和瓶颈分析
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @license MIT
 */

import { EventEmitter } from 'events';

/**
 * 智能并发管理器
 */
class ConcurrencyManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      // 并发控制
      maxConcurrency: options.maxConcurrency || 5,
      batchSize: options.batchSize || 3,
      queueLimit: options.queueLimit || 1000,

      // 超时控制
      defaultTimeout: options.defaultTimeout || 30000,
      adaptiveTimeout: options.adaptiveTimeout !== false,
      timeoutMultiplier: options.timeoutMultiplier || 1.5,

      // 重试策略
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      exponentialBackoff: options.exponentialBackoff !== false,

      // 性能优化
      enableBatching: options.enableBatching !== false,
      adaptiveConcurrency: options.adaptiveConcurrency !== false,
      autoTuning: options.autoTuning !== false
    };

    // 状态管理
    this.activeTasks = new Set();
    this.queue = [];
    this.priorityQueue = [];
    this.completedTasks = 0;
    this.failedTasks = 0;

    // 性能指标
    this.metrics = {
      averageResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      queueLength: 0,
      concurrencyUtilization: 0,
      adaptiveMetrics: {
        lastOptimalConcurrency: this.config.maxConcurrency,
        performanceHistory: [],
        tuningIterations: 0
      }
    };

    // 自适应性能调优
    if (this.config.autoTuning) {
      this.startAutoTuning();
    }

    console.log('🚀 智能并发管理器已启动');
  }

  /**
   * 处理任务列表（主要入口）
   */
  async processTask(tasks, processor, options = {}) {
    const startTime = Date.now();
    const taskConfig = { ...this.config, ...options };

    this.emit('processing:started', {
      taskCount: tasks.length,
      config: taskConfig
    });

    try {
      let results;

      if (taskConfig.enableBatching && tasks.length > taskConfig.batchSize) {
        results = await this.processBatched(tasks, processor, taskConfig);
      } else {
        results = await this.processConcurrent(tasks, processor, taskConfig);
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(results, duration);

      this.emit('processing:completed', {
        duration,
        results: results.length,
        successful: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
      });

      return results;

    } catch (error) {
      this.emit('processing:error', error);
      throw error;
    }
  }

  /**
   * 批量处理任务
   */
  async processBatched(tasks, processor, config) {
    const allResults = [];
    const batchSize = this.calculateOptimalBatchSize(tasks.length);

    console.log(`📦 批量处理: ${tasks.length} 个任务，批次大小: ${batchSize}`);

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      console.log(`🔄 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)}`);

      const batchResults = await this.processConcurrent(batch, processor, config);
      allResults.push(...batchResults);

      // 批次间短暂延迟，避免过载
      if (i + batchSize < tasks.length) {
        await this.adaptiveDelay(batch.length);
      }

      // 检查是否需要调整并发数
      if (config.adaptiveConcurrency) {
        this.adjustConcurrency(batchResults);
      }
    }

    return allResults;
  }

  /**
   * 并发处理任务
   */
  async processConcurrent(tasks, processor, config) {
    const semaphore = new Semaphore(config.maxConcurrency || this.config.maxConcurrency);
    const timeout = this.calculateTimeout(tasks, config);

    const promises = tasks.map(async (task, index) => {
      return semaphore.acquire(async () => {
        const taskId = `task_${Date.now()}_${index}`;
        this.activeTasks.add(taskId);

        try {
          const result = await this.executeWithTimeout(
            () => processor(task, index),
            timeout,
            taskId
          );

          this.completedTasks++;
          return { status: 'fulfilled', value: result, taskId };

        } catch (error) {
          this.failedTasks++;

          // 尝试重试
          if (config.maxRetries > 0 && this.shouldRetry(error)) {
            try {
              const retryResult = await this.retryWithBackoff(
                () => processor(task, index),
                config.maxRetries,
                config.retryDelay,
                taskId
              );

              this.completedTasks++;
              return { status: 'fulfilled', value: retryResult, taskId };

            } catch (retryError) {
              return { status: 'rejected', error: retryError, taskId };
            }
          }

          return { status: 'rejected', error, taskId };

        } finally {
          this.activeTasks.delete(taskId);
        }
      });
    });

    return Promise.allSettled(promises).then(results =>
      results.map(r => r.value)
    );
  }

  /**
   * 带超时的执行
   */
  async executeWithTimeout(fn, timeout, taskId) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Task ${taskId} timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * 重试机制（指数退避）
   */
  async retryWithBackoff(fn, maxRetries, baseDelay, taskId) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 重试任务 ${taskId}, 尝试 ${attempt}/${maxRetries}`);
        return await fn();

      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = this.config.exponentialBackoff
            ? baseDelay * Math.pow(2, attempt - 1)
            : baseDelay;

          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error) {
    // 网络错误、超时错误等可以重试
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'timeout'
    ];

    return retryableErrors.some(pattern =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * 计算最优批次大小
   */
  calculateOptimalBatchSize(totalTasks) {
    if (totalTasks <= this.config.batchSize) {
      return totalTasks;
    }

    // 基于历史性能数据动态调整
    const baseSize = this.config.batchSize;
    const concurrency = this.config.maxConcurrency;

    // 确保批次大小是并发数的倍数，最大化资源利用
    const optimalSize = Math.max(
      baseSize,
      Math.ceil(totalTasks / Math.ceil(totalTasks / (baseSize * concurrency)))
    );

    return Math.min(optimalSize, totalTasks);
  }

  /**
   * 计算超时时间
   */
  calculateTimeout(tasks, config) {
    if (!config.adaptiveTimeout) {
      return config.defaultTimeout || this.config.defaultTimeout;
    }

    // 基于任务复杂度和历史性能调整超时
    const baseTimeout = config.defaultTimeout || this.config.defaultTimeout;
    const complexityFactor = this.estimateComplexity(tasks);
    const performanceFactor = this.getPerformanceFactor();

    return Math.round(baseTimeout * complexityFactor * performanceFactor);
  }

  /**
   * 估算任务复杂度
   */
  estimateComplexity(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return 1;
    }

    // 基于任务数量和内容大小估算复杂度
    const avgTaskSize = tasks.reduce((sum, task) => {
      return sum + (typeof task === 'string' ? task.length : JSON.stringify(task).length);
    }, 0) / tasks.length;

    // 复杂度因子: 1.0 - 2.0
    return Math.min(2.0, 1.0 + (avgTaskSize / 10000));
  }

  /**
   * 获取性能因子
   */
  getPerformanceFactor() {
    if (this.metrics.averageResponseTime === 0) {
      return 1;
    }

    // 如果平均响应时间较长，增加超时时间
    const expectedResponseTime = 5000; // 5秒基准
    return Math.min(3.0, Math.max(0.5, this.metrics.averageResponseTime / expectedResponseTime));
  }

  /**
   * 自适应延迟
   */
  async adaptiveDelay(batchSize) {
    // 基于当前负载和性能调整延迟
    const baseDelay = 100;
    const loadFactor = this.activeTasks.size / this.config.maxConcurrency;
    const performanceFactor = this.metrics.errorRate > 0.1 ? 2 : 1;

    const delay = baseDelay * loadFactor * performanceFactor;

    if (delay > 0) {
      await this.delay(delay);
    }
  }

  /**
   * 调整并发数
   */
  adjustConcurrency(batchResults) {
    const successRate = batchResults.filter(r => r.status === 'fulfilled').length / batchResults.length;
    const currentConcurrency = this.config.maxConcurrency;

    if (successRate > 0.95 && this.metrics.averageResponseTime < 3000) {
      // 性能良好，可以增加并发
      this.config.maxConcurrency = Math.min(currentConcurrency + 1, 10);
      console.log(`📈 增加并发数到 ${this.config.maxConcurrency}`);

    } else if (successRate < 0.8 || this.metrics.averageResponseTime > 10000) {
      // 性能不佳，减少并发
      this.config.maxConcurrency = Math.max(currentConcurrency - 1, 1);
      console.log(`📉 减少并发数到 ${this.config.maxConcurrency}`);
    }
  }

  /**
   * 启动自动调优
   */
  startAutoTuning() {
    // 每5分钟进行一次性能分析和调优
    setInterval(() => {
      this.performAutoTuning();
    }, 300000);
  }

  /**
   * 执行自动调优
   */
  performAutoTuning() {
    const metrics = this.metrics;
    const adaptive = metrics.adaptiveMetrics;

    // 记录当前性能
    adaptive.performanceHistory.push({
      timestamp: Date.now(),
      concurrency: this.config.maxConcurrency,
      throughput: metrics.throughput,
      responseTime: metrics.averageResponseTime,
      errorRate: metrics.errorRate
    });

    // 保持最近20个数据点
    if (adaptive.performanceHistory.length > 20) {
      adaptive.performanceHistory = adaptive.performanceHistory.slice(-20);
    }

    // 分析趋势并调整
    if (adaptive.performanceHistory.length >= 3) {
      const recent = adaptive.performanceHistory.slice(-3);
      const trend = this.analyzeTrend(recent);

      if (trend.improving) {
        console.log('📊 性能趋势良好，保持当前配置');
      } else {
        console.log('📊 性能下降，尝试优化配置');
        this.optimizeConfiguration(trend);
      }
    }

    adaptive.tuningIterations++;
  }

  /**
   * 分析性能趋势
   */
  analyzeTrend(dataPoints) {
    const throughputTrend = this.calculateTrend(dataPoints.map(d => d.throughput));
    const responseTrend = this.calculateTrend(dataPoints.map(d => d.responseTime));
    const errorTrend = this.calculateTrend(dataPoints.map(d => d.errorRate));

    return {
      improving: throughputTrend > 0 && responseTrend < 0 && errorTrend <= 0,
      throughputTrend,
      responseTrend,
      errorTrend
    };
  }

  /**
   * 计算趋势（简单线性回归斜率）
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * 优化配置
   */
  optimizeConfiguration(trend) {
    if (trend.responseTrend > 0) {
      // 响应时间增加，减少并发
      this.config.maxConcurrency = Math.max(1, this.config.maxConcurrency - 1);
      console.log(`🔧 优化: 减少并发数到 ${this.config.maxConcurrency}`);
    }

    if (trend.errorTrend > 0) {
      // 错误率增加，增加重试次数
      this.config.maxRetries = Math.min(5, this.config.maxRetries + 1);
      console.log(`🔧 优化: 增加重试次数到 ${this.config.maxRetries}`);
    }

    if (trend.throughputTrend < 0 && this.config.maxConcurrency < 8) {
      // 吞吐量下降，尝试增加并发
      this.config.maxConcurrency++;
      console.log(`🔧 优化: 增加并发数到 ${this.config.maxConcurrency}`);
    }
  }

  /**
   * 更新性能指标
   */
  updateMetrics(results, duration) {
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const total = results.length;

    // 更新吞吐量 (tasks/second)
    this.metrics.throughput = total / (duration / 1000);

    // 更新错误率
    this.metrics.errorRate = total > 0 ? failed / total : 0;

    // 更新平均响应时间
    this.metrics.averageResponseTime = duration / total;

    // 更新并发利用率
    this.metrics.concurrencyUtilization = this.activeTasks.size / this.config.maxConcurrency;

    // 更新队列长度
    this.metrics.queueLength = this.queue.length;

    this.emit('metrics:updated', this.metrics);
  }

  /**
   * 获取实时状态
   */
  getStatus() {
    return {
      config: { ...this.config },
      metrics: { ...this.metrics },
      runtime: {
        activeTasks: this.activeTasks.size,
        queueLength: this.queue.length,
        completedTasks: this.completedTasks,
        failedTasks: this.failedTasks,
        totalTasks: this.completedTasks + this.failedTasks
      }
    };
  }

  /**
   * 重置统计
   */
  reset() {
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.activeTasks.clear();
    this.queue = [];
    this.metrics = {
      averageResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      queueLength: 0,
      concurrencyUtilization: 0,
      adaptiveMetrics: {
        lastOptimalConcurrency: this.config.maxConcurrency,
        performanceHistory: [],
        tuningIterations: 0
      }
    };

    console.log('🔄 并发管理器统计已重置');
  }

  /**
   * 延迟工具方法
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 信号量实现
 */
class Semaphore {
  constructor(capacity) {
    this.capacity = capacity;
    this.current = 0;
    this.queue = [];
  }

  async acquire(fn) {
    return new Promise((resolve, reject) => {
      if (this.current < this.capacity) {
        this.current++;
        this.execute(fn, resolve, reject);
      } else {
        this.queue.push({ fn, resolve, reject });
      }
    });
  }

  async execute(fn, resolve, reject) {
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.release();
    }
  }

  release() {
    this.current--;

    if (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();
      this.current++;
      this.execute(fn, resolve, reject);
    }
  }
}

export { ConcurrencyManager };
export default ConcurrencyManager;
