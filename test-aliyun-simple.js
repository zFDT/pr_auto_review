#!/usr/bin/env node

/**
 * 简单的阿里百炼测试
 */

import { AliyunBailianAnalyzer } from './aliyun-bailian-analyzer.js';

async function testSimple() {
  console.log('🧪 开始测试阿里百炼分析器...');
  
  const config = {
    ai_config: {
      aliyun_bailian: {
        api_key: 'your_openai_api_key_here',
        model: 'qwen-max',
        workspace_id: 'your_aliyun_workspace_id',
        base_url: 'https://dashscope.aliyuncs.com/api/v1',
        timeout: 60000,  // 增加到60秒超时时间
        max_tokens: 1000, // 适当增加token数量
        temperature: 0.1
      }
    }
  };

  try {
    const analyzer = new AliyunBailianAnalyzer(config);
    console.log('✅ 分析器初始化成功');
    console.log('配置状态:', analyzer.checkConfiguration());
    console.log('是否可用:', analyzer.isAvailable());

    // 创建一个简单的测试diff
    const simpleDiff = [{
      new_path: 'test.js',
      old_path: 'test.js',
      diff: `@@ -1,3 +1,4 @@
 function hello() {
+  console.log('hello world');
   return 'hello';
 }`
    }];

    const mrDetails = {
      title: '测试MR',
      description: '这是一个测试',
      id: 123
    };

    console.log('🚀 开始分析测试代码...');
    
    // 设置超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('分析超时')), 70000); // 70秒总超时
    });

    const analysisPromise = analyzer.analyzeCodeChanges(simpleDiff, mrDetails);
    
    const result = await Promise.race([analysisPromise, timeoutPromise]);
    
    console.log('✅ 分析完成:', result);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.stack);
  }
}

testSimple();
