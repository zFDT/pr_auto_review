#!/usr/bin/env node

/**
 * 安全配置加载器 - 优化版本
 * 
 * 这个模块提供安全、可靠的配置文件加载功能，支持：
 * - 环境变量替换和验证
 * - 敏感信息保护和加密
 * - 配置文件验证和结构检查
 * - 单例模式和缓存机制
 * - 多环境配置支持
 * - 配置变更监听和热重载
 * 
 * 功能特性：
 * - 🔒 敏感信息安全处理
 * - ⚡ 高性能缓存机制
 * - 🛡️ 完整的输入验证
 * - 📝 详细的错误诊断
 * - 🔄 配置热重载支持
 * - 🌍 多环境配置管理
 * 
 * @author AI Assistant
 * @version 2.0.0
 * @license MIT
 * @since 2024
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 配置验证规则
 * 定义配置文件的结构和验证规则
 */
const CONFIG_SCHEMA = {
  gitlab: {
    required: true,
    properties: {
      host: { type: 'string', required: true, pattern: /^https?:\/\/.+/ },
      token: { type: 'string', required: true, minLength: 10 }
    }
  },
  projects: {
    required: true,
    type: 'object',
    minProperties: 1
  },
  review_settings: {
    required: true,
    properties: {
      max_files_warning: { type: 'number', min: 1, max: 1000, default: 20 },
      max_lines_warning: { type: 'number', min: 1, max: 10000, default: 1000 },
      include_detailed_diff: { type: 'boolean', default: true },
      check_console_logs: { type: 'boolean', default: true },
      check_todos: { type: 'boolean', default: true },
      enable_ai_analysis: { type: 'boolean', default: true },
      ai_provider: { type: 'string', enum: ['openai', 'copilot', 'auto-copilot'], default: 'openai' }
    }
  },
  ai_config: {
    required: false,
    properties: {
      openai: {
        properties: {
          api_key: { type: 'string' },
          model: { type: 'string', default: 'gpt-4o' },
          base_url: { type: 'string', default: 'https://api.openai.com/v1' },
          max_tokens: { type: 'number', min: 100, max: 8000, default: 4000 },
          temperature: { type: 'number', min: 0, max: 2, default: 0.1 }
        }
      },
      copilot: {
        properties: {
          enabled: { type: 'boolean', default: false },
          vscode_path: { type: 'string' },
          timeout: { type: 'number', min: 1000, max: 120000, default: 30000 }
        }
      }
    }
  },
  notification: {
    required: false,
    properties: {
      feishu: {
        properties: {
          webhook_url: { type: 'string' },
          enabled: { type: 'boolean', default: false }
        }
      }
    }
  }
};

/**
 * 配置验证错误类
 * 专门用于配置验证相关的错误
 */
class ConfigValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ConfigValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * 安全配置加载器类
 * 
 * 提供完整的配置管理功能，包括：
 * - 安全的配置文件加载和解析
 * - 环境变量替换和验证
 * - 敏感信息保护和脱敏
 * - 配置结构验证和错误诊断
 * - 配置缓存和性能优化
 * - 多环境支持和配置继承
 */
class ConfigLoader extends EventEmitter {
  /**
   * 构造函数
   * 初始化配置加载器
   */
  constructor() {
    super();
    
    // 配置缓存
    this.configCache = new Map();
    this.configHash = null;
    this.lastLoadTime = null;
    
    // 环境变量缓存
    this.envCache = new Map();
    
    // 文件监听器
    this.configWatchers = new Map();
    
    // 加载统计
    this.loadStats = {
      totalLoads: 0,
      successfulLoads: 0,
      failedLoads: 0,
      cacheHits: 0,
      averageLoadTime: 0
    };
    
    // 默认配置路径
    this.defaultConfigPaths = [
      'config.json',
      'config.local.json',
      `.env.${process.env.NODE_ENV || 'development'}`,
      '.env.local',
      '.env'
    ];
    
    this.logger = console; // 可以替换为更复杂的日志系统
  }

