/**
 * Review Standards Manager
 * 统一管理所有review相关的配置和规范
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ReviewStandardsManager {
  constructor() {
    // 从当前工作目录查找配置文件
    this.configDir = process.cwd() + '/config';
    this.standardsConfigPath = this.configDir + '/review-standards-config.json';
    this.mainConfigPath = this.configDir + '/config.json';
    this.flutterConfigPath = this.configDir + '/flutter-review-config.json';
    
    this.loadStandards();
  }
  
  /**
   * 加载review标准配置
   */
  loadStandards() {
    try {
      if (existsSync(this.standardsConfigPath)) {
        const content = readFileSync(this.standardsConfigPath, 'utf-8');
        this.standards = JSON.parse(content);
      } else {
        throw new Error('Review standards config file not found');
      }
    } catch (error) {
      console.error('❌ 加载review标准配置失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 获取指定语言的review标准
   * @param {string} language - 编程语言
   * @returns {Object} 语言特定的review标准
   */
  getLanguageStandards(language) {
    const langKey = this.normalizeLanguageKey(language);
    const globalStandards = this.standards.global_review_standards;
    const languageSpecific = this.standards.language_specific_standards[langKey];
    
    if (!languageSpecific) {
      console.log(`⚠️ 未找到${language}的特定标准，使用全局标准`);
      return globalStandards;
    }
    
    // 合并全局标准和语言特定标准
    return this.mergeStandards(globalStandards, languageSpecific);
  }
  
  /**
   * 获取项目类型的review标准
   * @param {string} projectType - 项目类型
   * @returns {Object} 项目特定的review标准
   */
  getProjectTypeStandards(projectType) {
    const projectStandards = this.standards.project_type_standards[projectType];
    const globalStandards = this.standards.global_review_standards;
    
    if (!projectStandards) {
      console.log(`⚠️ 未找到${projectType}的特定标准，使用全局标准`);
      return globalStandards;
    }
    
    return {
      ...globalStandards,
      project_focus: projectStandards.focus_areas
    };
  }
  
  /**
   * 获取系统提示词
   * @param {string} language - 编程语言
   * @param {string} projectType - 项目类型
   * @returns {string} 完整的系统提示词
   */
  getSystemPrompt(language = null, projectType = null) {
    const globalPrompts = this.standards.global_review_standards.system_prompts;
    const analysisAreas = this.standards.global_review_standards.analysis_focus_areas;
    const outputFormat = this.standards.global_review_standards.output_format_requirements;
    
    let systemPrompt = globalPrompts.base_system_prompt + '\n\n';
    
    // 添加角色定义
    systemPrompt += '🎯 **核心职责：**\n';
    globalPrompts.role_definition.responsibilities.forEach(resp => {
      systemPrompt += `- ${resp}\n`;
    });
    
    systemPrompt += '\n💡 **分析原则：**\n';
    globalPrompts.analysis_principles.forEach(principle => {
      systemPrompt += `- ${principle}\n`;
    });
    
    // 添加分析重点
    systemPrompt += '\n📋 **分析重点领域：**\n';
    Object.entries(analysisAreas).forEach(([area, config]) => {
      if (config.enabled) {
        systemPrompt += `\n**${this.translateAreaName(area)}** (权重: ${config.weight}%):\n`;
        config.items.forEach(item => {
          systemPrompt += `- ${item}\n`;
        });
      }
    });
    
    // 添加语言特定要求
    if (language) {
      const langStandards = this.getLanguageStandards(language);
      if (langStandards.specific_checks) {
        systemPrompt += `\n🔍 **${language}特定检查项：**\n`;
        Object.entries(langStandards.specific_checks).forEach(([check, desc]) => {
          systemPrompt += `- ${desc}\n`;
        });
      }
    }
    
    // 添加项目类型要求
    if (projectType) {
      const projectStandards = this.getProjectTypeStandards(projectType);
      if (projectStandards.project_focus) {
        systemPrompt += `\n🎯 **${projectType}项目重点关注：**\n`;
        projectStandards.project_focus.forEach(focus => {
          systemPrompt += `- ${focus}\n`;
        });
      }
    }
    
    // 添加输出格式要求
    systemPrompt += '\n📤 **输出要求：**\n';
    systemPrompt += `- 使用${outputFormat.language === 'chinese' ? '中文' : '英文'}回复\n`;
    systemPrompt += `- 采用${outputFormat.style}的风格\n`;
    systemPrompt += `- 每个类别最多提供${outputFormat.max_suggestions_per_category}条建议\n`;
    if (outputFormat.include_examples) {
      systemPrompt += '- 提供具体的代码示例和修改建议\n';
    }
    
    // 添加质量评分标准
    systemPrompt += '\n⭐ **质量评分标准 (1-10分)：**\n';
    Object.entries(outputFormat.quality_scoring.criteria).forEach(([score, desc]) => {
      systemPrompt += `- ${score}分: ${desc}\n`;
    });
    
    systemPrompt += '\n请用专业、简洁的中文回复，避免冗长的理论阐述，专注于实际可执行的建议。';
    
    return systemPrompt;
  }
  
  /**
   * 获取AI提供商特定配置
   * @param {string} provider - AI提供商名称
   * @returns {Object} 提供商特定配置
   */
  getAIProviderConfig(provider) {
    return this.standards.ai_provider_specific_config[provider] || {};
  }
  
  /**
   * 获取严重程度分类配置
   * @returns {Object} 严重程度配置
   */
  getSeverityClassification() {
    return this.standards.severity_classification;
  }
  
  /**
   * 获取团队自定义规则
   * @returns {Object} 团队自定义配置
   */
  getTeamCustomization() {
    return this.standards.team_customization;
  }
  
  /**
   * 更新review标准配置
   * @param {Object} updates - 要更新的配置
   */
  updateStandards(updates) {
    this.standards = { ...this.standards, ...updates };
    this.saveStandards();
  }
  
  /**
   * 保存review标准配置
   */
  saveStandards() {
    try {
      writeFileSync(this.standardsConfigPath, JSON.stringify(this.standards, null, 2), 'utf-8');
      console.log('✅ Review标准配置已保存');
    } catch (error) {
      console.error('❌ 保存review标准配置失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 生成配置诊断报告
   * @returns {Object} 诊断报告
   */
  generateDiagnosticReport() {
    const report = {
      config_status: 'OK',
      warnings: [],
      suggestions: [],
      statistics: {}
    };
    
    // 检查配置完整性
    const requiredSections = [
      'global_review_standards',
      'language_specific_standards', 
      'ai_provider_specific_config'
    ];
    
    requiredSections.forEach(section => {
      if (!this.standards[section]) {
        report.warnings.push(`缺少必要配置段: ${section}`);
        report.config_status = 'WARNING';
      }
    });
    
    // 统计信息
    report.statistics = {
      supported_languages: Object.keys(this.standards.language_specific_standards || {}).length,
      supported_project_types: Object.keys(this.standards.project_type_standards || {}).length,
      ai_providers: Object.keys(this.standards.ai_provider_specific_config || {}).length,
      custom_rules: (this.standards.team_customization?.custom_rules?.rules || []).length
    };
    
    // 生成建议
    if (report.statistics.supported_languages < 3) {
      report.suggestions.push('建议添加更多编程语言的支持');
    }
    
    if (report.statistics.custom_rules === 0) {
      report.suggestions.push('建议根据团队需求添加自定义规则');
    }
    
    return report;
  }
  
  /**
   * 合并标准配置
   * @private
   */
  mergeStandards(global, specific) {
    return {
      ...global,
      ...specific,
      analysis_focus_areas: {
        ...global.analysis_focus_areas,
        ...(specific.analysis_focus_areas || {})
      }
    };
  }
  
  /**
   * 标准化语言键
   * @private
   */
  normalizeLanguageKey(language) {
    const languageMap = {
      'javascript': 'javascript_typescript',
      'typescript': 'javascript_typescript',
      'js': 'javascript_typescript',
      'ts': 'javascript_typescript',
      'dart': 'flutter_dart',
      'flutter': 'flutter_dart',
      'py': 'python',
      'java': 'java'
    };
    
    return languageMap[language.toLowerCase()] || language.toLowerCase();
  }
  
  /**
   * 翻译分析领域名称
   * @private
   */
  translateAreaName(area) {
    const translations = {
      'code_quality': '代码质量',
      'potential_bugs': '潜在Bug',
      'security_vulnerabilities': '安全漏洞',
      'performance_optimization': '性能优化',
      'maintainability': '可维护性',
      'architecture_design': '架构设计'
    };
    
    return translations[area] || area;
  }
  
  /**
   * 验证配置格式
   * @returns {boolean} 配置是否有效
   */
  validateConfig() {
    try {
      // 基本结构验证
      const requiredSections = [
        'global_review_standards',
        'language_specific_standards',
        'ai_provider_specific_config'
      ];
      
      for (const section of requiredSections) {
        if (!this.standards[section]) {
          console.error(`❌ 缺少必要配置段: ${section}`);
          return false;
        }
      }
      
      // 验证全局标准
      const globalStandards = this.standards.global_review_standards;
      if (!globalStandards.system_prompts || !globalStandards.analysis_focus_areas) {
        console.error('❌ 全局标准配置不完整');
        return false;
      }
      
      console.log('✅ Review标准配置验证通过');
      return true;
    } catch (error) {
      console.error('❌ 配置验证失败:', error.message);
      return false;
    }
  }
}

export default ReviewStandardsManager;
