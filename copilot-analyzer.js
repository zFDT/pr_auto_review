#!/usr/bin/env node
import { Gitlab } from "@gitbeaker/rest";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// VS Code Copilot集成版本
class CopilotAnalyzer {
  constructor(config) {
    this.config = config;
  }

  async analyzeCodeChanges(diff, mrDetails) {
    try {
      // 将代码变更写入临时文件
      const tempDir = path.join(__dirname, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const analysisPrompt = this.createAnalysisPrompt(diff, mrDetails);
      const tempFile = path.join(tempDir, 'code_review.md');
      await fs.writeFile(tempFile, analysisPrompt, 'utf8');
      
      console.log('🤖 使用VS Code Copilot进行分析...');
      console.log('请在VS Code中：');
      console.log('1. 打开文件:', tempFile);
      console.log('2. 选中所有内容');
      console.log('3. 使用 Ctrl+I 或 Copilot Chat 进行分析');
      console.log('4. 将分析结果保存到:', path.join(tempDir, 'copilot_analysis.md'));
      
      // 等待用户手动完成分析
      await this.waitForUserInput();
      
      // 读取分析结果
      const analysisFile = path.join(tempDir, 'copilot_analysis.md');
      try {
        const analysisResult = await fs.readFile(analysisFile, 'utf8');
        return this.parseAnalysisResult(analysisResult);
      } catch (error) {
        console.log('未找到分析结果文件，跳过AI分析');
        return null;
      }
      
    } catch (error) {
      console.warn('Copilot分析失败:', error.message);
      return null;
    }
  }

  createAnalysisPrompt(diff, mrDetails) {
    const diffText = diff.map(file => {
      return `## 文件: ${file.new_path}\n\`\`\`diff\n${file.diff}\n\`\`\``;
    }).join('\n\n');

    return `# 代码审查请求

请作为专业的代码审查员，分析以下Merge Request并提供详细的审查意见。

## MR信息
- **标题**: ${mrDetails.title}
- **描述**: ${mrDetails.description || '无描述'}
- **作者**: ${mrDetails.author.name}
- **源分支**: ${mrDetails.source_branch}
- **目标分支**: ${mrDetails.target_branch}

## 代码变更

${diffText}

## 请提供以下分析：

### 1. 代码质量评分 (1-10分)
请评估代码的整体质量。

### 2. 潜在问题
列出可能存在的bug、逻辑错误或代码异味。

### 3. 安全性考虑
识别可能的安全漏洞或风险。

### 4. 性能影响
分析代码变更对性能的潜在影响。

### 5. 可维护性
评估代码的可读性、可维护性和扩展性。

### 6. 测试建议
建议需要添加的测试用例。

### 7. 改进建议
提供具体的代码改进建议。

### 8. 总体评估
给出总体的审查意见和建议。

---
请将您的分析结果保存到 copilot_analysis.md 文件中。`;
  }

  async waitForUserInput() {
    console.log('\n按 Enter 键继续（完成Copilot分析后）...');
    return new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }

  parseAnalysisResult(analysisText) {
    // 简单解析分析结果
    return {
      quality_score: this.extractScore(analysisText),
      potential_bugs: this.extractSection(analysisText, '潜在问题'),
      security_concerns: this.extractSection(analysisText, '安全性考虑'),
      performance_impact: this.extractSectionText(analysisText, '性能影响'),
      maintainability: this.extractSectionText(analysisText, '可维护性'),
      testing_suggestions: this.extractSection(analysisText, '测试建议'),
      improvement_suggestions: this.extractSection(analysisText, '改进建议'),
      summary: this.extractSectionText(analysisText, '总体评估') || analysisText
    };
  }

  extractScore(text) {
    const scoreMatch = text.match(/(\d+)\s*\/?\s*10|(\d+)\s*分/);
    return scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2]) : null;
  }

  extractSection(text, sectionName) {
    const regex = new RegExp(`###?\\s*\\d*\\.?\\s*${sectionName}[\\s\\S]*?(?=###|$)`, 'i');
    const match = text.match(regex);
    if (match) {
      const content = match[0];
      const items = content.split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.replace(/^[\s\-\*]+/, '').trim())
        .filter(item => item.length > 0);
      return items;
    }
    return [];
  }

  extractSectionText(text, sectionName) {
    const regex = new RegExp(`###?\\s*\\d*\\.?\\s*${sectionName}([\\s\\S]*?)(?=###|$)`, 'i');
    const match = text.match(regex);
    if (match) {
      return match[1].trim().replace(/^[\s\-\*]+/gm, '').trim();
    }
    return '';
  }
}

// 导出供主脚本使用
export { CopilotAnalyzer };
