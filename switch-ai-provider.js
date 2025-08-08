#!/usr/bin/env node

/**
 * AI 提供商配置切换工具
 * 快速切换 OpenAI、Copilot 等 AI 分析器
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { configLoader } from './config-loader.js';

const SUPPORTED_PROVIDERS = {
  'openai': {
    name: 'OpenAI GPT',
    description: '使用 OpenAI GPT 模型进行代码分析（推荐）',
    requirements: ['OPENAI_API_KEY 环境变量或配置文件中的 API 密钥']
  },
  'copilot': {
    name: 'GitHub Copilot',
    description: '使用 GitHub Copilot 进行代码分析（支持Flutter专项优化）',
    requirements: [
      'VS Code 已安装',
      'GitHub Copilot 扩展已安装并登录',
      '网络连接正常'
    ]
  }
};

async function showCurrentConfig() {
  try {
    const config = await configLoader.loadConfig();
    const currentProvider = config.review_settings?.ai_provider || 'none';
    
    console.log('📋 当前 AI 配置信息:');
    console.log('='.repeat(50));
    console.log(`当前提供商: ${currentProvider}`);
    
    if (SUPPORTED_PROVIDERS[currentProvider]) {
      const provider = SUPPORTED_PROVIDERS[currentProvider];
      console.log(`提供商名称: ${provider.name}`);
      console.log(`描述: ${provider.description}`);
      console.log('要求:');
      provider.requirements.forEach(req => {
        console.log(`  - ${req}`);
      });
    }
    
    console.log(`AI 分析: ${config.review_settings?.enable_ai_analysis ? '启用' : '禁用'}`);
    
    if (currentProvider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY || config.ai_config?.openai?.api_key;
      const hasKey = apiKey && apiKey !== '${OPENAI_API_KEY}';
      console.log(`OpenAI API 密钥: ${hasKey ? '已配置 ✅' : '未配置 ❌'}`);
      console.log(`OpenAI 模型: ${config.ai_config?.openai?.model || 'gpt-4o'}`);
      console.log(`OpenAI 端点: ${config.ai_config?.openai?.base_url || 'https://api.openai.com/v1'}`);
    }
    
    if (currentProvider === 'copilot') {
      const fallback = config.ai_config?.copilot?.fallback_to_openai;
      console.log(`Copilot 回退到 OpenAI: ${fallback ? '启用' : '禁用'}`);
      console.log(`VS Code 路径: ${config.ai_config?.copilot?.vscode_path || '自动检测'}`);
    }
    
  } catch (error) {
    console.error('❌ 读取配置失败:', error.message);
  }
}

async function switchProvider(newProvider) {
  if (!SUPPORTED_PROVIDERS[newProvider]) {
    console.error(`❌ 不支持的 AI 提供商: ${newProvider}`);
    console.log('支持的提供商:');
    Object.keys(SUPPORTED_PROVIDERS).forEach(key => {
      console.log(`  - ${key}: ${SUPPORTED_PROVIDERS[key].name}`);
    });
    return;
  }
  
  try {
    // 读取当前配置
    const configPath = path.join(process.cwd(), 'config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // 更新 AI 提供商
    config.review_settings.ai_provider = newProvider;
    config.review_settings.enable_ai_analysis = true;
    
    // 根据提供商添加特定配置
    if (newProvider === 'copilot' && !config.ai_config?.copilot) {
      config.ai_config = config.ai_config || {};
      config.ai_config.copilot = {
        enabled: true,
        vscode_path: "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
        timeout: 30000,
        fallback_to_openai: true
      };
    }
    
    // 保存配置
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    console.log('✅ AI 提供商配置已更新');
    console.log(`📋 新的提供商: ${SUPPORTED_PROVIDERS[newProvider].name}`);
    
    // 显示要求和建议
    const provider = SUPPORTED_PROVIDERS[newProvider];
    console.log('\n📝 使用要求:');
    provider.requirements.forEach(req => {
      console.log(`  - ${req}`);
    });
    
    if (newProvider === 'openai') {
      console.log('\n💡 OpenAI 配置建议:');
      console.log('  1. 设置环境变量: export OPENAI_API_KEY="your-api-key"');
      console.log('  2. 或在 config.json 中配置 api_key');
      console.log('  3. 运行测试: node test-ai-analyzers.js');
    } else if (newProvider === 'copilot') {
      console.log('\n💡 Copilot 配置建议:');
      console.log('  1. 确保 VS Code 已安装 GitHub Copilot 扩展');
      console.log('  2. 在 VS Code 中登录 GitHub Copilot');
      console.log('  3. 运行测试: node test-ai-analyzers.js');
    }
    
  } catch (error) {
    console.error('❌ 更新配置失败:', error.message);
  }
}

async function listProviders() {
  console.log('🤖 支持的 AI 提供商:');
  console.log('='.repeat(50));
  
  Object.entries(SUPPORTED_PROVIDERS).forEach(([key, provider]) => {
    console.log(`\n${key}:`);
    console.log(`  名称: ${provider.name}`);
    console.log(`  描述: ${provider.description}`);
    console.log('  要求:');
    provider.requirements.forEach(req => {
      console.log(`    - ${req}`);
    });
  });
}

async function testProvider(provider) {
  if (!SUPPORTED_PROVIDERS[provider]) {
    console.error(`❌ 不支持的 AI 提供商: ${provider}`);
    return;
  }
  
  console.log(`🧪 测试 ${SUPPORTED_PROVIDERS[provider].name}...`);
  
  // 临时切换到指定提供商进行测试
  const originalConfigPath = path.join(process.cwd(), 'config.json');
  const backupConfigPath = path.join(process.cwd(), 'config.json.backup');
  
  try {
    // 备份原配置
    await fs.copyFile(originalConfigPath, backupConfigPath);
    
    // 切换提供商
    await switchProvider(provider);
    
    // 运行测试
    const { spawn } = await import('child_process');
    const testProcess = spawn('node', ['test-ai-analyzers.js'], {
      stdio: 'inherit',
      shell: true
    });
    
    testProcess.on('close', async (code) => {
      // 恢复原配置
      try {
        await fs.copyFile(backupConfigPath, originalConfigPath);
        await fs.unlink(backupConfigPath);
      } catch (restoreError) {
        console.warn('⚠️ 恢复配置失败:', restoreError.message);
      }
      
      if (code === 0) {
        console.log(`✅ ${SUPPORTED_PROVIDERS[provider].name} 测试完成`);
      } else {
        console.log(`❌ ${SUPPORTED_PROVIDERS[provider].name} 测试失败`);
      }
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    // 尝试恢复配置
    try {
      await fs.copyFile(backupConfigPath, originalConfigPath);
      await fs.unlink(backupConfigPath);
    } catch (restoreError) {
      console.warn('⚠️ 恢复配置失败:', restoreError.message);
    }
  }
}

function showUsage() {
  console.log('🔧 AI 提供商配置工具');
  console.log('='.repeat(50));
  console.log('用法:');
  console.log('  node switch-ai-provider.js [命令] [选项]');
  console.log('');
  console.log('命令:');
  console.log('  show                   显示当前配置');
  console.log('  list                   列出所有支持的提供商');
  console.log('  switch <provider>      切换到指定提供商');
  console.log('  test <provider>        测试指定提供商');
  console.log('');
  console.log('提供商:');
  console.log('  openai                 OpenAI GPT (推荐)');
  console.log('  copilot                GitHub Copilot (支持Flutter专项)');
  console.log('');
  console.log('示例:');
  console.log('  node switch-ai-provider.js show');
  console.log('  node switch-ai-provider.js switch openai');
  console.log('  node switch-ai-provider.js test copilot');
}

// 主程序入口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const option = args[1];
  
  switch (command) {
    case 'show':
      await showCurrentConfig();
      break;
    case 'list':
      await listProviders();
      break;
    case 'switch':
      if (!option) {
        console.error('❌ 请指定要切换的提供商');
        showUsage();
        return;
      }
      await switchProvider(option);
      break;
    case 'test':
      if (!option) {
        console.error('❌ 请指定要测试的提供商');
        showUsage();
        return;
      }
      await testProvider(option);
      break;
    default:
      showUsage();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
