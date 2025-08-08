#!/usr/bin/env node

/**
 * 阿里云百炼分析器简单测试脚本
 * 
 * 避免复杂的异步初始化导致的循环问题
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import fs from 'fs/promises';

// 简单的配置加载
async function loadConfig() {
  try {
    const configContent = await fs.readFile('./config.json', 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('配置加载失败:', error.message);
    process.exit(1);
  }
}

// 简单的阿里云百炼测试
class SimpleAliyunBailianTest {
  async runTests() {
    console.log('🚀 开始阿里云百炼分析器简单测试...\n');

    try {
      // 1. 配置测试
      await this.testConfiguration();
      
      // 2. 连接测试
      await this.testConnection();
      
      console.log('✅ 测试完成');
      
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      process.exit(1);
    }
  }

  async testConfiguration() {
    console.log('📋 1. 配置测试');
    
    const config = await loadConfig();
    const bailianConfig = config.ai_config?.aliyun_bailian;
    
    if (!bailianConfig) {
      console.log('   ❌ 未找到阿里云百炼配置');
      return;
    }
    
    const hasApiKey = bailianConfig.api_key && !bailianConfig.api_key.startsWith('${');
    const hasWorkspaceId = bailianConfig.workspace_id && !bailianConfig.workspace_id.startsWith('${');
    
    console.log(`   📦 模型: ${bailianConfig.model || 'qwen-max'}`);
    console.log(`   🔑 API密钥: ${hasApiKey ? '已配置' : '未配置'}`);
    console.log(`   🆔 工作空间ID: ${hasWorkspaceId ? '已配置' : '未配置'}`);
    console.log(`   🌐 服务地址: ${bailianConfig.base_url || 'https://dashscope.aliyuncs.com/api/v1'}`);
    
    if (hasApiKey && hasWorkspaceId) {
      console.log('   ✅ 配置完整\n');
    } else {
      console.log('   ⚠️ 配置不完整，请检查API密钥和工作空间ID\n');
    }
  }

  async testConnection() {
    console.log('🔌 2. 连接测试');
    
    const config = await loadConfig();
    const bailianConfig = config.ai_config?.aliyun_bailian;
    
    if (!bailianConfig?.api_key || bailianConfig.api_key.startsWith('${')) {
      console.log('   ⚠️ API密钥未配置，跳过连接测试\n');
      return;
    }
    
    try {
      console.log('   📡 正在测试API连接...');
      
      const response = await fetch(`${bailianConfig.base_url || 'https://dashscope.aliyuncs.com/api/v1'}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bailianConfig.api_key}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable'
        },
        body: JSON.stringify({
          model: bailianConfig.model || 'qwen-max',
          input: {
            messages: [
              {
                role: 'user',
                content: '请回复"连接测试成功"'
              }
            ]
          },
          parameters: {
            max_tokens: 50,
            temperature: 0.1,
            result_format: 'message'
          }
        }),
        signal: AbortSignal.timeout(10000) // 10秒超时
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.code && result.code !== '200') {
          console.log(`   ❌ API错误: ${result.code} - ${result.message}`);
        } else {
          const content = result.output?.choices?.[0]?.message?.content || result.output?.text || '';
          console.log('   ✅ 连接成功');
          console.log(`   🤖 模型响应: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
          
          if (result.usage) {
            console.log(`   📊 Token使用: 输入${result.usage.input_tokens || 0}, 输出${result.usage.output_tokens || 0}`);
          }
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.log(`   ❌ HTTP错误: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
    } catch (error) {
      if (error.name === 'TimeoutError') {
        console.log('   ❌ 连接超时，请检查网络连接');
      } else {
        console.log(`   ❌ 连接失败: ${error.message}`);
      }
    }
    
    console.log('');
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SimpleAliyunBailianTest();
  tester.runTests().catch(console.error);
}

export { SimpleAliyunBailianTest };
