# 🤖 PR Review Automation - 智能代码审查工具

<div align="center">

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/your-repo/pr-review-automation)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitLab](https://img.shields.io/badge/GitLab-compatible-orange.svg)](https://gitlab.com/)

一个专为GitLab设计的智能PR评审工具，集成多种AI分析引擎，支持Flutter、JavaScript、TypeScript等多种语言的代码质量分析。

[快速开始](#-快速开始) • [功能特性](#-功能特性) • [安装指南](#-安装指南) • [配置文档](#-配置文档) • [项目结构](#-项目结构)

</div>

---

## 📋 项目概述

PR Review Automation 是一个高效、智能的代码审查自动化工具，旨在提升团队的代码质量和开发效率。通过集成多种AI分析引擎和规则检测，为每个Pull Request提供全面、详细的评审报告。

**🎯 项目特色:**
- **企业级架构**: 规范化的模块结构，具备生产环境部署能力
- **多AI引擎**: 支持OpenAI GPT-4、阿里云百炼、VS Code Copilot等
- **智能分析**: AI驱动的代码质量、安全性、性能分析
- **实时通知**: 飞书卡片、邮件等多渠道通知
- **专业报告**: 结构化的Markdown格式评审报告

---

## ✨ 功能特性

### 🔍 代码分析能力
- **静态分析**: 检测潜在bug、代码异味、安全漏洞
- **规范检查**: 代码风格、命名规范、注释完整性
- **AI增强**: 多种AI模型深度分析和改进建议
- **专项检查**: Flutter/Dart、JavaScript/TypeScript特化分析

### 🚀 技术架构
- **模块化设计**: 清晰的目录结构和组件分离
- **可扩展性**: 易于添加新的AI分析器和功能
- **配置管理**: 安全的配置加载和环境变量支持
- **错误恢复**: 完善的错误处理和重试机制

---

## 🚀 快速开始

### 1. 系统要求
- Node.js >= 14.0.0
- Git
- GitLab访问权限

### 2. 安装依赖
```bash
npm install
```

### 3. 配置项目
```bash
# 复制配置文件
cp config/config.json.example config/config.json

# 编辑配置
vim config/config.json

# 验证配置
npm run check-config
```

### 4. 运行评审
```bash
# 通过Shell脚本 (推荐)
./review.sh "项目名称" MR编号

# 通过Node.js
node index.js "项目名称" MR编号

# 通过npm脚本
npm start "项目名称" MR编号
```

---

## 📁 项目结构

```
pr-review-automation/
├── README.md                   # 项目主文档
├── index.js                    # 项目统一入口点
├── pr-reviewer.js              # 核心评审逻辑
├── review.sh                   # 外部调用入口脚本
├── package.json               # Node.js项目配置
│
├── src/                       # 源代码目录
│   ├── analyzers/             # AI分析器模块
│   ├── config/                # 配置管理模块
│   └── utils/                 # 工具函数模块
│
├── config/                    # 配置文件目录
├── scripts/                   # 系统脚本目录
├── docs/                      # 文档目录
├── reports/                   # 评审报告目录
└── temp/                      # 临时文件目录
```

详细的项目结构说明请参考 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## ⚙️ 配置文档

### 主配置文件 (`config/config.json`)

```json
{
  "gitlab": {
    "host": "https://your-gitlab-host.com",
    "token": "${GITLAB_TOKEN}"
  },
  "projects": {
    "项目名称": {
      "id": 项目ID,
      "description": "项目描述"
    }
  },
  "review_settings": {
    "ai_provider": "aliyun_bailian",
    "enable_ai_analysis": true
  }
}
```

### 环境变量 (`.env`)

```bash
GITLAB_TOKEN=your_gitlab_token
OPENAI_API_KEY=your_openai_key
ALIYUN_API_KEY=your_aliyun_key
FEISHU_WEBHOOK=your_feishu_webhook
```

---

## 🔧 可用命令

### 基础命令
- `npm start` - 启动评审程序
- `npm run check-config` - 验证配置文件
- `npm run check-health` - 健康检查

### 管理命令  
- `npm run switch-ai` - 切换AI提供商
- `npm run clean` - 清理项目文件
- `npm run backup-config` - 备份配置文件

### 开发命令
- `npm run dev` - 调试模式运行
- `npm run test:config` - 测试配置
- `npm run test:ai` - 测试AI连接

---

## 📚 文档索引

- [快速开始指南](docs/QUICKSTART.md)
- [AI模型配置指南](docs/AI_MODELS_GUIDE.md)
- [阿里云百炼设置](docs/ALIYUN_BAILIAN_SETUP.md)
- [Copilot设置指南](docs/COPILOT_SETUP.md)
- [完整技术分享文档](docs/COMPREHENSIVE_TECH_SHARING.md)
- [统一评审配置指南](docs/UNIFIED_REVIEW_CONFIG_GUIDE.md)
- [项目结构说明](PROJECT_STRUCTURE.md)

---

## 🛠️ 系统服务

### 文件服务器
项目包含一个HTTP文件服务器，用于提供评审报告的Web访问：

```bash
# 启动文件服务器
./scripts/file-server.sh start

# 查看服务器状态
./scripts/file-server.sh status

# 停止文件服务器  
./scripts/file-server.sh stop
```

文件服务器已配置为开机自启动服务。

---

## 📝 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](LICENSE) 文件。

---

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

---

## 📞 支持与反馈

如果您在使用过程中遇到问题或有改进建议，请：

- 📋 [提交Issue](../../issues)
- 📧 发送邮件至项目维护者
- 💬 在项目讨论区交流

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给我们一个Star！**

Made with ❤️ by the PR Review Automation Team

</div>
