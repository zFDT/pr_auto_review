# PR Review Automation - 智能代码评审工具文档中心

> 🤖 专为GitLab设计的企业级智能PR评审工具，集成多种AI分析引擎，提升代码质量和开发效率

## 📚 文档导航

### 🚀 入门指南
- **[快速开始](QUICKSTART.md)** - 5分钟快速上手指南
- **[安装配置](SETUP_GUIDE.md)** - 详细的安装和配置步骤
- **[配置指南](CONFIG_GUIDE.md)** - 完整的配置文件说明

### 🤖 AI集成
- **[AI模型指南](AI_INTEGRATION.md)** - 支持的AI模型和配置方法
- **[多AI提供商](AI_INTEGRATION.md#多ai提供商)** - OpenAI、阿里云百炼、VS Code Copilot等

### 📖 技术文档
- **[技术架构](TECHNICAL_ARCHITECTURE.md)** - 系统架构设计和技术实现
- **[API接口](API_REFERENCE.md)** - 接口文档和集成指南
- **[故障排除](TROUBLESHOOTING.md)** - 常见问题和解决方案

### 💡 最佳实践
- **[使用指南](BEST_PRACTICES.md)** - 使用技巧和最佳实践
- **[定制开发](CUSTOMIZATION.md)** - 自定义分析规则和扩展开发

## 🎯 核心特性

### ✨ 智能分析能力
- **多AI引擎**: 支持OpenAI GPT-4、阿里云百炼、VS Code Copilot
- **深度分析**: 代码质量、安全漏洞、性能优化、架构设计
- **语言支持**: Flutter/Dart、JavaScript/TypeScript、Python等

### 🚀 企业级特性
- **实时通知**: 飞书、邮件等多渠道通知
- **安全合规**: 企业内网部署，数据不出网
- **高可用性**: 错误恢复、重试机制、负载均衡

### 📊 专业报告
- **结构化输出**: Markdown格式的详细评审报告
- **可视化展示**: 飞书卡片、Web界面展示
- **数据分析**: Token使用统计、性能指标

## 🏢 企业级部署

### 内网环境支持
- ✅ GitLab集成
- ✅ Jenkins CI/CD
- ✅ 安全网关
- ✅ 数据脱敏

### 高可用架构
- ✅ 负载均衡
- ✅ 故障转移
- ✅ 监控告警
- ✅ 自动恢复

## 📈 效果数据

| 指标 | 传统评审 | AI自动评审 | 提升幅度 |
|------|----------|------------|----------|
| **评审时间** | 2小时 | 20分钟 | **85%↑** |
| **问题发现率** | 基线 | +75% | **75%↑** |
| **人力成本** | 基线 | -60% | **60%↓** |
| **响应时间** | 24小时 | 5分钟 | **99%↑** |

## 🎨 使用示例

### 基本用法
```bash
# 评审指定MR
./review.sh "ZM App" 161

# 或使用Node.js
node pr-reviewer.js "ZM App" 161
```

### 高级用法
```bash
# 开发模式（详细日志）
DEBUG=true node pr-reviewer.js "ZM App" 161

# 配置检查
npm run check-config

# 飞书通知测试
npm run check-feishu
```

## 🔧 配置示例

### 基础配置
```json
{
  "review_settings": {
    "ai_provider": "github_copilot"
  },
  "ai_config": {
    "github_copilot": {
      "api_key": "${GITHUB_COPILOT_TOKEN}",
      "model": "gpt-4.1"
    }
  }
}
```

### 企业内网配置
```json
{
  "gitlab_config": {
    "url": "https://gitlab.company.com",
    "token": "${GITLAB_TOKEN}"
  },
  "security": {
    "data_masking": true,
    "network_isolation": true
  }
}
```

## 📞 支持与反馈

- **技术支持**: 查看[故障排除指南](TROUBLESHOOTING.md)
- **功能建议**: 提交GitHub Issue
- **技术交流**: 参考[技术架构文档](TECHNICAL_ARCHITECTURE.md)

---

<div align="center">

**开始您的智能代码评审之旅** 🚀

[快速开始](QUICKSTART.md) • [查看配置](CONFIG_GUIDE.md) • [了解架构](TECHNICAL_ARCHITECTURE.md)

</div>
