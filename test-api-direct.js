#!/usr/bin/env node

/**
 * 直接测试阿里云百炼API连接
 */

import fetch from 'node-fetch';

async function testAPIDirectly() {
  console.log('🔗 直接测试阿里云百炼API连接...');
  
  const config = {
    api_key: 'your_openai_api_key_here',
    model: 'qwen-max',
    base_url: 'https://dashscope.aliyuncs.com/api/v1'
  };

  const requestBody = {
    model: config.model,
    input: {
      messages: [
        {
          role: 'user',
          content: '你好，请回复一个简单的问候'
        }
      ]
    },
    parameters: {
      max_tokens: 100,
      temperature: 0.1,
      result_format: 'message'
    }
  };

  console.log('📡 发送API请求...');
  console.log('URL:', `${config.base_url}/services/aigc/text-generation/generation`);
  console.log('Headers:', {
    'Authorization': `Bearer ${config.api_key.substring(0, 10)}...`,
    'Content-Type': 'application/json',
    'X-DashScope-SSE': 'disable'
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('⏰ 5秒超时，取消请求');
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(`${config.base_url}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    console.log('📥 收到响应:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API错误响应:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ API响应成功:', JSON.stringify(result, null, 2));

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('❌ 请求超时');
    } else {
      console.error('❌ 请求失败:', error);
    }
  }
}

testAPIDirectly();
