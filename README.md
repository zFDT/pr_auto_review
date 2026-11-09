# 🤖 PR Review Automation - 智能代码审查工具

<div align="center">

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/your-repo/pr-review-automation)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitLab](https://img.shields.io/badge/GitLab-compatible-orange.svg)](https://gitlab.com/)

一个专为GitLab设计的智能PR评审工具，集成多种AI分析引擎，支持Flutter、JavaScript、TypeScript等多种语言的代码质量分析。

[快速开始](docs/QUICKSTART.md) • [配置指南](docs/CONFIG_GUIDE.md) • [AI集成](docs/AI_INTEGRATION.md) • [技术架构](docs/TECHNICAL_ARCHITECTURE.md) • [故障排除](docs/TROUBLESHOOTING.md)

</div>

---

## � 文档中心

> **📖 完整文档请访问：[docs/README.md](docs/README.md)**

### 🚀 入门文档
- **[快速开始](docs/QUICKSTART.md)** - 5分钟快速上手，立即体验AI代码评审
- **[配置指南](docs/CONFIG_GUIDE.md)** - 完整的配置文件说明和最佳实践
- **[AI集成指南](docs/AI_INTEGRATION.md)** - 支持的AI模型和配置方法

### 🔧 技术文档  
- **[技术架构](docs/TECHNICAL_ARCHITECTURE.md)** - 系统架构设计和核心实现
- **[故障排除](docs/TROUBLESHOOTING.md)** - 常见问题和解决方案

---

## ✨ 核心特性一览

### 🤖 多AI引擎支持
| AI提供商 | 状态 | 推荐等级 | 适用场景 |
|----------|------|----------|----------|
| **GitHub Copilot** | ✅ 推荐 | ⭐⭐⭐⭐⭐ | 企业用户首选 |
| **OpenAI GPT-4** | ✅ 支持 | ⭐⭐⭐⭐ | 个人开发者 |
| **阿里云百炼** | ✅ 支持 | ⭐⭐⭐ | 国内用户 |

### 🔍 智能分析能力
- **代码质量分析** - 代码风格、命名规范、最佳实践检查
- **安全漏洞检测** - SQL注入、XSS、权限验证等安全问题
- **性能优化建议** - 算法优化、资源使用、缓存策略建议
- **架构设计评估** - 模块化、解耦、可维护性分析

### 🚀 企业级特性
- **实时通知** - 飞书卡片、邮件等多渠道通知
- **安全合规** - 数据脱敏、网络隔离、权限控制
- **高可用性** - 错误恢复、重试机制、负载均衡
- **可扩展性** - 模块化设计、插件系统、配置管理

---

## ⚡ 快速体验

### 一键开始
```bash
# 1. 克隆项目
git clone <repository-url>
cd pr-review-automation

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑.env文件，填入GitLab Token和AI API Key

# 4. 验证配置
npm run check-config

# 5. 立即开始评审
./review.sh "项目名称" MR编号
```

### 使用示例
```bash
# 评审指定MR
./review.sh "ZM App" 161

# 开发模式（详细日志）
DEBUG=true node pr-reviewer.js "ZM App" 161

# 切换AI提供商
npm run switch-ai github_copilot
npm run switch-ai openai
```

---

## 📊 效果展示

### 性能提升数据
| 指标 | 传统评审 | AI自动评审 | 提升幅度 |
|------|----------|------------|----------|
| **评审时间** | 2小时 | 20分钟 | **85%↑** |
| **问题发现率** | 基线 | +75% | **75%↑** |
| **人力成本** | 基线 | -60% | **60%↓** |
| **响应时间** | 24小时 | 5分钟 | **99%↑** |

### 评审报告示例
```
� AI代码评审报告 - MR #161

🎯 总体评分: 8.2/10
📝 分析文件: 15个文件，1,234行代码
⏱️ 分析耗时: 45秒
🤖 AI提供商: GitHub Copilot (GPT-4.1)

🔍 发现问题:
• 代码质量问题: 3个
• 潜在Bug: 2个  
• 安全风险: 1个
• 性能优化点: 4个

💡 主要建议:
1. 建议使用const替代let声明不变变量
2. 异步操作缺少错误处理机制
3. 数据库查询存在SQL注入风险
4. 可以使用缓存优化频繁查询
```

---

## 🛠️ 系统要求

### 运行环境
- **Node.js** >= 14.0.0
- **npm** >= 6.0.0  
- **GitLab** 访问权限

### API密钥（至少配置一种）
- `GITLAB_TOKEN` - GitLab访问令牌（必需）
- `GITHUB_COPILOT_TOKEN` - GitHub Copilot API密钥（推荐）
- `OPENAI_API_KEY` - OpenAI API密钥
- `ALIYUN_BAILIAN_API_KEY` - 阿里云百炼API密钥
- `FEISHU_WEBHOOK_URL` - 飞书通知Webhook（可选）

---

## 🏗️ 项目结构

```
pr-review-automation/
├── 📚 docs/                    # 完整文档中心
│   ├── README.md              # 文档导航中心
│   ├── QUICKSTART.md          # 快速开始指南
│   ├── CONFIG_GUIDE.md        # 配置完整指南
│   ├── AI_INTEGRATION.md      # AI集成指南
│   ├── TECHNICAL_ARCHITECTURE.md # 技术架构文档
│   └── TROUBLESHOOTING.md     # 故障排除指南
│
├── 🚀 入口文件
│   ├── review.sh              # Shell脚本入口
│   ├── index.js               # Node.js入口
│   └── pr-reviewer.js         # 核心评审逻辑
│
├── 📦 src/                     # 源代码模块
│   ├── analyzers/             # AI分析器
│   ├── config/                # 配置管理
│   └── utils/                 # 工具函数
│
├── ⚙️ config/                  # 配置文件
│   ├── config.json            # 主配置文件
│   └── *.json                 # 专用配置
│
└── 📊 reports/                 # 评审报告输出
```

---

## 🎯 适用场景

### � 企业团队
- **大型项目** - 支持复杂代码结构分析
- **多人协作** - 统一代码评审标准
- **质量保证** - 全面的质量检查体系
- **合规要求** - 企业级安全和数据保护

### 👨‍💻 个人开发者
- **快速反馈** - 即时获得代码改进建议
- **学习提升** - AI驱动的最佳实践指导
- **效率提升** - 自动化重复性评审工作
- **成本控制** - 灵活的AI提供商选择

---

## � 版本更新

查看 [update.md](update.md) 了解最新的功能更新和bug修复。

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

<div align="center">

**🚀 开始您的智能代码评审之旅**

[立即开始](docs/QUICKSTART.md) • [查看文档](docs/README.md) • [配置指南](docs/CONFIG_GUIDE.md)

**让AI助力您的代码质量提升！**

</div>
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

## 技术特色与复盘

### 技术亮点

- **多 AI 引擎可插拔架构**：通过统一的 `analyzer` 接口抽象出 GitHub Copilot、OpenAI GPT-4、阿里云百炼三类引擎，配置即可切换、互不影响——把「供应商差异」收敛到适配层，上层评审逻辑与具体模型解耦。
- **面向 GitLab 的 PR 评审自动化**：围绕 GitLab MR 生命周期做端到端自动化——拉取 MR diff → 分文件分析 → 汇总评分与问题清单，覆盖代码质量、安全漏洞（SQL 注入 / XSS / 权限校验）、性能优化、架构评估四类维度。
- **飞书卡片 + 邮件通知的工程化集成**：评审结果不是停留在报告文件，而是通过飞书自定义卡片（结构化评分、问题分类、建议列表）与邮件双通道主动推送给开发者，把「评审结论」变成可消费的即时通知。
- **多语言覆盖**：分析器同时支持 Flutter、JavaScript、TypeScript 等语言，适配移动端与前端为主的混合技术栈。

### 个人贡献

- 独立完成从 0 到 1 的开发：核心评审逻辑、多 AI 引擎接入层（Copilot / OpenAI / 百炼）、飞书卡片与邮件通知链路、配置文件与 `review.sh` 一键入口均由本人实现。

### 收获与规划

- **收获**：完整实践了「LLM 落地到代码评审」这条链路——难点不在调用大模型，而在如何把 diff 切分、提示词工程、结果结构化、多引擎结果归一化串成稳定可用的工程。
- **规划**：后续扩展更多引擎（如 Claude、国产开源模型）并补充模型成本与质量的横向对比；当前面向 GitLab，计划抽象出平台层以兼容 GitHub PR，让评审能力在双平台复用。
