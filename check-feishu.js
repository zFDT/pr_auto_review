#!/usr/bin/env node

/**
 * 飞书Webhook配置检查工具
 * 用于验证飞书通知配置是否正确
 */

import { configLoader } from './config-loader.js';

async function checkFeishuConfig() {
  try {
    console.log('🔍 检查飞书Webhook配置...\n');
    
    const config = await configLoader.loadConfig();
    const feishuConfig = config.notification?.feishu;
    
    if (!feishuConfig) {
      console.log('❌ 未找到飞书配置');
      return false;
    }
    
    console.log('📋 飞书配置信息:');
    console.log(`- 启用状态: ${feishuConfig.enabled ? '✅ 已启用' : '❌ 已禁用'}`);
    
    const webhookUrl = feishuConfig.webhook_url;
    if (!webhookUrl || webhookUrl === '${FEISHU_WEBHOOK_URL}') {
      console.log('- Webhook URL: ❌ 未配置');
      console.log('\n💡 请在 .env 文件中设置 FEISHU_WEBHOOK_URL');
      return false;
    }
    
    if (!webhookUrl.startsWith('https://open.feishu.cn/')) {
      console.log('- Webhook URL: ⚠️ URL格式可能不正确');
      console.log(`- URL: ${webhookUrl.substring(0, 50)}...`);
      return false;
    }
    
    console.log('- Webhook URL: ✅ 已配置');
    console.log(`- URL: ${webhookUrl.substring(0, 50)}...${webhookUrl.slice(-10)}`);
    
    // 测试连接
    console.log('\n🧪 测试Webhook连接...');
    
    try {
      const testData = {
        msg_type: "text",
        content: {
          text: "飞书Webhook配置测试 - 请忽略此消息"
        }
      };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      if (response.ok) {
        console.log('✅ Webhook连接测试成功');
        return true;
      } else {
        console.log('❌ Webhook连接测试失败:', response.status, response.statusText);
        return false;
      }
      
    } catch (error) {
      console.log('❌ Webhook连接测试失败:', error.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 配置检查失败:', error.message);
    return false;
  }
}

// 如果直接运行此脚本
if (process.argv[1].endsWith('check-feishu.js')) {
  checkFeishuConfig().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { checkFeishuConfig };
