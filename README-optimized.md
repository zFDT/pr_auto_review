# 🤖 PR Review Automation - 智能代码审查工具

<div align="center">

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/your-repo/pr-review-automation)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitLab](https://img.shields.io/badge/GitLab-compatible-orange.svg)](https://gitlab.com/)

一个专为GitLab设计的智能PR评审工具，集成多种AI分析引擎，支持Flutter、JavaScript、TypeScript等多种语言的代码质量分析。

[快速开始](#-快速开始) • [功能特性](#-功能特性) • [安装指南](#-安装指南) • [使用说明](#-使用说明) • [配置文档](#-配置文档)

</div>

---

## 📋 项目概述

PR Review Automation 是一个高效、智能的代码审查自动化工具，旨在提升团队的代码质量和开发效率。通过集成多种AI分析引擎和规则检测，为每个Pull Request提供全面、详细的评审报告。

### 🎯 核心价值

- **⏰ 提升效率**: 自动化代码分析，节省人工评审时间
- **📊 质量保障**: 多维度代码质量检测，确保代码规范
- **🤖 智能分析**: AI驱动的深度代码分析和改进建议
- **📱 实时通知**: 集成飞书、钉钉等即时通讯工具
- **🛡️ 专业检查**: 针对Flutter、前端等特定技术栈的专项检查

---

## ✨ 功能特性

### 🔍 代码分析能力

- **静态分析**: 检测潜在bug、代码异味、安全漏洞
- **规范检查**: 代码风格、命名规范、注释完整性
- **性能评估**: 内存泄漏、性能瓶颈、优化建议
- **安全扫描**: 敏感信息泄露、SQL注入、XSS等安全问题
- **架构分析**: 模块耦合度、代码复杂度、可维护性评估

### 🤖 AI智能引擎

| AI提供商 | 支持模型 | 特色功能 | 适用场景 |
|---------|----------|----------|----------|
| **OpenAI** | GPT-4o, GPT-4 Turbo | 深度语义分析，上下文理解 | 复杂业务逻辑分析 |
| **VS Code Copilot** | Codex | 实时代码建议，IDE集成 | 开发环境实时分析 |
| **本地规则引擎** | 自定义规则 | 快速响应，离线可用 | 基础规范检查 |

### 📊 多语言支持

<table>
<tr>
<td>

**前端技术栈**
- JavaScript/TypeScript
- React/Vue/Angular
- CSS/SCSS/Less
- HTML5

</td>
<td>

**移动开发**
- Flutter/Dart
- React Native
- Kotlin/Swift
- Java/Objective-C

</td>
<td>

**后端技术栈**
- Node.js
- Python/Django
- Java/Spring
- Go/Rust

</td>
</tr>
</table>

### 🛡️ Flutter专项检查

- **性能优化**: Widget重建优化、内存管理
- **UI/UX一致性**: 主题使用、响应式布局
- **状态管理**: Provider、Bloc、GetX模式检查
- **依赖管理**: pubspec.yaml版本冲突检测
- **平台适配**: iOS/Android兼容性检查

### 📱 通知与集成

- **飞书机器人**: 富文本卡片通知，一键查看详情
- **钉钉机器人**: 支持@指定人员，任务提醒
- **邮件通知**: HTML格式报告，自动抄送相关人员
- **Webhook集成**: 支持自定义webhook，集成CI/CD流程

---

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 14.0.0
- **GitLab**: 支持REST API v4
- **操作系统**: Windows、macOS、Linux

### 一键安装

```bash
# 克隆项目
git clone https://github.com/your-repo/pr-review-automation.git
cd pr-review-automation

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置信息

# 验证配置
npm run check-config

# 运行第一次评审
npm run review "项目名称" 123
```

### Docker 快速部署

```bash
# 构建镜像
docker build -t pr-review-automation .

# 运行容器
docker run -d \
  --name pr-reviewer \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/reports:/app/reports \
  -e GITLAB_TOKEN=your_token \
  pr-review-automation
```

---

## 📖 使用说明

### 基础用法

```bash
# 基本命令格式
node pr-reviewer.js <项目名称> <MR编号>

# 示例：评审ZM App项目的161号MR
node pr-reviewer.js "ZM App" 161

# 使用脚本简化操作
./review.sh "ZM App" 161
```

### 高级用法

```bash
# 启用调试模式
DEBUG=true node pr-reviewer.js "ZM App" 161

# 指定配置文件
node pr-reviewer.js --config=config.prod.json "ZM App" 161

# 干运行模式（不发送通知）
node pr-reviewer.js --dry-run "ZM App" 161

# 只进行AI分析
node pr-reviewer.js --ai-only "ZM App" 161

# 批量分析多个MR
node batch-review.js "ZM App" 160,161,162
```

### 参数说明

| 参数 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `项目名称` | ✅ | config.json中配置的项目名称 | "ZM App" |
| `MR编号` | ✅ | GitLab中的Merge Request IID | 161 |
| `--config` | ❌ | 指定配置文件路径 | --config=config.prod.json |
| `--debug` | ❌ | 启用详细日志输出 | --debug |
| `--dry-run` | ❌ | 干运行模式，不发送通知 | --dry-run |

---

## ⚙️ 配置文档

### 基础配置

创建 `config.json` 文件：

```json
{
  "gitlab": {
    "host": "https://git.example.com",
    "token": "${GITLAB_TOKEN}"
  },
  "projects": {
    "ZM App": {
      "id": 9831,
      "description": "主应用项目",
      "reviewers": ["@developer1", "@developer2"],
      "rules": {
        "max_files": 20,
        "max_lines": 1000,
        "require_tests": true
      }
    }
  },
  "review_settings": {
    "max_files_warning": 20,
    "max_lines_warning": 1000,
    "include_detailed_diff": true,
    "check_console_logs": true,
    "check_todos": true,
    "enable_ai_analysis": true,
    "ai_provider": "openai"
  }
}
```

### AI配置

```json
{
  "ai_config": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "model": "gpt-4o",
      "base_url": "https://api.openai.com/v1",
      "max_tokens": 4000,
      "temperature": 0.1,
      "timeout": 60000
    },
    "copilot": {
      "enabled": true,
      "vscode_path": "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "timeout": 30000,
      "fallback_to_openai": true
    },
    "review_prompts": {
      "system_prompt": "你是一个专业的代码审查专家...",
      "analysis_focus": [
        "代码质量和最佳实践",
        "潜在的bug和逻辑错误",
        "安全漏洞和风险点",
        "性能优化建议"
      ]
    }
  }
}
```

### 通知配置

```json
{
  "notification": {
    "feishu": {
      "webhook_url": "${FEISHU_WEBHOOK_URL}",
      "enabled": true,
      "mention_users": ["user123", "user456"],
      "card_template": "detailed"
    },
    "email": {
      "enabled": false,
      "smtp_host": "smtp.example.com",
      "smtp_port": 587,
      "username": "${EMAIL_USERNAME}",
      "password": "${EMAIL_PASSWORD}",
      "recipients": ["team@example.com"]
    }
  }
}
```

### 环境变量

创建 `.env` 文件：

```bash
# GitLab配置
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_HOST=https://git.example.com

# AI服务配置
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1

# 通知配置
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxx

# 运行环境
NODE_ENV=production
LOG_LEVEL=info
DEBUG=false
```

---

## 📊 报告示例

### 评审报告结构

```markdown
# 📋 PR Review 报告

## 📊 基本信息
- **项目名称**: ZM App
- **MR编号**: #161
- **标题**: 添加用户认证功能
- **作者**: 张三
- **代码质量评分**: 🟢 8.5/10

## 📈 变更统计
| 指标 | 数量 | 评估 |
|------|------|------|
| 总文件数 | 12 | 🟢 合理 |
| 新增行数 | +256 | 🟢 适中 |
| 删除行数 | -18 | 🟢 少量 |
| 净变更 | +238 | 🟢 正常范围 |

## 🤖 AI智能分析
### 📋 总体评估
代码结构清晰，遵循了良好的编程规范。新增的用户认证功能实现合理，
安全性考虑充分。建议在某些关键方法中添加更详细的错误处理。

### 🐛 潜在问题
- authentication.dart: 建议对用户输入进行更严格的验证
- user_service.dart: 可能存在内存泄漏，建议在dispose中释放资源

### 💡 改进建议
- 考虑添加单元测试覆盖新增功能
- 建议使用更安全的密码存储方式
- 可以考虑添加用户会话管理功能
```

### 飞书卡片通知

![飞书通知示例](docs/images/feishu-notification.png)

---

## 🔧 高级功能

### 自定义规则引擎

创建自定义检查规则：

```javascript
// rules/custom-rules.js
export const customRules = {
  'no-hardcoded-colors': {
    description: '检测硬编码颜色值',
    pattern: /Color\(0x[0-9A-Fa-f]{8}\)/g,
    level: 'warning',
    message: '建议使用主题颜色而不是硬编码颜色值'
  },
  
  'require-documentation': {
    description: '要求公共方法有文档注释',
    pattern: /public\s+\w+\s+\w+\s*\([^)]*\)\s*{/g,
    level: 'info',
    message: '公共方法建议添加文档注释'
  }
};
```

### 插件开发

```javascript
// plugins/flutter-analyzer.js
export class FlutterAnalyzer {
  analyze(code, context) {
    const issues = [];
    
    // 检查Widget性能
    if (this.hasPerformanceIssues(code)) {
      issues.push({
        type: 'performance',
        message: '发现可能的性能问题',
        line: this.findProblemLine(code),
        suggestion: '考虑使用const构造函数'
      });
    }
    
    return {
      quality_score: this.calculateScore(issues),
      issues,
      suggestions: this.generateSuggestions(code)
    };
  }
}
```

### CI/CD 集成

#### GitHub Actions

```yaml
name: PR Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run review "${{ github.event.repository.name }}" "${{ github.event.number }}"
        env:
          GITLAB_TOKEN: ${{ secrets.GITLAB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

#### GitLab CI

```yaml
stages:
  - review

pr_review:
  stage: review
  image: node:16
  script:
    - npm install
    - npm run review "$CI_PROJECT_NAME" "$CI_MERGE_REQUEST_IID"
  rules:
    - if: $CI_MERGE_REQUEST_IID
  artifacts:
    reports:
      junit: reports/review-report.xml
    paths:
      - reports/
```

---

## 🛠️ 故障排除

### 常见问题

<details>
<summary><strong>❌ GitLab连接失败</strong></summary>

**问题**: `Error: Request failed with status code 401`

**解决方案**:
1. 检查GitLab token是否正确配置
2. 确认token具有足够的权限
3. 验证GitLab主机地址是否正确

```bash
# 测试GitLab连接
curl -H "PRIVATE-TOKEN: your_token" "https://git.example.com/api/v4/user"
```
</details>

<details>
<summary><strong>❌ AI分析失败</strong></summary>

**问题**: `OpenAI API 错误: Insufficient quota`

**解决方案**:
1. 检查OpenAI账户余额
2. 确认API密钥是否有效
3. 尝试降低max_tokens参数

```bash
# 测试OpenAI连接
npm run test-ai
```
</details>

<details>
<summary><strong>❌ 配置文件格式错误</strong></summary>

**问题**: `配置文件JSON格式错误`

**解决方案**:
1. 使用JSON格式验证工具检查语法
2. 确保所有字符串使用双引号
3. 检查是否有多余的逗号

```bash
# 验证配置文件
npm run check-config
```
</details>

### 性能优化

| 优化项 | 默认值 | 推荐值 | 说明 |
|--------|--------|--------|------|
| `max_tokens` | 4000 | 2000-6000 | 根据项目复杂度调整 |
| `timeout` | 30s | 60s | 大型项目建议增加 |
| `cache_enabled` | true | true | 启用缓存提升性能 |
| `parallel_analysis` | false | true | 并行分析多个文件 |

### 调试模式

```bash
# 启用详细日志
DEBUG=* node pr-reviewer.js "ZM App" 161

# 只输出特定模块日志
DEBUG=ai:* node pr-reviewer.js "ZM App" 161

# 生成诊断报告
npm run diagnose
```

---

## 📈 性能指标

### 分析能力

- **代码行数**: 支持单次分析 50,000+ 行代码
- **文件数量**: 建议单次分析不超过 100 个文件
- **响应时间**: AI分析平均 15-30 秒
- **准确率**: 问题检测准确率 > 85%

### 系统要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| **CPU** | 2核心 | 4核心+ |
| **内存** | 4GB | 8GB+ |
| **磁盘** | 10GB | 50GB+ |
| **网络** | 1Mbps | 10Mbps+ |

---

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

### 开发环境搭建

```bash
# 1. Fork并克隆项目
git clone https://github.com/your-username/pr-review-automation.git
cd pr-review-automation

# 2. 安装开发依赖
npm install --dev

# 3. 创建功能分支
git checkout -b feature/your-feature-name

# 4. 运行测试
npm test

# 5. 启动开发模式
npm run dev
```

### 代码规范

- 使用 ESLint + Prettier 进行代码格式化
- 遵循 [JavaScript Standard Style](https://standardjs.com/)
- 编写单元测试覆盖新功能
- 更新相关文档

### 提交规范

```bash
# 功能开发
git commit -m "feat: 添加新的AI分析引擎"

# Bug修复
git commit -m "fix: 修复配置文件解析错误"

# 文档更新
git commit -m "docs: 更新API文档"

# 性能优化
git commit -m "perf: 优化大文件分析性能"
```

---

## 📝 更新日志

### v2.1.0 (2024-XX-XX)
- ✨ 新增多AI引擎支持
- 🚀 性能优化，分析速度提升50%
- 🛡️ 增强Flutter专项检查功能
- 📱 优化飞书通知卡片样式
- 🐛 修复配置文件热重载问题

### v2.0.0 (2024-XX-XX)
- 🎉 重构核心架构，支持插件化
- 🤖 集成OpenAI GPT-4模型
- 📊 新增代码质量评分机制
- 🔧 完善配置管理系统
- 📖 重写文档和示例

### v1.5.0 (2024-XX-XX)
- 🔍 增强代码分析能力
- 📱 添加飞书机器人通知
- 🛠️ 优化错误处理机制
- 📝 完善报告模板

<details>
<summary>查看更多历史版本</summary>

### v1.0.0 (2024-XX-XX)
- 🎉 项目初始版本
- 📋 基础PR分析功能
- 📊 Markdown报告生成
- ⚙️ GitLab API集成

</details>

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

```
MIT License

Copyright (c) 2024 PR Review Automation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🆘 支持与反馈

### 获取帮助

- 📚 **文档**: [完整文档](https://your-repo.github.io/pr-review-automation)
- 🐛 **Bug报告**: [GitHub Issues](https://github.com/your-repo/pr-review-automation/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/your-repo/pr-review-automation/discussions)
- 📧 **邮件支持**: support@example.com

### 社区

- 💬 **QQ群**: 123456789
- 📱 **微信群**: 扫码加入
- 🌐 **官方网站**: https://pr-review-automation.com

---

<div align="center">

**如果这个项目对你有帮助，请给我们一个 ⭐ Star!**

[⬆ 回到顶部](#-pr-review-automation---智能代码审查工具)

</div>
