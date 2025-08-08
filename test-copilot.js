#!/usr/bin/env node

/**
 * GitHub Copilot 集成测试脚本
 * 验证 Copilot 环境是否正确配置
 */

import { CopilotOnlyAnalyzer } from './copilot-extension.js';

async function testCopilotIntegration() {
  console.log('🧪 开始 GitHub Copilot 集成测试...\n');

  const analyzer = new CopilotOnlyAnalyzer();

  try {
    // 检查环境
    console.log('1️⃣ 检查 Copilot 环境...');
    const isAvailable = await analyzer.checkCopilotEnvironment();

    if (isAvailable) {
      console.log('✅ GitHub Copilot 环境检查通过\n');
      
      // 创建测试数据
      const testDiff = [
        {
          new_path: 'lib/test_widget.dart',
          diff: `@@ -0,0 +1,20 @@
+import 'package:flutter/material.dart';
+
+class TestWidget extends StatelessWidget {
+  @override
+  Widget build(BuildContext context) {
+    return Scaffold(
+      appBar: AppBar(
+        title: Text('Test'),
+      ),
+      body: Center(
+        child: Text('Hello World'),
+      ),
+    );
+  }
+}`
        }
      ];

      const testMrDetails = {
        title: 'Test MR for Copilot Integration',
        author: { name: 'Test User' },
        source_branch: 'feature/test',
        target_branch: 'main'
      };

      console.log('2️⃣ 执行测试分析...');
      const result = await analyzer.analyzeCopilot(testDiff, testMrDetails);

      if (result.status === 'completed') {
        console.log('✅ Copilot 分析测试成功!');
        console.log('\n📊 分析结果预览:');
        console.log(`- 分析的文件数: ${result.analysis.total_files}`);
        console.log(`- 成功分析: ${result.analysis.analyzed_files}`);
        console.log(`- Copilot 版本: ${result.copilot_version}`);
        console.log(`- 分析总结: ${result.analysis.summary.summary_text}\n`);
        
        console.log('🎉 GitHub Copilot 集成完全正常!');
        process.exit(0);
      } else {
        console.error('❌ Copilot 分析测试失败');
        console.error('失败原因:', result.failure_reasons);
        console.log('\n🔧 请查看故障排除步骤:');
        result.troubleshooting_steps.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step}`);
        });
        process.exit(1);
      }

    } else {
      console.error('❌ GitHub Copilot 环境检查失败');
      console.error('失败原因:', analyzer.failureReasons);
      console.log('\n🔧 请按以下步骤设置 Copilot:');
      console.log('   1. 安装 VS Code');
      console.log('   2. 安装 GitHub Copilot 扩展');
      console.log('   3. 登录 GitHub Copilot');
      console.log('   4. 验证订阅状态');
      console.log('\n📖 详细设置指南请查看: COPILOT_SETUP.md');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('详细错误:', error.stack);
    process.exit(1);
  }
}

// 运行测试
testCopilotIntegration();
