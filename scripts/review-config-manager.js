#!/usr/bin/env node

/**
 * Review Standards Configuration Manager
 * 统一管理和配置代码审查标准的命令行工具
 * 
 * 支持的操作：
 * - 查看当前配置
 * - 更新配置项
 * - 切换语言标准
 * - 管理团队规则
 * - 验证配置
 * - 导入/导出配置
 */

import ReviewStandardsManager from '../src/utils/review-standards-manager.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ReviewConfigManager {
  constructor() {
    this.standardsManager = new ReviewStandardsManager();
    this.commands = {
      'show': this.showConfig.bind(this),
      'update': this.updateConfig.bind(this),
      'language': this.manageLanguage.bind(this),
      'rules': this.manageRules.bind(this),
      'validate': this.validateConfig.bind(this),
      'export': this.exportConfig.bind(this),
      'import': this.importConfig.bind(this),
      'reset': this.resetConfig.bind(this),
      'help': this.showHelp.bind(this)
    };
  }

  /**
   * 主入口方法
   */
  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const subCommand = args[1];
    const options = args.slice(2);

    console.log('🔧 Review Standards Configuration Manager')
    console.log('='*50);

    if (!this.commands[command]) {
      console.error(`❌ 未知命令: ${command}`);
      this.showHelp();
      return;
    }

    try {
      await this.commands[command](subCommand, options);
    } catch (error) {
      console.error(`❌ 执行失败: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * 显示当前配置
   */
  async showConfig(section = null) {
    console.log('📋 当前Review标准配置:\n');

    if (section) {
      switch (section) {
        case 'global':
          this.showGlobalStandards();
          break;
        case 'languages':
          this.showLanguageStandards();
          break;
        case 'projects':
          this.showProjectStandards();
          break;
        case 'ai':
          this.showAIConfig();
          break;
        case 'team':
          this.showTeamCustomization();
          break;
        default:
          console.error(`❌ 未知配置段: ${section}`);
          break;
      }
    } else {
      this.showOverview();
    }
  }

  /**
   * 显示配置概览
   */
  showOverview() {
    const standards = this.standardsManager.standards;
    const global = standards.global_review_standards;
    const languages = standards.language_specific_standards;
    const projects = standards.project_type_standards;
    const aiProviders = standards.ai_provider_specific_config;

    console.log('🌍 全局标准:');
    console.log(`  版本: ${global.version || 'N/A'}`);
    console.log(`  最后更新: ${global.last_updated || 'N/A'}`);
    console.log(`  分析重点领域: ${Object.keys(global.analysis_focus_areas || {}).length}个`);

    console.log('\n🔤 支持的编程语言:');
    Object.keys(languages || {}).forEach(lang => {
      const langConfig = languages[lang];
      console.log(`  - ${lang}: ${langConfig.enabled ? '✅' : '❌'}`);
    });

    console.log('\n📁 支持的项目类型:');
    Object.keys(projects || {}).forEach(type => {
      const projectConfig = projects[type];
      console.log(`  - ${type}: ${projectConfig.enabled ? '✅' : '❌'}`);
    });

    console.log('\n🤖 AI提供商配置:');
    Object.keys(aiProviders || {}).forEach(provider => {
      console.log(`  - ${provider}: 已配置`);
    });

    const report = this.standardsManager.generateDiagnosticReport();
    console.log(`\n📊 配置状态: ${report.config_status}`);
    if (report.warnings.length > 0) {
      console.log('⚠️ 警告:');
      report.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
  }

  /**
   * 显示全局标准
   */
  showGlobalStandards() {
    const global = this.standardsManager.standards.global_review_standards;
    
    console.log('🌍 全局Review标准:');
    console.log(`描述: ${global.description}`);
    console.log(`版本: ${global.version}`);
    console.log(`最后更新: ${global.last_updated}\n`);

    console.log('📋 分析重点领域:');
    Object.entries(global.analysis_focus_areas).forEach(([area, config]) => {
      console.log(`\n  ${area}:`);
      console.log(`    启用: ${config.enabled ? '✅' : '❌'}`);
      console.log(`    权重: ${config.weight}%`);
      console.log(`    检查项目:`);
      config.items.forEach(item => console.log(`      - ${item}`));
    });
  }

  /**
   * 显示语言标准
   */
  showLanguageStandards() {
    const languages = this.standardsManager.standards.language_specific_standards;
    
    console.log('🔤 编程语言特定标准:\n');
    Object.entries(languages).forEach(([lang, config]) => {
      console.log(`${lang}:`);
      console.log(`  启用: ${config.enabled ? '✅' : '❌'}`);
      console.log(`  继承: ${config.extends}`);
      if (config.specific_checks) {
        console.log(`  特定检查:`);
        Object.entries(config.specific_checks).forEach(([check, desc]) => {
          console.log(`    - ${check}: ${desc}`);
        });
      }
      console.log('');
    });
  }

  /**
   * 更新配置
   */
  async updateConfig(section, options) {
    if (!section) {
      console.error('❌ 请指定要更新的配置段');
      return;
    }

    console.log(`🔧 更新配置段: ${section}`);

    switch (section) {
      case 'global':
        await this.updateGlobalConfig(options);
        break;
      case 'language':
        await this.updateLanguageConfig(options);
        break;
      case 'project':
        await this.updateProjectConfig(options);
        break;
      case 'ai':
        await this.updateAIConfig(options);
        break;
      default:
        console.error(`❌ 不支持更新的配置段: ${section}`);
        break;
    }
  }

  /**
   * 管理语言配置
   */
  async manageLanguage(action, options) {
    const languages = this.standardsManager.standards.language_specific_standards;

    switch (action) {
      case 'list':
        this.showLanguageStandards();
        break;
      
      case 'enable':
        if (!options[0]) {
          console.error('❌ 请指定要启用的语言');
          return;
        }
        await this.toggleLanguage(options[0], true);
        break;
      
      case 'disable':
        if (!options[0]) {
          console.error('❌ 请指定要禁用的语言');
          return;
        }
        await this.toggleLanguage(options[0], false);
        break;
      
      case 'add':
        if (!options[0]) {
          console.error('❌ 请指定要添加的语言名称');
          return;
        }
        await this.addLanguage(options[0]);
        break;
      
      default:
        console.log('📖 语言管理命令:');
        console.log('  list    - 显示所有语言配置');
        console.log('  enable  - 启用指定语言');
        console.log('  disable - 禁用指定语言');
        console.log('  add     - 添加新语言配置');
        break;
    }
  }

  /**
   * 切换语言启用状态
   */
  async toggleLanguage(language, enabled) {
    const standards = this.standardsManager.standards;
    const langKey = this.standardsManager.normalizeLanguageKey(language);

    if (!standards.language_specific_standards[langKey]) {
      console.error(`❌ 未找到语言配置: ${language}`);
      return;
    }

    standards.language_specific_standards[langKey].enabled = enabled;
    this.standardsManager.updateStandards(standards);
    
    console.log(`✅ ${language} 已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 管理团队规则
   */
  async manageRules(action, options) {
    const teamCustomization = this.standardsManager.getTeamCustomization();

    switch (action) {
      case 'list':
        this.showTeamRules(teamCustomization);
        break;
      
      case 'add':
        await this.addTeamRule(options);
        break;
      
      case 'remove':
        await this.removeTeamRule(options[0]);
        break;
      
      case 'edit':
        await this.editTeamRule(options[0]);
        break;
      
      default:
        console.log('📖 团队规则管理命令:');
        console.log('  list   - 显示所有团队规则');
        console.log('  add    - 添加新规则');
        console.log('  remove - 删除规则');
        console.log('  edit   - 编辑规则');
        break;
    }
  }

  /**
   * 显示团队规则
   */
  showTeamRules(teamCustomization) {
    console.log('👥 团队自定义规则:\n');
    
    if (teamCustomization.custom_rules && teamCustomization.custom_rules.rules) {
      teamCustomization.custom_rules.rules.forEach((rule, index) => {
        console.log(`${index + 1}. ${rule.name}`);
        console.log(`   模式: ${rule.pattern}`);
        console.log(`   严重程度: ${rule.severity}`);
        console.log(`   消息: ${rule.message}`);
        console.log('');
      });
    } else {
      console.log('暂无自定义规则');
    }

    console.log('🚫 排除模式:');
    if (teamCustomization.exclusion_patterns) {
      teamCustomization.exclusion_patterns.forEach(pattern => {
        console.log(`  - ${pattern}`);
      });
    }
  }

  /**
   * 验证配置
   */
  async validateConfig() {
    console.log('🔍 验证Review标准配置...\n');
    
    const isValid = this.standardsManager.validateConfig();
    const report = this.standardsManager.generateDiagnosticReport();
    
    console.log('📊 诊断报告:');
    console.log(`配置状态: ${report.config_status}`);
    console.log(`支持语言数: ${report.statistics.supported_languages}`);
    console.log(`项目类型数: ${report.statistics.supported_project_types}`);
    console.log(`AI提供商数: ${report.statistics.ai_providers}`);
    console.log(`自定义规则数: ${report.statistics.custom_rules}`);

    if (report.warnings.length > 0) {
      console.log('\n⚠️ 警告:');
      report.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (report.suggestions.length > 0) {
      console.log('\n💡 建议:');
      report.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    }

    console.log(`\n${isValid ? '✅' : '❌'} 配置${isValid ? '有效' : '无效'}`);
  }

  /**
   * 导出配置
   */
  async exportConfig(format = 'json', options = []) {
    const outputFile = options[0] || `review-standards-export-${Date.now()}.json`;
    
    try {
      const config = this.standardsManager.standards;
      writeFileSync(outputFile, JSON.stringify(config, null, 2));
      console.log(`✅ 配置已导出到: ${outputFile}`);
    } catch (error) {
      console.error(`❌ 导出失败: ${error.message}`);
    }
  }

  /**
   * 导入配置
   */
  async importConfig(filePath) {
    if (!filePath) {
      console.error('❌ 请指定要导入的配置文件路径');
      return;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const importedConfig = JSON.parse(content);
      
      console.log('🔍 验证导入的配置...');
      
      // 简单验证
      const requiredSections = ['global_review_standards', 'language_specific_standards'];
      for (const section of requiredSections) {
        if (!importedConfig[section]) {
          throw new Error(`导入的配置缺少必要段: ${section}`);
        }
      }
      
      this.standardsManager.updateStandards(importedConfig);
      console.log('✅ 配置导入成功');
      
    } catch (error) {
      console.error(`❌ 导入失败: ${error.message}`);
    }
  }

  /**
   * 重置配置到默认值
   */
  async resetConfig() {
    console.log('⚠️ 这将重置所有Review标准配置到默认值');
    console.log('请确认是否继续 (y/N):');
    
    // 在实际应用中，这里应该有用户输入确认
    // 为了演示，我们直接提示
    console.log('❌ 重置操作已取消（需要用户确认）');
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
📖 Review Standards Configuration Manager 使用指南

用法: node review-config-manager.js <command> [options]

命令:
  show [section]           显示配置信息
    - global              显示全局标准
    - languages           显示语言标准
    - projects            显示项目类型标准
    - ai                  显示AI配置
    - team                显示团队自定义

  update <section>         更新配置
    - global              更新全局配置
    - language            更新语言配置
    - project             更新项目配置
    - ai                  更新AI配置

  language <action>        管理语言配置
    - list                列出所有语言
    - enable <lang>       启用指定语言
    - disable <lang>      禁用指定语言
    - add <lang>          添加新语言

  rules <action>           管理团队规则
    - list                显示所有规则
    - add                 添加新规则
    - remove <name>       删除规则
    - edit <name>         编辑规则

  validate                 验证配置有效性
  export [file]            导出配置到文件
  import <file>            从文件导入配置
  reset                    重置配置到默认值
  help                     显示此帮助信息

示例:
  node review-config-manager.js show global
  node review-config-manager.js language enable typescript
  node review-config-manager.js rules list
  node review-config-manager.js validate
  node review-config-manager.js export my-config.json
`);
  }
}

// 主程序
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new ReviewConfigManager();
  manager.run().catch(error => {
    console.error('❌ 程序执行失败:', error.message);
    process.exit(1);
  });
}

export default ReviewConfigManager;
