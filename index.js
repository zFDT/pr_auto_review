#!/usr/bin/env node

/**
 * PR Review Automation - 项目入口文件
 * 
 * 这是整个项目的统一入口点，提供：
 * - 命令行接口
 * - 参数解析和验证
 * - 环境检查
 * - 错误处理
 * 
 * @author AI Assistant
 * @version 2.1.0
 * @license MIT
 */

import { PRReviewer } from './pr-reviewer.js';
import { configLoader } from './src/config/config-loader.js';

/**
 * 主函数
 */
async function main() {
  try {
    // 环境检查
    if (process.argv.length < 4) {
      console.log('用法: node index.js <项目名称> <MR编号>');
      console.log('示例: node index.js "ZM App" 161');
      process.exit(1);
    }

    const projectName = process.argv[2];
    const mrId = parseInt(process.argv[3]);

    if (isNaN(mrId)) {
      console.error('❌ MR编号必须是数字');
      process.exit(1);
    }

    // 加载配置
    const config = await configLoader.loadConfig();
    
    // 创建并运行评审器
    const reviewer = new PRReviewer(config);
    await reviewer.reviewPR(projectName, mrId);

  } catch (error) {
    console.error('❌ 程序执行失败:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
