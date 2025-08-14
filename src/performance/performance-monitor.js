#!/usr/bin/env node

/**
 * 性能监控和报告生成器
 * 
 * 提供全面的性能监控、分析和报告功能：
 * - 实时性能指标收集和分析
 * - 智能瓶颈检测和优化建议
 * - 详细的性能报告生成
 * - 历史趋势分析和预测
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @license MIT
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * 性能监控器
 */
class PerformanceMonitor {
  constructor(options = {}) {
    this.config = {
      // 监控配置
      enableRealTimeMonitoring: options.enableRealTimeMonitoring !== false,
      monitoringInterval: options.monitoringInterval || 60000, // 1分钟
      metricsRetention: options.metricsRetention || 86400000, // 24小时

      // 报告配置
      reportDirectory: options.reportDirectory || './reports/performance',
      enableAutoReporting: options.enableAutoReporting !== false,
      reportInterval: options.reportInterval || 3600000, // 1小时

      // 告警配置
      enableAlerts: options.enableAlerts !== false,
      responseTimeThreshold: options.responseTimeThreshold || 5000, // 5秒
      errorRateThreshold: options.errorRateThreshold || 0.1, // 10%
      memoryThreshold: options.memoryThreshold || 0.8 // 80%
    };

    // 性能指标存储
    this.metrics = {
      system: {
        memory: [],
        cpu: [],
        diskIO: [],
        networkIO: []
      },
      application: {
        requests: [],
        responses: [],
        errors: [],
        cache: []
      },
      ai: {
        openai: { requests: [], responses: [], errors: [] },
        copilot: { requests: [], responses: [], errors: [] },
        aliyun: { requests: [], responses: [], errors: [] }
      },
      business: {
        reviews: [],
        analyses: [],
        reports: []
      }
    };

    // 实时统计
    this.realtimeStats = {
      activeRequests: 0,
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      cacheHitRate: 0
    };

    // 性能分析器
    this.analyzer = new PerformanceAnalyzer();

    // 报告生成器
    this.reportGenerator = new ReportGenerator(this.config.reportDirectory);

    this.initialize();
  }

  /**
   * 初始化监控器
   */
  async initialize() {
    try {
      // 创建报告目录
      await fs.mkdir(this.config.reportDirectory, { recursive: true });

      if (this.config.enableRealTimeMonitoring) {
        this.startRealTimeMonitoring();
      }

      if (this.config.enableAutoReporting) {
        this.startAutoReporting();
      }

      console.log('📊 性能监控器已启动');

    } catch (error) {
      console.error('性能监控器初始化失败:', error.message);
    }
  }

  /**
   * 启动实时监控
   */
  startRealTimeMonitoring() {
    // 系统指标监控
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.monitoringInterval);

    // 应用指标分析
    setInterval(() => {
      this.analyzeApplicationMetrics();
    }, this.config.monitoringInterval);

    // 清理过期数据
    setInterval(() => {
      this.cleanupExpiredMetrics();
    }, this.config.metricsRetention);

