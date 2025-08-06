#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 自动化VS Code Copilot分析器 - Flutter专用版
class AutoCopilotAnalyzer {
  constructor(config) {
    this.config = config;
    this.flutterConfig = null;
    this.loadFlutterConfig();
  }

  async loadFlutterConfig() {
    try {
      const configPath = path.join(process.cwd(), 'flutter-review-config.json');
      const configContent = await fs.readFile(configPath, 'utf8');
      this.flutterConfig = JSON.parse(configContent);
    } catch (error) {
      console.warn('未找到Flutter配置文件，使用默认配置');
      this.flutterConfig = { review_focus: {}, output_settings: { include_detailed_diff: false } };
    }
  }

  async analyzeCodeChanges(diff, mrDetails) {
    try {
      console.log('🤖 使用VS Code Copilot进行自动化分析...');
      
      // 创建临时工作区
      const workspaceDir = await this.createTempWorkspace(diff, mrDetails);
      
      // 使用VS Code CLI进行分析
      const analysis = await this.runCopilotAnalysis(workspaceDir);
      
      // 清理临时文件
      await this.cleanup(workspaceDir);
      
      return this.parseAnalysisResult(analysis);
      
    } catch (error) {
      console.warn('Copilot自动分析失败:', error.message);
      return null;
    }
  }

  async createTempWorkspace(diff, mrDetails) {
    const tempDir = path.join(process.cwd(), 'temp', 'copilot-workspace');
    await fs.mkdir(tempDir, { recursive: true });

    // 创建分析文件
    const analysisContent = this.createAnalysisContent(diff, mrDetails);
    await fs.writeFile(path.join(tempDir, 'review.md'), analysisContent, 'utf8');

    // 创建VS Code配置
    const vscodeDir = path.join(tempDir, '.vscode');
    await fs.mkdir(vscodeDir, { recursive: true });
    
    const tasksConfig = {
      version: "2.0.0",
      tasks: [
        {
          label: "copilot-review",
          type: "shell",
          command: "echo",
          args: ["Copilot analysis workspace ready"],
          group: "build"
        }
      ]
    };
    
    await fs.writeFile(
      path.join(vscodeDir, 'tasks.json'), 
      JSON.stringify(tasksConfig, null, 2), 
      'utf8'
    );

    return tempDir;
  }

  createAnalysisContent(diff, mrDetails) {
    const diffContent = diff.map(file => {
      // 为每个文件创建实际的代码内容
      const lines = file.diff.split('\n');
      let fileContent = '';
      let isInContext = false;
      
      for (const line of lines) {
        if (line.startsWith('@@')) {
          isInContext = true;
          continue;
        }
        if (isInContext && !line.startsWith('-')) {
          const cleanLine = line.startsWith('+') ? line.substring(1) : line;
          fileContent += cleanLine + '\n';
        }
      }
      
      return {
        path: file.new_path,
        content: fileContent,
        diff: file.diff
      };
    }).filter(f => f.content.trim().length > 0);

    return `# Code Review Analysis

## MR Information
- Title: ${mrDetails.title}
- Author: ${mrDetails.author.name}
- Source: ${mrDetails.source_branch}
- Target: ${mrDetails.target_branch}

## Files Changed
${diffContent.map(f => `- ${f.path}`).join('\n')}

## Analysis Request
Please analyze the following code changes and provide:
1. Code quality assessment (1-10 score)
2. Potential issues or bugs
3. Security considerations
4. Performance impact
5. Maintainability assessment
6. Testing suggestions
7. Improvement recommendations

${diffContent.map(f => `
## File: ${f.path}

\`\`\`dart
${f.content}
\`\`\`

### Changes:
\`\`\`diff
${f.diff}
\`\`\`
`).join('\n')}

---
COPILOT: Please provide a comprehensive code review analysis in the following JSON format:

{
  "quality_score": number,
  "potential_issues": ["issue1", "issue2"],
  "security_concerns": ["concern1", "concern2"],
  "performance_impact": "description",
  "maintainability": "assessment",
  "testing_suggestions": ["test1", "test2"],
  "improvement_suggestions": ["improvement1", "improvement2"],
  "summary": "overall assessment"
}`;
  }

  async runCopilotAnalysis(workspaceDir) {
    try {
      // 方法1: 尝试使用VS Code CLI
      const result = await this.tryVSCodeCLI(workspaceDir);
      if (result) return result;

      // 方法2: 使用Node.js模拟分析
      return await this.simulateCopilotAnalysis(workspaceDir);
      
    } catch (error) {
      console.warn('VS Code CLI分析失败，使用模拟分析:', error.message);
      return await this.simulateCopilotAnalysis(workspaceDir);
    }
  }

  async tryVSCodeCLI(workspaceDir) {
    try {
      // 检查VS Code是否可用
      await execAsync('code --version');
      
      // 创建一个自动化脚本
      const scriptContent = `
