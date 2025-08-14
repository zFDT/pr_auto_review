#!/usr/bin/env node

/**
 * 优化的AI分析器工厂
 * 
 * 负责创建和管理单一AI分析器实例：
 * - 严格按照配置创建指定的AI分析器
 * - 高性能并发优化
 * - 无fallback策略，配置错误直接失败
 * - 移除缓存功能以适应独立运行模式
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @license MIT
 */

import { CopilotAnalyzer } from '../analyzers/copilot-extension.js';
import { OpenAIAnalyzer } from '../analyzers/openai-analyzer.js';
import { AliyunBailianAnalyzer } from '../analyzers/aliyun-bailian-analyzer.js';
import { aiConfigManager } from '../config/ai-config-manager.js';

/**
 * AI分析器工厂类
 */
class AIAnalyzerFactory {
  constructor() {
    this.analyzer = null;
    this.provider = null;
    this.performanceStats = {
      initTime: null,
      analysisCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      errorCount: 0,
      successRate: 0
    };
  }

  /**
   * 创建AI分析器
   * @param {Object} config 完整配置对象
   * @returns {Promise<Object>} AI分析器实例
   * @throws {Error} 如果创建失败
   */
  async createAnalyzer(config) {
    const startTime = Date.now();

    try {
      // 初始化AI配置管理器
      await aiConfigManager.initialize(config);

      this.provider = aiConfigManager.getAIProvider();
      const aiConfig = aiConfigManager.getAIConfig();

      // 根据配置的提供商创建分析器
      switch (this.provider) {
        case 'aliyun_bailian':
        case 'bailian':
          this.analyzer = await this.createAliyunBailianAnalyzer(config, aiConfig);
          break;

        case 'openai':
          this.analyzer = await this.createOpenAIAnalyzer(config, aiConfig);
          break;

        case 'copilot':
          this.analyzer = await this.createCopilotAnalyzer(config, aiConfig);
          break;

        default:
          throw new Error(`不支持的AI提供商: ${this.provider}`);
      }

      // 记录初始化时间
      this.performanceStats.initTime = Date.now() - startTime;

      // 验证分析器是否可用
      await this.validateAnalyzer();

      console.log(`🎯 ${this.provider} AI分析器创建成功，初始化耗时: ${this.performanceStats.initTime}ms`);
      console.log(`📊 性能配置: 并发=${aiConfig.maxConcurrency}, 超时=${aiConfig.timeout}ms`);

      return this.analyzer;

    } catch (error) {
      console.error(`❌ AI分析器创建失败: ${error.message}`);
      throw new Error(`AI分析器初始化失败: ${error.message}`);
    }
  }

  /**
   * 创建阿里云百炼分析器
   */
  async createAliyunBailianAnalyzer(config, aiConfig) {
    const optimizedConfig = {
      ...config,
      ai_config: {
        ...config.ai_config,
        aliyun_bailian: {
          ...config.ai_config.aliyun_bailian,
          ...aiConfig
        }
      }
    };

    const analyzer = new AliyunBailianAnalyzer(optimizedConfig);

    // 验证阿里云百炼连接
    if (!analyzer.isConfigured) {
      throw new Error('阿里云百炼分析器配置验证失败');
    }

    return analyzer;
  }

  /**
   * 创建OpenAI分析器
   */
  async createOpenAIAnalyzer(config, aiConfig) {
    const optimizedConfig = {
      ...config,
      ai_config: {
        ...config.ai_config,
        openai: {
          ...config.ai_config.openai,
          ...aiConfig
        }
      }
    };

    const analyzer = new OpenAIAnalyzer(optimizedConfig);

    // 验证OpenAI连接
    if (!analyzer.isConfigured()) {
      throw new Error('OpenAI分析器配置验证失败');
    }

    return analyzer;
  }

