#!/usr/bin/env node

/**
 * 配置验证工具
 * 检查所有必要的配置项和环境变量
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import { configLoader } from './config-loader.js';
import fs from 'fs/promises';
import path from 'path';

async function validateConfig() {
  console.log('🔍 开始配置验证...\n');
  
  let hasErrors = false;
  const warnings = [];
  const suggestions = [];
  
  try {
    // 检查配置文件
    const config = await configLoader.loadConfig();
    console.log('✅ config.json 文件读取成功\n');
    
    // 检查 GitLab 配置
    console.log('📡 检查 GitLab 配置...');
    if (!config.gitlab?.host) {
      console.log('❌ GitLab host 未配置');
      hasErrors = true;
    } else {
      console.log(`✅ GitLab host: ${config.gitlab.host}`);
    }
    
    const gitlabToken = process.env.GITLAB_TOKEN || config.gitlab?.token;
    if (!gitlabToken || gitlabToken === '${GITLAB_TOKEN}') {
      console.log('❌ GITLAB_TOKEN 未配置');
      hasErrors = true;
      suggestions.push('设置环境变量: export GITLAB_TOKEN="your_gitlab_token"');
    } else {
      console.log('✅ GitLab token 已配置');
    }
    
    // 检查项目配置
    console.log('\n📁 检查项目配置...');
    if (!config.projects || Object.keys(config.projects).length === 0) {
      console.log('⚠️ 未配置任何项目');
      warnings.push('建议在 config.json 中添加项目配置');
    } else {
      console.log(`✅ 已配置 ${Object.keys(config.projects).length} 个项目:`);
      Object.entries(config.projects).forEach(([name, project]) => {
        console.log(`  - ${name} (ID: ${project.id})`);
      });
    }
    
    // 检查 AI 配置
    console.log('\n🤖 检查 AI 配置...');
    const aiProvider = config.review_settings?.ai_provider || 'none';
    const aiEnabled = config.review_settings?.enable_ai_analysis || false;
    
    console.log(`AI 分析: ${aiEnabled ? '启用' : '禁用'}`);
    console.log(`AI 提供商: ${aiProvider}`);
    
    if (aiEnabled) {
      switch (aiProvider) {
        case 'openai':
          await validateOpenAI(config);
          break;
        case 'copilot':
          await validateCopilot(config);
          break;
        case 'auto-copilot':
          await validateAutoCopilot(config);
          break;
        default:
          console.log(`❌ 未知的 AI 提供商: ${aiProvider}`);
          hasErrors = true;
          suggestions.push('使用 node switch-ai-provider.js list 查看支持的提供商');
      }
    } else {
      warnings.push('AI 分析已禁用，将跳过智能代码审查');
    }
    
    // 检查飞书配置
    console.log('\n📱 检查飞书通知配置...');
    const feishuEnabled = config.notification?.feishu?.enabled || false;
    const feishuWebhook = process.env.FEISHU_WEBHOOK_URL || config.notification?.feishu?.webhook_url;
    
    if (feishuEnabled) {
      if (!feishuWebhook || feishuWebhook === '${FEISHU_WEBHOOK_URL}') {
        console.log('❌ 飞书 webhook URL 未配置');
        hasErrors = true;
        suggestions.push('设置环境变量: export FEISHU_WEBHOOK_URL="your_webhook_url"');
      } else {
        console.log('✅ 飞书通知已配置');
      }
    } else {
      console.log('⚠️ 飞书通知已禁用');
    }
    
    // 检查输出目录
    console.log('\n📁 检查输出目录...');
    const reportsDir = './reports';
    const tempDir = './temp';
    
    try {
      await fs.access(reportsDir);
      console.log('✅ reports 目录存在');
    } catch (error) {
      console.log('⚠️ reports 目录不存在，将自动创建');
      try {
        await fs.mkdir(reportsDir, { recursive: true });
        console.log('✅ reports 目录创建成功');
      } catch (createError) {
        console.log('❌ 无法创建 reports 目录:', createError.message);
        hasErrors = true;
      }
    }
    
    try {
      await fs.access(tempDir);
      console.log('✅ temp 目录存在');
    } catch (error) {
      console.log('⚠️ temp 目录不存在，将自动创建');
      try {
        await fs.mkdir(tempDir, { recursive: true });
        console.log('✅ temp 目录创建成功');
      } catch (createError) {
        console.log('❌ 无法创建 temp 目录:', createError.message);
        hasErrors = true;
      }
    }
    
    // 总结
    console.log('\n' + '='.repeat(50));
    console.log('📊 配置验证总结:');
    
    if (hasErrors) {
      console.log('❌ 发现配置错误，请修复后重试');
    } else {
      console.log('✅ 配置验证通过');
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ 警告:');
      warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (suggestions.length > 0) {
      console.log('\n💡 建议:');
      suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    }
    
    console.log('\n🚀 下一步:');
    if (hasErrors) {
      console.log('  1. 根据上述错误信息修复配置');
      console.log('  2. 重新运行: node validate-config.js');
    } else {
      console.log('  1. 测试 AI 连接: node test-ai-analyzers.js');
      console.log('  2. 分析 MR: node pr-reviewer.js <project_id> <mr_id>');
    }
    
    return !hasErrors;
    
  } catch (error) {
    console.error('❌ 配置验证失败:', error.message);
    return false;
  }
}

async function validateOpenAI(config) {
  console.log('\n  🔍 验证 OpenAI 配置...');
  
  const apiKey = process.env.OPENAI_API_KEY || config.ai_config?.openai?.api_key;
  if (!apiKey || apiKey === '${OPENAI_API_KEY}') {
    console.log('  ❌ OpenAI API 密钥未配置');
    console.log('  💡 请设置环境变量: export OPENAI_API_KEY="your_api_key"');
    return false;
  }
  
  if (apiKey.startsWith('your_') || apiKey.length < 20) {
    console.log('  ❌ OpenAI API 密钥看起来不正确');
    console.log('  💡 请确保使用真实的 API 密钥');
    return false;
  }
  
  console.log('  ✅ OpenAI API 密钥已配置');
  
  const model = config.ai_config?.openai?.model || 'gpt-4o';
  console.log(`  📱 模型: ${model}`);
  
  const baseUrl = config.ai_config?.openai?.base_url || 'https://api.openai.com/v1';
  console.log(`  🌐 端点: ${baseUrl}`);
  
  return true;
}

async function validateCopilot(config) {
  console.log('\n  🔍 验证 Copilot 配置...');
  
  const vscodeDefaultPath = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
  const vscodePath = config.ai_config?.copilot?.vscode_path || vscodeDefaultPath;
  
  try {
    await fs.access(vscodePath);
    console.log('  ✅ VS Code 路径存在');
  } catch (error) {
    console.log('  ❌ VS Code 路径不存在:', vscodePath);
    console.log('  💡 请确保 VS Code 已安装，或更新配置中的路径');
    return false;
  }
  
  console.log('  ⚠️ 需要手动验证:');
  console.log('    - GitHub Copilot 扩展已安装');
  console.log('    - 已登录 GitHub Copilot');
  console.log('    - Copilot 订阅有效');
  
  const fallback = config.ai_config?.copilot?.fallback_to_openai;
  if (fallback) {
    console.log('  🔄 回退到 OpenAI: 启用');
    return await validateOpenAI(config);
  }
  
  return true;
}

async function validateAutoCopilot(config) {
  console.log('\n  🔍 验证 Auto Copilot 配置...');
  console.log('  ⚠️ 这是实验性功能，稳定性有限');
  
  return await validateCopilot(config);
}

// 主程序入口
if (import.meta.url === `file://${process.argv[1]}`) {
  validateConfig().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { validateConfig };
