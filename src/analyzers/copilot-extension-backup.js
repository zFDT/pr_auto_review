#!/usr/bin/env node

/**
 * GitHub Copilot 智能代码分析器
 * 支持 VS Code Copilot 扩展的自动代码审查功能
 * 
 * @author AI Assistant
 * @version 2.0.0
 */

import fs from 'fs/promises';
import { accessSync, constants } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Copilot分析器类
 * 使用VS Code的GitHub Copilot进行代码分析
 */
class CopilotAnalyzer {
  constructor(config = {}) {
    this.config = config || {};
    this.enabled = this.checkCopilotAvailability();
    this.flutterConfig = null;

    // 加载Flutter专用配置
    this.loadSpecializedConfig().catch(err => {
      console.warn('⚠️ 加载Flutter配置失败:', err.message);
    });
  }

  /**
   * 加载专用配置
   */
  async loadSpecializedConfig() {
    try {
      // 使用统一配置文件
      const unifiedConfigPath = path.join(process.cwd(), 'config', 'unified-flutter-review-config.json');

      // 检查统一配置文件是否存在
      try {
        await fs.access(unifiedConfigPath);
        console.log('✅ 使用统一Flutter配置文件');
      } catch {
        throw new Error('未找到Flutter配置文件');
      }

      const configContent = await fs.readFile(unifiedConfigPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      // 根据配置文件格式进行适配
      if (parsedConfig.unified_flutter_review_config) {
        // 统一配置格式
        this.flutterConfig = this.adaptUnifiedConfig(parsedConfig.unified_flutter_review_config);
      } else {
        // 兼容旧格式
        this.flutterConfig = parsedConfig;
      }

      console.log('✅ 加载Flutter专用配置成功');
    } catch (error) {
      // 使用默认配置
      this.flutterConfig = {
        review_focus: "Flutter/Dart 项目优化，同时支持多种编程语言"
      };
      console.log('⚠️ 使用默认配置:', error.message);
    }
  }

class CopilotAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.copilotAvailable = false;
    this.vscodeAvailable = false;
    this.failureReasons = [];
    this.flutterConfig = null;

    // 设置VS Code的绝对路径
    this.vscodeCommand = this.getVSCodeCommand();

    // 加载专用配置
    this.loadSpecializedConfig();
  }

  /**
   * 获取VS Code命令路径
   */
  getVSCodeCommand() {
    // 优先使用配置中的路径
    const configPath = this.config.ai_config?.copilot?.vscode_path;
    if (configPath) {
      try {
        accessSync(configPath, constants.F_OK);
        console.log('🎯 使用配置的VS Code路径:', configPath);
        return configPath;
      } catch (error) {
        console.warn('⚠️ 配置的VS Code路径无效，使用默认路径');
      }
    }

    // macOS标准安装路径
    const macPath = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
    // 备用路径
    const alternatePaths = [
      '/usr/local/bin/code',
      '/opt/homebrew/bin/code',
      process.env.HOME + '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
    ];

    // 检查标准路径
    try {
      accessSync(macPath, constants.F_OK);
      console.log('🎯 找到VS Code路径:', macPath);
      return macPath;
    } catch (error) {
      // 检查备用路径
      for (const altPath of alternatePaths) {
        try {
          accessSync(altPath, constants.F_OK);
          console.log('🎯 找到VS Code路径:', altPath);
          return altPath;
        } catch (error) {
          continue;
        }
      }
    }

    // 如果都找不到，尝试使用PATH中的code命令
    console.log('⚠️ 未找到VS Code绝对路径，使用PATH中的code命令');
    return 'code';
  }

