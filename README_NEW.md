# 🤖 PR Review 自动化工具

一个强大的自动化代码评审工具，专为GitLab Merge Request设计，支持AI智能分析和Flutter项目优化。

## ✨ 功能特性

- 🔍 **智能代码分析** - 基于规则的代码质量检测
- 🤖 **AI辅助评审** - 集成GitHub Copilot和OpenAI分析
- 📊 **详细统计报告** - 全面的变更统计和可视化展示
- 🚀 **Flutter优化** - 专门针对Flutter/Dart项目的评审规则
- 🔒 **安全检测** - 敏感信息和安全漏洞检测
- 📱 **通知集成** - 飞书机器人自动通知
- 🎯 **多项目支持** - 灵活的项目配置管理
- ⚙️ **高度可配置** - 支持环境变量和自定义规则

## 🚀 快速开始

### 1. 环境准备

```bash
# 确保已安装Node.js (>= 14.0.0)
node --version

# 克隆项目
git clone <your-repo-url>
cd pr-review-automation
```

### 2. 安装和配置

```bash
# 安装依赖
npm install

# 初始化配置（推荐）
npm run setup

# 手动配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入实际的配置值
```

### 3. 配置环境变量

编辑 `.env` 文件：

```bash
# GitLab配置
GITLAB_TOKEN=your_gitlab_token_here

# AI服务配置（可选）
GITHUB_COPILOT_TOKEN=your_github_copilot_token
OPENAI_API_KEY=your_openai_api_key

# 通知配置（可选）
FEISHU_WEBHOOK_URL=your_feishu_webhook_url
```

### 4. 验证配置

```bash
# 测试GitLab连接
npm run test-gitlab

# 验证配置文件
npm run check-config
```

## 📖 使用方法

### 基本使用

```bash
# 使用改进的Shell脚本（推荐）
./review-pr.sh "ZM App" 161

# 直接使用Node.js
npm run review "ZM App" 161

# 或者
node pr-reviewer.js "ZM App" 161
```

### 高级选项

```bash
# 详细输出模式
./review-pr.sh "ZM App" 161 --verbose

# 调试模式
./review-pr.sh "ZM App" 161 --debug

# 禁用AI分析
./review-pr.sh "ZM App" 161 --no-ai

# 预览模式（不执行实际操作）
./review-pr.sh "ZM App" 161 --dry-run

# 查看帮助
./review-pr.sh --help
```

## ⚙️ 配置说明

### 项目配置 (config.json)

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
    "max_files_warning": 15,
    "max_lines_warning": 1000,
    "enable_ai_analysis": true,
    "ai_provider": "auto-copilot"
  }
}
```

### Flutter专项配置

工具包含专门的Flutter/Dart评审规则：

- Widget生命周期检查
- 状态管理最佳实践
- 性能优化建议
- UI/UX一致性检查
- 依赖管理分析

## 📊 报告示例

生成的报告包含：

- 📋 **基本信息** - MR详情和元数据
- 📈 **变更统计** - 文件数、行数变化的可视化表格
- 📁 **文件变更** - 新增、修改、删除文件的详细列表
- ⚠️ **问题检测** - 潜在问题和安全隐患
- 🤖 **AI分析** - 智能代码质量评估
- 💬 **评论汇总** - 现有讨论的整理
- 💡 **改进建议** - 具体的优化建议

## 🔧 开发和调试

### 可用脚本

```bash
# 开发模式运行
npm run dev "ZM App" 161

# 测试GitLab连接
npm run test-gitlab

# 配置验证
npm run check-config

# 查看详细日志
DEBUG=true ./review-pr.sh "ZM App" 161
```

### 自定义规则

在 `flutter-review-config.json` 中配置Flutter专项规则：

```json
{
  "review_focus": {
    "performance_optimization": {
      "enabled": true,
      "weight": 25
    },
    "code_quality_and_structure": {
      "enabled": true,
      "weight": 20
    }
  }
}
```

## 🚨 故障排除

### 常见问题

1. **"未找到Node.js"**
   - 解决方案: 安装Node.js (>= 14.0.0)

2. **"配置验证失败"**
   - 解决方案: 检查 `.env` 文件和环境变量配置

3. **"GitLab API调用失败"**
   - 解决方案: 验证Token权限和网络连接

4. **"AI分析失败"**
   - 解决方案: 检查AI服务配置或使用 `--no-ai` 跳过

### 调试技巧

```bash
# 启用详细日志
export DEBUG=true
./review-pr.sh "ZM App" 161 --verbose

# 检查环境
node -e "console.log(process.env)"

# 验证配置
npm run check-config
```

## 🔒 安全最佳实践

1. **不要提交敏感信息** - 使用环境变量存储Token
2. **定期更新Token** - 定期轮换GitLab和AI服务Token
3. **权限最小化** - 只授予必要的GitLab权限
4. **网络安全** - 在安全的网络环境中使用

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [GitBeaker](https://github.com/jdalrymple/gitbeaker) - GitLab API客户端
- [OpenAI](https://openai.com/) - AI分析服务
- GitHub Copilot - 代码智能分析

---

**⭐ 如果这个项目对你有帮助，请给它一个Star！**
