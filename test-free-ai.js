#!/usr/bin/env node

/**
 * 免费AI服务测试工具
 * 用于测试和验证各种免费AI服务的可用性
 */

import { FreeAIAnalyzer } from './free-ai-analyzer.js';
import { configLoader } from './config-loader.js';

async function testFreeAIServices() {
  console.log('🧪 开始测试免费AI服务...\n');

  try {
    // 加载配置
    const config = await configLoader.loadConfig();
    
    // 创建分析器实例
    const analyzer = new FreeAIAnalyzer(config);
    
    // 测试连接
    console.log('📡 测试服务连接...');
    const connectionResult = await analyzer.testConnection();
    
    console.log('连接测试结果:');
    console.log(`✅ 可用服务: ${connectionResult.available_services.join(', ')}`);
    console.log(`🎯 当前服务: ${connectionResult.current_service}`);
    console.log(`📝 状态信息: ${connectionResult.message}\n`);
    
    // 测试代码分析功能
    console.log('🔍 测试代码分析功能...');
    
    const testDiff = [{
      new_path: 'test.js',
      old_path: 'test.js',
      diff: `
@@ -1,5 +1,8 @@
 function testFunction() {
-  console.log("Hello World");
+  console.log("Hello World");
+  // TODO: 需要优化
+  var result = eval("1+1");
+  document.innerHTML = "<script>alert('xss')</script>";
   return true;
 }
`
    }];
    
    const testMRDetails = {
      title: '测试MR',
      description: '这是一个测试Merge Request',
      source_branch: 'feature/test',
      target_branch: 'main'
    };
    
    const analysisResult = await analyzer.analyzeCodeChanges(testDiff, testMRDetails);
    
    if (analysisResult && analysisResult.status === 'success') {
      console.log('✅ 代码分析测试成功!');
      console.log(`📊 使用的服务: ${analysisResult.provider}`);
      console.log(`⏰ 分析时间: ${analysisResult.timestamp}`);
      
      if (analysisResult.analysis) {
        console.log('\n📋 分析结果预览:');
        if (analysisResult.analysis.summary) {
          console.log(`摘要: ${analysisResult.analysis.summary.substring(0, 100)}...`);
        }
        if (analysisResult.analysis.issues) {
          console.log(`发现问题: ${analysisResult.analysis.issues.length} 个`);
        }
        if (analysisResult.analysis.score) {
          console.log(`质量评分: ${analysisResult.analysis.score}/10`);
        }
      }
    } else {
      console.log('⚠️ 代码分析测试失败');
      if (analysisResult && analysisResult.error) {
        console.log(`错误信息: ${analysisResult.error}`);
      }
    }
    
    // 服务可用性详细报告
    console.log('\n' + '='.repeat(50));
    console.log('📊 服务可用性详细报告');
    console.log('='.repeat(50));
    
    const services = [
      { name: 'Ollama (本地)', key: 'ollama', recommended: true },
      { name: 'Groq AI', key: 'groq', recommended: true },
      { name: 'Hugging Face', key: 'huggingface', recommended: false },
      { name: 'Together AI', key: 'together', recommended: false },
      { name: '百度文心', key: 'baidu', recommended: false },
      { name: '通义千问', key: 'tongyi', recommended: false }
    ];
    
    for (const service of services) {
      const isAvailable = analyzer.availableServices[service.key];
      const status = isAvailable ? '✅ 可用' : '❌ 不可用';
      const recommendation = service.recommended ? '⭐ 推荐' : '';
      
      console.log(`${service.name}: ${status} ${recommendation}`);
      
      if (!isAvailable && service.key !== 'ollama') {
        console.log(`   💡 配置方法: 设置环境变量 ${service.key.toUpperCase()}_API_KEY`);
      } else if (!isAvailable && service.key === 'ollama') {
        console.log('   💡 安装方法: brew install ollama && ollama serve');
      }
    }
    
    // 给出配置建议
    console.log('\n📝 配置建议:');
    
    if (analyzer.availableServices.ollama) {
      console.log('🎉 建议使用Ollama本地模型，速度快且完全免费');
    } else if (analyzer.availableServices.groq) {
      console.log('🚀 建议使用Groq AI，速度极快且免费配额充足');
    } else if (connectionResult.available_services.length > 0) {
      console.log(`✅ 当前可用服务: ${connectionResult.available_services[0]}，可以正常使用`);
    } else {
      console.log('⚠️ 没有配置任何AI服务，建议按照 FREE_AI_SETUP.md 指南进行配置');
      console.log('📖 快速开始: brew install ollama && ollama pull codellama');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.log('\n🔧 排错建议:');
    console.log('1. 检查网络连接');
    console.log('2. 验证API密钥配置');
    console.log('3. 查看 FREE_AI_SETUP.md 获取详细配置指南');
    process.exit(1);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testFreeAIServices().catch(console.error);
}

export { testFreeAIServices };
