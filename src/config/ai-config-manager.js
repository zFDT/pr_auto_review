#!/usr/bin/env node

/**
 * AI配置管理器
 * 
 * 专门负责AI提供商的配置管理和验证：
 * - 严格的AI提供商配置验证
 * - 单一AI提供商初始化（不支持fallback）
 * - 高性能并发配置优化
 * - 配置错误时立即终止流程
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @license MIT
 */

import { configLoader } from './config-loader.js';

/**
 * AI配置管理器类
 */
class AIConfigManager {
  constructor() {
    this.config = null;
    this.aiProvider = null;
    this.aiConfig = null;
  }

  /**
   * 初始化AI配置
   * @param {Object} config 完整的配置对象
   * @throws {Error} 如果配置无效或AI不可用
   */
  async initialize(config) {
    this.config = config;

    // 获取配置的AI提供商
    this.aiProvider = config.review_settings?.ai_provider;

    if (!this.aiProvider) {
      throw new Error('配置错误：未指定AI提供商。请在config.json的review_settings.ai_provider中配置');
    }

    // 验证AI提供商配置
    await this.validateAIProvider();

    // 优化AI配置以提高性能
    this.optimizeAIConfig();

    console.log(`✅ AI配置管理器初始化完成，使用提供商: ${this.aiProvider}`);
  }

  /**
   * 验证AI提供商配置
   * @throws {Error} 如果配置无效
   */
  async validateAIProvider() {
    const aiConfigs = this.config.ai_config;

    if (!aiConfigs) {
      throw new Error('配置错误：缺少ai_config配置');
    }

    switch (this.aiProvider) {
      case 'aliyun_bailian':
      case 'bailian':
        this.validateAliyunBailianConfig(aiConfigs.aliyun_bailian);
        this.aiConfig = aiConfigs.aliyun_bailian;
        break;

      case 'openai':
        this.validateOpenAIConfig(aiConfigs.openai);
        this.aiConfig = aiConfigs.openai;
        break;

      case 'copilot':
        this.validateCopilotConfig(aiConfigs.copilot);
        this.aiConfig = aiConfigs.copilot;
        break;

      default:
        throw new Error(`不支持的AI提供商: ${this.aiProvider}。支持的提供商: aliyun_bailian, openai, copilot`);
    }
  }

  /**
   * 验证阿里云百炼配置
   * @param {Object} config 阿里云百炼配置
   * @throws {Error} 如果配置无效
   */
  validateAliyunBailianConfig(config) {
    if (!config) {
      throw new Error('配置错误：缺少aliyun_bailian配置');
    }

    const apiKey = process.env.ALIYUN_BAILIAN_API_KEY || config.api_key;
    const workspaceId = process.env.ALIYUN_BAILIAN_WORKSPACE_ID || config.workspace_id;

    if (!apiKey || apiKey === '${ALIYUN_BAILIAN_API_KEY}') {
      throw new Error('配置错误：阿里云百炼API密钥未配置。请设置ALIYUN_BAILIAN_API_KEY环境变量或在配置文件中指定api_key');
    }

    if (!workspaceId || workspaceId === '${ALIYUN_BAILIAN_WORKSPACE_ID}') {
      throw new Error('配置错误：阿里云百炼工作空间ID未配置。请设置ALIYUN_BAILIAN_WORKSPACE_ID环境变量或在配置文件中指定workspace_id');
    }

    if (!config.model) {
      throw new Error('配置错误：阿里云百炼模型未配置。请在配置文件中指定model');
    }

    console.log(`✅ 阿里云百炼配置验证通过 - 模型: ${config.model}, 工作空间: ${workspaceId.slice(0, 6)}***`);
  }

