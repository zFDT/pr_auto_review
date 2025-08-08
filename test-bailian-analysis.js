#!/usr/bin/env node

/**
 * 简化的 PR review 测试，专门测试阿里百炼分析结果
 */

import { Gitlab } from "@gitbeaker/rest";
import { AliyunBailianAnalyzer } from './aliyun-bailian-analyzer.js';
import { configLoader } from './config-loader.js';

async function testBailianAnalysis() {
  console.log('🧪 测试阿里百炼分析...');
  
  // 加载配置
  const config = await configLoader.loadConfig();
  
  // 创建分析器
  const analyzer = new AliyunBailianAnalyzer(config);
  
  // 创建模拟的代码差异
  const mockDiff = [
    {
      new_path: 'test.js',
      old_path: 'test.js',
      diff: `@@ -1,3 +1,6 @@
+// 新增注释
 function test() {
-  console.log("old");
+  console.log("new");
+  // TODO: 需要优化
 }`
    }
  ];
  
  const mockMrDetails = {
    title: '测试PR',
    description: '这是一个测试PR'
  };
  
  try {
    console.log('📤 开始分析...');
    const result = await analyzer.analyzeCodeChanges(mockDiff, mockMrDetails);
    
    console.log('✅ 分析完成！');
    console.log('📊 分析结果结构:');
    console.log('- status:', result.status);
    console.log('- provider:', result.provider);
    console.log('- model:', result.model);
    console.log('- timestamp:', result.timestamp);
    console.log('- chunks_analyzed:', result.chunks_analyzed);
    
    console.log('\n🎯 分析内容:');
    if (result.analysis) {
      console.log('- summary:', result.analysis.summary?.substring(0, 100) + '...');
      console.log('- quality_score:', result.analysis.quality_score);
      console.log('- risk_level:', result.analysis.risk_level);
      console.log('- strengths:', result.analysis.strengths?.length, '项');
      console.log('- potential_issues:', result.analysis.potential_issues?.length, '项');
      console.log('- improvement_suggestions:', result.analysis.improvement_suggestions?.length, '项');
      console.log('- security_concerns:', result.analysis.security_concerns?.length, '项');
      
      console.log('\n📝 原始响应 (前500字符):');
      console.log(result.analysis.raw_response?.substring(0, 500) + '...');
    }
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

testBailianAnalysis().catch(console.error);
