#!/usr/bin/env node

/**
 * 系统健康检查工具
 * 用于检查项目的整体状态和配置
 */

import { configLoader } from '../config/config-loader.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class HealthChecker {
  constructor() {
    this.config = null;
    this.results = {
      config: {},
      dependencies: {},
      ai_services: {},
      file_permissions: {},
      overall: 'unknown'
    };
  }

  async checkAll() {
    console.log('🏥 开始系统健康检查...\n');

    try {
      await this.checkConfig();
      await this.checkDependencies();
      await this.checkAIServices();
      await this.checkFilePermissions();
      await this.checkReportsDirectory();
      
      this.generateOverallStatus();
      this.printResults();
      
    } catch (error) {
      console.error('❌ 健康检查失败:', error.message);
      process.exit(1);
    }
  }

  async checkConfig() {
    console.log('📋 检查配置文件...');
    
    try {
      this.config = await configLoader.loadConfig();
      this.results.config.status = 'healthy';
      this.results.config.message = '配置文件加载成功';
      console.log('  ✅ 配置文件正常');
    } catch (error) {
      this.results.config.status = 'error';
      this.results.config.message = error.message;
      console.log('  ❌ 配置文件错误:', error.message);
    }
  }

  async checkDependencies() {
    console.log('\n📦 检查依赖包...');
    
    try {
      const { stdout } = await execAsync('npm ls --depth=0 --json');
      const packageInfo = JSON.parse(stdout);
      
      const requiredDeps = ['@gitbeaker/rest', 'openai', 'node-fetch'];
      const missingDeps = [];
      
      for (const dep of requiredDeps) {
        if (!packageInfo.dependencies || !packageInfo.dependencies[dep]) {
          missingDeps.push(dep);
        }
      }
      
      if (missingDeps.length === 0) {
        this.results.dependencies.status = 'healthy';
        this.results.dependencies.message = '所有依赖包正常';
        console.log('  ✅ 依赖包完整');
      } else {
        this.results.dependencies.status = 'warning';
        this.results.dependencies.message = `缺少依赖包: ${missingDeps.join(', ')}`;
        console.log('  ⚠️ 缺少依赖包:', missingDeps.join(', '));
      }
    } catch (error) {
      this.results.dependencies.status = 'error';
      this.results.dependencies.message = '无法检查依赖包';
      console.log('  ❌ 依赖包检查失败');
    }
  }

  async checkAIServices() {
    console.log('\n🤖 检查AI服务...');
    
    if (!this.config) {
      console.log('  ⚠️ 无法检查AI服务（配置未加载）');
      return;
    }

    // 检查OpenAI配置
    const openaiKey = process.env.OPENAI_API_KEY || this.config.ai_config?.openai?.api_key;
    if (openaiKey && openaiKey !== '${OPENAI_API_KEY}') {
      console.log('  ✅ OpenAI API密钥已配置');
      this.results.ai_services.openai = 'configured';
    } else {
      console.log('  ⚠️ OpenAI API密钥未配置');
      this.results.ai_services.openai = 'not_configured';
    }

    // 检查Copilot配置
    const copilotConfig = this.config.ai_config?.copilot;
    if (copilotConfig?.enabled) {
      console.log('  ✅ Copilot已启用');
      this.results.ai_services.copilot = 'enabled';
    } else {
      console.log('  ⚠️ Copilot未启用');
      this.results.ai_services.copilot = 'disabled';
    }

    // 检查VS Code路径
    if (copilotConfig?.vscode_path) {
      try {
        await fs.access(copilotConfig.vscode_path);
        console.log('  ✅ VS Code路径有效');
      } catch {
        console.log('  ❌ VS Code路径无效');
      }
    }
  }

  async checkFilePermissions() {
    console.log('\n📁 检查文件权限...');
    
    const filesToCheck = [
      './pr-reviewer.js',
      './config.json',
      './reports'
    ];

    let allGood = true;
    
    for (const file of filesToCheck) {
      try {
        await fs.access(file, fs.constants.R_OK);
        console.log(`  ✅ ${file} 可读`);
      } catch {
        console.log(`  ❌ ${file} 不可读`);
        allGood = false;
      }
    }

    this.results.file_permissions.status = allGood ? 'healthy' : 'error';
  }

  async checkReportsDirectory() {
    console.log('\n📊 检查报告目录...');
    
    try {
      const reportsStat = await fs.stat('./reports');
      if (reportsStat.isDirectory()) {
        const files = await fs.readdir('./reports');
        console.log(`  ✅ 报告目录存在 (${files.length} 个文件)`);
        
        // 检查是否有过期的报告文件
        const oldFiles = [];
        const now = Date.now();
        
        for (const file of files) {
          const filePath = path.join('./reports', file);
          const stat = await fs.stat(filePath);
          const age = (now - stat.mtime.getTime()) / (1000 * 60 * 60 * 24); // 天数
          
          if (age > 30) {
            oldFiles.push(file);
          }
        }
        
        if (oldFiles.length > 0) {
          console.log(`  ⚠️ ${oldFiles.length} 个报告文件超过30天`);
        }
      }
    } catch (error) {
      console.log('  ❌ 报告目录不存在或不可访问');
    }
  }

  generateOverallStatus() {
    const statuses = [
      this.results.config.status,
      this.results.dependencies.status,
      this.results.file_permissions.status
    ];

    if (statuses.includes('error')) {
      this.results.overall = 'unhealthy';
    } else if (statuses.includes('warning')) {
      this.results.overall = 'warning';
    } else {
      this.results.overall = 'healthy';
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 健康检查总结');
    console.log('='.repeat(50));
    
    const statusIcon = {
      'healthy': '✅',
      'warning': '⚠️',
      'unhealthy': '❌',
      'unknown': '❓'
    };

    console.log(`整体状态: ${statusIcon[this.results.overall]} ${this.results.overall.toUpperCase()}`);
    
    console.log('\n详细信息:');
    console.log(`- 配置文件: ${statusIcon[this.results.config.status]} ${this.results.config.message || this.results.config.status}`);
    console.log(`- 依赖包: ${statusIcon[this.results.dependencies.status]} ${this.results.dependencies.message || this.results.dependencies.status}`);
    console.log(`- 文件权限: ${statusIcon[this.results.file_permissions.status]} ${this.results.file_permissions.status}`);
    
    if (this.results.overall !== 'healthy') {
      console.log('\n🔧 建议操作:');
      if (this.results.config.status === 'error') {
        console.log('- 检查并修复配置文件');
      }
      if (this.results.dependencies.status !== 'healthy') {
        console.log('- 运行 npm install 安装缺失的依赖');
      }
      if (this.results.file_permissions.status === 'error') {
        console.log('- 检查文件权限设置');
      }
    }
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new HealthChecker();
  checker.checkAll().catch(console.error);
}

export { HealthChecker };
