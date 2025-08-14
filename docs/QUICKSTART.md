# 快速启动指南

## 常用命令

# 快速开始指南

> 5分钟快速上手PR Review Automation工具

## 🎯 前置条件

### 系统要求
- **Node.js** >= 14.0.0
- **npm** >= 6.0.0
- **GitLab** 访问权限
- **AI服务** 至少配置一种（推荐GitHub Copilot）

### 必需的API密钥
- `GITLAB_TOKEN` - GitLab访问令牌
- `GITHUB_COPILOT_TOKEN` 或 `OPENAI_API_KEY` - AI服务密钥
- `FEISHU_WEBHOOK_URL` - 飞书通知（可选）

## 🚀 快速安装

### 1. 克隆项目
```bash
git clone <repository-url>
cd pr-review-automation
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

在 `.env` 文件中填入以下内容：
```env
# GitLab配置
GITLAB_TOKEN=your_gitlab_token_here

# AI服务配置（选择一种）
GITHUB_COPILOT_TOKEN=your_copilot_token_here
# 或者
OPENAI_API_KEY=your_openai_key_here

# 飞书通知（可选）
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your_webhook_id
```

### 4. 配置验证
```bash
# 验证配置是否正确
npm run check-config

# 验证飞书通知（如果配置了）
npm run check-feishu
```

## 🎮 立即开始

### 基础用法
```bash
# 评审指定的Merge Request
./review.sh "项目名称" MR编号

# 示例：评审"ZM App"项目的第161号MR
./review.sh "ZM App" 161
```

### Node.js方式
```bash
# 直接使用Node.js运行
node pr-reviewer.js "ZM App" 161

# 开发模式（显示详细日志）
DEBUG=true node pr-reviewer.js "ZM App" 161
```

## 📊 查看结果

### 评审报告位置
```
reports/
└── {MR编号}/
    ├── review_git_{MR编号}_{时间戳}.txt    # 详细评审报告
    ├── feishu_card_{MR编号}.json          # 飞书卡片数据
    ├── request_*.json                      # API请求记录
    └── response_*.json                     # API响应记录
```

### 报告内容包括
- 📝 **代码质量分析** - 代码风格、命名规范、最佳实践
- 🐛 **潜在Bug检测** - 逻辑错误、边界条件、异常处理
- 🔒 **安全漏洞扫描** - SQL注入、XSS、权限验证等
- ⚡ **性能优化建议** - 算法优化、资源使用、缓存策略
- 🏗️ **架构设计评估** - 模块化、解耦、可维护性

### 飞书通知
如果配置了飞书Webhook，评审完成后会自动发送通知卡片到群聊。

## ⚙️ 常用命令

### 配置管理
```bash
# 检查配置文件
npm run check-config

# 验证AI提供商连接
npm run test-ai

# 切换AI提供商
npm run switch-ai github_copilot
npm run switch-ai openai
```

### 系统维护
```bash
# 清理临时文件
npm run clean

# 健康检查
npm run health-check

# 查看项目结构
npm run show-structure
```

## 🔧 配置选项

### AI提供商配置
在 `config/config.json` 中配置：

```json
{
  "review_settings": {
    "ai_provider": "github_copilot"  // 可选: "github_copilot", "openai"
  },
  "ai_config": {
    "github_copilot": {
      "api_key": "${GITHUB_COPILOT_TOKEN}",
      "model": "gpt-4.1"
    },
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "model": "gpt-4",
      "base_url": "https://api.openai.com/v1"
    }
  }
}
```

### 项目配置
```json
{
  "projects": [
    {
      "name": "ZM App",
      "id": 123,
      "path": "mobile/zm-app",
      "language": "flutter"
    }
  ]
}
```

## 🚨 故障排除

### 常见问题

#### 1. 配置错误
```bash
# 运行配置检查
npm run check-config

# 常见错误：
# - GitLab Token无效或过期
# - AI API密钥错误
# - 项目路径或ID不正确
```

#### 2. 网络连接问题
```bash
# 检查GitLab连接
curl -H "Authorization: Bearer $GITLAB_TOKEN" "$GITLAB_URL/api/v4/user"

# 检查AI服务连接
npm run test-ai
```

#### 3. 权限问题
```bash
# 确保脚本可执行
chmod +x ./review.sh

# 检查GitLab项目访问权限
npm run check-project-access "项目名称"
```

#### 4. 飞书通知问题
```bash
# 测试飞书Webhook
npm run check-feishu

# 验证Webhook URL格式
echo $FEISHU_WEBHOOK_URL
```

### 调试模式
```bash
# 启用详细日志
DEBUG=true node pr-reviewer.js "项目名称" MR编号

# 查看API调用详情
DEBUG_API=true node pr-reviewer.js "项目名称" MR编号
```

## 📈 下一步

### 深入了解
- 📖 [完整配置指南](CONFIG_GUIDE.md) - 详细的配置选项说明
- 🤖 [AI集成指南](AI_INTEGRATION.md) - 多AI提供商配置
- 🏗️ [技术架构](TECHNICAL_ARCHITECTURE.md) - 系统设计和实现

### 高级功能
- 🔧 [自定义规则](CUSTOMIZATION.md) - 定制分析规则
- 🚀 [企业部署](ENTERPRISE_DEPLOYMENT.md) - 生产环境部署
- 📊 [监控运维](MONITORING.md) - 系统监控和维护

---

**🎉 恭喜！您已经成功搭建了智能代码评审系统**

现在可以开始使用 `./review.sh "项目名称" MR编号` 命令来体验AI驱动的代码评审了！
