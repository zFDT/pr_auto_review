#!/usr/bin/env node

/**
 * 阿里云百炼 API 测试脚本
 */

import fetch from 'node-fetch';

const config = {
  api_key: "your_openai_api_key_here",
  model: "qwen-max",
  workspace_id: "your_aliyun_workspace_id",
  base_url: "https://dashscope.aliyuncs.com/api/v1",
  timeout: 300000,
  max_tokens: 2000,
  temperature: 0.1
};

async function testBailianAPI() {
  console.log('🧪 测试阿里云百炼 API...');
  
  const requestBody = {
    model: config.model,
    input: {
      messages: [
        {
          role: 'system',
          content: '你是一个专业的代码审查专家。'
        },
        {
          role: 'user', 
          content: '请简单介绍一下代码审查的重要性。'
        }
      ]
    },
    parameters: {
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      result_format: 'message'
    }
  };

  console.log('📡 请求配置:');
  console.log('- API Key:', config.api_key.slice(0, 10) + '...');
  console.log('- Model:', config.model);
  console.log('- Base URL:', config.base_url);
  console.log('- Workspace ID:', config.workspace_id);

  try {
    console.log('📤 发送请求...');
    const startTime = Date.now();
    
    const response = await fetch(`${config.base_url}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify(requestBody)
    });

    const endTime = Date.now();
    console.log(`⏱️ 请求耗时: ${endTime - startTime}ms`);

    console.log('📨 响应状态:', response.status, response.statusText);
    console.log('📨 响应头:', Object.fromEntries(response.headers));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 错误响应:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ API 响应结构:', Object.keys(result));
    
    if (result.output && result.output.text) {
      console.log('📝 AI 回复:', result.output.text);
    } else if (result.output && result.output.choices) {
      console.log('📝 AI 回复:', result.output.choices[0]?.message?.content);
    } else {
      console.log('📝 完整响应:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    console.error('📊 错误详情:', error);
  }
}

// 运行测试
testBailianAPI().catch(console.error);
