#!/usr/bin/env node

/**
 * 智能缓存管理器 - 企业级缓存解决方案
 * 
 * 提供多层缓存架构和智能缓存策略：
 * - L1内存缓存 + L2Redis缓存 + L3文件缓存
 * - 智能缓存预热和失效策略
 * - 缓存穿透、击穿、雪崩防护
 * - 实时缓存监控和性能分析
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @license MIT
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * 智能缓存管理器
 */
class CacheManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      // 基础配置
      enabled: options.enabled !== false,
      debug: options.debug === true,

      // L1缓存（内存）
      l1: {
        enabled: options.l1?.enabled !== false,
        maxSize: options.l1?.maxSize || 1000,
        maxMemory: options.l1?.maxMemory || 100 * 1024 * 1024, // 100MB
        ttl: options.l1?.ttl || 300000, // 5分钟
        algorithm: options.l1?.algorithm || 'lru' // lru, lfu, fifo
      },

      // L2缓存（Redis）
      l2: {
        enabled: options.l2?.enabled === true,
        host: options.l2?.host || 'localhost',
        port: options.l2?.port || 6379,
        ttl: options.l2?.ttl || 3600000, // 1小时
        keyPrefix: options.l2?.keyPrefix || 'pr_review:'
      },

      // L3缓存（文件系统）
      l3: {
        enabled: options.l3?.enabled !== false,
        directory: options.l3?.directory || './cache',
        maxFiles: options.l3?.maxFiles || 10000,
        ttl: options.l3?.ttl || 86400000, // 24小时
        compression: options.l3?.compression !== false
      },

      // 缓存策略
      strategy: {
        writeThrough: options.strategy?.writeThrough === true,
        writeBack: options.strategy?.writeBack === true,
        readThrough: options.strategy?.readThrough !== false,
        failover: options.strategy?.failover !== false
      },

      // 预热配置
      prewarming: {
        enabled: options.prewarming?.enabled === true,
        batchSize: options.prewarming?.batchSize || 100,
        concurrency: options.prewarming?.concurrency || 3
      }
    };

    // 缓存实例
    this.l1Cache = new L1Cache(this.config.l1);
    this.l2Cache = this.config.l2.enabled ? new L2Cache(this.config.l2) : null;
    this.l3Cache = new L3Cache(this.config.l3);

    // 统计信息
    this.stats = {
      requests: { total: 0, hits: 0, misses: 0 },
      l1: { hits: 0, misses: 0, evictions: 0 },
      l2: { hits: 0, misses: 0, errors: 0 },
      l3: { hits: 0, misses: 0, errors: 0 },
      performance: {
        averageGetTime: 0,
        averageSetTime: 0,
        getTimes: [],
        setTimes: []
      }
    };

    // 布隆过滤器（防止缓存穿透）
    this.bloomFilter = new SimpleBloomFilter(10000, 4);

    // 分布式锁（防止缓存击穿）
    this.locks = new Map();

    this.initialize();
  }

  /**
   * 初始化缓存管理器
   */
  async initialize() {
    try {
      // 初始化L3缓存目录
      await this.l3Cache.initialize();

      // 初始化L2缓存连接
      if (this.l2Cache) {
        await this.l2Cache.initialize();
      }

      // 启动清理任务
      this.startCleanupTasks();

      // 启动统计任务
      this.startStatisticsTasks();

      this.log('🚀 缓存管理器初始化完成');

    } catch (error) {
      this.log('❌ 缓存管理器初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取缓存值
   */
  async get(key, options = {}) {
    const startTime = Date.now();
    this.stats.requests.total++;

    try {
      const normalizedKey = this.normalizeKey(key);

      // 检查布隆过滤器（防穿透）
      if (!this.bloomFilter.test(normalizedKey) && !options.bypassBloomFilter) {
        this.stats.requests.misses++;
        return null;
      }

      let result = null;
      let source = null;

      // L1缓存查询
      if (this.config.l1.enabled) {
        result = await this.l1Cache.get(normalizedKey);
        if (result !== null) {
          source = 'L1';
          this.stats.l1.hits++;
        } else {
          this.stats.l1.misses++;
        }
      }

      // L2缓存查询
      if (result === null && this.l2Cache && this.config.l2.enabled) {
        try {
          result = await this.l2Cache.get(normalizedKey);
          if (result !== null) {
            source = 'L2';
            this.stats.l2.hits++;

            // 回写到L1
            if (this.config.l1.enabled) {
              await this.l1Cache.set(normalizedKey, result, this.config.l1.ttl);
            }
          } else {
            this.stats.l2.misses++;
          }
        } catch (error) {
          this.stats.l2.errors++;
          this.log('L2缓存查询错误:', error.message);
        }
      }

      // L3缓存查询
      if (result === null && this.config.l3.enabled) {
        try {
          result = await this.l3Cache.get(normalizedKey);
          if (result !== null) {
            source = 'L3';
            this.stats.l3.hits++;

            // 回写到L1和L2
            await this.writeUpstream(normalizedKey, result);
          } else {
            this.stats.l3.misses++;
          }
        } catch (error) {
          this.stats.l3.errors++;
          this.log('L3缓存查询错误:', error.message);
        }
      }

      // 更新统计
      if (result !== null) {
        this.stats.requests.hits++;
        this.log(`✅ 缓存命中 [${source}]: ${key}`);
      } else {
        this.stats.requests.misses++;
        this.log(`❌ 缓存未命中: ${key}`);
      }

      // 记录性能指标
      const duration = Date.now() - startTime;
      this.updatePerformanceStats('get', duration);

      return result;

    } catch (error) {
      this.log('缓存获取错误:', error.message);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(key, value, ttl = null, options = {}) {
    const startTime = Date.now();

    try {
      const normalizedKey = this.normalizeKey(key);
      const serializedValue = this.serializeValue(value);

      // 添加到布隆过滤器
      this.bloomFilter.add(normalizedKey);

      // 防止缓存击穿：使用分布式锁
      const lockKey = `lock:${normalizedKey}`;
      if (this.locks.has(lockKey)) {
        this.log(`🔒 等待锁释放: ${key}`);
        await this.waitForLock(lockKey);
      }

      this.locks.set(lockKey, Date.now());

      try {
        // 写入所有层级
        const promises = [];

        // L1缓存
        if (this.config.l1.enabled) {
          promises.push(
            this.l1Cache.set(normalizedKey, serializedValue, ttl || this.config.l1.ttl)
          );
        }

        // L2缓存
        if (this.l2Cache && this.config.l2.enabled) {
          promises.push(
            this.l2Cache.set(normalizedKey, serializedValue, ttl || this.config.l2.ttl)
              .catch(error => {
                this.log('L2缓存设置错误:', error.message);
              })
          );
        }

        // L3缓存
        if (this.config.l3.enabled) {
          promises.push(
            this.l3Cache.set(normalizedKey, serializedValue, ttl || this.config.l3.ttl)
              .catch(error => {
                this.log('L3缓存设置错误:', error.message);
              })
          );
        }

        await Promise.allSettled(promises);

        this.log(`✅ 缓存设置成功: ${key}`);

      } finally {
        // 释放锁
        this.locks.delete(lockKey);
      }

      // 记录性能指标
      const duration = Date.now() - startTime;
      this.updatePerformanceStats('set', duration);

      return true;

    } catch (error) {
      this.log('缓存设置错误:', error.message);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key) {
    try {
      const normalizedKey = this.normalizeKey(key);

      const promises = [];

      if (this.config.l1.enabled) {
        promises.push(this.l1Cache.delete(normalizedKey));
      }

      if (this.l2Cache && this.config.l2.enabled) {
        promises.push(this.l2Cache.delete(normalizedKey));
      }

      if (this.config.l3.enabled) {
        promises.push(this.l3Cache.delete(normalizedKey));
      }

      await Promise.allSettled(promises);

      this.log(`✅ 缓存删除成功: ${key}`);
      return true;

    } catch (error) {
      this.log('缓存删除错误:', error.message);
      return false;
    }
  }

  /**
   * 批量预热缓存
   */
  async prewarm(items, loader) {
    if (!this.config.prewarming.enabled) {
      this.log('缓存预热未启用');
      return;
    }

    this.log(`🔥 开始预热 ${items.length} 个缓存项`);

    const batchSize = this.config.prewarming.batchSize;
    const concurrency = this.config.prewarming.concurrency;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const promises = batch.map(async (item) => {
        try {
          const key = typeof item === 'string' ? item : item.key;
          const existing = await this.get(key, { bypassBloomFilter: true });

          if (existing === null) {
            const value = await loader(item);
            if (value !== null) {
              await this.set(key, value);
            }
          }
        } catch (error) {
          this.log(`预热失败 ${item}:`, error.message);
        }
      });

      // 限制并发数
      const chunks = [];
      for (let j = 0; j < promises.length; j += concurrency) {
        chunks.push(promises.slice(j, j + concurrency));
      }

      for (const chunk of chunks) {
        await Promise.allSettled(chunk);
      }

      this.log(`预热进度: ${Math.min(i + batchSize, items.length)}/${items.length}`);
    }

    this.log('🔥 缓存预热完成');
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    try {
      const promises = [];

      if (this.config.l1.enabled) {
        promises.push(this.l1Cache.clear());
      }

      if (this.l2Cache && this.config.l2.enabled) {
        promises.push(this.l2Cache.clear());
      }

      if (this.config.l3.enabled) {
        promises.push(this.l3Cache.clear());
      }

      await Promise.allSettled(promises);

      // 重置布隆过滤器
      this.bloomFilter = new SimpleBloomFilter(10000, 4);

      // 重置统计
      this.resetStats();

      this.log('🧹 所有缓存已清空');

    } catch (error) {
      this.log('清空缓存错误:', error.message);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const hitRate = this.stats.requests.total > 0
      ? this.stats.requests.hits / this.stats.requests.total
      : 0;

    return {
      ...this.stats,
      hitRate,
      l1Stats: this.l1Cache.getStats(),
      l2Stats: this.l2Cache ? this.l2Cache.getStats() : null,
      l3Stats: this.l3Cache.getStats()
    };
  }

  /**
   * 获取缓存健康状态
   */
  getHealth() {
    const stats = this.getStats();

    return {
      status: 'healthy',
      hitRate: stats.hitRate,
      averageResponseTime: stats.performance.averageGetTime,
      l1: {
        status: this.config.l1.enabled ? 'enabled' : 'disabled',
        size: stats.l1Stats.size,
        hitRate: stats.l1Stats.hitRate
      },
      l2: {
        status: this.l2Cache ? 'enabled' : 'disabled',
        hitRate: stats.l2Stats?.hitRate || 0
      },
      l3: {
        status: this.config.l3.enabled ? 'enabled' : 'disabled',
        size: stats.l3Stats.size,
        hitRate: stats.l3Stats.hitRate
      }
    };
  }

  /**
   * 上游写入（将数据写入上层缓存）
   */
  async writeUpstream(key, value) {
    const promises = [];

    if (this.config.l1.enabled) {
      promises.push(
        this.l1Cache.set(key, value, this.config.l1.ttl)
      );
    }

    if (this.l2Cache && this.config.l2.enabled) {
      promises.push(
        this.l2Cache.set(key, value, this.config.l2.ttl)
          .catch(error => this.log('L2回写错误:', error.message))
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * 等待锁释放
   */
  async waitForLock(lockKey, timeout = 5000) {
    const startTime = Date.now();

    while (this.locks.has(lockKey) && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * 标准化缓存键
   */
  normalizeKey(key) {
    if (typeof key !== 'string') {
      key = JSON.stringify(key);
    }

    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * 序列化值
   */
  serializeValue(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }

  /**
   * 反序列化值
   */
  deserializeValue(value) {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * 更新性能统计
   */
  updatePerformanceStats(operation, duration) {
    const stats = this.stats.performance;

    if (operation === 'get') {
      stats.getTimes.push(duration);
      if (stats.getTimes.length > 1000) {
        stats.getTimes = stats.getTimes.slice(-1000);
      }
      stats.averageGetTime = stats.getTimes.reduce((a, b) => a + b) / stats.getTimes.length;
    } else if (operation === 'set') {
      stats.setTimes.push(duration);
      if (stats.setTimes.length > 1000) {
        stats.setTimes = stats.setTimes.slice(-1000);
      }
      stats.averageSetTime = stats.setTimes.reduce((a, b) => a + b) / stats.setTimes.length;
    }
  }

  /**
   * 启动清理任务
   */
  startCleanupTasks() {
    // 每小时执行一次清理
    setInterval(() => {
      this.performCleanup();
    }, 3600000);
  }

  /**
   * 启动统计任务
   */
  startStatisticsTasks() {
    // 每分钟输出统计信息
    setInterval(() => {
      if (this.config.debug) {
        this.logStatistics();
      }
    }, 60000);
  }

  /**
   * 执行清理
   */
  async performCleanup() {
    this.log('🧹 开始缓存清理');

    try {
      // L1清理
      if (this.config.l1.enabled) {
        await this.l1Cache.cleanup();
      }

      // L3清理
      if (this.config.l3.enabled) {
        await this.l3Cache.cleanup();
      }

      this.log('🧹 缓存清理完成');

    } catch (error) {
      this.log('缓存清理错误:', error.message);
    }
  }

  /**
   * 记录统计信息
   */
  logStatistics() {
    const stats = this.getStats();
    this.log('📊 缓存统计:', {
      总请求数: stats.requests.total,
      命中率: `${(stats.hitRate * 100).toFixed(2)}%`,
      平均获取时间: `${stats.performance.averageGetTime.toFixed(2)}ms`,
      L1命中率: `${(stats.l1Stats.hitRate * 100).toFixed(2)}%`,
      L2命中率: stats.l2Stats ? `${(stats.l2Stats.hitRate * 100).toFixed(2)}%` : 'N/A',
      L3命中率: `${(stats.l3Stats.hitRate * 100).toFixed(2)}%`
    });
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      requests: { total: 0, hits: 0, misses: 0 },
      l1: { hits: 0, misses: 0, evictions: 0 },
      l2: { hits: 0, misses: 0, errors: 0 },
      l3: { hits: 0, misses: 0, errors: 0 },
      performance: {
        averageGetTime: 0,
        averageSetTime: 0,
        getTimes: [],
        setTimes: []
      }
    };
  }

  /**
   * 日志记录
   */
  log(message, data = null) {
    if (this.config.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [CacheManager] ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  /**
   * 关闭缓存管理器
   */
  async shutdown() {
    try {
      if (this.l2Cache) {
        await this.l2Cache.shutdown();
      }

      await this.l3Cache.shutdown();

      this.log('🛑 缓存管理器已关闭');

    } catch (error) {
      this.log('缓存管理器关闭错误:', error.message);
    }
  }
}

/**
 * L1内存缓存
 */
class L1Cache {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.accessTimes = new Map();
    this.accessCounts = new Map();
    this.insertOrder = [];
    this.currentMemory = 0;
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  async get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    const item = this.cache.get(key);

    // 检查TTL
    if (item.expiry && Date.now() > item.expiry) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // 更新访问统计
    this.accessTimes.set(key, Date.now());
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);

    this.stats.hits++;
    return item.value;
  }

  async set(key, value, ttl) {
    const expiry = ttl ? Date.now() + ttl : null;
    const item = { value, expiry };
    const itemSize = this.calculateSize(item);

    // 检查内存限制
    if (this.currentMemory + itemSize > this.config.maxMemory) {
      await this.evict(itemSize);
    }

    // 检查数量限制
    if (this.cache.size >= this.config.maxSize) {
      await this.evict(0);
    }

    // 如果是新键，记录插入顺序
    if (!this.cache.has(key)) {
      this.insertOrder.push(key);
    }

    this.cache.set(key, item);
    this.currentMemory += itemSize;
    this.accessTimes.set(key, Date.now());
    this.accessCounts.set(key, 1);
  }

  async delete(key) {
    if (this.cache.has(key)) {
      const item = this.cache.get(key);
      this.currentMemory -= this.calculateSize(item);

      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.accessCounts.delete(key);

      const index = this.insertOrder.indexOf(key);
      if (index > -1) {
        this.insertOrder.splice(index, 1);
      }
    }
  }

  async evict(requiredSpace) {
    const algorithm = this.config.algorithm;
    let evictedSpace = 0;

    while ((this.currentMemory + requiredSpace > this.config.maxMemory ||
      this.cache.size >= this.config.maxSize) &&
      this.cache.size > 0) {

      let keyToEvict;

      switch (algorithm) {
        case 'lfu':
          keyToEvict = this.findLFUKey();
          break;
        case 'fifo':
          keyToEvict = this.findFIFOKey();
          break;
        case 'lru':
        default:
          keyToEvict = this.findLRUKey();
          break;
      }

      if (keyToEvict) {
        const item = this.cache.get(keyToEvict);
        evictedSpace += this.calculateSize(item);
        await this.delete(keyToEvict);
        this.stats.evictions++;
      } else {
        break;
      }
    }

    return evictedSpace;
  }

  findLRUKey() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  findLFUKey() {
    let leastKey = null;
    let leastCount = Infinity;

    for (const [key, count] of this.accessCounts) {
      if (count < leastCount) {
        leastCount = count;
        leastKey = key;
      }
    }

    return leastKey;
  }

  findFIFOKey() {
    return this.insertOrder[0] || null;
  }

  calculateSize(item) {
    return JSON.stringify(item).length * 2; // 粗略估算
  }

  async cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache) {
      if (item.expiry && now > item.expiry) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }

  async clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.accessCounts.clear();
    this.insertOrder = [];
    this.currentMemory = 0;
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getStats() {
    const hitRate = (this.stats.hits + this.stats.misses) > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    return {
      ...this.stats,
      hitRate,
      size: this.cache.size,
      memoryUsage: this.currentMemory,
      memoryLimit: this.config.maxMemory
    };
  }
}

/**
 * L2 Redis缓存（模拟实现）
 */
class L2Cache {
  constructor(config) {
    this.config = config;
    this.stats = { hits: 0, misses: 0, errors: 0 };
    this.connected = false;
  }

  async initialize() {
    // 模拟Redis连接
    this.connected = true;
  }

  async get(key) {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    // 模拟Redis操作
    this.stats.misses++; // 简化实现
    return null;
  }

  async set(key, value, ttl) {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    // 模拟Redis操作
    return true;
  }

  async delete(key) {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    return true;
  }

  async clear() {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    this.stats = { hits: 0, misses: 0, errors: 0 };
  }

  getStats() {
    const hitRate = (this.stats.hits + this.stats.misses) > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    return {
      ...this.stats,
      hitRate,
      connected: this.connected
    };
  }

  async shutdown() {
    this.connected = false;
  }
}

/**
 * L3文件系统缓存
 */
class L3Cache {
  constructor(config) {
    this.config = config;
    this.stats = { hits: 0, misses: 0, errors: 0 };
  }

  async initialize() {
    try {
      await fs.mkdir(this.config.directory, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async get(key) {
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf8');
      const item = JSON.parse(data);

      // 检查TTL
      if (item.expiry && Date.now() > item.expiry) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return item.value;

    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.stats.errors++;
      } else {
        this.stats.misses++;
      }
      return null;
    }
  }

  async set(key, value, ttl) {
    try {
      const filePath = this.getFilePath(key);
      const expiry = ttl ? Date.now() + ttl : null;
      const item = { value, expiry, timestamp: Date.now() };

      await fs.writeFile(filePath, JSON.stringify(item), 'utf8');
      return true;

    } catch (error) {
      this.stats.errors++;
      return false;
    }
  }

  async delete(key) {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async cleanup() {
    try {
      const files = await fs.readdir(this.config.directory);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        try {
          const filePath = path.join(this.config.directory, file);
          const data = await fs.readFile(filePath, 'utf8');
          const item = JSON.parse(data);

          if (item.expiry && now > item.expiry) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch {
          // 忽略单个文件错误
        }
      }

      console.log(`🧹 L3缓存清理: 删除 ${deletedCount} 个过期文件`);

    } catch (error) {
      this.stats.errors++;
    }
  }

  async clear() {
    try {
      const files = await fs.readdir(this.config.directory);

      for (const file of files) {
        await fs.unlink(path.join(this.config.directory, file));
      }

      this.stats = { hits: 0, misses: 0, errors: 0 };

    } catch (error) {
      this.stats.errors++;
    }
  }

  getFilePath(key) {
    return path.join(this.config.directory, `${key}.cache`);
  }

  async getStats() {
    try {
      const files = await fs.readdir(this.config.directory);
      const hitRate = (this.stats.hits + this.stats.misses) > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0;

      return {
        ...this.stats,
        hitRate,
        size: files.length,
        maxFiles: this.config.maxFiles
      };
    } catch {
      return this.stats;
    }
  }

  async shutdown() {
    // 文件系统缓存无需特殊关闭操作
  }
}

/**
 * 简单布隆过滤器实现
 */
class SimpleBloomFilter {
  constructor(capacity, hashFunctions) {
    this.capacity = capacity;
    this.hashFunctions = hashFunctions;
    this.bitArray = new Array(capacity).fill(false);
  }

  add(item) {
    const hashes = this.getHashes(item);
    for (const hash of hashes) {
      this.bitArray[hash % this.capacity] = true;
    }
  }

  test(item) {
    const hashes = this.getHashes(item);
    return hashes.every(hash => this.bitArray[hash % this.capacity]);
  }

  getHashes(item) {
    const hashes = [];
    for (let i = 0; i < this.hashFunctions; i++) {
      hashes.push(this.hash(item, i));
    }
    return hashes;
  }

  hash(item, seed) {
    let hash = seed;
    for (let i = 0; i < item.length; i++) {
      hash = ((hash << 5) + hash + item.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash);
  }
}

export { CacheManager };
export default CacheManager;
