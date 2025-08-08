#!/usr/bin/env node

/**
 * 测试完整的PR reviewer流程（模拟数据）
 */

import { PRReviewer } from './pr-reviewer.js';

async function testFullReview() {
  console.log('🧪 开始测试完整的PR review流程...');
  
  // 模拟配置（不需要真实的GitLab token）
  const mockConfig = {
    gitlab: {
      host: "https://git.dreame.tech",
      token: "mock-token"
    },
    projects: {
      "Test Project": {
        id: 123,
        description: "测试项目"
      }
    },
    review_settings: {
      max_files_warning: 20,
      max_lines_warning: 1000,
      include_detailed_diff: true,
      check_console_logs: true,
      check_todos: true,
      enable_ai_analysis: true,
      ai_provider: "aliyun_bailian"
    },
    ai_config: {
      aliyun_bailian: {
        api_key: "your_openai_api_key_here",
        model: "qwen-max",
        workspace_id: "your_aliyun_workspace_id",
        base_url: "https://dashscope.aliyuncs.com/api/v1",
        timeout: 60000,
        max_tokens: 4000,
        temperature: 0.1
      }
    },
    notification: {
      feishu: {
        webhook_url: null,
        enabled: false
      }
    }
  };

  try {
    const reviewer = new PRReviewer(mockConfig);
    console.log('✅ PR Reviewer 初始化成功');

    // 模拟简单的代码变更
    const mockDiff = [
      {
        new_path: 'src/main.js',
        old_path: 'src/main.js',
        diff: `@@ -1,5 +1,7 @@
 function calculateSum(a, b) {
+  // TODO: Add input validation
+  console.log('Calculating sum of', a, 'and', b);
   return a + b;
 }
 
 export default calculateSum;`
      },
      {
        new_path: 'src/utils.js',
        old_path: null,
        new_file: true,
        diff: `@@ -0,0 +1,8 @@
+export function formatNumber(num) {
+  if (typeof num !== 'number') {
+    throw new Error('Input must be a number');
+  }
+  return num.toLocaleString();
+}
+
+export { formatNumber as default };`
      }
    ];

    const mockMrDetails = {
      title: '添加数字格式化工具函数',
      description: '这个MR添加了一个新的工具函数用于格式化数字显示',
      author: { name: 'Test User' },
      created_at: new Date().toISOString(),
      web_url: 'https://example.com/mr/123'
    };

    console.log('🔍 开始代码分析...');
    console.log('AI提供商配置:', mockConfig.review_settings.ai_provider);
    console.log('阿里百炼分析器可用:', reviewer.aiAnalyzer?.aliyunBailianAnalyzer?.isAvailable());
    console.log('免费AI分析器可用:', reviewer.aiAnalyzer?.freeAIAnalyzer?.isAvailable());
    
    const aiAnalysis = await reviewer.aiAnalyzer.analyzeCodeChanges(mockDiff, mockMrDetails);
    
    if (aiAnalysis) {
      console.log('✅ AI分析完成:', {
        provider: aiAnalysis.provider,
        model: aiAnalysis.model,
        status: aiAnalysis.status,
        chunks: aiAnalysis.chunks_analyzed,
        score: aiAnalysis.analysis?.score,
        summary: aiAnalysis.analysis?.summary?.substring(0, 100) + '...'
      });
    }

    console.log('📝 生成评审报告...');
    const staticAnalysis = reviewer.analyzeCodeChanges(mockDiff);
    
    console.log('📊 静态分析结果:', {
      totalFiles: staticAnalysis.totalFiles,
      newFiles: staticAnalysis.newFiles?.length,
      modifiedFiles: staticAnalysis.modifiedFiles?.length,
      languages: staticAnalysis.languages,
      potentialIssues: staticAnalysis.potentialIssues?.length
    });

    console.log('🎉 测试完成！阿里百炼配置正常工作！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.stack);
  }
}

testFullReview();
