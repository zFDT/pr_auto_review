#!/usr/bin/env node

/**
 * 项目清理工具
 * 用于清理过期文件和优化项目存储空间
 */

import fs from 'fs/promises';
import path from 'path';

class ProjectCleaner {
  constructor() {
    this.deletedFiles = [];
    this.totalSizeCleaned = 0;
  }

  async cleanAll() {
    console.log('🧹 开始清理项目...\n');

    try {
      await this.cleanReports();
      await this.cleanTempFiles();
      await this.cleanNodeModulesCache();
      await this.cleanLogs();
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ 清理失败:', error.message);
      process.exit(1);
    }
  }

  async cleanReports() {
    console.log('📊 清理过期报告文件...');
    
    try {
      const reportsDir = './reports';
      const files = await fs.readdir(reportsDir);
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天

      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(reportsDir, file);
        const stat = await fs.stat(filePath);
        
        if (now - stat.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          this.deletedFiles.push(filePath);
          this.totalSizeCleaned += stat.size;
          cleanedCount++;
        }
      }
      
      console.log(`  ✅ 清理了 ${cleanedCount} 个过期报告文件`);
      
    } catch (error) {
      console.log('  ⚠️ 报告目录清理失败:', error.message);
    }
  }

  async cleanTempFiles() {
    console.log('\n🗑️ 清理临时文件...');
    
    const tempPatterns = [
      './temp/**/*',
      './*.tmp',
      './*.temp',
      './.*~',
      './.DS_Store'
    ];

    let cleanedCount = 0;

    try {
      // 清理temp目录
      const tempDir = './temp';
      try {
        const tempFiles = await fs.readdir(tempDir, { withFileTypes: true });
        
        for (const file of tempFiles) {
          const filePath = path.join(tempDir, file.name);
          
          if (file.isDirectory()) {
            await fs.rmdir(filePath, { recursive: true });
          } else {
            const stat = await fs.stat(filePath);
            await fs.unlink(filePath);
            this.totalSizeCleaned += stat.size;
          }
          
          this.deletedFiles.push(filePath);
          cleanedCount++;
        }
      } catch (error) {
        // temp目录不存在或为空
      }

      // 清理根目录的临时文件
      const rootFiles = await fs.readdir('.');
      
      for (const file of rootFiles) {
        if (file.endsWith('.tmp') || file.endsWith('.temp') || file === '.DS_Store') {
          try {
            const stat = await fs.stat(file);
            await fs.unlink(file);
            this.deletedFiles.push(file);
            this.totalSizeCleaned += stat.size;
            cleanedCount++;
          } catch (error) {
            // 忽略删除失败的文件
          }
        }
      }
      
      console.log(`  ✅ 清理了 ${cleanedCount} 个临时文件`);
      
    } catch (error) {
      console.log('  ⚠️ 临时文件清理失败:', error.message);
    }
  }

  async cleanNodeModulesCache() {
    console.log('\n📦 清理Node.js缓存...');
    
    try {
      const cacheDir = './node_modules/.cache';
      
      try {
        const stat = await fs.stat(cacheDir);
        await fs.rmdir(cacheDir, { recursive: true });
        this.deletedFiles.push(cacheDir);
        this.totalSizeCleaned += stat.size || 0;
        console.log('  ✅ 清理了Node.js缓存目录');
      } catch (error) {
        console.log('  ℹ️ 未找到缓存目录');
      }
      
    } catch (error) {
      console.log('  ⚠️ 缓存清理失败:', error.message);
    }
  }

  async cleanLogs() {
    console.log('\n📝 清理日志文件...');
    
    const logPatterns = [
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      'lerna-debug.log*'
    ];

    let cleanedCount = 0;

    try {
      const files = await fs.readdir('.');
      
      for (const file of files) {
        const isLogFile = logPatterns.some(pattern => {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(file);
        });
        
        if (isLogFile) {
          try {
            const stat = await fs.stat(file);
            await fs.unlink(file);
            this.deletedFiles.push(file);
            this.totalSizeCleaned += stat.size;
            cleanedCount++;
          } catch (error) {
            // 忽略删除失败的文件
          }
        }
      }
      
      console.log(`  ✅ 清理了 ${cleanedCount} 个日志文件`);
      
    } catch (error) {
      console.log('  ⚠️ 日志文件清理失败:', error.message);
    }
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('🧹 清理总结');
    console.log('='.repeat(50));
    
    console.log(`清理文件数量: ${this.deletedFiles.length}`);
    console.log(`释放空间大小: ${this.formatFileSize(this.totalSizeCleaned)}`);
    
    if (this.deletedFiles.length > 0) {
      console.log('\n清理的文件列表:');
      this.deletedFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
    console.log('\n✅ 项目清理完成！');
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  const cleaner = new ProjectCleaner();
  cleaner.cleanAll().catch(console.error);
}

export { ProjectCleaner };