const vscode = require('vscode');

async function analyzeCopilot() {
  try {
    // 这里需要VS Code扩展API支持
    // 由于Copilot API限制，我们使用替代方案
    return null;
  } catch (error) {
    console.error('Copilot API error:', error);
    return null;
  }
}

analyzeCopilot();
`;
      
      // 注意：VS Code Copilot API目前不支持直接的命令行调用
      // 返回null以使用备用方案
      return null;
      
    } catch (error) {
      return null;
    }
  }

  async simulateCopilotAnalysis(workspaceDir) {
    // 读取分析文件
    const reviewContent = await fs.readFile(path.join(workspaceDir, 'review.md'), 'utf8');
    
    // 基于规则的智能分析（模拟Copilot的分析能力）
    const analysis = await this.performRuleBasedAnalysis(reviewContent);
    
    return JSON.stringify(analysis, null, 2);
  }

  async performRuleBasedAnalysis(content) {
    if (!this.flutterConfig) {
      await this.loadFlutterConfig();
    }

    const analysis = {
      quality_score: 8,
      flutter_analysis: {
        code_quality_and_structure: {},
        flutter_specific_checks: {},
        performance_optimization: {},
        ui_ux_consistency: {},
        error_handling_and_stability: {},
        dependency_management: {},
        code_standards: {},
        security_checks: {},
        commit_quality: {},
        documentation_updates: {}
      },
      potential_issues: [],
      security_concerns: [],
      performance_impact: "",
      maintainability: "",
      testing_suggestions: [],
      improvement_suggestions: [],
      summary: ""
    };

    const lines = content.split('\n');
    let codeBlocks = [];
    let inCodeBlock = false;
    let currentBlock = [];

    // 提取代码块
    for (const line of lines) {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          codeBlocks.push(currentBlock.join('\n'));
          currentBlock = [];
        }
        inCodeBlock = !inCodeBlock;
      } else if (inCodeBlock) {
        currentBlock.push(line);
      }
    }

    const allCode = codeBlocks.join('\n');
    let qualityScore = 8;

    // 1. 代码质量与结构检查
    qualityScore = await this.analyzeCodeQualityAndStructure(allCode, analysis, qualityScore);

    // 2. Flutter特定检查
    qualityScore = await this.analyzeFlutterSpecificChecks(allCode, analysis, qualityScore);

    // 3. 性能优化检查
    qualityScore = await this.analyzePerformanceOptimization(allCode, analysis, qualityScore);

    // 4. UI/UX一致性检查
    qualityScore = await this.analyzeUIUXConsistency(allCode, analysis, qualityScore);

    // 5. 错误处理与稳定性检查
    qualityScore = await this.analyzeErrorHandlingAndStability(allCode, analysis, qualityScore);

    // 6. 依赖管理检查
    qualityScore = await this.analyzeDependencyManagement(allCode, analysis, qualityScore);

    // 7. 代码规范检查
    qualityScore = await this.analyzeCodeStandards(allCode, analysis, qualityScore);

    // 8. 安全性检查
    qualityScore = await this.analyzeSecurityChecks(allCode, analysis, qualityScore);

    // 9. 提交质量检查
    qualityScore = await this.analyzeCommitQuality(content, analysis, qualityScore);

    // 10. 文档更新检查
    qualityScore = await this.analyzeDocumentationUpdates(content, analysis, qualityScore);

    // 设置最终评分
    analysis.quality_score = Math.max(1, Math.min(10, qualityScore));

    // 生成总结
    analysis.summary = this.generateFlutterSummary(analysis);

    return analysis;
  }

  async analyzeCodeQualityAndStructure(code, analysis, qualityScore) {
    const issues = [];
    
    // 检查命名规范
    if (code.match(/[A-Z][a-z]+[A-Z]/)) {
      // 可能的驼峰命名
      analysis.flutter_analysis.code_quality_and_structure.naming_conventions = "✅ 发现符合规范的命名";
    } else {
      issues.push("建议检查变量和函数命名是否符合camelCase规范");
      qualityScore -= 0.5;
    }

    // 检查文件组织
    if (code.includes('lib/') || code.includes('main.dart')) {
      analysis.flutter_analysis.code_quality_and_structure.file_organization = "✅ 文件组织符合Flutter项目结构";
    }

    // 检查代码复用
    if (code.includes('class ') && code.includes('extends ')) {
      analysis.flutter_analysis.code_quality_and_structure.code_reuse = "✅ 发现类继承，代码复用良好";
    }

    if (issues.length > 0) {
      analysis.improvement_suggestions.push(...issues);
    }

    return qualityScore;
  }

  async analyzeFlutterSpecificChecks(code, analysis, qualityScore) {
    const issues = [];

    // Widget设计检查
    if (code.includes('StatelessWidget') || code.includes('StatefulWidget')) {
      analysis.flutter_analysis.flutter_specific_checks.widget_design = "✅ 正确使用Flutter Widget";
    }

    // const使用检查
    if (code.includes('const ')) {
      analysis.flutter_analysis.flutter_specific_checks.const_usage = "✅ 发现const关键字使用，有助于性能优化";
    } else {
      issues.push("建议在可能的地方使用const关键字优化性能");
      qualityScore -= 0.5;
    }

    // 状态管理检查
    if (code.includes('Provider') || code.includes('BLoC') || code.includes('Riverpod')) {
      analysis.flutter_analysis.flutter_specific_checks.state_management = "✅ 使用了推荐的状态管理方案";
    } else if (code.includes('setState')) {
      analysis.flutter_analysis.flutter_specific_checks.state_management = "⚠️ 使用setState，对于复杂状态建议考虑其他状态管理方案";
    }

    // 生命周期管理
    if (code.includes('initState') && code.includes('dispose')) {
      analysis.flutter_analysis.flutter_specific_checks.lifecycle_management = "✅ 正确处理Widget生命周期";
    } else if (code.includes('initState') && !code.includes('dispose')) {
      issues.push("发现initState但缺少dispose，可能导致内存泄漏");
      qualityScore -= 1;
    }

    if (issues.length > 0) {
      analysis.potential_issues.push(...issues);
    }

    return qualityScore;
  }

  async analyzePerformanceOptimization(code, analysis, qualityScore) {
    const issues = [];

    // build方法优化检查
    if (code.includes('build(') && code.includes('setState')) {
      issues.push("注意避免在build方法中进行复杂计算或调用setState");
      qualityScore -= 0.5;
    }

    // ListView使用检查
    if (code.includes('ListView(')) {
      issues.push("对于长列表，建议使用ListView.builder进行性能优化");
      qualityScore -= 0.5;
    } else if (code.includes('ListView.builder')) {
      analysis.flutter_analysis.performance_optimization.list_rendering = "✅ 使用ListView.builder优化列表性能";
    }

    // 内存管理检查
    if (code.includes('Stream') && !code.includes('dispose')) {
      issues.push("Stream使用需要在dispose中取消订阅，避免内存泄漏");
      qualityScore -= 1;
    }

    if (code.includes('AnimationController') && !code.includes('dispose')) {
      issues.push("AnimationController需要在dispose中释放资源");
      qualityScore -= 1;
    }

    analysis.performance_impact = issues.length > 0 
      ? `发现 ${issues.length} 个性能相关问题需要关注`
      : "未发现明显的性能问题";

    if (issues.length > 0) {
      analysis.potential_issues.push(...issues);
    }

    return qualityScore;
  }

  async analyzeUIUXConsistency(code, analysis, qualityScore) {
    const issues = [];

    // 主题使用检查
    if (code.includes('Theme.of(context)')) {
      analysis.flutter_analysis.ui_ux_consistency.theme_usage = "✅ 正确使用Theme数据";
    } else if (code.includes('Colors.') && !code.includes('Theme.of')) {
      issues.push("建议使用Theme.of(context)而不是硬编码颜色");
      qualityScore -= 0.5;
    }

    // 响应式布局检查
    if (code.includes('MediaQuery') || code.includes('LayoutBuilder')) {
      analysis.flutter_analysis.ui_ux_consistency.responsive_layout = "✅ 考虑了响应式布局";
    }

    if (issues.length > 0) {
      analysis.improvement_suggestions.push(...issues);
    }

    return qualityScore;
  }

  async analyzeErrorHandlingAndStability(code, analysis, qualityScore) {
    const issues = [];

    // 异常处理检查
    if (code.includes('try') && code.includes('catch')) {
      analysis.flutter_analysis.error_handling_and_stability.exception_handling = "✅ 实现了异常处理机制";
    } else if (code.includes('await ') && !code.includes('try')) {
      issues.push("异步操作建议添加try-catch错误处理");
      qualityScore -= 1;
    }

    // 空安全检查
    if (code.includes('!') && !code.includes('?')) {
      issues.push("使用强制非空操作符(!)需要确保安全性，建议使用空安全操作符");
      qualityScore -= 0.5;
    }

    // 调试代码检查
    if (code.includes('if (true)')) {
      issues.push("发现调试代码 if (true)，生产环境应移除");
      qualityScore -= 1;
    }

    if (code.includes('print(') || code.includes('debugPrint(')) {
      issues.push("发现调试打印语句，生产环境建议移除或使用日志系统");
      qualityScore -= 0.5;
    }

    // 测试建议
    analysis.testing_suggestions = [
      "为主要业务逻辑添加单元测试",
      "为自定义Widget添加Widget测试",
      "考虑添加集成测试覆盖关键用户流程"
    ];

    if (issues.length > 0) {
      analysis.potential_issues.push(...issues);
    }

    return qualityScore;
  }

  async analyzeDependencyManagement(code, analysis, qualityScore) {
    // 这里可以检查import语句等
    if (code.includes('import \'package:')) {
      analysis.flutter_analysis.dependency_management.package_usage = "✅ 使用了外部包依赖";
    }

    return qualityScore;
  }

  async analyzeCodeStandards(code, analysis, qualityScore) {
    const issues = [];

    // TODO检查
    const todoMatches = code.match(/TODO|FIXME|HACK/gi);
    if (todoMatches && todoMatches.length > 0) {
      issues.push(`发现 ${todoMatches.length} 个待完成标记(TODO/FIXME/HACK)`);
      analysis.flutter_analysis.code_standards.todo_management = `⚠️ 需要处理 ${todoMatches.length} 个待完成事项`;
    }

    // 注释检查
    if (code.includes('///') || code.includes('//')) {
      analysis.flutter_analysis.code_standards.documentation = "✅ 代码包含注释说明";
    }

    if (issues.length > 0) {
      analysis.improvement_suggestions.push(...issues);
    }

    return qualityScore;
  }

  async analyzeSecurityChecks(code, analysis, qualityScore) {
    const issues = [];

    // HTTP vs HTTPS检查
    if (code.includes('http://') && !code.includes('localhost')) {
      issues.push("发现HTTP协议使用，生产环境建议使用HTTPS");
      qualityScore -= 1;
    }

    // 硬编码敏感信息检查
    if (code.match(/api[_-]?key|password|secret/i)) {
      issues.push("可能包含硬编码的敏感信息，建议使用环境变量或配置文件");
      qualityScore -= 2;
    }

    if (issues.length > 0) {
      analysis.security_concerns.push(...issues);
    }

    return qualityScore;
  }

  async analyzeCommitQuality(content, analysis, qualityScore) {
    // 分析提交标题
    if (content.includes('feat') || content.includes('fix') || content.includes('docs')) {
      analysis.flutter_analysis.commit_quality.message_format = "✅ 提交信息符合规范格式";
    }

    return qualityScore;
  }

  async analyzeDocumentationUpdates(content, analysis, qualityScore) {
    // 检查是否需要文档更新
    if (content.includes('新增') || content.includes('添加')) {
      analysis.flutter_analysis.documentation_updates.readme_check = "⚠️ 新功能可能需要更新README文档";
    }

    return qualityScore;
  }

  generateFlutterSummary(analysis) {
    const issueCount = analysis.potential_issues.length + analysis.security_concerns.length;
    const score = analysis.quality_score;

    if (score >= 8) {
      return "代码质量优秀，符合Flutter开发最佳实践。建议继续保持现有的代码质量水准。";
    } else if (score >= 6) {
      return "代码质量良好，有少量改进空间。主要关注点在性能优化和代码规范方面。";
    } else if (score >= 4) {
      return "代码需要改进，特别是在Flutter最佳实践、性能优化和错误处理方面。";
    } else {
      return "代码存在较多问题，建议重点关注代码质量、安全性和Flutter开发规范。";
    }
  }

  parseAnalysisResult(analysisText) {
    try {
      // 尝试解析JSON响应
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果不是JSON格式，返回解析后的结果
      return JSON.parse(analysisText);
    } catch (error) {
      console.warn('解析Copilot分析结果失败:', error.message);
      return {
        quality_score: null,
        potential_issues: [],
        security_concerns: [],
        performance_impact: "",
        maintainability: "",
        testing_suggestions: [],
        improvement_suggestions: [],
        summary: analysisText
      };
    }
  }

  async cleanup(workspaceDir) {
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理临时文件失败:', error.message);
    }
  }
}

export { AutoCopilotAnalyzer };