  /**
   * 验证OpenAI配置
   * @param {Object} config OpenAI配置
   * @throws {Error} 如果配置无效
   */
  validateOpenAIConfig(config) {
    if (!config) {
      throw new Error('配置错误：缺少openai配置');
    }

    const apiKey = process.env.OPENAI_API_KEY || config.api_key;

    if (!apiKey || apiKey === '${OPENAI_API_KEY}') {
      throw new Error('配置错误：OpenAI API密钥未配置。请设置OPENAI_API_KEY环境变量或在配置文件中指定api_key');
    }

    if (!config.model) {
      throw new Error('配置错误：OpenAI模型未配置。请在配置文件中指定model');
    }

    console.log(`✅ OpenAI配置验证通过 - 模型: ${config.model}`);
  }

  /**
   * 验证Copilot配置
   * @param {Object} config Copilot配置
   * @throws {Error} 如果配置无效
   */
  validateCopilotConfig(config) {
    if (!config) {
      throw new Error('配置错误：缺少copilot配置');
    }

    if (!config.enabled) {
      throw new Error('配置错误：Copilot未启用。请在配置文件中设置copilot.enabled为true');
    }

    console.log(`✅ Copilot配置验证通过`);
  }

  /**
   * 优化AI配置以提高性能
   */
  optimizeAIConfig() {
    const performanceOptimizations = {
      // 基础性能配置
      baseOptimizations: {
        maxConcurrency: 8,        // 提高并发数
        batchSize: 5,             // 增加批处理大小
        requestTimeout: 45000,    // 45秒超时
        maxRetries: 2,            // 降低重试次数以快速失败
        retryDelay: 500,          // 降低重试延迟
      },

      // AI提供商特定优化
      providerOptimizations: {
        aliyun_bailian: {
          maxConcurrency: 10,     // 阿里云百炼支持更高并发
          maxTokens: 8192,        // 最大token数
          temperature: 0.1,       // 降低随机性提高一致性
          timeout: 60000,         // 60秒超时
          streamMode: false,      // 禁用流模式提高吞吐量
        },
        openai: {
          maxConcurrency: 6,      // OpenAI适中并发
          maxTokens: 4096,
          temperature: 0.1,
          timeout: 45000,
          streamMode: false,
        },
        copilot: {
          maxConcurrency: 4,      // Copilot较低并发
          timeout: 30000,
          maxRetries: 1,          // Copilot重试较少
        }
      }
    };

    // 应用基础优化
    Object.assign(this.aiConfig, performanceOptimizations.baseOptimizations);

    // 应用提供商特定优化
    const providerOpts = performanceOptimizations.providerOptimizations[this.aiProvider];
    if (providerOpts) {
      Object.assign(this.aiConfig, providerOpts);
    }

    // 移除缓存相关配置（因为每次独立运行）
    delete this.aiConfig.enableCache;
    delete this.aiConfig.cacheMaxSize;
    delete this.aiConfig.cacheTTL;

    console.log(`🚀 AI配置已优化，并发数: ${this.aiConfig.maxConcurrency}, 超时: ${this.aiConfig.timeout}ms`);
  }

  /**
   * 获取优化后的AI配置
   * @returns {Object} AI配置对象
   */
  getAIConfig() {
    return this.aiConfig;
  }

  /**
   * 获取AI提供商名称
   * @returns {string} AI提供商名称
   */
  getAIProvider() {
    return this.aiProvider;
  }

  /**
   * 检查AI是否已配置并可用
   * @returns {boolean} 是否可用
   */
  isAIReady() {
    return this.aiProvider && this.aiConfig;
  }

  /**
   * 获取性能统计信息
   * @returns {Object} 性能统计
   */
  getPerformanceStats() {
    return {
      provider: this.aiProvider,
      maxConcurrency: this.aiConfig?.maxConcurrency || 0,
      timeout: this.aiConfig?.timeout || 0,
      maxTokens: this.aiConfig?.maxTokens || 0,
      optimized: true,
      cacheEnabled: false // 明确表示缓存已禁用
    };
  }
}

// 导出单例实例
export const aiConfigManager = new AIConfigManager();
export default AIConfigManager;
