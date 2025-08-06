#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 安全的配置加载器
 * 支持环境变量替换和敏感信息保护
 */
class ConfigLoader {
  constructor() {
    this.config = null;
  }

  /**
   * 加载环境变量文件
   */
  async loadEnvFile(envPath = '.env') {
    try {
      const fullPath = path.join(__dirname, envPath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            process.env[key.trim()] = value.trim();
          }
        }
      });
    } catch (error) {
      console.warn(`警告: 无法加载环境变量文件 ${envPath}:`, error.message);
    }
  }

  /**
   * 替换配置中的环境变量占位符
   */
  replaceEnvVars(obj) {
    if (typeof obj === 'string') {
      // 替换 ${VAR_NAME} 格式的环境变量
      return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = process.env[varName];
        if (value === undefined) {
          console.warn(`警告: 环境变量 ${varName} 未设置，使用默认值`);
          return match; // 保持原始占位符
        }
        return value;
      });
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceEnvVars(item));
    } else if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceEnvVars(value);
      }
      return result;
    }
    return obj;
  }

  /**
   * 验证必需的配置项
   */
  validateConfig(config) {
    const required = [
      'gitlab.host',
      'gitlab.token'
    ];

    const errors = [];
    
    for (const path of required) {
      const keys = path.split('.');
      let current = config;
      
      for (const key of keys) {
        if (!current || typeof current !== 'object' || !(key in current)) {
          errors.push(`缺少必需配置: ${path}`);
          break;
        }
        current = current[key];
      }
      
      // 检查是否仍然包含占位符
      if (typeof current === 'string' && current.includes('${')) {
        errors.push(`配置 ${path} 包含未解析的环境变量: ${current}`);
      }
    }

    if (errors.length > 0) {
      throw new Error('配置验证失败:\n' + errors.join('\n'));
    }
  }

  /**
   * 加载并验证配置
   */
  async loadConfig(configPath = 'config.json') {
    try {
      // 1. 加载环境变量
      await this.loadEnvFile();

      // 2. 读取配置文件
      const fullPath = path.join(__dirname, configPath);
      const configContent = await fs.readFile(fullPath, 'utf8');
      let config = JSON.parse(configContent);

      // 3. 替换环境变量
      config = this.replaceEnvVars(config);

      // 4. 验证配置
      this.validateConfig(config);

      this.config = config;
      return config;

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`配置文件 ${configPath} 不存在`);
      } else if (error instanceof SyntaxError) {
        throw new Error(`配置文件 ${configPath} JSON格式错误: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取配置（懒加载）
   */
  async getConfig() {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config;
  }

  /**
   * 获取敏感信息掩码版本的配置（用于日志）
   */
  getMaskedConfig() {
    if (!this.config) {
      return null;
    }

    const sensitiveKeys = ['token', 'api_key', 'webhook_url', 'password', 'secret'];
    
    const maskSensitive = (obj) => {
      if (typeof obj === 'string') {
        return obj.length > 8 ? obj.substring(0, 4) + '***' + obj.substring(obj.length - 4) : '***';
      } else if (Array.isArray(obj)) {
        return obj.map(item => maskSensitive(item));
      } else if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            result[key] = maskSensitive(value);
          } else {
            result[key] = maskSensitive(value);
          }
        }
        return result;
      }
      return obj;
    };

    return maskSensitive(this.config);
  }
}

// 单例模式
const configLoader = new ConfigLoader();

export { ConfigLoader, configLoader };
