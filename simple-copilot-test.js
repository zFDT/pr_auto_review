#!/usr/bin/env node

/**
 * 简化的 Copilot 测试脚本
 * 只验证基础环境配置
 */

import { CopilotOnlyAnalyzer } from './copilot-extension.js';

async function simpleCopilotTest() {
  console.log('🚀 简化 Copilot 环境测试...\n');

  const analyzer = new CopilotOnlyAnalyzer();

  console.log('📍 检测到的VS Code路径:', analyzer.vscodeCommand);

  // 只检查基础环境，不执行复杂的连接测试
  try {
    console.log('1️⃣ 检查VS Code环境...');
    const isAvailable = await analyzer.checkCopilotEnvironment();

    console.log('\n📊 环境检查结果:');
    console.log('   VS Code可用:', analyzer.vscodeAvailable);
    console.log('   Copilot可用:', analyzer.copilotAvailable);

    if (analyzer.failureReasons.length > 0) {
      console.log('\n⚠️ 发现的问题:');
      analyzer.failureReasons.forEach((reason, index) => {
        console.log(`   ${index + 1}. ${reason}`);
      });
    }

    if (analyzer.vscodeAvailable) {
      console.log('\n✅ VS Code 环境配置成功!');
      
      // 创建一个测试MR来演示分析功能
      const testDiff = [
        {
          new_path: 'lib/test_widget.dart',
          diff: `@@ -0,0 +1,15 @@
+import 'package:flutter/material.dart';
+
+class TestWidget extends StatelessWidget {
+  @override
+  Widget build(BuildContext context) {
+    return Container(
+      child: Text('Hello World'),
+    );
+  }
+}`
        }
      ];

      const testMrDetails = {
        title: 'Simple Test MR',
        author: { name: 'Test User' },
        source_branch: 'feature/test',
        target_branch: 'main'
      };

      console.log('\n🧪 开始代码分析测试...');
      const result = await analyzer.analyzeCopilot(testDiff, testMrDetails);
      
      console.log('\n📄 分析结果:');
      console.log(JSON.stringify(result, null, 2));

      // 保存测试结果
      await import('fs/promises').then(fs => 
        fs.writeFile(
          './reports/simple_copilot_test.json', 
          JSON.stringify(result, null, 2)
        )
      );
      
      console.log('\n💾 测试结果已保存到: ./reports/simple_copilot_test.json');
    }

  } catch (error) {
    console.error('\n❌ 测试过程出错:', error.message);
    process.exit(1);
  }
}

// 运行测试
simpleCopilotTest().catch(console.error);
