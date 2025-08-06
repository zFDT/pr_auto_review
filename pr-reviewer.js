#!/usr/bin/env node

/**
 * PR自动化评审工具
 * 
 * 主要功能：
 * - 自动获取GitLab MR信息
 * - 分析代码变更和评论
 * - 生成结构化评审报告
 * - 支持AI智能分析（OpenAI、Copilot）
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import { Gitlab } from "@gitbeaker/rest";
import OpenAI from 'openai';
import { AutoCopilotAnalyzer } from './auto-copilot-analyzer.js';
import { configLoader } from './config-loader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// 获取脚本所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保fetch可用（Node.js 18+内置，旧版本需要polyfill）
if (typeof fetch === 'undefined') {
  global.fetch = (await import('node-fetch')).default;
}

/**
 * 加载配置文件
 * 使用安全的配置加载器，支持环境变量替换
 * 
 * @returns {Promise<Object>} 配置对象
 */
async function loadConfig() {
  try {
    return await configLoader.loadConfig();
  } catch (error) {
    console.error('❌ 配置加载失败:', error.message);
    console.error('💡 请检查 config.json 文件和环境变量配置');
    console.error('💡 参考 .env.example 文件设置环境变量');
    process.exit(1);
  }
}

/**
 * AI分析器类
 * 负责调用不同的AI服务进行代码分析
 */
class AIAnalyzer {
  constructor(config) {
    this.config = config;
    this.openai = null;
    this.autoCopilotAnalyzer = null;
    
    if (config.review_settings.enable_ai_analysis) {
      this.setupAI();
    }
  }