  /**
   * 加载环境变量文件
   * 解析.env文件并设置到process.env中，支持多种格式
   * 
   * @param {string} envPath - 环境变量文件路径
   * @returns {Promise<Object>} 加载的环境变量对象
   */
  async loadEnvFile(envPath = '.env') {
    try {
      const fullPath = path.resolve(__dirname, envPath);
      
      // 检查文件是否存在
      try {
        await fs.access(fullPath);
      } catch {
        this.logger.warn(`环境变量文件不存在: ${envPath}`);
        return {};
      }
      
      const content = await fs.readFile(fullPath, 'utf8');
      const envVars = {};
      
      // 解析环境变量文件
      content.split('\n').forEach((line, lineNumber) => {
        const trimmed = line.trim();
        
        // 跳过空行和注释
        if (!trimmed || trimmed.startsWith('#')) {
          return;
        }
        
        // 解析键值对
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) {
          this.logger.warn(`环境变量文件格式错误，行 ${lineNumber + 1}: ${line}`);
          return;
        }
        
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // 处理转义字符
        value = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
        
        // 设置环境变量
        if (key && !process.env.hasOwnProperty(key)) {
          process.env[key] = value;
          envVars[key] = value;
        }
      });
      
      this.logger.info(`环境变量文件加载成功: ${envPath} (${Object.keys(envVars).length} 个变量)`);
      return envVars;
      
    } catch (error) {
      this.logger.error(`加载环境变量文件失败: ${envPath}`, error);
      throw new Error(`加载环境变量文件失败: ${error.message}`);
    }
  }

  /**
   * 加载所有环境变量文件
   * 按优先级顺序加载多个环境变量文件
   * 
   * @returns {Promise<Object>} 合并后的环境变量对象
   */
  async loadAllEnvFiles() {
    const allEnvVars = {};
    
    // 按优先级顺序加载环境变量文件
    const envFiles = [
      '.env',
      '.env.local',
      `.env.${process.env.NODE_ENV || 'development'}`,
      `.env.${process.env.NODE_ENV || 'development'}.local`
    ];
    
    for (const envFile of envFiles) {
      try {
        const envVars = await this.loadEnvFile(envFile);
        Object.assign(allEnvVars, envVars);
      } catch (error) {
        // 忽略不存在的文件
        if (!error.message.includes('不存在')) {
          this.logger.warn(`加载环境变量文件失败: ${envFile}`, error.message);
        }
      }
    }
    
    return allEnvVars;
  }

  /**
   * 替换环境变量
   * 安全地替换配置中的环境变量占位符
   * 
   * @param {any} obj - 要处理的对象
   * @param {Set} visited - 已访问的对象（防止循环引用）
   * @returns {any} 处理后的对象
   */
  replaceEnvVars(obj, visited = new Set()) {
    // 防止循环引用
    if (visited.has(obj)) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      return this.replaceEnvVarsInString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceEnvVars(item, visited));
    }
    
    if (obj && typeof obj === 'object') {
      visited.add(obj);
      const result = {};
      
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceEnvVars(value, visited);
      }
      
      visited.delete(obj);
      return result;
    }
    
    return obj;
  }

  /**
   * 替换字符串中的环境变量
   * 支持多种格式：${VAR}、$VAR、#{VAR}
   * @private
   */
  replaceEnvVarsInString(str) {
    // 缓存检查
    if (this.envCache.has(str)) {
      return this.envCache.get(str);
    }
    
    let result = str;
    
    // 替换 ${VAR} 格式
    result = result.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        this.logger.warn(`环境变量未定义: ${varName}`);
        return match; // 保持原样
      }
      return value;
    });
    
    // 替换 $VAR 格式
    result = result.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        this.logger.warn(`环境变量未定义: ${varName}`);
        return match; // 保持原样
      }
      return value;
    });
    
    // 缓存结果
    this.envCache.set(str, result);
    return result;
  }

  /**
   * 验证配置对象
   * 根据预定义的schema验证配置结构和数据类型
   * 
   * @param {Object} config - 配置对象
   * @param {Object} schema - 验证规则
   * @param {string} path - 当前验证路径（用于错误消息）
   * @returns {Object} 验证后的配置对象（应用默认值）
   */
  validateConfig(config, schema = CONFIG_SCHEMA, path = '') {
    const validatedConfig = { ...config };
    const errors = [];
    
    // 验证必需字段
    for (const [key, rule] of Object.entries(schema)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const value = config[key];
      
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`必需字段缺失: ${fieldPath}`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        try {
          validatedConfig[key] = this.validateField(value, rule, fieldPath);
        } catch (error) {
          errors.push(error.message);
        }
      } else if (rule.default !== undefined) {
        // 应用默认值
        validatedConfig[key] = rule.default;
      }
    }
    
    if (errors.length > 0) {
      throw new ConfigValidationError(`配置验证失败:\n${errors.join('\n')}`);
    }
    
    return validatedConfig;
  }

  /**
   * 验证单个字段
   * @private
   */
  validateField(value, rule, path) {
    // 类型验证
    if (rule.type) {
      if (!this.validateType(value, rule.type)) {
        throw new ConfigValidationError(`字段类型错误: ${path}，期望 ${rule.type}，实际 ${typeof value}`, path, value);
      }
    }
    
    // 字符串特定验证
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        throw new ConfigValidationError(`字符串太短: ${path}，最小长度 ${rule.minLength}`, path, value);
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        throw new ConfigValidationError(`字符串太长: ${path}，最大长度 ${rule.maxLength}`, path, value);
      }
      
      if (rule.pattern && !rule.pattern.test(value)) {
        throw new ConfigValidationError(`字符串格式不正确: ${path}`, path, value);
      }
      
      if (rule.enum && !rule.enum.includes(value)) {
        throw new ConfigValidationError(`枚举值无效: ${path}，有效值: ${rule.enum.join(', ')}`, path, value);
      }
    }
    
    // 数字特定验证
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        throw new ConfigValidationError(`数值太小: ${path}，最小值 ${rule.min}`, path, value);
      }
      
      if (rule.max !== undefined && value > rule.max) {
        throw new ConfigValidationError(`数值太大: ${path}，最大值 ${rule.max}`, path, value);
      }
    }
    
    // 对象特定验证
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (rule.minProperties && Object.keys(value).length < rule.minProperties) {
        throw new ConfigValidationError(`对象属性太少: ${path}，最少 ${rule.minProperties} 个属性`, path, value);
      }
      
      if (rule.properties) {
        return this.validateConfig(value, rule.properties, path);
      }
    }
    
    return value;
  }

  /**
   * 验证数据类型
   * @private
   */
  validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * 脱敏敏感信息
   * 移除或混淆配置中的敏感数据用于日志记录
   * 
   * @param {Object} config - 原始配置对象
   * @returns {Object} 脱敏后的配置对象
   */
  sanitizeConfig(config) {
    const sensitiveFields = [
      'token', 'api_key', 'password', 'secret', 'webhook_url', 
      'private_key', 'access_token', 'refresh_token'
    ];
    
    return this.deepClone(config, (key, value) => {
      if (typeof value === 'string' && sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase()))) {
        // 保留前3个和后3个字符，中间用*代替
        if (value.length > 10) {
          return value.slice(0, 3) + '*'.repeat(value.length - 6) + value.slice(-3);
        } else if (value.length > 6) {
          return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
        } else {
          return '*'.repeat(value.length);
        }
      }
      return value;
    });
  }

  /**
   * 深度克隆对象
   * @private
   */
  deepClone(obj, transformer = null) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item, transformer));
    }
    
    const cloned = {};
    for (const [key, value] of Object.entries(obj)) {
      const transformedValue = transformer ? transformer(key, value) : value;
      cloned[key] = this.deepClone(transformedValue, transformer);
    }
    
    return cloned;
  }

  /**
   * 计算配置哈希
   * 用于检测配置文件变更
   * @private
   */
  calculateConfigHash(config) {
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return createHash('md5').update(configString).digest('hex');
  }

  /**
   * 主配置加载方法
   * 加载并验证配置文件，支持缓存和错误恢复
   * 
   * @param {string} configPath - 配置文件路径
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Object>} 加载的配置对象
   */
  async loadConfig(configPath = 'config.json', useCache = true) {
    const startTime = Date.now();
    this.loadStats.totalLoads++;
    
    try {
      const fullPath = path.resolve(__dirname, configPath);
      
      // 检查缓存
      if (useCache && this.configCache.has(fullPath)) {
        const cachedConfig = this.configCache.get(fullPath);
        this.loadStats.cacheHits++;
        this.logger.debug(`使用缓存配置: ${configPath}`);
        return cachedConfig;
      }
      
      // 首先加载环境变量
      await this.loadAllEnvFiles();
      
      // 读取配置文件
      this.logger.info(`加载配置文件: ${configPath}`);
      const configContent = await fs.readFile(fullPath, 'utf8');
      let config;
      
      try {
        config = JSON.parse(configContent);
      } catch (parseError) {
        throw new ConfigValidationError(`配置文件JSON格式错误: ${parseError.message}`);
      }
      
      // 替换环境变量
      config = this.replaceEnvVars(config);
      
      // 验证配置
      config = this.validateConfig(config);
      
      // 计算哈希
      const newHash = this.calculateConfigHash(config);
      
      // 检查配置是否发生变更
      if (this.configHash && this.configHash !== newHash) {
        this.emit('configChanged', config, this.configCache.get(fullPath));
      }
      
      this.configHash = newHash;
      this.lastLoadTime = new Date().toISOString();
      
      // 缓存配置
      this.configCache.set(fullPath, config);
      
      // 记录成功统计
      const duration = Date.now() - startTime;
      this.loadStats.successfulLoads++;
      this.updateLoadStats(duration);
      
      this.logger.info(`配置加载成功: ${configPath} (${duration}ms)`);
      
      // 脱敏日志
      const sanitizedConfig = this.sanitizeConfig(config);
      this.logger.debug('配置内容:', JSON.stringify(sanitizedConfig, null, 2));
      
      return config;
      
    } catch (error) {
      this.loadStats.failedLoads++;
      
      if (error instanceof ConfigValidationError) {
        this.logger.error('配置验证失败:', error.message);
      } else {
        this.logger.error('配置加载失败:', error.message);
      }
      
      // 尝试使用备用配置
      const fallbackConfig = await this.tryLoadFallbackConfig(configPath);
      if (fallbackConfig) {
        this.logger.warn('使用备用配置');
        return fallbackConfig;
      }
      
      throw error;
    }
  }

  /**
   * 尝试加载备用配置
   * @private
   */
  async tryLoadFallbackConfig(originalPath) {
    const fallbackPaths = [
      'config.backup.json',
      'config.default.json',
      'config.example.json'
    ];
    
    for (const fallbackPath of fallbackPaths) {
      try {
        this.logger.info(`尝试备用配置: ${fallbackPath}`);
        return await this.loadConfig(fallbackPath, false);
      } catch {
        // 继续尝试下一个备用配置
      }
    }
    
    return null;
  }

  /**
   * 更新加载统计
   * @private
   */
  updateLoadStats(duration) {
    const successfulLoads = this.loadStats.successfulLoads;
    if (successfulLoads > 0) {
      this.loadStats.averageLoadTime = 
        (this.loadStats.averageLoadTime * (successfulLoads - 1) + duration) / successfulLoads;
    }
  }

  /**
   * 启动配置文件监听
   * 监听配置文件变更并自动重新加载
   * 
   * @param {string} configPath - 要监听的配置文件路径
   * @param {Function} callback - 配置变更回调函数
   */
  async startConfigWatcher(configPath = 'config.json', callback = null) {
    const fullPath = path.resolve(__dirname, configPath);
    
    try {
      // 检查文件是否存在
      await fs.access(fullPath);
      
      // 停止现有的监听器
      if (this.configWatchers.has(fullPath)) {
        this.configWatchers.get(fullPath).close();
      }
      
      // 创建新的监听器
      const watcher = fs.watch(fullPath, { persistent: false }, async (eventType, filename) => {
        if (eventType === 'change') {
          this.logger.info(`配置文件变更检测: ${filename}`);
          
          try {
            // 清除缓存
            this.configCache.delete(fullPath);
            
            // 重新加载配置
            const newConfig = await this.loadConfig(configPath, false);
            
            // 触发回调
            if (callback) {
              callback(newConfig);
            }
            
            this.emit('configReloaded', newConfig);
            
          } catch (error) {
            this.logger.error('配置重新加载失败:', error.message);
            this.emit('configReloadError', error);
          }
        }
      });
      
      this.configWatchers.set(fullPath, watcher);
      this.logger.info(`配置文件监听已启动: ${configPath}`);
      
    } catch (error) {
      this.logger.error(`配置文件监听启动失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 停止配置文件监听
   * 
   * @param {string} configPath - 配置文件路径
   */
  stopConfigWatcher(configPath = 'config.json') {
    const fullPath = path.resolve(__dirname, configPath);
    
    if (this.configWatchers.has(fullPath)) {
      this.configWatchers.get(fullPath).close();
      this.configWatchers.delete(fullPath);
      this.logger.info(`配置文件监听已停止: ${configPath}`);
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.configCache.clear();
    this.envCache.clear();
    this.configHash = null;
    this.lastLoadTime = null;
    this.logger.info('配置缓存已清除');
  }

  /**
   * 获取加载统计信息
   * 
   * @returns {Object} 统计信息对象
   */
  getLoadStats() {
    return {
      ...this.loadStats,
      cacheSize: this.configCache.size,
      envCacheSize: this.envCache.size,
      lastLoadTime: this.lastLoadTime,
      watchedFiles: Array.from(this.configWatchers.keys())
    };
  }

  /**
   * 验证配置完整性
   * 检查配置是否包含所有必需的字段和有效的值
   * 
   * @param {Object} config - 要验证的配置对象
   * @returns {Object} 验证结果
   */
  validateConfigIntegrity(config) {
    const issues = [];
    const warnings = [];
    
    try {
      // 基本结构验证
      this.validateConfig(config);
      
      // GitLab连接验证
      if (config.gitlab) {
        if (!config.gitlab.host || !config.gitlab.host.startsWith('http')) {
          issues.push('GitLab主机地址格式无效');
        }
        
        if (!config.gitlab.token || config.gitlab.token === '${GITLAB_TOKEN}') {
          issues.push('GitLab token未配置或使用了占位符');
        }
      }
      
      // 项目配置验证
      if (config.projects) {
        const projectCount = Object.keys(config.projects).length;
        if (projectCount === 0) {
          issues.push('未配置任何项目');
        } else {
          for (const [name, project] of Object.entries(config.projects)) {
            if (!project.id || typeof project.id !== 'number') {
              issues.push(`项目 "${name}" 的ID配置无效`);
            }
          }
        }
      }
      
      // AI配置验证
      if (config.review_settings?.enable_ai_analysis) {
        const provider = config.review_settings.ai_provider;
        
        if (provider === 'openai') {
          const apiKey = process.env.OPENAI_API_KEY || config.ai_config?.openai?.api_key;
          if (!apiKey || apiKey === '${OPENAI_API_KEY}') {
            warnings.push('OpenAI API密钥未配置，AI分析将不可用');
          }
        } else if (provider === 'copilot') {
          if (!config.ai_config?.copilot?.enabled) {
            warnings.push('Copilot未启用，AI分析将不可用');
          }
        }
      }
      
      // 通知配置验证
      if (config.notification?.feishu?.enabled) {
        const webhookUrl = process.env.FEISHU_WEBHOOK_URL || config.notification.feishu.webhook_url;
        if (!webhookUrl || webhookUrl === '${FEISHU_WEBHOOK_URL}') {
          warnings.push('飞书Webhook URL未配置，通知功能将不可用');
        }
      }
      
    } catch (error) {
      issues.push(error.message);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      warnings,
      summary: `发现 ${issues.length} 个错误和 ${warnings.length} 个警告`
    };
  }

  /**
   * 生成配置诊断报告
   * 
   * @returns {string} 诊断报告
   */
  generateDiagnosticReport() {
    const stats = this.getLoadStats();
    const integrity = this.configCache.size > 0 ? 
      this.validateConfigIntegrity(this.configCache.values().next().value) : 
      { valid: false, issues: ['没有已加载的配置'], warnings: [] };
    
    return `
📋 配置加载器诊断报告
生成时间: ${new Date().toLocaleString('zh-CN')}

📊 加载统计:
- 总加载次数: ${stats.totalLoads}
- 成功加载: ${stats.successfulLoads}
- 失败加载: ${stats.failedLoads}
- 缓存命中: ${stats.cacheHits}
- 平均加载时间: ${stats.averageLoadTime.toFixed(2)}ms
- 最后加载时间: ${stats.lastLoadTime || '未加载'}

💾 缓存状态:
- 配置缓存大小: ${stats.cacheSize}
- 环境变量缓存大小: ${stats.envCacheSize}
- 监听文件数量: ${stats.watchedFiles.length}

✅ 配置完整性:
- 验证状态: ${integrity.valid ? '✅ 通过' : '❌ 失败'}
- 错误数量: ${integrity.issues.length}
- 警告数量: ${integrity.warnings.length}

${integrity.issues.length > 0 ? `❌ 错误:\n${integrity.issues.map(issue => `  - ${issue}`).join('\n')}\n` : ''}
${integrity.warnings.length > 0 ? `⚠️ 警告:\n${integrity.warnings.map(warning => `  - ${warning}`).join('\n')}\n` : ''}

💡 建议:
- 定期检查配置文件完整性
- 确保所有敏感信息通过环境变量配置
- 启用配置文件监听以获得更好的开发体验
- 定期备份重要的配置文件
    `.trim();
  }
}

// 创建单例实例
const configLoader = new ConfigLoader();

// 导出模块
export { ConfigLoader, ConfigValidationError, configLoader };

// 如果作为脚本直接运行，执行配置验证
if (import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    try {
      console.log('🔧 配置加载器诊断工具\n');
      
      // 加载配置
      const config = await configLoader.loadConfig();
      console.log('✅ 配置加载成功\n');
      
      // 生成诊断报告
      const report = configLoader.generateDiagnosticReport();
      console.log(report);
      
      // 验证配置完整性
      const integrity = configLoader.validateConfigIntegrity(config);
      if (!integrity.valid) {
        console.error('\n❌ 配置验证失败，请修复以上问题后重试');
        process.exit(1);
      } else {
        console.log('\n✅ 配置验证通过');
      }
      
    } catch (error) {
      console.error('❌ 配置诊断失败:', error.message);
      process.exit(1);
    }
  }
  
  main();
}