    console.log('📈 实时性能监控已启动');
  }

  /**
   * 启动自动报告
   */
  startAutoReporting() {
    setInterval(async () => {
      try {
        await this.generatePerformanceReport();
      } catch (error) {
        console.error('自动报告生成失败:', error.message);
      }
    }, this.config.reportInterval);

    console.log('📋 自动性能报告已启动');
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    const timestamp = Date.now();

    // 内存使用
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      timestamp,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      usage: memoryUsage.heapUsed / memoryUsage.heapTotal
    };

    this.metrics.system.memory.push(systemMemory);
    this.realtimeStats.memoryUsage = systemMemory.usage;

    // CPU使用
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();
    const systemCPU = {
      timestamp,
      user: cpuUsage.user,
      system: cpuUsage.system,
      loadAverage: loadAverage[0],
      cores: os.cpus().length
    };

    this.metrics.system.cpu.push(systemCPU);
    this.realtimeStats.cpuUsage = loadAverage[0];

    // 网络IO（模拟）
    const networkIO = {
      timestamp,
      bytesReceived: this.getNetworkBytes('rx'),
      bytesSent: this.getNetworkBytes('tx'),
      connectionsActive: this.realtimeStats.activeRequests
    };

    this.metrics.system.networkIO.push(networkIO);

    // 磁盘IO（模拟）
    const diskIO = {
      timestamp,
      readBytes: this.getDiskBytes('read'),
      writeBytes: this.getDiskBytes('write'),
      operations: this.getDiskOperations()
    };

    this.metrics.system.diskIO.push(diskIO);
  }

  /**
   * 分析应用指标
   */
  analyzeApplicationMetrics() {
    // 计算每分钟请求数
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.metrics.application.requests.filter(
      r => r.timestamp > oneMinuteAgo
    );

    this.realtimeStats.requestsPerMinute = recentRequests.length;

    // 计算平均响应时间
    const recentResponses = this.metrics.application.responses.filter(
      r => r.timestamp > oneMinuteAgo
    );

    if (recentResponses.length > 0) {
      const totalTime = recentResponses.reduce((sum, r) => sum + r.duration, 0);
      this.realtimeStats.averageResponseTime = totalTime / recentResponses.length;
    }

    // 计算错误率
    const recentErrors = this.metrics.application.errors.filter(
      e => e.timestamp > oneMinuteAgo
    );

    const totalOperations = recentRequests.length + recentErrors.length;
    this.realtimeStats.errorRate = totalOperations > 0
      ? recentErrors.length / totalOperations
      : 0;

    // 计算缓存命中率
    const recentCacheOps = this.metrics.application.cache.filter(
      c => c.timestamp > oneMinuteAgo
    );

    if (recentCacheOps.length > 0) {
      const hits = recentCacheOps.filter(c => c.type === 'hit').length;
      this.realtimeStats.cacheHitRate = hits / recentCacheOps.length;
    }

    // 检查性能告警
    this.checkPerformanceAlerts();
  }

  /**
   * 检查性能告警
   */
  checkPerformanceAlerts() {
    const alerts = [];

    // 响应时间告警
    if (this.realtimeStats.averageResponseTime > this.config.responseTimeThreshold) {
      alerts.push({
        type: 'high_response_time',
        severity: 'warning',
        message: `平均响应时间过高: ${Math.round(this.realtimeStats.averageResponseTime)}ms`,
        threshold: this.config.responseTimeThreshold,
        current: this.realtimeStats.averageResponseTime,
        suggestions: [
          '优化AI分析器性能',
          '增加并发处理能力',
          '检查网络连接',
          '启用更积极的缓存策略'
        ]
      });
    }

    // 错误率告警
    if (this.realtimeStats.errorRate > this.config.errorRateThreshold) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `错误率过高: ${(this.realtimeStats.errorRate * 100).toFixed(1)}%`,
        threshold: this.config.errorRateThreshold,
        current: this.realtimeStats.errorRate,
        suggestions: [
          '检查AI服务连接状态',
          '验证配置文件',
          '增强错误重试机制',
          '检查网络稳定性'
        ]
      });
    }

    // 内存使用告警
    if (this.realtimeStats.memoryUsage > this.config.memoryThreshold) {
      alerts.push({
        type: 'high_memory_usage',
        severity: 'warning',
        message: `内存使用率过高: ${(this.realtimeStats.memoryUsage * 100).toFixed(1)}%`,
        threshold: this.config.memoryThreshold,
        current: this.realtimeStats.memoryUsage,
        suggestions: [
          '减少缓存大小',
          '增加垃圾回收频率',
          '优化内存使用模式',
          '考虑横向扩展'
        ]
      });
    }

    // 低缓存命中率告警
    if (this.realtimeStats.cacheHitRate < 0.7 && this.realtimeStats.requestsPerMinute > 10) {
      alerts.push({
        type: 'low_cache_hit_rate',
        severity: 'info',
        message: `缓存命中率较低: ${(this.realtimeStats.cacheHitRate * 100).toFixed(1)}%`,
        threshold: 0.7,
        current: this.realtimeStats.cacheHitRate,
        suggestions: [
          '增加缓存容量',
          '优化缓存策略',
          '延长缓存TTL',
          '实现缓存预热'
        ]
      });
    }

    if (alerts.length > 0) {
      this.handlePerformanceAlerts(alerts);
    }
  }

  /**
   * 处理性能告警
   */
  handlePerformanceAlerts(alerts) {
    console.warn('⚠️ 性能告警检测到问题:');

    alerts.forEach(alert => {
      console.warn(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
      console.warn(`    建议: ${alert.suggestions.slice(0, 2).join(', ')}`);
    });

    // 发出告警事件
    this.emit?.('performance:alerts', alerts);
  }

  /**
   * 记录请求指标
   */
  recordRequest(details) {
    this.metrics.application.requests.push({
      timestamp: Date.now(),
      ...details
    });

    this.realtimeStats.activeRequests++;
  }

  /**
   * 记录响应指标
   */
  recordResponse(details) {
    this.metrics.application.responses.push({
      timestamp: Date.now(),
      ...details
    });

    this.realtimeStats.activeRequests = Math.max(0, this.realtimeStats.activeRequests - 1);
  }

  /**
   * 记录错误指标
   */
  recordError(error, context = {}) {
    this.metrics.application.errors.push({
      timestamp: Date.now(),
      message: error.message || String(error),
      type: error.constructor?.name || 'Unknown',
      context
    });
  }

  /**
   * 记录缓存操作
   */
  recordCacheOperation(type, key, hit = false) {
    this.metrics.application.cache.push({
      timestamp: Date.now(),
      type: hit ? 'hit' : 'miss',
      operation: type,
      key
    });
  }

  /**
   * 记录AI分析器指标
   */
  recordAIMetrics(analyzer, metrics) {
    if (this.metrics.ai[analyzer]) {
      Object.keys(metrics).forEach(type => {
        if (this.metrics.ai[analyzer][type]) {
          this.metrics.ai[analyzer][type].push({
            timestamp: Date.now(),
            ...metrics[type]
          });
        }
      });
    }
  }

  /**
   * 记录业务指标
   */
  recordBusinessMetrics(type, data) {
    if (this.metrics.business[type]) {
      this.metrics.business[type].push({
        timestamp: Date.now(),
        ...data
      });
    }
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport(timeRange = '1h') {
    try {
      console.log('📋 生成性能报告...');

      const reportData = this.analyzer.analyzePerformance(this.metrics, timeRange);
      const report = await this.reportGenerator.generateReport(reportData);

      console.log(`✅ 性能报告已生成: ${report.filePath}`);
      return report;

    } catch (error) {
      console.error('性能报告生成失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取实时状态
   */
  getRealTimeStatus() {
    return {
      timestamp: Date.now(),
      stats: { ...this.realtimeStats },
      system: {
        memory: this.realtimeStats.memoryUsage,
        cpu: this.realtimeStats.cpuUsage,
        uptime: process.uptime()
      },
      health: this.getHealthScore()
    };
  }

  /**
   * 获取健康评分
   */
  getHealthScore() {
    let score = 100;

    // 响应时间影响
    if (this.realtimeStats.averageResponseTime > 10000) {
      score -= 30;
    } else if (this.realtimeStats.averageResponseTime > 5000) {
      score -= 15;
    }

    // 错误率影响
    if (this.realtimeStats.errorRate > 0.2) {
      score -= 40;
    } else if (this.realtimeStats.errorRate > 0.1) {
      score -= 20;
    }

    // 内存使用影响
    if (this.realtimeStats.memoryUsage > 0.9) {
      score -= 20;
    } else if (this.realtimeStats.memoryUsage > 0.8) {
      score -= 10;
    }

    // CPU使用影响
    if (this.realtimeStats.cpuUsage > 2) {
      score -= 15;
    } else if (this.realtimeStats.cpuUsage > 1) {
      score -= 5;
    }

    return Math.max(0, score);
  }

  /**
   * 清理过期指标
   */
  cleanupExpiredMetrics() {
    const cutoffTime = Date.now() - this.config.metricsRetention;

    Object.keys(this.metrics).forEach(category => {
      Object.keys(this.metrics[category]).forEach(type => {
        if (Array.isArray(this.metrics[category][type])) {
          this.metrics[category][type] = this.metrics[category][type].filter(
            item => item.timestamp > cutoffTime
          );
        }
      });
    });
  }

  /**
   * 模拟网络字节数
   */
  getNetworkBytes(type) {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * 模拟磁盘字节数
   */
  getDiskBytes(type) {
    return Math.floor(Math.random() * 500000);
  }

  /**
   * 模拟磁盘操作数
   */
  getDiskOperations() {
    return Math.floor(Math.random() * 100);
  }
}

/**
 * 性能分析器
 */
class PerformanceAnalyzer {
  /**
   * 分析性能数据
   */
  analyzePerformance(metrics, timeRange) {
    const timeWindow = this.parseTimeRange(timeRange);
    const cutoffTime = Date.now() - timeWindow;

    return {
      summary: this.generateSummary(metrics, cutoffTime),
      system: this.analyzeSystemMetrics(metrics.system, cutoffTime),
      application: this.analyzeApplicationMetrics(metrics.application, cutoffTime),
      ai: this.analyzeAIMetrics(metrics.ai, cutoffTime),
      business: this.analyzeBusinessMetrics(metrics.business, cutoffTime),
      recommendations: this.generateRecommendations(metrics, cutoffTime),
      trends: this.analyzeTrends(metrics, cutoffTime)
    };
  }

  /**
   * 解析时间范围
   */
  parseTimeRange(timeRange) {
    const matches = timeRange.match(/^(\d+)([hmsd])$/);
    if (!matches) return 3600000; // 默认1小时

    const value = parseInt(matches[1]);
    const unit = matches[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600000;
    }
  }

  /**
   * 生成摘要
   */
  generateSummary(metrics, cutoffTime) {
    const recentRequests = metrics.application.requests.filter(r => r.timestamp > cutoffTime);
    const recentResponses = metrics.application.responses.filter(r => r.timestamp > cutoffTime);
    const recentErrors = metrics.application.errors.filter(e => e.timestamp > cutoffTime);

    const avgResponseTime = recentResponses.length > 0
      ? recentResponses.reduce((sum, r) => sum + r.duration, 0) / recentResponses.length
      : 0;

    const errorRate = (recentRequests.length + recentErrors.length) > 0
      ? recentErrors.length / (recentRequests.length + recentErrors.length)
      : 0;

    return {
      timeRange: cutoffTime,
      totalRequests: recentRequests.length,
      totalErrors: recentErrors.length,
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      throughput: recentRequests.length > 0
        ? recentRequests.length / ((Date.now() - cutoffTime) / 1000)
        : 0
    };
  }

  /**
   * 分析系统指标
   */
  analyzeSystemMetrics(systemMetrics, cutoffTime) {
    const recentMemory = systemMetrics.memory.filter(m => m.timestamp > cutoffTime);
    const recentCPU = systemMetrics.cpu.filter(c => c.timestamp > cutoffTime);

    return {
      memory: {
        average: this.calculateAverage(recentMemory, 'usage'),
        peak: this.calculateMax(recentMemory, 'usage'),
        trend: this.calculateTrend(recentMemory, 'usage')
      },
      cpu: {
        average: this.calculateAverage(recentCPU, 'loadAverage'),
        peak: this.calculateMax(recentCPU, 'loadAverage'),
        trend: this.calculateTrend(recentCPU, 'loadAverage')
      }
    };
  }

  /**
   * 分析应用指标
   */
  analyzeApplicationMetrics(appMetrics, cutoffTime) {
    const recentCache = appMetrics.cache.filter(c => c.timestamp > cutoffTime);

    const cacheHits = recentCache.filter(c => c.type === 'hit').length;
    const cacheMisses = recentCache.filter(c => c.type === 'miss').length;
    const cacheHitRate = (cacheHits + cacheMisses) > 0
      ? cacheHits / (cacheHits + cacheMisses)
      : 0;

    return {
      cache: {
        hitRate: Math.round(cacheHitRate * 100) / 100,
        totalOperations: cacheHits + cacheMisses,
        hits: cacheHits,
        misses: cacheMisses
      }
    };
  }

  /**
   * 分析AI指标
   */
  analyzeAIMetrics(aiMetrics, cutoffTime) {
    const result = {};

    Object.keys(aiMetrics).forEach(analyzer => {
      const recentRequests = aiMetrics[analyzer].requests.filter(r => r.timestamp > cutoffTime);
      const recentErrors = aiMetrics[analyzer].errors.filter(e => e.timestamp > cutoffTime);

      result[analyzer] = {
        requests: recentRequests.length,
        errors: recentErrors.length,
        errorRate: recentRequests.length > 0
          ? recentErrors.length / recentRequests.length
          : 0
      };
    });

    return result;
  }

  /**
   * 分析业务指标
   */
  analyzeBusinessMetrics(businessMetrics, cutoffTime) {
    const recentReviews = businessMetrics.reviews.filter(r => r.timestamp > cutoffTime);
    const recentAnalyses = businessMetrics.analyses.filter(a => a.timestamp > cutoffTime);

    return {
      reviews: {
        total: recentReviews.length,
        averageQuality: this.calculateAverage(recentReviews, 'qualityScore')
      },
      analyses: {
        total: recentAnalyses.length,
        averageDuration: this.calculateAverage(recentAnalyses, 'duration')
      }
    };
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(metrics, cutoffTime) {
    const recommendations = [];

    // 基于系统指标的建议
    const recentMemory = metrics.system.memory.filter(m => m.timestamp > cutoffTime);
    const avgMemoryUsage = this.calculateAverage(recentMemory, 'usage');

    if (avgMemoryUsage > 0.8) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        title: '内存使用优化',
        description: `内存使用率 ${(avgMemoryUsage * 100).toFixed(1)}% 偏高`,
        actions: [
          '减少缓存大小',
          '增加垃圾回收频率',
          '优化数据结构',
          '考虑增加内存容量'
        ]
      });
    }

    // 基于应用指标的建议
    const recentCache = metrics.application.cache.filter(c => c.timestamp > cutoffTime);
    const cacheHits = recentCache.filter(c => c.type === 'hit').length;
    const cacheMisses = recentCache.filter(c => c.type === 'miss').length;
    const cacheHitRate = (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 1;

    if (cacheHitRate < 0.7 && (cacheHits + cacheMisses) > 50) {
      recommendations.push({
        category: 'cache',
        priority: 'medium',
        title: '缓存效率优化',
        description: `缓存命中率 ${(cacheHitRate * 100).toFixed(1)}% 较低`,
        actions: [
          '增加缓存容量',
          '优化缓存策略',
          '延长缓存TTL',
          '实现智能预热'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 分析趋势
   */
  analyzeTrends(metrics, cutoffTime) {
    const recentMemory = metrics.system.memory.filter(m => m.timestamp > cutoffTime);
    const recentRequests = metrics.application.requests.filter(r => r.timestamp > cutoffTime);

    return {
      memory: this.calculateTrend(recentMemory, 'usage'),
      requests: this.calculateRequestTrend(recentRequests)
    };
  }

  /**
   * 计算平均值
   */
  calculateAverage(data, field) {
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length;
  }

  /**
   * 计算最大值
   */
  calculateMax(data, field) {
    if (data.length === 0) return 0;
    return Math.max(...data.map(item => item[field] || 0));
  }

  /**
   * 计算趋势
   */
  calculateTrend(data, field) {
    if (data.length < 2) return 'stable';

    const values = data.map(item => item[field] || 0);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * 计算请求趋势
   */
  calculateRequestTrend(requests) {
    if (requests.length < 10) return 'stable';

    // 按时间分组，计算每分钟请求数
    const timeSlots = {};
    requests.forEach(req => {
      const minute = Math.floor(req.timestamp / 60000) * 60000;
      timeSlots[minute] = (timeSlots[minute] || 0) + 1;
    });

    const counts = Object.values(timeSlots);
    return this.calculateTrend(counts.map((count, i) => ({ value: count })), 'value');
  }
}

/**
 * 报告生成器
 */
class ReportGenerator {
  constructor(outputDir) {
    this.outputDir = outputDir;
  }

  /**
   * 生成报告
   */
  async generateReport(reportData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `performance-report-${timestamp}.md`;
    const filePath = path.join(this.outputDir, fileName);

    const reportContent = this.generateMarkdownReport(reportData);

    await fs.writeFile(filePath, reportContent, 'utf8');

    return {
      filePath,
      fileName,
      timestamp: new Date().toISOString(),
      size: reportContent.length
    };
  }

  /**
   * 生成Markdown格式报告
   */
  generateMarkdownReport(data) {
    const timestamp = new Date().toLocaleString('zh-CN');

    return `# 性能监控报告

生成时间: ${timestamp}

## 📊 性能摘要

| 指标 | 数值 |
|------|------|
| 总请求数 | ${data.summary.totalRequests} |
| 总错误数 | ${data.summary.totalErrors} |
| 平均响应时间 | ${data.summary.averageResponseTime}ms |
| 错误率 | ${(data.summary.errorRate * 100).toFixed(1)}% |
| 吞吐量 | ${data.summary.throughput.toFixed(2)} req/s |

## 🖥️ 系统资源

### 内存使用
- 平均使用率: ${(data.system.memory.average * 100).toFixed(1)}%
- 峰值使用率: ${(data.system.memory.peak * 100).toFixed(1)}%
- 趋势: ${data.system.memory.trend}

### CPU使用
- 平均负载: ${data.system.cpu.average.toFixed(2)}
- 峰值负载: ${data.system.cpu.peak.toFixed(2)}
- 趋势: ${data.system.cpu.trend}

## 💾 缓存性能

| 指标 | 数值 |
|------|------|
| 命中率 | ${(data.application.cache.hitRate * 100).toFixed(1)}% |
| 总操作数 | ${data.application.cache.totalOperations} |
| 命中次数 | ${data.application.cache.hits} |
| 未命中次数 | ${data.application.cache.misses} |

## 🤖 AI分析器状态

${Object.keys(data.ai).map(analyzer => `
### ${analyzer.toUpperCase()}
- 请求数: ${data.ai[analyzer].requests}
- 错误数: ${data.ai[analyzer].errors}
- 错误率: ${(data.ai[analyzer].errorRate * 100).toFixed(1)}%
`).join('')}

## 📈 业务指标

### 代码评审
- 总评审数: ${data.business.reviews.total}
- 平均质量分: ${data.business.reviews.averageQuality.toFixed(1)}/10

### 分析任务
- 总分析数: ${data.business.analyses.total}
- 平均耗时: ${Math.round(data.business.analyses.averageDuration)}ms

## 🎯 优化建议

${data.recommendations.map(rec => `
### ${rec.title} (${rec.priority})

${rec.description}

建议措施:
${rec.actions.map(action => `- ${action}`).join('\n')}
`).join('')}

## 📊 趋势分析

- 内存使用趋势: ${data.trends.memory}
- 请求量趋势: ${data.trends.requests}

---

*报告由 PR Review Automation 性能监控系统自动生成*
`;
  }
}

export { PerformanceMonitor };
export default PerformanceMonitor;
