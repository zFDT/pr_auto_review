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

import { PRReviewer, listProjects } from './pr-reviewer.js';
import { configLoader } from './src/config/config-loader.js';

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
📋 PR Review Automation Tool

用法:
  node index.js <项目名称> <MR编号>     执行PR评审
  node index.js --list-projects       列出所有可用项目
  node index.js --help               显示此帮助信息

示例:
  node index.js "ZM App" 161          评审ZM App项目的MR #161
  node index.js zm-app 161            使用项目路径评审
  node index.js dreame/zm-app 161     使用命名空间路径评审
  node index.js 9831 161              使用项目ID评审
  node index.js --list-projects       查看所有可用项目

💡 项目引用方式：
   现在支持多种方式引用项目，无需手动在config.json中配置：
   • 项目名称：如 "ZM App" 
   • 项目路径：如 "zm-app"
   • 命名空间路径：如 "dreame/zm-app"
   • 项目ID：如 "9831"

🔧 配置：
   如果config.json中有projects配置，将优先使用配置文件
   否则会自动从GitLab API动态获取项目信息
  `);
}

/**
 * 主函数
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // 处理特殊命令
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      showHelp();
      return;
    }
    
    if (args.includes('--list-projects') || args.includes('-l')) {
      await listProjects();
      return;
    }

    // 正常的PR评审流程
    if (args.length < 2) {
      console.log('❌ 参数不足');
      showHelp();
      process.exit(1);
    }

    const projectName = args[0];
    const mrId = parseInt(args[1]);

    if (isNaN(mrId)) {
      console.error('❌ MR编号必须是数字');
      process.exit(1);
    }

    console.log(`🚀 开始评审项目: ${projectName}, MR #${mrId}`);

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