  /**
   * 加载专用配置（如Flutter配置）
   */
  async loadSpecializedConfig() {
    try {
      // 使用统一配置文件
      const unifiedConfigPath = path.join(process.cwd(), 'config', 'unified-flutter-review-config.json');

      // 检查统一配置文件是否存在
      try {
        await fs.access(unifiedConfigPath);
        console.log('✅ 使用统一Flutter配置文件');
      } catch {
        throw new Error('未找到Flutter配置文件');
      }

      const configContent = await fs.readFile(unifiedConfigPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      // 根据配置文件格式进行适配
      if (parsedConfig.unified_flutter_review_config) {
        // 统一配置格式 - 提取review_focus_areas作为review_focus
        const unifiedConfig = parsedConfig.unified_flutter_review_config;
        this.flutterConfig = {
          review_focus: this.convertReviewFocusAreas(unifiedConfig.review_focus_areas || {}),
          output_settings: unifiedConfig.general_settings?.output_settings || {
            include_detailed_diff: false,
            focus_on_flutter_specific: true
          }
        };
      } else {
        // 兼容旧格式
        this.flutterConfig = parsedConfig;
      }

      console.log('✅ 加载Flutter专用配置成功');
    } catch (error) {
      // 使用默认配置
      this.flutterConfig = {
        review_focus: {
          performance: true,
          security: true,
          ui_consistency: true,
          error_handling: true,
          dependency_management: true
        },
        output_settings: {
          include_detailed_diff: false,
          focus_on_flutter_specific: true
        }
      };
      console.log('📋 使用默认Flutter配置');
    }
  }

  /**
   * 转换新格式的review_focus_areas为旧格式的review_focus
   * @param {Object} reviewFocusAreas - 新格式的焦点区域
   * @returns {Object} 旧格式的review_focus
   */
  convertReviewFocusAreas(reviewFocusAreas) {
    const reviewFocus = {};

    for (const [key, area] of Object.entries(reviewFocusAreas)) {
      if (area.enabled) {
        // 将新的区域键映射到旧的键
        const mappedKey = this.mapAreaKeyToLegacy(key);
        reviewFocus[mappedKey] = true;
      }
    }

    return reviewFocus;
  }

  /**
   * 将新配置的区域键映射到旧配置的键
   * @param {string} newKey - 新配置的键
   * @returns {string} 旧配置的键
   */
  mapAreaKeyToLegacy(newKey) {
    const keyMapping = {
      'performance_optimization': 'performance',
      'security_and_best_practices': 'security',
      'ui_ux_consistency': 'ui_consistency',
      'error_handling_and_stability': 'error_handling',
      'getx_state_management': 'dependency_management',
      'widget_design_and_architecture': 'architecture',
      'dart_code_quality': 'code_quality'
    };

    return keyMapping[newKey] || newKey;
  }

  /**
   * 检查 Copilot 环境是否可用
   */
  async checkCopilotEnvironment() {
    const checks = [];

    // 检查 VS Code 是否安装
    try {
      console.log('🔍 检查VS Code安装路径:', this.vscodeCommand);
      const { stdout } = await execAsync(`"${this.vscodeCommand}" --version`);
      this.vscodeAvailable = true;
      console.log('✅ VS Code 已安装:', stdout.split('\n')[0]);
    } catch (error) {
      this.failureReasons.push(`VS Code 未安装或路径不正确: ${this.vscodeCommand}`);
      console.error('❌ VS Code 检查失败:', error.message);
    }

    // 检查 Copilot 扩展是否安装
    try {
      const { stdout } = await execAsync(`"${this.vscodeCommand}" --list-extensions`);
      const extensions = stdout.split('\n');

      if (extensions.includes('github.copilot')) {
        console.log('✅ GitHub Copilot 扩展已安装');
      } else {
        this.failureReasons.push('github.copilot 扩展未安装');
        console.error('❌ GitHub Copilot 扩展未找到');
      }

      if (extensions.includes('github.copilot-chat')) {
        console.log('✅ GitHub Copilot Chat 扩展已安装');
      } else {
        console.warn('⚠️ GitHub Copilot Chat 扩展未安装（可选）');
      }

    } catch (error) {
      this.failureReasons.push('无法检查 VS Code 扩展: ' + error.message);
    }

    // 检查 Copilot 登录状态
    try {
      // 通过创建临时文件测试 Copilot 是否可用
      const testResult = await this.testCopilotConnection();
      if (testResult.success) {
        this.copilotAvailable = true;
        console.log('✅ Copilot 连接测试成功');
      } else {
        this.failureReasons.push('Copilot 连接测试失败: ' + testResult.error);
      }
    } catch (error) {
      this.failureReasons.push('Copilot 连接测试异常: ' + error.message);
    }

    return this.copilotAvailable;
  }

  /**
   * 测试 Copilot 连接
   */
  async testCopilotConnection() {
    try {
      const tempDir = path.join(process.cwd(), 'temp', 'copilot-test');
      await fs.mkdir(tempDir, { recursive: true });

      // 创建测试代码文件
      const testCode = `// This is a test file to verify Copilot connection
class TestWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // TODO: Add implementation
  }
}`;

      const testFile = path.join(tempDir, 'test.dart');
      await fs.writeFile(testFile, testCode, 'utf8');

      // 创建 VS Code 自动化脚本
      const automationScript = this.createCopilotTestScript(testFile);
      const scriptFile = path.join(tempDir, 'test-copilot.js');
      await fs.writeFile(scriptFile, automationScript, 'utf8');

      // 运行测试
      const command = `"${this.vscodeCommand}" "${tempDir}" --extensionDevelopmentPath="${tempDir}" --wait`;
      console.log('🧪 执行 Copilot 连接测试...');
      console.log('📋 执行命令:', command);

      // 设置超时
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Copilot 测试超时 (30秒)')), 30000)
      );

      const execution = execAsync(command);

      await Promise.race([execution, timeout]);

      // 检查测试结果
      const resultFile = path.join(tempDir, 'copilot-test-result.json');

      // 等待结果文件生成
      for (let i = 0; i < 10; i++) {
        try {
          const result = await fs.readFile(resultFile, 'utf8');
          const testResult = JSON.parse(result);

          // 清理测试文件
          await fs.rm(tempDir, { recursive: true, force: true });

          return testResult;
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      throw new Error('Copilot 测试结果文件未生成');

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 创建 Copilot 测试脚本
   */
  createCopilotTestScript(testFile) {
    return `
const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');

async function testCopilot() {
  try {
    console.log('开始 Copilot 连接测试...');
    
    // 等待 VS Code 完全加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 打开测试文件
    const document = await vscode.workspace.openTextDocument('${testFile.replace(/\\/g, '\\\\')}');
    await vscode.window.showTextDocument(document);
    
    // 检查 Copilot 扩展是否可用
    const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
    
    if (!copilotExtension) {
      throw new Error('GitHub Copilot 扩展未安装');
    }
    
    if (!copilotExtension.isActive) {
      console.log('激活 Copilot 扩展...');
      await copilotExtension.activate();
    }
    
    // 测试 Copilot 建议功能
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      throw new Error('无法获取活动编辑器');
    }
    
    // 移动到文件末尾触发 Copilot
    const lastLine = editor.document.lineCount - 1;
    const lastChar = editor.document.lineAt(lastLine).text.length;
    const position = new vscode.Position(lastLine, lastChar);
    
    editor.selection = new vscode.Selection(position, position);
    
    // 触发 Copilot 建议
    await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
    
    // 等待建议生成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 尝试获取建议
    const suggestions = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', 
      document.uri, position);
    
    const result = {
      success: true,
      copilot_active: copilotExtension.isActive,
      suggestions_available: suggestions && suggestions.items && suggestions.items.length > 0,
      extension_version: copilotExtension.packageJSON.version,
      test_timestamp: new Date().toISOString()
    };
    
    // 保存测试结果
    const resultPath = path.join(path.dirname('${testFile.replace(/\\/g, '\\\\')}'), 'copilot-test-result.json');
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    
    console.log('Copilot 测试完成:', result);
    
    // 关闭 VS Code
    await vscode.commands.executeCommand('workbench.action.closeWindow');
    
  } catch (error) {
    console.error('Copilot 测试失败:', error);
    
    const result = {
      success: false,
      error: error.message,
      test_timestamp: new Date().toISOString()
    };
    
    try {
      const resultPath = path.join(path.dirname('${testFile.replace(/\\/g, '\\\\')}'), 'copilot-test-result.json');
      await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    } catch (writeError) {
      console.error('无法写入测试结果:', writeError);
    }
    
    // 关闭 VS Code
    await vscode.commands.executeCommand('workbench.action.closeWindow');
  }
}

// 如果在 VS Code 扩展环境中运行
if (typeof vscode !== 'undefined') {
  testCopilot();
}

module.exports = { testCopilot };
`;
  }

  /**
   * 主要分析入口方法
   * 兼容原有的 analyzeCopilot 和 analyzeCodeChanges 接口
   */
  async analyzeCodeChanges(diff, mrDetails) {
    return await this.analyzeCopilot(diff, mrDetails);
  }

  /**
   * 执行 Copilot 代码分析
   */
  async analyzeCopilot(diff, mrDetails) {
    try {
      console.log('🤖 开始 GitHub Copilot 代码分析...');

      // 首先检查环境
      const isAvailable = await this.checkCopilotEnvironment();

      if (!isAvailable) {
        const failureReport = this.createFailureReport();
        await this.writeFailureReport(failureReport);
        return failureReport;
      }

      // 创建分析工作区
      const workspaceDir = await this.createAnalysisWorkspace(diff, mrDetails);

      // 执行 Copilot 分析
      const analysisResult = await this.executeCopilotAnalysis(workspaceDir);

      // 清理工作区
      await this.cleanup(workspaceDir);

      // 格式化并保存结果
      const formattedResult = this.formatAnalysisResult(analysisResult);

      if (formattedResult.status === 'success') {
        console.log('✅ GitHub Copilot 分析成功完成');
      } else {
        await this.writeFailureReport(formattedResult);
      }

      return formattedResult;

    } catch (error) {
      console.error('❌ Copilot 分析过程出错:', error.message);
      this.failureReasons.push('分析过程异常: ' + error.message);

      const errorReport = {
        status: 'error',
        provider: 'copilot',
        error: error.message,
        stack: error.stack,
        message: 'GitHub Copilot 分析过程中发生未预期的错误',
        timestamp: new Date().toISOString(),
        troubleshooting: [
          '1. 检查 VS Code 是否正确安装',
          '2. 确认 GitHub Copilot 扩展已安装并激活',
          '3. 验证 GitHub Copilot 登录状态',
          '4. 检查系统权限和网络连接',
          '5. 重启 VS Code 后重试'
        ]
      };

      await this.writeFailureReport(errorReport);
      return errorReport;
    }
  }

  /**
   * 创建分析工作区
   */
  async createAnalysisWorkspace(diff, mrDetails) {
    const tempDir = path.join(process.cwd(), 'temp', 'copilot-analysis');
    await fs.mkdir(tempDir, { recursive: true });

    // 创建实际的代码文件而不是 markdown
    for (const file of diff) {
      if (file.new_path && file.diff) {
        const filePath = path.join(tempDir, file.new_path);
        const fileDir = path.dirname(filePath);

        await fs.mkdir(fileDir, { recursive: true });

        // 从 diff 中提取实际代码
        const actualCode = this.extractCodeFromDiff(file.diff);
        await fs.writeFile(filePath, actualCode, 'utf8');
      }
    }

    // 创建分析配置
    const analysisConfig = {
      mrDetails: mrDetails,
      analysisType: 'copilot-code-review',
      requestedAnalysis: [
        'code-quality-assessment',
        'potential-bugs',
        'security-issues',
        'performance-concerns',
        'best-practices-violations',
        'maintainability-issues'
      ]
    };

    await fs.writeFile(
      path.join(tempDir, 'analysis-config.json'),
      JSON.stringify(analysisConfig, null, 2),
      'utf8'
    );

    return tempDir;
  }

  /**
   * 从 git diff 中提取实际代码
   */
  extractCodeFromDiff(diff) {
    const lines = diff.split('\n');
    const codeLines = [];

    for (const line of lines) {
      if (line.startsWith('@@')) {
        continue; // 跳过 diff 头部
      }

      if (line.startsWith('+')) {
        // 新增的代码行
        codeLines.push(line.substring(1));
      } else if (!line.startsWith('-')) {
        // 保持的代码行
        codeLines.push(line);
      }
    }

    return codeLines.join('\n');
  }

  /**
   * 执行真正的 Copilot 分析
   */
  async executeCopilotAnalysis(workspaceDir) {
    try {
      console.log('🚀 启动 VS Code 进行 Copilot 分析...');

      // 创建专门的分析扩展
      const analysisExtension = await this.createAnalysisExtension(workspaceDir);

      // 安装并运行扩展
      const installCmd = `"${this.vscodeCommand}" --install-extension "${analysisExtension}"`;
      await execAsync(installCmd);

      // 打开工作区并触发分析
      const analyzeCmd = `"${this.vscodeCommand}" "${workspaceDir}" --command "copilot.analyzeWorkspace" --wait`;

      console.log('⏳ 等待 Copilot 分析完成...');
      await execAsync(analyzeCmd, { timeout: 60000 }); // 60秒超时

      // 读取分析结果
      const resultFile = path.join(workspaceDir, 'copilot-analysis-result.json');

      // 等待结果文件生成
      for (let i = 0; i < 30; i++) {
        try {
          const result = await fs.readFile(resultFile, 'utf8');
          const analysis = JSON.parse(result);

          if (analysis.status === 'completed') {
            console.log('✅ Copilot 分析完成');
            return analysis;
          } else if (analysis.status === 'failed') {
            this.failureReasons.push('Copilot 分析失败: ' + analysis.error);
            return this.createFailureReport();
          }
        } catch (error) {
          // 结果文件还没生成，继续等待
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      this.failureReasons.push('Copilot 分析超时，未在60秒内完成');
      return this.createFailureReport();

    } catch (error) {
      console.error('❌ Copilot 分析执行失败:', error.message);
      this.failureReasons.push('分析执行失败: ' + error.message);
      return this.createFailureReport();
    }
  }

  /**
   * 创建专门的分析扩展
   */
  async createAnalysisExtension(workspaceDir) {
    const extensionDir = path.join(workspaceDir, '.copilot-analyzer-extension');
    await fs.mkdir(extensionDir, { recursive: true });

    // 扩展配置
    const packageJson = {
      "name": "copilot-code-analyzer",
      "version": "1.0.0",
      "engines": { "vscode": "^1.60.0" },
      "main": "./extension.js",
      "activationEvents": ["*"],
      "contributes": {
        "commands": [{
          "command": "copilot.analyzeWorkspace",
          "title": "Analyze Workspace with Copilot"
        }]
      },
      "extensionDependencies": ["GitHub.copilot"]
    };

    await fs.writeFile(
      path.join(extensionDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf8'
    );

    // 扩展主逻辑
    const extensionCode = `
const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');

async function activate(context) {
  const disposable = vscode.commands.registerCommand('copilot.analyzeWorkspace', async () => {
    try {
      await performCopilotAnalysis();
    } catch (error) {
      console.error('Analysis failed:', error);
      await saveFailureResult(error.message);
    }
  });

  context.subscriptions.push(disposable);
}

async function performCopilotAnalysis() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No workspace folder found');
  }

  const analysisResult = {
    status: 'started',
    timestamp: new Date().toISOString(),
    copilot_version: null,
    analysis: null
  };

  try {
    // 检查 Copilot 扩展
    const copilotExt = vscode.extensions.getExtension('GitHub.copilot');
    if (!copilotExt) {
      throw new Error('GitHub Copilot extension not found');
    }

    if (!copilotExt.isActive) {
      await copilotExt.activate();
    }

    analysisResult.copilot_version = copilotExt.packageJSON.version;

    // 获取工作区中的所有 Dart 文件
    const dartFiles = await vscode.workspace.findFiles('**/*.dart', '**/.*');
    
    if (dartFiles.length === 0) {
      throw new Error('No Dart files found in workspace');
    }

    const fileAnalyses = [];

    // 逐个分析文件
    for (const fileUri of dartFiles) {
      try {
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);

        const fileAnalysis = await analyzeSingleFile(document);
        fileAnalyses.push({
          file: path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath),
          analysis: fileAnalysis
        });

        // 避免过快请求
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(\`Failed to analyze \${fileUri.fsPath}:\`, error);
        fileAnalyses.push({
          file: path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath),
          error: error.message
        });
      }
    }

    analysisResult.status = 'completed';
    analysisResult.analysis = {
      total_files: dartFiles.length,
      analyzed_files: fileAnalyses.filter(f => !f.error).length,
      file_analyses: fileAnalyses,
      summary: generateSummary(fileAnalyses)
    };

  } catch (error) {
    analysisResult.status = 'failed';
    analysisResult.error = error.message;
  }

  // 保存结果
  const resultPath = path.join(workspaceFolder.uri.fsPath, 'copilot-analysis-result.json');
  await fs.writeFile(resultPath, JSON.stringify(analysisResult, null, 2));
}

async function analyzeSingleFile(document) {
  const analysis = {
    line_count: document.lineCount,
    suggestions: [],
    issues: [],
    quality_indicators: {}
  };

  try {
    // 逐行分析，尝试获取 Copilot 建议
    for (let i = 0; i < Math.min(document.lineCount, 50); i++) { // 限制分析前50行
      const line = document.lineAt(i);
      const position = new vscode.Position(i, line.text.length);

      try {
        // 获取该位置的完成建议
        const completions = await vscode.commands.executeCommand(
          'vscode.executeCompletionItemProvider',
          document.uri,
          position
        );

        if (completions && completions.items) {
          const copilotSuggestions = completions.items.filter(item => 
            item.detail && item.detail.includes('Copilot')
          );

          if (copilotSuggestions.length > 0) {
            analysis.suggestions.push({
              line: i + 1,
              suggestions: copilotSuggestions.map(s => ({
                text: s.insertText,
                detail: s.detail
              }))
            });
          }
        }
      } catch (error) {
        // 忽略单行分析错误
      }
    }

    // 分析代码质量指标
    const text = document.getText();
    analysis.quality_indicators = {
      has_const_usage: text.includes('const '),
      has_final_usage: text.includes('final '),
      has_proper_imports: text.includes('import \'package:'),
      has_comments: text.includes('//') || text.includes('///'),
      has_todo_items: text.includes('TODO') || text.includes('FIXME'),
      complexity_estimate: estimateComplexity(text)
    };

    // 识别潜在问题
    if (text.includes('print(')) {
      analysis.issues.push('Uses print() instead of debugPrint()');
    }
    if (text.includes('setState') && text.includes('Timer')) {
      analysis.issues.push('Potential memory leak: setState in Timer');
    }
    if (!text.includes('const ') && text.includes('Widget')) {
      analysis.issues.push('Missing const keywords for performance');
    }

  } catch (error) {
    analysis.error = error.message;
  }

  return analysis;
}

function estimateComplexity(text) {
  const lines = text.split('\\n').length;
  const functions = (text.match(/\\b\\w+\\s*\\(/g) || []).length;
  const conditions = (text.match(/\\b(if|for|while|switch)\\b/g) || []).length;
  
  return {
    lines: lines,
    functions: functions,
    conditions: conditions,
    score: Math.min(10, Math.floor((lines + functions * 2 + conditions * 3) / 10))
  };
}

function generateSummary(fileAnalyses) {
  const totalSuggestions = fileAnalyses.reduce((sum, f) => 
    sum + (f.analysis?.suggestions?.length || 0), 0);
  const totalIssues = fileAnalyses.reduce((sum, f) => 
    sum + (f.analysis?.issues?.length || 0), 0);

  return {
    total_copilot_suggestions: totalSuggestions,
    total_issues_found: totalIssues,
    analysis_completeness: fileAnalyses.filter(f => !f.error).length / fileAnalyses.length,
    summary_text: \`Found \${totalSuggestions} Copilot suggestions and \${totalIssues} potential issues across \${fileAnalyses.length} files\`
  };
}

async function saveFailureResult(errorMessage) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const resultPath = path.join(workspaceFolder.uri.fsPath, 'copilot-analysis-result.json');
    const failureResult = {
      status: 'failed',
      error: errorMessage,
      timestamp: new Date().toISOString()
    };
    await fs.writeFile(resultPath, JSON.stringify(failureResult, null, 2));
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
`;

    await fs.writeFile(
      path.join(extensionDir, 'extension.js'),
      extensionCode,
      'utf8'
    );

    return extensionDir;
  }

  /**
   * 创建失败报告
   */
  createFailureReport() {
    return {
      status: 'failed',
      error: 'GitHub Copilot analysis failed',
      failure_reasons: this.failureReasons,
      vscode_available: this.vscodeAvailable,
      copilot_available: this.copilotAvailable,
      vscode_command_path: this.vscodeCommand,
      troubleshooting_steps: [
        '1. 确保已安装 VS Code',
        `2. 安装 GitHub Copilot 扩展: "${this.vscodeCommand}" --install-extension github.copilot`,
        '3. 登录 GitHub Copilot: 在 VS Code 中运行 "GitHub Copilot: Sign In"',
        '4. 验证 Copilot 订阅状态',
        '5. 检查网络连接',
        `6. 当前使用的VS Code路径: ${this.vscodeCommand}`
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 格式化分析结果
   */
  formatAnalysisResult(analysisResult) {
    if (!analysisResult || analysisResult.status === 'failed') {
      return analysisResult;
    }

    // 增强结果格式，适配多种输出需求
    const formattedResult = {
      ...analysisResult,
      provider: 'copilot',
      enhanced_metadata: {
        flutter_specific: this.flutterConfig?.output_settings?.focus_on_flutter_specific || false,
        analysis_focus: this.flutterConfig?.review_focus || {},
        vscode_path: this.vscodeCommand,
        config_loaded: !!this.flutterConfig
      }
    };

    // 如果是Flutter项目，添加专项分析
    if (this.isFlutterProject(analysisResult)) {
      formattedResult.flutter_analysis = this.addFlutterSpecificAnalysis(analysisResult);
    }

    return formattedResult;
  }

  /**
   * 检测是否为Flutter项目
   */
  isFlutterProject(analysisResult) {
    const analysis = analysisResult.analysis;
    if (!analysis || !analysis.file_analyses) return false;

    return analysis.file_analyses.some(fileAnalysis =>
      fileAnalysis.file && fileAnalysis.file.endsWith('.dart')
    );
  }

  /**
   * 添加Flutter专项分析
   */
  addFlutterSpecificAnalysis(analysisResult) {
    const analysis = analysisResult.analysis;
    const flutterAnalysis = {
      dart_files_count: 0,
      widget_usage: [],
      performance_issues: [],
      ui_consistency_issues: [],
      best_practices: []
    };

    if (analysis.file_analyses) {
      analysis.file_analyses.forEach(fileAnalysis => {
        if (fileAnalysis.file && fileAnalysis.file.endsWith('.dart')) {
          flutterAnalysis.dart_files_count++;

          // 分析Widget使用
          if (fileAnalysis.analysis?.quality_indicators) {
            const indicators = fileAnalysis.analysis.quality_indicators;
            if (!indicators.has_const_usage) {
              flutterAnalysis.performance_issues.push({
                file: fileAnalysis.file,
                issue: 'Missing const keywords for Widget optimization',
                severity: 'medium'
              });
            }
          }
        }
      });
    }

    return flutterAnalysis;
  }

  /**
   * 写入失败报告到文件
   */
  async writeFailureReport(report) {
    try {
      const reportsDir = './reports';
      await fs.mkdir(reportsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `copilot_failure_${timestamp}.json`;
      const filepath = path.join(reportsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf8');
      console.log(`📝 失败报告已保存: ${filepath}`);

      return filepath;
    } catch (error) {
      console.error('❌ 保存失败报告时出错:', error.message);
      throw error;
    }
  }

  /**
   * 清理临时文件
   */
  async cleanup(workspaceDir) {
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
      console.log('🧹 临时文件清理完成');
    } catch (error) {
      console.warn('⚠️ 清理临时文件失败:', error.message);
    }
  }
}

// 导出新的类名，同时保持向后兼容
export { CopilotAnalyzer };
export { CopilotAnalyzer as CopilotOnlyAnalyzer }; // 向后兼容
export { CopilotAnalyzer as AutoCopilotAnalyzer }; // 向后兼容
