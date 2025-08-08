#!/usr/bin/env node

/**
 * 测试完整的review.sh流程（模拟GitLab数据）
 */

import { PRReviewer } from './pr-reviewer.js';
import { configLoader } from './config-loader.js';
import fs from 'fs/promises';
import path from 'path';

async function mockReviewFlow() {
  console.log('🚀 测试完整的review.sh流程（模拟数据）...');

  try {
    // 加载配置
    const config = await configLoader.loadConfig();
    console.log('✅ 配置加载成功');

    // 模拟GitLab MR数据
    const mockMrData = {
      id: 176,
      iid: 176,
      title: "优化数据处理性能",
      description: "本MR优化了数据处理函数的性能，添加了缓存机制和错误处理",
      author: {
        name: "Test Developer",
        username: "test.dev",
        avatar_url: "https://example.com/avatar.jpg"
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      web_url: "https://git.dreame.tech/project/test/-/merge_requests/176",
      source_branch: "feature/performance-optimization",
      target_branch: "master",
      state: "opened",
      merge_status: "can_be_merged"
    };

    // 模拟代码差异
    const mockDiff = [
      {
        old_path: "src/data/processor.js",
        new_path: "src/data/processor.js",
        new_file: false,
        deleted_file: false,
        diff: `@@ -1,10 +1,20 @@
 import { Cache } from './cache.js';
 
+// 添加缓存实例
+const cache = new Cache();
+
 export class DataProcessor {
   constructor() {
     this.data = [];
+    this.cache = cache;
   }
 
   process(input) {
+    // 检查缓存
+    const cacheKey = this.generateCacheKey(input);
+    if (this.cache.has(cacheKey)) {
+      return this.cache.get(cacheKey);
+    }
+
     if (!input || typeof input !== 'object') {
       throw new Error('Input must be a valid object');
     }
@@ -15,6 +25,12 @@
     // TODO: Implement more sophisticated processing
     const result = this.transformData(input);
     
+    // 缓存结果
+    this.cache.set(cacheKey, result);
+    
     return result;
   }
+  
+  generateCacheKey(input) {
+    return JSON.stringify(input);
+  }
 }`
      },
      {
        old_path: null,
        new_path: "src/utils/validation.js",
        new_file: true,
        deleted_file: false,
        diff: `@@ -0,0 +1,25 @@
+/**
+ * 数据验证工具函数
+ */
+
+export function validateInput(data) {
+  if (!data) {
+    throw new Error('数据不能为空');
+  }
+  
+  if (typeof data !== 'object') {
+    throw new Error('数据必须是对象类型');
+  }
+  
+  return true;
+}
+
+export function sanitizeString(str) {
+  if (typeof str !== 'string') {
+    return '';
+  }
+  
+  return str.trim().replace(/[<>]/g, '');
+}
+
+export { validateInput as default };`
      }
    ];

    // 创建PR reviewer实例
    const reviewer = new PRReviewer(config);
    console.log('✅ PR Reviewer初始化成功');

    // 执行AI分析
    console.log('🤖 开始AI代码分析...');
    const aiAnalysis = await reviewer.aiAnalyzer.analyzeCodeChanges(mockDiff, mockMrData);
    console.log('✅ AI分析完成');

    // 执行静态分析
    console.log('📊 开始静态代码分析...');
    const staticAnalysis = reviewer.analyzeCodeChanges(mockDiff);
    console.log('✅ 静态分析完成');

    // 生成报告
    console.log('📝 生成评审报告...');
    const reportContent = reviewer.generateMarkdownReport(mockMrData, mockDiff, staticAnalysis, aiAnalysis);

    // 保存报告
    const reportDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportFile = path.join(reportDir, `review_git_${mockMrData.iid}.txt`);
    await fs.writeFile(reportFile, reportContent, 'utf8');
    console.log(`✅ 报告已保存: ${reportFile}`);

    // 生成飞书卡片数据
    console.log('📱 生成飞书卡片数据...');
    const feishuCard = reviewer.generateFeishuCard(mockMrData, mockDiff, staticAnalysis, aiAnalysis);
    
    const feishuFile = path.join(reportDir, `feishu_card_${mockMrData.iid}.json`);
    await fs.writeFile(feishuFile, JSON.stringify(feishuCard, null, 2), 'utf8');
    console.log(`✅ 飞书数据已保存: ${feishuFile}`);

    // 显示摘要
    console.log('\n📋 评审摘要:');
    console.log(`- 项目: Test Project`);
    console.log(`- MR编号: ${mockMrData.iid}`);
    console.log(`- 标题: ${mockMrData.title}`);
    console.log(`- 文件数量: ${staticAnalysis.totalFiles}`);
    console.log(`- 新文件: ${staticAnalysis.newFiles?.length || 0}`);
    console.log(`- 修改文件: ${staticAnalysis.modifiedFiles?.length || 0}`);
    console.log(`- 潜在问题: ${staticAnalysis.potentialIssues?.length || 0}`);
    console.log(`- AI评分: ${aiAnalysis?.analysis?.score || 'N/A'}/10`);
    console.log(`- 风险等级: ${aiAnalysis?.analysis?.risk_level || 'unknown'}`);

    console.log('\n🎉 模拟review流程完成！');
    console.log(`📄 查看完整报告: cat ${reportFile}`);
    console.log(`📱 查看飞书数据: cat ${feishuFile}`);

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.stack);
  }
}

mockReviewFlow();
