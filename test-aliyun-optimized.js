#!/usr/bin/env node

/**
 * 阿里云百炼分析器优化测试脚本
 * 
 * 测试优化后的配置参数和性能改进
 */

import { AliyunBailianAnalyzer } from './aliyun-bailian-analyzer.js';
import fs from 'fs/promises';

async function testOptimizedAnalyzer() {
  console.log('🧪 测试优化后的阿里云百炼分析器');
  console.log('='.repeat(50));

  try {
    // 读取配置文件
    const configData = await fs.readFile('./config.json', 'utf-8');
    const config = JSON.parse(configData);

    // 创建分析器实例
    const analyzer = new AliyunBailianAnalyzer(config);

    // 1. 测试配置信息
    console.log('\n📋 配置信息测试:');
    const configInfo = analyzer.getConfigInfo();
    console.log('配置状态:', configInfo.configured ? '✅ 已配置' : '❌ 未配置');
    console.log('模型:', configInfo.model);
    console.log('性能配置:', JSON.stringify(configInfo.performance, null, 2));

    if (!analyzer.isAvailable()) {
      console.log('❌ 分析器未正确配置，跳过测试');
      return;
    }

    // 2. 测试连接
    console.log('\n🔗 连接测试:');
    const connectionTest = await analyzer.testConnection();
    console.log('连接状态:', connectionTest.success ? '✅ 成功' : '❌ 失败');
    if (!connectionTest.success) {
      console.log('错误信息:', connectionTest.message);
      return;
    }

    // 3. 测试代码分析（模拟数据）
    console.log('\n🤖 代码分析测试:');
    const mockDiff = [
      {
        new_path: 'src/test-optimization.js',
        old_path: 'src/test-optimization.js',
        diff: `@@ -1,5 +1,10 @@
 function calculateTotal(items) {
-  let total = 0;
-  for (let i = 0; i < items.length; i++) {
-    total += items[i].price;
+  // 优化：使用reduce方法
+  return items.reduce((total, item) => {
+    if (!item || typeof item.price !== 'number') {
+      throw new Error('Invalid item or price');
+    }
+    return total + item.price;
+  }, 0);
 }
-  return total;
-}`
      }
    ];

    const mockMRDetails = {
      title: '优化计算函数性能',
      description: '使用函数式编程方法重构计算逻辑，添加输入验证'
    };

    const startTime = Date.now();
    const analysisResult = await analyzer.analyzeCodeChanges(mockDiff, mockMRDetails);
    const analysisTime = Date.now() - startTime;

    console.log('分析结果状态:', analysisResult.status);
    console.log('分析耗时:', `${analysisTime}ms`);
    console.log('质量评分:', `${analysisResult.analysis.quality_score}/10`);
    console.log('风险等级:', analysisResult.analysis.risk_level);
    console.log('发现问题数:', analysisResult.analysis.potential_issues?.length || 0);
    console.log('改进建议数:', analysisResult.analysis.improvement_suggestions?.length || 0);

    // 4. 测试缓存机制
    console.log('\n💾 缓存机制测试:');
    console.log('第一次分析完成，测试缓存...');
    
    const cacheStartTime = Date.now();
    const cachedResult = await analyzer.analyzeCodeChanges(mockDiff, mockMRDetails);
    const cacheTime = Date.now() - cacheStartTime;
    
    console.log('缓存分析耗时:', `${cacheTime}ms`);
    console.log('性能提升:', `${Math.round((analysisTime - cacheTime) / analysisTime * 100)}%`);

    // 5. 性能统计
    console.log('\n📊 性能统计:');
    const perfStats = analyzer.getPerformanceStats();
    console.log('缓存命中率:', perfStats.cache_hit_rate);
    console.log('缓存大小:', `${perfStats.cache_size}/${analyzer.maxCacheSize}`);
    console.log('总请求数:', perfStats.total_requests);

    // 6. 测试分块处理
    console.log('\n📦 分块处理测试:');
    const largeDiff = Array.from({ length: 15 }, (_, i) => ({
      new_path: `src/file${i}.js`,
      old_path: `src/file${i}.js`,
      diff: `@@ -1,3 +1,3 @@
 // File ${i}
-console.log('old');
+console.log('new');`
    }));

    console.log(`原始文件数: ${largeDiff.length}`);
    const chunks = analyzer.chunkDiff(largeDiff);
    console.log(`分块数量: ${chunks.length}`);
    console.log(`每块文件数: ${chunks.map(chunk => chunk.length).join(', ')}`);

    console.log('\n✅ 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error.stack);
  }
}

// 执行测试
testOptimizedAnalyzer().catch(console.error);
