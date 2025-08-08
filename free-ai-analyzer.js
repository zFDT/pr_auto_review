#!/usr/bin/env node

/**
 * 免费AI分析器 - 集成多个免费AI服务
 * 
 * 支持的免费AI服务：
 * 1. Hugging Face Inference API (免费配额)
 * 2. Groq AI (免费高速推理)
 * 3. Together AI (免费配额)
 * 4. Ollama 本地模型
 * 5. 百度文心一言 (免费配额)
 * 6. 阿里通义千问 (免费配额)
 * 7. 阿里云百炼大模型 (付费服务)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

class FreeAIAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.availableServices = {
      huggingface: this.isHuggingFaceConfigured(),
      groq: this.isGroqConfigured(),
      together: this.isTogetherConfigured(),
      ollama: false, // 将在初始化时异步检查
      baidu: this.isBaiduConfigured(),
      tongyi: this.isTongyiConfigured(),
      aliyun_bailian: this.isAliyunBailianConfigured()
    };
    
    // 异步检查 Ollama 可用性
    this.initializeOllamaCheck();
    
    this.currentService = this.selectBestService();
  }

  /**
   * 异步初始化 Ollama 检查
   */
  async initializeOllamaCheck() {
    try {
      this.availableServices.ollama = await this.isOllamaAvailable();
      // 重新选择最佳服务
      this.currentService = this.selectBestService();
    } catch (error) {
      this.availableServices.ollama = false;
    }
  }

  /**
   * 检查各个服务的配置状态
   */
  isHuggingFaceConfigured() {
    const token = process.env.HUGGINGFACE_TOKEN || this.config.ai_config?.huggingface?.token;
    return token && token !== '${HUGGINGFACE_TOKEN}';
  }

  isGroqConfigured() {
    const apiKey = process.env.GROQ_API_KEY || this.config.ai_config?.groq?.api_key;
    return apiKey && apiKey !== '${GROQ_API_KEY}';
  }

  isTogetherConfigured() {
    const apiKey = process.env.TOGETHER_API_KEY || this.config.ai_config?.together?.api_key;
    return apiKey && apiKey !== '${TOGETHER_API_KEY}';
  }

  async isOllamaAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  isBaiduConfigured() {
    const apiKey = process.env.BAIDU_API_KEY || this.config.ai_config?.baidu?.api_key;
    const secretKey = process.env.BAIDU_SECRET_KEY || this.config.ai_config?.baidu?.secret_key;
    return apiKey && secretKey && apiKey !== '${BAIDU_API_KEY}';
  }

  isTongyiConfigured() {
    const apiKey = process.env.TONGYI_API_KEY || this.config.ai_config?.tongyi?.api_key;
    return apiKey && apiKey !== '${TONGYI_API_KEY}';
  }

  isAliyunBailianConfigured() {
    const apiKey = process.env.ALIYUN_BAILIAN_API_KEY || this.config.ai_config?.aliyun_bailian?.api_key;
    const workspaceId = process.env.ALIYUN_BAILIAN_WORKSPACE_ID || this.config.ai_config?.aliyun_bailian?.workspace_id;
    return apiKey && workspaceId && apiKey !== '${ALIYUN_BAILIAN_API_KEY}' && workspaceId !== '${ALIYUN_BAILIAN_WORKSPACE_ID}';
  }

  /**
   * 选择最佳可用服务
   */
  selectBestService() {
    // 优先级：本地Ollama > 阿里云百炼 > Groq > HuggingFace > Together > 百度 > 通义
    if (this.availableServices.ollama) return 'ollama';
    if (this.availableServices.aliyun_bailian) return 'aliyun_bailian';
    if (this.availableServices.groq) return 'groq';
    if (this.availableServices.huggingface) return 'huggingface';
    if (this.availableServices.together) return 'together';
    if (this.availableServices.baidu) return 'baidu';
    if (this.availableServices.tongyi) return 'tongyi';
    return 'static'; // 回退到静态规则分析
  }

  /**
   * 分析代码变更
   */
  async analyzeCodeChanges(diff, mrDetails) {
    console.log(`🤖 使用 ${this.currentService} 进行代码分析...`);

    try {
      switch (this.currentService) {
        case 'ollama':
          return await this.analyzeWithOllama(diff, mrDetails);
        case 'aliyun_bailian':
          return await this.analyzeWithAliyunBailian(diff, mrDetails);
        case 'groq':
          return await this.analyzeWithGroq(diff, mrDetails);
        case 'huggingface':
          return await this.analyzeWithHuggingFace(diff, mrDetails);
        case 'together':
          return await this.analyzeWithTogether(diff, mrDetails);
        case 'baidu':
          return await this.analyzeWithBaidu(diff, mrDetails);
        case 'tongyi':
          return await this.analyzeWithTongyi(diff, mrDetails);
        default:
          return await this.analyzeWithStaticRules(diff, mrDetails);
      }
    } catch (error) {
      console.warn(`⚠️ ${this.currentService} 分析失败，回退到静态规则分析:`, error.message);
      return await this.analyzeWithStaticRules(diff, mrDetails);
    }
  }

  /**
   * Ollama 本地模型分析
   */
  async analyzeWithOllama(diff, mrDetails) {
    const prompt = this.buildAnalysisPrompt(diff, mrDetails);
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'codellama', // 或 'llama3', 'deepseek-coder' 等
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 2000
        }
      })
    });

    const result = await response.json();
    
    return {
      status: 'success',
      provider: 'ollama',
      analysis: this.parseAnalysisResponse(result.response),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Groq AI 分析
   */
  async analyzeWithGroq(diff, mrDetails) {
    const apiKey = process.env.GROQ_API_KEY || this.config.ai_config?.groq?.api_key;
    const prompt = this.buildAnalysisPrompt(diff, mrDetails);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // 免费且快速的模型
        messages: [
          {
            role: 'system',
            content: '你是一个专业的代码审查专家，专注于代码质量分析。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    const result = await response.json();
    
    return {
      status: 'success',
      provider: 'groq',
      analysis: this.parseAnalysisResponse(result.choices[0].message.content),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Hugging Face 分析
   */
  async analyzeWithHuggingFace(diff, mrDetails) {
    const token = process.env.HUGGINGFACE_TOKEN || this.config.ai_config?.huggingface?.token;
    const prompt = this.buildAnalysisPrompt(diff, mrDetails);

    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-large', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 2000,
          temperature: 0.1
        }
      })
    });

    const result = await response.json();
    
    return {
      status: 'success',
      provider: 'huggingface',
      analysis: this.parseAnalysisResponse(result[0]?.generated_text || '分析完成'),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 阿里云百炼分析
   */
  async analyzeWithAliyunBailian(diff, mrDetails) {
    const apiKey = process.env.ALIYUN_BAILIAN_API_KEY || this.config.ai_config?.aliyun_bailian?.api_key;
    const workspaceId = process.env.ALIYUN_BAILIAN_WORKSPACE_ID || this.config.ai_config?.aliyun_bailian?.workspace_id;
    const model = this.config.ai_config?.aliyun_bailian?.model || 'qwen-max';
    const baseUrl = this.config.ai_config?.aliyun_bailian?.base_url || 'https://dashscope.aliyuncs.com/api/v1';
    
    const prompt = this.buildAnalysisPrompt(diff, mrDetails);

    const response = await fetch(`${baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify({
        model: model,
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个专业的代码审查专家，专注于代码质量分析。请用中文提供详细的分析报告。'
            },
            {
              role: 'user', 
              content: prompt
            }
          ]
        },
        parameters: {
          max_tokens: 3000,
          temperature: 0.1,
          result_format: 'message'
        }
      })
    });

    const result = await response.json();
    
    if (result.code && result.code !== '200') {
      throw new Error(`阿里云百炼API错误: ${result.code} - ${result.message}`);
    }
    
    const content = result.output?.choices?.[0]?.message?.content || result.output?.text || '分析完成';
    
    return {
      status: 'success',
      provider: 'aliyun-bailian',
      model: model,
      analysis: this.parseAnalysisResponse(content),
      timestamp: new Date().toISOString(),
      usage: result.usage || {}
    };
  }

  /**
   * 百度文心一言分析
   */
  async analyzeWithBaidu(diff, mrDetails) {
    const apiKey = process.env.BAIDU_API_KEY || this.config.ai_config?.baidu?.api_key;
    const secretKey = process.env.BAIDU_SECRET_KEY || this.config.ai_config?.baidu?.secret_key;
    const model = this.config.ai_config?.baidu?.model || 'ERNIE-Bot-turbo';
    
    // 获取访问令牌
    const tokenResponse = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`, {
      method: 'POST'
    });
    const tokenResult = await tokenResponse.json();
    
    if (!tokenResult.access_token) {
      throw new Error('百度API令牌获取失败');
    }
    
    const prompt = this.buildAnalysisPrompt(diff, mrDetails);
    
    const response = await fetch(`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant?access_token=${tokenResult.access_token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_output_tokens: 2000
      })
    });

    const result = await response.json();
    
    return {
      status: 'success',
      provider: 'baidu',
      model: model,
      analysis: this.parseAnalysisResponse(result.result || '分析完成'),
      timestamp: new Date().toISOString(),
      usage: result.usage || {}
    };
  }

  /**
   * 阿里通义千问分析
   */
  async analyzeWithTongyi(diff, mrDetails) {
    const apiKey = process.env.TONGYI_API_KEY || this.config.ai_config?.tongyi?.api_key;
    const model = this.config.ai_config?.tongyi?.model || 'qwen-turbo';
    
    const prompt = this.buildAnalysisPrompt(diff, mrDetails);

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个专业的代码审查专家，专注于代码质量分析。'
            },
            {
              role: 'user', 
              content: prompt
            }
          ]
        },
        parameters: {
          max_tokens: 2000,
          temperature: 0.1,
          result_format: 'message'
        }
      })
    });

    const result = await response.json();
    
    const content = result.output?.choices?.[0]?.message?.content || result.output?.text || '分析完成';
    
    return {
      status: 'success',
      provider: 'tongyi',
      model: model,
      analysis: this.parseAnalysisResponse(content),
      timestamp: new Date().toISOString(),
      usage: result.usage || {}
    };
  }

  /**
   * 静态规则分析 (备用方案)
   */
  async analyzeWithStaticRules(diff, mrDetails) {
    console.log('🔍 使用静态规则进行代码分析...');
    
    const analysis = {
      summary: '基于静态规则的代码分析',
      issues: [],
      suggestions: [],
      score: 7,
      risk_level: 'low'
    };

    // 分析每个文件的变更
    for (const file of diff) {
      const fileAnalysis = this.analyzeFileWithRules(file);
      analysis.issues.push(...fileAnalysis.issues);
      analysis.suggestions.push(...fileAnalysis.suggestions);
    }

    // 计算总体评分
    analysis.score = Math.max(1, 10 - analysis.issues.length);
    analysis.risk_level = analysis.issues.length > 5 ? 'high' : 
                         analysis.issues.length > 2 ? 'medium' : 'low';

    return {
      status: 'success',
      provider: 'static-rules',
      analysis: analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 基于规则的文件分析
   */
  analyzeFileWithRules(file) {
    const issues = [];
    const suggestions = [];
    const content = file.diff || '';
    const fileName = file.new_path || file.old_path;

    // 代码质量检查
    if (content.includes('console.log')) {
      issues.push(`${fileName}: 包含调试日志语句`);
      suggestions.push(`${fileName}: 建议移除或使用正式的日志系统`);
    }

    if (content.includes('TODO') || content.includes('FIXME')) {
      issues.push(`${fileName}: 包含待完成的TODO项`);
      suggestions.push(`${fileName}: 建议在合并前完成所有TODO项`);
    }

    // 安全检查
    if (content.includes('eval(') || content.includes('innerHTML')) {
      issues.push(`${fileName}: 存在潜在的安全风险`);
      suggestions.push(`${fileName}: 避免使用eval()和innerHTML，使用更安全的替代方案`);
    }

    // 性能检查
    if (content.includes('for (') && content.includes('length')) {
      suggestions.push(`${fileName}: 考虑缓存数组长度以提高循环性能`);
    }

    // Flutter/Dart 特定检查
    if (fileName.endsWith('.dart')) {
      if (content.includes('setState') && !content.includes('mounted')) {
        issues.push(`${fileName}: setState调用可能存在内存泄漏风险`);
        suggestions.push(`${fileName}: 建议在setState前检查widget是否还在mounted状态`);
      }
    }

    // JavaScript/TypeScript 特定检查
    if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
      if (content.includes('var ')) {
        suggestions.push(`${fileName}: 建议使用let或const替代var`);
      }
      
      if (content.includes('== ') && !content.includes('=== ')) {
        suggestions.push(`${fileName}: 建议使用严格相等比较(===)`);
      }
    }

    return { issues, suggestions };
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(diff, mrDetails) {
    const diffText = diff.map(file => 
      `文件: ${file.new_path || file.old_path}\n变更:\n${file.diff}`
    ).join('\n\n');

    return `请分析以下代码变更：

MR标题: ${mrDetails.title}
MR描述: ${mrDetails.description || '无描述'}

代码变更:
${diffText}

请从以下角度进行分析：
1. 代码质量和最佳实践
2. 潜在的bug和逻辑错误
3. 安全漏洞和风险点
4. 性能优化建议
5. 代码可维护性和可读性

请提供具体的建议和评分(1-10分)。`;
  }

  /**
   * 解析AI响应
   */
  parseAnalysisResponse(response) {
    // 尝试从响应中提取结构化信息
    return {
      summary: response.substring(0, 200) + '...',
      raw_response: response,
      score: 7, // 默认评分
      risk_level: 'medium'
    };
  }

  /**
   * 测试连接
   */
  async testConnection() {
    const availableServices = [];
    
    for (const [service, isAvailable] of Object.entries(this.availableServices)) {
      if (isAvailable) {
        availableServices.push(service);
      }
    }

    return {
      success: availableServices.length > 0,
      available_services: availableServices,
      current_service: this.currentService,
      message: availableServices.length > 0 ? 
        `有 ${availableServices.length} 个AI服务可用` : 
        '没有可用的AI服务，将使用静态规则分析'
    };
  }

  /**
   * 检查是否可用
   */
  isAvailable() {
    return true; // 总是可用，因为有静态规则作为备用
  }
}

export { FreeAIAnalyzer };