  /**
   * 初始化AI服务
   * 根据配置选择AI提供商（移除已弃用的copilot选项）
   */
  setupAI() {
    const aiConfig = this.config.ai_config;
    const provider = this.config.review_settings.ai_provider;
    
    if (provider === 'openai') {
      // 支持环境变量或配置文件中的API密钥
      const apiKey = process.env.OPENAI_API_KEY || aiConfig.openai?.api_key;
      if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY') {
        console.warn('⚠️ 未配置OpenAI API密钥，AI分析将被跳过');
        this.config.review_settings.enable_ai_analysis = false;
        return;
      }
      
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: aiConfig.openai.base_url
      });
    } else if (provider === 'auto-copilot') {
      this.autoCopilotAnalyzer = new AutoCopilotAnalyzer(this.config);
    }
  }

  /**
   * 分析代码变更
   * 根据配置的AI提供商进行智能分析
   * 
   * @param {Array} diff - 代码差异数组
   * @param {Object} mrDetails - MR详细信息
   * @returns {Promise<Object|null>} 分析结果
   */
  async analyzeCodeChanges(diff, mrDetails) {
    if (!this.config.review_settings.enable_ai_analysis) {
      return null;
    }

    try {
      const provider = this.config.review_settings.ai_provider;
      
      if (provider === 'auto-copilot') {
        return await this.autoCopilotAnalyzer.analyzeCodeChanges(diff, mrDetails);
      } else if (provider === 'openai') {
        const prompt = this.createAnalysisPrompt(diff, mrDetails);
        const analysis = await this.callAI(prompt);
        return this.parseAIResponse(analysis);
      }
    } catch (error) {
      console.warn('AI分析失败:', error.message);
      return null;
    }
  }

  /**
   * 创建AI分析提示词
   * 格式化代码差异和MR信息为AI可理解的格式
   * 
   * @param {Array} diff - 代码差异数组
   * @param {Object} mrDetails - MR详细信息
   * @returns {string} 格式化的提示词
   */
  createAnalysisPrompt(diff, mrDetails) {
    const diffText = diff.map(file => {
      return `文件: ${file.new_path}\n${file.diff}`;
    }).join('\n\n');

    return `请作为一个高级代码审查员分析以下Merge Request：

标题: ${mrDetails.title}
描述: ${mrDetails.description || '无描述'}

代码变更:
${diffText}

请提供以下分析:
1. 代码质量评估 (1-10分)
2. 潜在的bug或问题
3. 性能影响分析
4. 安全性考虑
5. 可维护性评估
6. 测试建议
7. 改进建议

请以JSON格式返回，结构如下:
{
  "quality_score": 数字,
  "potential_bugs": ["问题1", "问题2"],
  "performance_impact": "性能影响描述",
  "security_concerns": ["安全问题1", "安全问题2"],
  "maintainability": "可维护性评估",
  "testing_suggestions": ["测试建议1", "测试建议2"],
  "improvement_suggestions": ["改进建议1", "改进建议2"],
  "summary": "总体评估摘要"
}`;
  }

  /**
   * 调用OpenAI API进行分析
   * 
   * @param {string} prompt - 分析提示词
   * @returns {Promise<Object>} 分析结果
   */
  async callAI(prompt) {
    if (this.config.review_settings.ai_provider === 'openai') {
      const response = await this.openai.chat.completions.create({
        model: this.config.ai_config.openai.model,
        messages: [
          {
            role: "system",
            content: "你是一个专业的代码审查员，具有丰富的软件开发和代码质量评估经验。请提供详细、准确、有用的代码审查意见。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });
      return response.choices[0].message.content;
    }
    throw new Error('不支持的AI提供商');
  }

  parseAIResponse(response) {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果无法解析JSON，返回原始响应
      return {
        quality_score: null,
        potential_bugs: [],
        performance_impact: "",
        security_concerns: [],
        maintainability: "",
        testing_suggestions: [],
        improvement_suggestions: [],
        summary: response
      };
    } catch (error) {
      console.warn('解析AI响应失败:', error.message);
      return {
        quality_score: null,
        potential_bugs: [],
        performance_impact: "",
        security_concerns: [],
        maintainability: "",
        testing_suggestions: [],
        improvement_suggestions: [],
        summary: response
      };
    }
  }
}

class PRReviewer {
  constructor(config) {
    this.config = config;
    this.api = new Gitlab({
      host: config.gitlab.host,
      token: config.gitlab.token
    });
    this.aiAnalyzer = new AIAnalyzer(config);
  }

  /**
   * 根据项目名称获取项目ID
   */
  getProjectId(projectName) {
    const project = this.config.projects[projectName];
    if (!project) {
      throw new Error(`未找到项目 "${projectName}" 的配置。请检查config.json中的projects配置。`);
    }
    return project.id;
  }

  /**
   * 获取MR详细信息
   */
  async getMRDetails(projectId, mrIid) {
    try {
      const mr = await this.api.MergeRequests.show(projectId, mrIid);
      return {
        title: mr.title,
        description: mr.description,
        state: mr.state,
        web_url: mr.web_url,
        target_branch: mr.target_branch,
        source_branch: mr.source_branch,
        merge_status: mr.merge_status,
        detailed_merge_status: mr.detailed_merge_status,
        diff_refs: mr.diff_refs,
        author: mr.author,
        created_at: mr.created_at,
        updated_at: mr.updated_at
      };
    } catch (error) {
      throw new Error(`获取MR详情失败: ${error.message}`);
    }
  }

  /**
   * 获取MR的代码差异
   */
  async getMRDiff(projectId, mrIid) {
    try {
      const diff = await this.api.MergeRequests.allDiffs(projectId, mrIid);
      return diff;
    } catch (error) {
      throw new Error(`获取MR代码差异失败: ${error.message}`);
    }
  }

  /**
   * 获取MR的评论
   */
  async getMRComments(projectId, mrIid) {
    try {
      const discussions = await this.api.MergeRequestDiscussions.all(projectId, mrIid);
      
      const unresolvedNotes = discussions.flatMap(note => note.notes).filter(note => note.resolved === false);
      const discussionNotes = unresolvedNotes.filter(note => note.type === "DiscussionNote").map(note => ({
        id: note.id,
        body: note.body,
        author_name: note.author.name,
        created_at: note.created_at
      }));
      const diffNotes = unresolvedNotes.filter(note => note.type === "DiffNote").map(note => ({
        id: note.id,
        body: note.body,
        author_name: note.author.name,
        position: note.position,
        created_at: note.created_at
      }));
      
      return { discussionNotes, diffNotes };
    } catch (error) {
      throw new Error(`获取MR评论失败: ${error.message}`);
    }
  }

  /**
   * 分析代码变更
   */
  analyzeCodeChanges(diff) {
    const analysis = {
      totalFiles: diff.length,
      addedLines: 0,
      deletedLines: 0,
      modifiedFiles: [],
      newFiles: [],
      deletedFiles: [],
      potentialIssues: []
    };

    diff.forEach(file => {
      // 统计行数变化
      const lines = file.diff.split('\n');
      lines.forEach(line => {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          analysis.addedLines++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          analysis.deletedLines++;
        }
      });

      // 文件状态分类
      if (file.new_file) {
        analysis.newFiles.push(file.new_path);
      } else if (file.deleted_file) {
        analysis.deletedFiles.push(file.old_path);
      } else {
        analysis.modifiedFiles.push(file.new_path);
      }

      // 检测潜在问题
      if (this.config.review_settings.check_console_logs && file.diff.includes('console.log')) {
        analysis.potentialIssues.push(`${file.new_path}: 包含 console.log 语句`);
      }
      if (this.config.review_settings.check_todos && (file.diff.includes('TODO') || file.diff.includes('FIXME'))) {
        analysis.potentialIssues.push(`${file.new_path}: 包含 TODO/FIXME 注释`);
      }
      if (analysis.addedLines > this.config.review_settings.max_lines_warning) {
        analysis.potentialIssues.push(`${file.new_path}: 单个文件新增行数过多 (${analysis.addedLines} 行)`);
      }
    });

    return analysis;
  }

  /**
   * 生成review报告
   */
  generateReviewReport(projectName, mrIid, mrDetails, diff, comments, analysis, aiAnalysis = null) {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    
    // 计算统计信息
    const fileCount = analysis.totalFiles;
    const additionCount = analysis.addedLines;
    const deletionCount = analysis.deletedLines;
    const netChange = additionCount - deletionCount;
    
    let report = `# 📋 PR Review 报告

**生成时间**: ${timestamp}  
**评审工具**: PR Review Automation v1.0  
**项目**: ${projectName}

---

## 📊 基本信息

| 项目 | ${projectName} |
|------|------|
| **MR编号** | #${mrIid} |
| **标题** | ${mrDetails.title} |
| **作者** | ${mrDetails.author.name} |
| **分支** | \`${mrDetails.source_branch}\` → \`${mrDetails.target_branch}\` |
| **状态** | ${mrDetails.state} |
| **合并状态** | ${mrDetails.detailed_merge_status || mrDetails.merge_status || '未知'} |
| **创建时间** | ${new Date(mrDetails.created_at).toLocaleString('zh-CN')} |
| **更新时间** | ${new Date(mrDetails.updated_at).toLocaleString('zh-CN')} |
| **Web链接** | [查看MR](${mrDetails.web_url}) |

## 📈 变更统计

| 指标 | 数量 | 评估 |
|------|------|------|
| **总文件数** | ${fileCount} | ${fileCount > 15 ? '🔴 较多' : fileCount > 10 ? '🟡 中等' : '🟢 合理'} |
| **新增行数** | +${additionCount} | ${additionCount > 1000 ? '🔴 大量' : additionCount > 500 ? '🟡 较多' : '🟢 适中'} |
| **删除行数** | -${deletionCount} | ${deletionCount > 500 ? '🔴 大量' : deletionCount > 100 ? '🟡 较多' : '🟢 适中'} |
| **净变更** | ${netChange > 0 ? '+' : ''}${netChange} | ${Math.abs(netChange) > 1000 ? '🔴 重大变更' : Math.abs(netChange) > 500 ? '🟡 较大变更' : '🟢 正常范围'} |
| **评论数量** | ${comments.length} | ${comments.length > 10 ? '🟡 讨论较多' : comments.length > 0 ? '🟢 有讨论' : '⚪ 无评论'} |

## 📝 PR描述

${mrDetails.description ? mrDetails.description.trim() : '_无描述信息_'}

## 📁 文件变更详情
`;

    if (analysis.newFiles.length > 0) {
      report += `\n### ✨ 新增文件 (${analysis.newFiles.length} 个)\n`;
      analysis.newFiles.forEach(file => report += `- 📄 ${file}\n`);
    }

    if (analysis.modifiedFiles.length > 0) {
      report += `\n### 🔧 修改文件 (${analysis.modifiedFiles.length} 个)\n`;
      analysis.modifiedFiles.forEach(file => report += `- 📝 ${file}\n`);
    }

    if (analysis.deletedFiles.length > 0) {
      report += `\n### 🗑️ 删除文件 (${analysis.deletedFiles.length} 个)\n`;
      analysis.deletedFiles.forEach(file => report += `- ❌ ${file}\n`);
    }

    // 潜在问题分析
    if (analysis.potentialIssues.length > 0) {
      report += `\n## ⚠️ 潜在问题检测\n`;
      analysis.potentialIssues.forEach((issue, index) => {
        report += `${index + 1}. ${issue}\n`;
      });
    } else {
      report += `\n## ✅ 潜在问题检测\n\n未发现明显的潜在问题。\n`;
    }

    // 现有评论
    if (comments.discussionNotes.length > 0 || comments.diffNotes.length > 0) {
      report += `\n## 现有评论\n`;
      
      if (comments.discussionNotes.length > 0) {
        report += `\n### 一般评论 (${comments.discussionNotes.length})\n`;
        comments.discussionNotes.forEach(note => {
          report += `- **${note.author_name}** (${note.created_at}): ${note.body}\n`;
        });
      }

      if (comments.diffNotes.length > 0) {
        report += `\n### 代码评论 (${comments.diffNotes.length})\n`;
        comments.diffNotes.forEach(note => {
          report += `- **${note.author_name}** (${note.created_at}): ${note.body}\n`;
          if (note.position) {
            report += `  位置: ${note.position.new_path}:${note.position.new_line}\n`;
          }
        });
      }
    }

    // AI智能分析
    if (aiAnalysis) {
      report += `\n## 🤖 Flutter专用AI分析\n`;
      
      if (aiAnalysis.quality_score !== null) {
        const scoreColor = aiAnalysis.quality_score >= 8 ? '🟢' : aiAnalysis.quality_score >= 6 ? '🟡' : '🔴';
        report += `\n### 代码质量评分: ${scoreColor} ${aiAnalysis.quality_score}/10\n`;
      }
      
      if (aiAnalysis.summary) {
        report += `\n### 📋 总体评估\n${aiAnalysis.summary}\n`;
      }

      // Flutter专用分析结果
      if (aiAnalysis.flutter_analysis) {
        const fa = aiAnalysis.flutter_analysis;
        
        report += `\n### 🏗️ 代码质量与结构\n`;
        if (fa.code_quality_and_structure) {
          Object.entries(fa.code_quality_and_structure).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
        
        report += `\n### 📱 Flutter特定检查\n`;
        if (fa.flutter_specific_checks) {
          Object.entries(fa.flutter_specific_checks).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
        
        report += `\n### ⚡ 性能优化\n`;
        if (fa.performance_optimization) {
          Object.entries(fa.performance_optimization).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
        
        report += `\n### 🎨 UI/UX一致性\n`;
        if (fa.ui_ux_consistency) {
          Object.entries(fa.ui_ux_consistency).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
        
        report += `\n### 🛡️ 错误处理与稳定性\n`;
        if (fa.error_handling_and_stability) {
          Object.entries(fa.error_handling_and_stability).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
        
        report += `\n### 📦 依赖管理\n`;
        if (fa.dependency_management) {
          Object.entries(fa.dependency_management).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
        
        report += `\n### 📏 代码规范\n`;
        if (fa.code_standards) {
          Object.entries(fa.code_standards).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
        
        report += `\n### 🔒 安全性\n`;
        if (fa.security_checks) {
          Object.entries(fa.security_checks).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
        
        report += `\n### 📝 提交质量\n`;
        if (fa.commit_quality) {
          Object.entries(fa.commit_quality).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
        
        report += `\n### 📚 文档更新\n`;
        if (fa.documentation_updates) {
          Object.entries(fa.documentation_updates).forEach(([key, value]) => {
            if (value) report += `- **${key}**: ${value}\n`;
          });
        }
      }
      
      if (aiAnalysis.potential_issues && aiAnalysis.potential_issues.length > 0) {
        report += `\n### 🐛 潜在问题\n`;
        aiAnalysis.potential_issues.forEach(bug => report += `- ${bug}\n`);
      }
      
      if (aiAnalysis.security_concerns && aiAnalysis.security_concerns.length > 0) {
        report += `\n### 🔒 安全性考虑\n`;
        aiAnalysis.security_concerns.forEach(concern => report += `- ${concern}\n`);
      }
      
      if (aiAnalysis.performance_impact) {
        report += `\n### ⚡ 性能影响\n${aiAnalysis.performance_impact}\n`;
      }
      
      if (aiAnalysis.maintainability) {
        report += `\n### 🔧 可维护性\n${aiAnalysis.maintainability}\n`;
      }
      
      if (aiAnalysis.testing_suggestions && aiAnalysis.testing_suggestions.length > 0) {
        report += `\n### 🧪 测试建议\n`;
        aiAnalysis.testing_suggestions.forEach(suggestion => report += `- ${suggestion}\n`);
      }
      
      if (aiAnalysis.improvement_suggestions && aiAnalysis.improvement_suggestions.length > 0) {
        report += `\n### 💡 改进建议\n`;
        aiAnalysis.improvement_suggestions.forEach(suggestion => report += `- ${suggestion}\n`);
      }
    }

    // Review建议
    report += `\n## Review 建议\n`;
    
    if (analysis.addedLines > 1000) {
      report += `- ⚠️ 这是一个较大的PR (${analysis.addedLines}行新增)，建议拆分成更小的PR\n`;
    }
    
    if (analysis.totalFiles > 20) {
      report += `- ⚠️ 修改文件较多 (${analysis.totalFiles}个)，请确保每个文件的修改都是必要的\n`;
    }
    
    if (analysis.potentialIssues.length === 0) {
      report += `- ✅ 未发现明显的代码质量问题\n`;
    }
    
    report += `- 📝 建议详细测试所有修改的功能\n`;
    report += `- 🔍 建议检查是否需要更新相关文档\n`;

    return report;
  }

  /**
   * 保存报告到文件
   */
  async saveReportToFile(report) {
    const outputDir = path.join(__dirname, 'reports');
    
    // 确保reports目录存在
    try {
      await fs.access(outputDir);
    } catch {
      await fs.mkdir(outputDir, { recursive: true });
    }

    // 使用全局变量或者从参数传递
    const mrIidValue = global.currentMrIid || '0'; 
    const fileName = `review_git_${mrIidValue}.txt`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.writeFile(filePath, report, 'utf8');
    return path.resolve(filePath);
  }

  /**
   * 生成飞书卡片格式的数据
   */
  generateFeishuCardData(projectName, mrIid, mrDetails, analysis, aiAnalysis = null) {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    
    // 计算统计信息
    const fileCount = analysis.totalFiles;
    const additionCount = analysis.addedLines;
    const deletionCount = analysis.deletedLines;
    const netChange = additionCount - deletionCount;
    
    // 状态评估
    const getFileCountStatus = (count) => count > 15 ? '🔴 较多' : count > 10 ? '🟡 中等' : '🟢 合理';
    const getAdditionStatus = (count) => count > 1000 ? '🔴 大量' : count > 500 ? '🟡 较多' : '🟢 适中';
    const getDeletionStatus = (count) => count > 500 ? '🔴 大量' : count > 100 ? '🟡 较多' : '🟢 适中';
    const getNetChangeStatus = (net) => Math.abs(net) > 1000 ? '🔴 重大变更' : Math.abs(net) > 500 ? '🟡 较大变更' : '🟢 正常范围';
    
    // AI评分和建议
    let qualityScore = null;
    let qualityColor = '⚪';
    let aiSummary = '';
    let mainIssues = [];
    let mainSuggestions = [];
    
    if (aiAnalysis) {
      qualityScore = aiAnalysis.quality_score;
      if (qualityScore !== null) {
        qualityColor = qualityScore >= 8 ? '🟢' : qualityScore >= 6 ? '🟡' : '🔴';
      }
      aiSummary = aiAnalysis.summary || '';
      
      // 提取主要问题（限制数量）
      if (aiAnalysis.potential_issues && aiAnalysis.potential_issues.length > 0) {
        mainIssues = aiAnalysis.potential_issues.slice(0, 3);
      }
      if (aiAnalysis.improvement_suggestions && aiAnalysis.improvement_suggestions.length > 0) {
        mainSuggestions = aiAnalysis.improvement_suggestions.slice(0, 3);
      }
    }
    
    // 构建飞书交互式卡片
    const cardData = {
      msg_type: "interactive",
      card: {
        config: {
          wide_screen_mode: true,
          enable_forward: true
        },
        header: {
          template: qualityScore >= 8 ? "green" : qualityScore >= 6 ? "yellow" : qualityScore >= 1 ? "red" : "blue",
          title: {
            content: `📋 ${projectName} - PR #${mrIid} 评审完成`,
            tag: "plain_text"
          }
        },
        elements: [
          {
            tag: "div",
            text: {
              content: `**🎯 ${mrDetails.title}**\n👤 **提交者**: ${mrDetails.author.name}\n🌿 **分支**: \`${mrDetails.source_branch}\` → \`${mrDetails.target_branch}\`\n⏰ **时间**: ${timestamp}`,
              tag: "lark_md"
            }
          },
          {
            tag: "hr"
          },
          {
            tag: "div",
            fields: [
              {
                is_short: true,
                text: {
                  content: `**📁 文件数量**\n${fileCount} ${getFileCountStatus(fileCount)}`,
                  tag: "lark_md"
                }
              },
              {
                is_short: true,
                text: {
                  content: `**📊 代码变更**\n+${additionCount}/-${deletionCount} ${getNetChangeStatus(netChange)}`,
                  tag: "lark_md"
                }
              }
            ]
          }
        ]
      }
    };
    
    // 添加AI评分部分
    if (qualityScore !== null) {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**🤖 AI评分**: ${qualityColor} ${qualityScore}/10`,
          tag: "lark_md"
        }
      });
    }
    
    // 添加AI总结
    if (aiSummary) {
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: `**📋 评估总结**\n${aiSummary}`,
          tag: "lark_md"
        }
      });
    }
    
    // 添加问题和建议
    if (mainIssues.length > 0 || analysis.potentialIssues.length > 0) {
      let issuesText = '**⚠️ 主要问题**\n';
      
      // 添加代码检测问题
      if (analysis.potentialIssues.length > 0) {
        analysis.potentialIssues.slice(0, 2).forEach(issue => {
          issuesText += `• ${issue}\n`;
        });
      }
      
      // 添加AI检测问题
      if (mainIssues.length > 0) {
        mainIssues.forEach(issue => {
          issuesText += `• ${issue}\n`;
        });
      }
      
      cardData.card.elements.push({
        tag: "hr"
      });
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: issuesText.trim(),
          tag: "lark_md"
        }
      });
    } else {
      cardData.card.elements.push({
        tag: "hr"
      });
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: "**✅ 代码质量良好**\n未发现明显问题，建议批准合并",
          tag: "lark_md"
        }
      });
    }
    
    // 添加改进建议
    if (mainSuggestions.length > 0) {
      let suggestionsText = '**💡 改进建议**\n';
      mainSuggestions.forEach(suggestion => {
        suggestionsText += `• ${suggestion}\n`;
      });
      
      cardData.card.elements.push({
        tag: "div",
        text: {
          content: suggestionsText.trim(),
          tag: "lark_md"
        }
      });
    }
    
    // 添加操作按钮
    cardData.card.elements.push({
      tag: "hr"
    });
    
    // 生成报告和JSON文件的下载链接
    const ip = this.getLocalIP();
    const reportFileName = `review_git_${mrIid}.txt`;
    const jsonFileName = `feishu_card_${mrIid}.json`;
    const reportDownloadUrl = `http://${ip}:8899/reports/${reportFileName}`;
    const jsonDownloadUrl = `http://${ip}:8899/reports/${jsonFileName}`;
    
    cardData.card.elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: {
            content: "查看 MR",
            tag: "plain_text"
          },
          type: "primary",
          url: mrDetails.web_url
        },
        {
          tag: "button",
          text: {
            content: "📄 下载报告",
            tag: "plain_text"
          },
          type: "default",
          url: reportDownloadUrl
        }
    
      ]
    });
    
    // 添加第二行按钮
    cardData.card.elements.push({
      tag: "action",
      actions: [
      {
        tag: "button",
        text: {
        content: "Jenkins 构建",
        tag: "plain_text"
        },
        type: "default",
        url: `http://jenkins.atomverse.com.cn:8080/job/APP_revicew/${process.env.BUILD_NUMBER || 'latest'}/console`
      },
      {
        tag: "button",
        text: {
        content: "🌐 PR 查看",
        tag: "plain_text"
        },
        type: "default",
        url: mrDetails.web_url
      }
      ]
    });
    
    return cardData;
  }

  /**
   * 保存飞书卡片数据到文件
   */
  async saveFeishuCardData(cardData) {
    const outputDir = path.join(__dirname, 'reports');
    const mrIidValue = global.currentMrIid || '0';
    const fileName = `feishu_card_${mrIidValue}.json`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(cardData, null, 2), 'utf8');
    return path.resolve(filePath);
  }

  /**
   * 获取本机IP地址
   * 
   * @returns {string} 本机IP地址
   */
  getLocalIP() {
    try {
      const ipResult = execSync("ifconfig | grep -E 'inet [0-9]' | grep -v '127.0.0.1' | head -1 | awk '{print $2}'", { encoding: 'utf8' });
      if (ipResult && ipResult.trim()) {
        return ipResult.trim();
      }
    } catch (error) {
      console.warn('⚠️ 获取IP地址失败:', error.message);
      // 如果获取失败，尝试备用方法
      try {
        const ipResult = execSync("hostname -I | awk '{print $1}'", { encoding: 'utf8' });
        if (ipResult && ipResult.trim() && !ipResult.startsWith('127.')) {
          return ipResult.trim();
        }
      } catch (backupError) {
        console.warn('⚠️ 备用IP获取方法也失败:', backupError.message);
      }
    }
    return 'localhost';
  }

  /**
   * 生成文件的HTTP访问URL
   * 
   * @param {string} filePath - 本地文件路径
   * @returns {string} HTTP访问URL
   */
  generateFileURL(filePath) {
    const fileName = path.basename(filePath);
    const ip = this.getLocalIP();
    return `http://${ip}:8899/reports/${fileName}`;
  }

  /**
   * 发送飞书Webhook通知
   */
  async sendFeishuWebhook(cardData) {
    try {
      const feishuConfig = this.config.notification?.feishu;
      
      if (!feishuConfig?.enabled) {
        console.log('📱 飞书通知未启用，跳过发送');
        return false;
      }
      
      const webhookUrl = feishuConfig.webhook_url;
      
      if (!webhookUrl || 
          webhookUrl === '${FEISHU_WEBHOOK_URL}' || 
          webhookUrl === 'undefined' ||
          webhookUrl.includes('${') ||
          webhookUrl === '' ||
          !webhookUrl.startsWith('https://')) {
        console.warn('⚠️ 飞书Webhook URL未配置或无效，跳过发送');
        return false;
      }
      
      console.log('📨 正在发送飞书通知...');
      console.log('🔗 Webhook URL:', webhookUrl.substring(0, 50) + '...' + webhookUrl.slice(-10));
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ 飞书通知发送成功');
        console.log('📊 响应状态:', response.status);
        return true;
      } else {
        console.error('❌ 飞书通知发送失败:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('📄 错误详情:', errorText);
        return false;
      }
      
    } catch (error) {
      console.error('❌ 发送飞书通知时出错:', error.message);
      return false;
    }
  }

  /**
   * 执行完整的PR review流程
   */
  async reviewPR(projectName, mrIid) {
    try {
      // 设置全局变量供其他函数使用
      global.currentMrIid = mrIid;
      
      console.log(`🚀 开始review ${projectName} 的 PR #${mrIid}...`);
      
      // 1. 获取项目ID
      const projectId = this.getProjectId(projectName);
      console.log(`📋 项目ID: ${projectId}`);
      
      // 2. 获取MR详情
      console.log('📥 获取MR详情...');
      const mrDetails = await this.getMRDetails(projectId, mrIid);
      console.log(`📝 标题: ${mrDetails.title}`);
      console.log(`👤 作者: ${mrDetails.author.name}`);
      console.log(`🌿 分支: ${mrDetails.source_branch} → ${mrDetails.target_branch}`);
      
      // 3. 获取代码差异
      console.log('📄 获取代码差异...');
      const diff = await this.getMRDiff(projectId, mrIid);
      console.log(`📁 变更文件数: ${diff.length}`);
      
      // 4. 获取评论
      console.log('💬 获取评论...');
      const comments = await this.getMRComments(projectId, mrIid);
      console.log(`💬 评论数: ${comments.length}`);
      
      // 5. 分析代码变更
      console.log('🔍 分析代码变更...');
      const analysis = this.analyzeCodeChanges(diff);
      
      // 6. AI智能分析
      let aiAnalysis = null;
      if (this.config.review_settings.enable_ai_analysis) {
        console.log('🤖 执行AI智能分析...');
        try {
          aiAnalysis = await this.aiAnalyzer.analyzeCodeChanges(diff, mrDetails);
          if (aiAnalysis) {
            console.log('✅ AI分析完成');
          } else {
            console.log('⚠️ AI分析跳过');
          }
        } catch (aiError) {
          console.warn('⚠️ AI分析失败:', aiError.message);
        }
      }
      
      // 7. 生成报告
      console.log('📊 生成review报告...');
      const report = this.generateReviewReport(projectName, mrIid, mrDetails, diff, comments, analysis, aiAnalysis);
      
      // 8. 生成飞书卡片数据
      console.log('📱 生成飞书卡片数据...');
      const feishuCardData = this.generateFeishuCardData(projectName, mrIid, mrDetails, analysis, aiAnalysis);
      
      // 9. 保存报告和飞书数据
      console.log('💾 保存报告和飞书数据...');
      const filePath = await this.saveReportToFile(report);
      const feishuCardPath = await this.saveFeishuCardData(feishuCardData);
      
      // 10. 发送飞书Webhook通知
      await this.sendFeishuWebhook(feishuCardData);
      
      // 11. 生成HTTP访问URL
      const fileURL = this.generateFileURL(filePath);
      const jsonURL = this.generateFileURL(feishuCardPath);
      
      console.log(`✅ Review完成！报告已保存到: ${filePath}`);
      console.log(`📱 飞书卡片数据已保存到: ${feishuCardPath}`);
      console.log(`🌐 在线访问链接: ${fileURL}`);
      console.log(`📊 JSON数据链接: ${jsonURL}`);
      
      return {
        filePath,
        fileURL,
        feishuCardPath,
        jsonURL
      };
      
    } catch (error) {
      console.error(`❌ Review失败: ${error.message}`);
      if (error.response) {
        console.error('🔍 API响应详情:', error.response.status, error.response.statusText);
      }
      throw error;
    } finally {
      // 清理全局变量
      if (global.currentMrIid) {
        delete global.currentMrIid;
      }
    }
  }
}

// 命令行入口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log('用法: node pr-reviewer.js <项目名称> <PR编号>');
    console.log('示例: node pr-reviewer.js "ZM App" 161');
    process.exit(1);
  }
  
  const [projectName, mrIid] = args;
  
  try {
    // 加载配置
    const config = await loadConfig();
    const reviewer = new PRReviewer(config);
    
    const filePath = await reviewer.reviewPR(projectName, parseInt(mrIid));
    console.log(`\n📄 报告文件路径: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('脚本执行失败:', error.message);
    process.exit(1);
  }
}

// 如果是直接运行此脚本
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { PRReviewer };
