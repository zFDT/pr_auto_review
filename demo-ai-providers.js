#!/usr/bin/env node

/**
 * 阿里云百炼分析器演示脚本
 * 
 * 演示如何在实际 PR 审查中使用阿里云百炼大模型
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import fs from 'fs/promises';

// 简单的配置加载
async function loadConfig() {
  const configContent = await fs.readFile('./config.json', 'utf-8');
  return JSON.parse(configContent);
}

// 演示不同的 AI 提供商配置
class AIProviderDemo {
  async demonstrateProviders() {
    console.log('🎯 AI 提供商配置演示\n');

    const config = await loadConfig();
    
    // 展示当前配置的AI提供商
    console.log('📋 当前可用的 AI 提供商:');
    
    // 1. 阿里云百炼
    const bailianConfig = config.ai_config?.aliyun_bailian;
    if (bailianConfig?.api_key && !bailianConfig.api_key.startsWith('${')) {
      console.log('   ✅ 阿里云百炼 (qwen-max) - 企业级大模型');
      console.log(`      - 模型: ${bailianConfig.model}`);
      console.log(`      - 工作空间: ${bailianConfig.workspace_id}`);
    } else {
      console.log('   ❌ 阿里云百炼 - 未配置');
    }
    
    // 2. OpenAI
    const openaiConfig = config.ai_config?.openai;
    if (openaiConfig?.api_key && !openaiConfig.api_key.startsWith('${')) {
      console.log('   ✅ OpenAI GPT-4 - 高质量分析');
      console.log(`      - 模型: ${openaiConfig.model}`);
    } else {
      console.log('   ❌ OpenAI - 未配置');
    }
    
    // 3. 免费AI服务
    const freeAIConfig = config.ai_config?.free_ai;
    if (freeAIConfig?.enabled) {
      console.log('   ✅ 免费AI服务 - 多种免费模型');
      console.log(`      - 优先级: ${freeAIConfig.priority.join(' > ')}`);
    }
    
    console.log('\n🔧 如何配置不同的 AI 提供商:\n');
    
    // 演示配置选项
    this.showConfigurationExamples();
    
    // 演示使用方式
    console.log('\n🚀 使用方式:\n');
    this.showUsageExamples();
  }

  showConfigurationExamples() {
    console.log('1️⃣ 使用阿里云百炼 (推荐用于企业环境):');
    console.log('   在 config.json 中设置:');
    console.log('   ```json');
    console.log('   {');
    console.log('     "review_settings": {');
    console.log('       "ai_provider": "aliyun_bailian"');
    console.log('     }');
    console.log('   }');
    console.log('   ```\n');
    
    console.log('2️⃣ 使用免费AI (包含阿里云百炼):');
    console.log('   ```json');
    console.log('   {');
    console.log('     "review_settings": {');
    console.log('       "ai_provider": "free"');
    console.log('     }');
    console.log('   }');
    console.log('   ```\n');
    
    console.log('3️⃣ 使用OpenAI GPT-4:');
    console.log('   ```json');
    console.log('   {');
    console.log('     "review_settings": {');
    console.log('       "ai_provider": "openai"');
    console.log('     }');
    console.log('   }');
    console.log('   ```');
  }

  showUsageExamples() {
    console.log('📝 PR 审查命令:');
    console.log('   node pr-reviewer.js <project_id> <mr_id>\n');
    
    console.log('🧪 测试 AI 分析器:');
    console.log('   node test-aliyun-bailian-simple.js  # 快速测试');
    console.log('   node test-aliyun-bailian-fixed.js   # 完整测试\n');
    
    console.log('🔄 切换 AI 提供商:');
    console.log('   node switch-ai-provider.js aliyun_bailian');
    console.log('   node switch-ai-provider.js free');
    console.log('   node switch-ai-provider.js openai\n');
    
    console.log('💡 特性对比:');
    console.log('   ┌─────────────────┬────────────┬─────────────┬─────────────┐');
    console.log('   │ 提供商          │ 成本       │ 质量        │ 速度        │');
    console.log('   ├─────────────────┼────────────┼─────────────┼─────────────┤');
    console.log('   │ 阿里云百炼      │ 付费       │ 优秀        │ 快速        │');
    console.log('   │ OpenAI GPT-4    │ 付费       │ 优秀        │ 中等        │');
    console.log('   │ 免费AI (混合)   │ 免费       │ 良好        │ 快速        │');
    console.log('   │ Ollama (本地)   │ 免费       │ 中等        │ 很快        │');
    console.log('   └─────────────────┴────────────┴─────────────┴─────────────┘');
  }
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new AIProviderDemo();
  demo.demonstrateProviders().catch(console.error);
}

export { AIProviderDemo };
