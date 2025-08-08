#!/usr/bin/env node

/**
 * AI 分析器测试工具
 * 测试 OpenAI 和 Copilot 两种分析器的功能
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import { configLoader } from './config-loader.js';
import { OpenAIAnalyzer } from './openai-analyzer.js';
import { CopilotAnalyzer } from './copilot-extension.js';

async function testAIAnalyzers() {
  console.log('🧪 AI 分析器测试开始...\n');
  
  try {
    // 加载配置
    const config = await configLoader.loadConfig();
    console.log('✅ 配置加载成功\n');
    
    // 创建测试用的 diff 和 MR 信息
    const testDiff = [
      {
        new_path: 'lib/test_widget.dart',
        diff: `@@ -1,5 +1,10 @@
 import 'package:flutter/material.dart';
 
 class TestWidget extends StatelessWidget {
+  final String title;
+  
+  const TestWidget({Key? key, required this.title}) : super(key: key);
+  
   @override
   Widget build(BuildContext context) {
-    return Container();
+    return Text(title);
   }
 }`
      }
    ];
    
    const testMR = {
      title: 'Add title parameter to TestWidget',
      description: 'Added required title parameter to make widget more flexible',
      author: { name: 'Test User' },
      source_branch: 'feature/test-widget',
      target_branch: 'master'
    };
    
    // 测试 OpenAI 分析器
    await testOpenAI(config, testDiff, testMR);
    
    // 测试 Copilot 分析器
    await testCopilot(config, testDiff, testMR);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

async function testOpenAI(config, testDiff, testMR) {
  console.log('🤖 测试 OpenAI 分析器...');
  
  const openaiAnalyzer = new OpenAIAnalyzer(config);
  
  // 测试连接
  const connectionTest = await openaiAnalyzer.testConnection();
  if (connectionTest.success) {
    console.log('✅ OpenAI 连接测试成功');
    console.log(`📋 响应: ${connectionTest.message}`);
    console.log(`🔧 模型: ${connectionTest.model}`);
    console.log(`📊 用量: ${JSON.stringify(connectionTest.usage)}`);
  } else {
    console.log('❌ OpenAI 连接测试失败:', connectionTest.error);
    return;
  }
  
  // 测试代码分析
  if (openaiAnalyzer.isAvailable()) {
    console.log('🔍 开始 OpenAI 代码分析测试...');
    const analysisResult = await openaiAnalyzer.analyzeCodeChanges(testDiff, testMR);
    
    if (analysisResult && analysisResult.status === 'success') {
      console.log('✅ OpenAI 代码分析成功');
      console.log(`📊 分析评分: ${analysisResult.analysis.score}`);
      console.log(`📝 总结: ${analysisResult.analysis.summary}`);
      console.log(`🐛 发现问题: ${analysisResult.analysis.issues.length} 个`);
      console.log(`💡 建议数量: ${analysisResult.analysis.suggestions.length} 个`);
      
      // 保存结果
      await openaiAnalyzer.saveAnalysisResult(analysisResult);
    } else {
      console.log('❌ OpenAI 代码分析失败:', analysisResult?.error || '未知错误');
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

async function testCopilot(config, testDiff, testMR) {
  console.log('🚀 测试 Copilot 分析器...');
  
  const copilotAnalyzer = new CopilotAnalyzer(config);
  
  // 测试连接
  console.log('🔍 开始 Copilot 连接测试...');
  const connectionTest = await copilotAnalyzer.testCopilotConnection();
  
  if (connectionTest.success) {
    console.log('✅ Copilot 连接测试成功');
    console.log(`📋 Copilot 活跃: ${connectionTest.copilot_active}`);
    console.log(`💡 建议可用: ${connectionTest.suggestions_available}`);
    console.log(`🔧 扩展版本: ${connectionTest.extension_version}`);
  } else {
    console.log('❌ Copilot 连接测试失败:', connectionTest.error);
  }
  
  // 测试代码分析
  console.log('🔍 开始 Copilot 代码分析测试...');
  const analysisResult = await copilotAnalyzer.analyzeCodeChanges(testDiff, testMR);
  
  if (analysisResult && analysisResult.status === 'success') {
    console.log('✅ Copilot 代码分析成功');
    console.log(`📊 分析结果: ${JSON.stringify(analysisResult.analysis, null, 2)}`);
    
    // 显示增强的元数据
    if (analysisResult.enhanced_metadata) {
      console.log('� 增强元数据:');
      console.log(`  Flutter专项: ${analysisResult.enhanced_metadata.flutter_specific}`);
      console.log(`  配置已加载: ${analysisResult.enhanced_metadata.config_loaded}`);
    }
    
    // 显示Flutter专项分析
    if (analysisResult.flutter_analysis) {
      console.log('🎯 Flutter专项分析:');
      console.log(`  Dart文件数: ${analysisResult.flutter_analysis.dart_files_count}`);
      console.log(`  性能问题: ${analysisResult.flutter_analysis.performance_issues.length}`);
    }
  } else {
    console.log('❌ Copilot 代码分析失败:', analysisResult?.error || '未知错误');
    if (analysisResult?.failure_reasons) {
      console.log('� 失败原因:');
      analysisResult.failure_reasons.forEach(reason => {
        console.log(`  - ${reason}`);
      });
    }
    if (analysisResult?.troubleshooting_steps || analysisResult?.troubleshooting) {
      console.log('🔧 故障排除建议:');
      const steps = analysisResult.troubleshooting_steps || analysisResult.troubleshooting;
      steps.forEach(step => {
        console.log(`  ${step}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// 主程序入口
if (import.meta.url === `file://${process.argv[1]}`) {
  testAIAnalyzers();
}