  /**
   * 创建Copilot分析器
   */
  async createCopilotAnalyzer(config, aiConfig) {
    const optimizedConfig = {
      ...config,
      ai_config: {
        ...config.ai_config,
        copilot: {
          ...config.ai_config.copilot,
          ...aiConfig
        }
      }
    };

    const analyzer = new CopilotAnalyzer(optimizedConfig);

    return analyzer;
  }

  /**
   * 验证分析器是否可用
   */
  async validateAnalyzer() {
    if (!this.analyzer) {
      throw new Error('分析器创建失败');
    }

    // 检查分析器是否有必要的方法
    if (typeof this.analyzer.analyzeCodeChanges !== 'function') {
      throw new Error('分析器缺少必要的analyzeCodeChanges方法');
    }

    // 根据提供商进行特定验证
    switch (this.provider) {
      case 'aliyun_bailian':
      case 'bailian':
        if (!this.analyzer.isConfigured) {
          throw new Error('阿里云百炼分析器配置不完整');
        }
        break;

      case 'openai':
        if (!this.analyzer.isConfigured()) {
          throw new Error('OpenAI分析器配置不完整');
        }
        break;

      case 'copilot':
        // Copilot的验证可能需要特殊处理
        break;
    }

    console.log(`✅ ${this.provider} 分析器验证通过`);
  }

  /**
   * 执行AI分析（带性能监控）
   * @param {Array} diff 代码差异
   * @param {Object} mrDetails MR详情
   * @returns {Promise<Object>} 分析结果
   */
  async analyze(diff, mrDetails) {
    if (!this.analyzer) {
      throw new Error('AI分析器未初始化');
    }

    const startTime = Date.now();

    try {
      console.log(`🔍 开始使用 ${this.provider} 进行代码分析...`);

      const result = await this.analyzer.analyzeCodeChanges(diff, mrDetails);

      // 更新性能统计
      const responseTime = Date.now() - startTime;
      this.updatePerformanceStats(responseTime, true);

      console.log(`✅ ${this.provider} 分析完成，耗时: ${responseTime}ms`);

      return result;

    } catch (error) {
      // 更新错误统计
      const responseTime = Date.now() - startTime;
      this.updatePerformanceStats(responseTime, false);

      console.error(`❌ ${this.provider} 分析失败: ${error.message}`);
      throw new Error(`AI分析失败: ${error.message}`);
    }
  }

  /**
   * 更新性能统计
   */
  updatePerformanceStats(responseTime, success) {
    this.performanceStats.analysisCount++;
    this.performanceStats.totalResponseTime += responseTime;
    this.performanceStats.averageResponseTime = Math.round(
      this.performanceStats.totalResponseTime / this.performanceStats.analysisCount
    );

    if (!success) {
      this.performanceStats.errorCount++;
    }

    this.performanceStats.successRate = (
      (this.performanceStats.analysisCount - this.performanceStats.errorCount) /
      this.performanceStats.analysisCount * 100
    ).toFixed(2);
  }

  /**
   * 获取分析器实例
   * @returns {Object} 分析器实例
   */
  getAnalyzer() {
    return this.analyzer;
  }

  /**
   * 获取当前使用的AI提供商
   * @returns {string} AI提供商名称
   */
  getProvider() {
    return this.provider;
  }

  /**
   * 获取性能统计信息
   * @returns {Object} 性能统计
   */
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      provider: this.provider,
      aiConfig: aiConfigManager.getPerformanceStats()
    };
  }

  /**
   * 检查分析器是否已就绪
   * @returns {boolean} 是否就绪
   */
  isReady() {
    return this.analyzer !== null && this.provider !== null;
  }

  /**
   * 销毁分析器（清理资源）
   */
  destroy() {
    this.analyzer = null;
    this.provider = null;
    console.log('🧹 AI分析器资源已清理');
  }
}

// 导出工厂实例
export const aiAnalyzerFactory = new AIAnalyzerFactory();
export default AIAnalyzerFactory;
