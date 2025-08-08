#!/usr/bin/env node

/**
 * 阿里云百炼分析器测试脚本
 * 
 * 测试阿里云百炼大模型服务平台的代码审查功能
 * 包括配置验证、连接测试和分析能力测试
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import { AliyunBailianAnalyzer } from './aliyun-bailian-analyzer.js';
import fs from 'fs/promises';

// 简单的配置加载，避免循环依赖
async function loadConfig() {
  try {
    const configContent = await fs.readFile('./config.json', 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('配置加载失败:', error.message);
    throw error;
  }
}

/**
 * 测试配置
 */
const TEST_CONFIG = {
  // 模拟MR信息
  mockMR: {
    title: '优化用户登录模块',
    description: '改进登录验证逻辑，增加错误处理，提升用户体验'
  },
  
  // 模拟代码差异
  mockDiff: [
    {
      new_path: 'src/auth/login.js',
      old_path: 'src/auth/login.js',
      diff: `@@ -15,8 +15,12 @@ export class LoginService {
   async validateUser(username, password) {
+    // 输入验证
+    if (!username || !password) {
+      throw new Error('用户名和密码不能为空');
+    }
+    
     try {
-      const user = await this.userRepository.findByUsername(username);
+      const user = await this.userRepository.findByUsername(username.trim());
       
-      if (user && user.password === password) {
+      if (user && await this.comparePassword(password, user.hashedPassword)) {
         return { success: true, user };
       }
     } catch (error) {
-      console.log('登录失败:', error);
+      this.logger.error('登录验证失败:', error);
       return { success: false, error: '登录失败' };
     }
   }`
    }
  ]
};

class AliyunBailianTester {
  constructor() {
    this.results = {
      configTest: null,
      connectionTest: null,
      analysisTest: null
    };
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🚀 开始阿里云百炼分析器测试...\n');

    try {
      // 1. 配置测试
      await this.testConfiguration();
      
      // 2. 连接测试
      await this.testConnection();
      
      // 3. 分析功能测试
      await this.testAnalysisCapability();
      
      // 4. 生成测试报告
      await this.generateTestReport();
      
    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 测试配置加载
   */
  async testConfiguration() {
    console.log('📋 1. 配置测试');
    
    try {
      const config = await loadConfig();
      const analyzer = new AliyunBailianAnalyzer(config);
      const configInfo = analyzer.getConfigInfo();
      
      this.results.configTest = {
        success: true,
        configured: configInfo.configured,
        model: configInfo.model,
        baseUrl: configInfo.base_url,
        message: configInfo.configured ? '配置完整' : '配置不完整，请检查API密钥和工作空间ID'
      };
      
      console.log(`   ✅ 配置状态: ${configInfo.configured ? '已配置' : '未配置'}`);
      console.log(`   📦 模型: ${configInfo.model}`);
      console.log(`   🌐 服务地址: ${configInfo.base_url}\n`);
      
    } catch (error) {
      this.results.configTest = {
        success: false,
        error: error.message
      };
      console.log(`   ❌ 配置测试失败: ${error.message}\n`);
    }
  }

  /**
   * 测试连接
   */
  async testConnection() {
    console.log('🔌 2. 连接测试');
    
    try {
      const config = await loadConfig();
      const analyzer = new AliyunBailianAnalyzer(config);
      
      if (!analyzer.isAvailable()) {
        this.results.connectionTest = {
          success: false,
          message: '分析器不可用，请检查配置'
        };
        console.log('   ⚠️ 分析器不可用，跳过连接测试\n');
        return;
      }
      
      const connectionResult = await analyzer.testConnection();
      this.results.connectionTest = connectionResult;
      
      if (connectionResult.success) {
        console.log('   ✅ 连接成功');
        console.log(`   🤖 模型: ${connectionResult.model}\n`);
      } else {
        console.log(`   ❌ 连接失败: ${connectionResult.message}\n`);
      }
      
    } catch (error) {
      this.results.connectionTest = {
        success: false,
        error: error.message
      };
      console.log(`   ❌ 连接测试异常: ${error.message}\n`);
    }
  }

  /**
   * 测试分析能力
   */
  async testAnalysisCapability() {
    console.log('🧠 3. 分析能力测试');
    
    try {
      const config = await loadConfig();
      const analyzer = new AliyunBailianAnalyzer(config);
      
      if (!analyzer.isAvailable()) {
        this.results.analysisTest = {
          success: false,
          message: '分析器不可用'
        };
        console.log('   ⚠️ 分析器不可用，跳过分析测试\n');
        return;
      }
      
      console.log('   📊 开始分析模拟代码变更...');
      const startTime = Date.now();
      
      const analysisResult = await analyzer.analyzeCodeChanges(
        TEST_CONFIG.mockDiff, 
        TEST_CONFIG.mockMR
      );
      
      const duration = Date.now() - startTime;
      
      this.results.analysisTest = {
        success: true,
        duration: duration,
        result: analysisResult,
        summary: this.summarizeAnalysisResult(analysisResult)
      };
      
      console.log(`   ✅ 分析完成 (耗时: ${duration}ms)`);
      console.log(`   📈 评分: ${analysisResult.analysis?.score || 'N/A'}/10`);
      console.log(`   ⚡ 风险等级: ${analysisResult.analysis?.risk_level || 'N/A'}`);
      console.log(`   🔍 发现问题: ${analysisResult.analysis?.issues?.length || 0} 个`);
      console.log(`   💡 改进建议: ${analysisResult.analysis?.suggestions?.length || 0} 条\n`);
      
    } catch (error) {
      this.results.analysisTest = {
        success: false,
        error: error.message
      };
      console.log(`   ❌ 分析测试失败: ${error.message}\n`);
    }
  }

  /**
   * 总结分析结果
   */
  summarizeAnalysisResult(result) {
    if (!result || !result.analysis) {
      return '无分析结果';
    }
    
    const analysis = result.analysis;
    return {
      score: analysis.score || 0,
      risk_level: analysis.risk_level || 'unknown',
      issues_count: analysis.issues?.length || 0,
      suggestions_count: analysis.suggestions?.length || 0,
      has_security_notes: (analysis.security_notes?.length || 0) > 0
    };
  }

  /**
   * 生成测试报告
   */
  async generateTestReport() {
    console.log('📝 4. 生成测试报告');
    
    const report = {
      timestamp: new Date().toISOString(),
      test_summary: {
        total_tests: 3,
        passed: Object.values(this.results).filter(r => r?.success).length,
        failed: Object.values(this.results).filter(r => r?.success === false).length
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };
    
    try {
      const reportPath = `./reports/aliyun_bailian_test_${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`   ✅ 测试报告已保存: ${reportPath}`);
      console.log('\n📊 测试总结:');
      console.log(`   ✅ 通过: ${report.test_summary.passed}/3`);
      console.log(`   ❌ 失败: ${report.test_summary.failed}/3`);
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 建议:');
        report.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ 报告保存失败: ${error.message}`);
    }
  }

  /**
   * 生成改进建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (!this.results.configTest?.success) {
      recommendations.push('请检查阿里云百炼配置，确保API密钥和工作空间ID正确设置');
    }
    
    if (!this.results.connectionTest?.success) {
      recommendations.push('请验证网络连接和API访问权限');
    }
    
    if (!this.results.analysisTest?.success) {
      recommendations.push('请检查分析器实现和API调用逻辑');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('所有测试通过，阿里云百炼分析器工作正常');
    }
    
    return recommendations;
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AliyunBailianTester();
  tester.runAllTests().catch(console.error);
}

export { AliyunBailianTester };
