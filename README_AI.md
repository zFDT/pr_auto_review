# PR Review 自动化工具 - AI增强版

## 🚀 功能概述

这个自动化脚本现在支持三种分析模式：

1. **基础分析** - 传统的代码统计和规则检查
2. **OpenAI分析** - 使用GPT-4/GPT-3.5进行智能代码审查
3. **VS Code Copilot分析** - 集成GitHub Copilot进行代码审查

## 🔧 使用方法

### 1. 基础使用（无AI）
```bash
# 在config.json中设置
"enable_ai_analysis": false

# 运行
.\review-pr.bat "ZM App" 161
```

### 2. 使用OpenAI分析
```bash
# 配置API密钥
export OPENAI_API_KEY="sk-your-api-key"

# 在config.json中设置
"enable_ai_analysis": true,
"ai_provider": "openai"

# 运行
.\review-pr.bat "ZM App" 161
```

### 3. 使用VS Code Copilot分析
```bash
# 在config.json中设置
"enable_ai_analysis": true,
"ai_provider": "copilot"

# 运行（需要手动与Copilot交互）
.\review-pr.bat "ZM App" 161
```

## 🤖 AI分析功能

### OpenAI模式
- ✅ 全自动分析
- ✅ 结构化输出
- ✅ 详细的代码质量评估
- ❌ 需要API密钥和费用

### Copilot模式
- ✅ 使用GitHub Copilot（如果你有订阅）
- ✅ 更准确的代码理解
- ✅ 无额外API费用
- ❌ 需要手动操作

## 📊 报告示例

启用AI分析后，报告将包含：

```markdown
## 🤖 AI智能分析

### 代码质量评分: 🟢 8/10

### 总体评估
这是一个高质量的代码变更，主要改进了代码格式和日志功能...

### 🐛 潜在问题
- main函数中的异步操作处理可以优化
- 建议添加错误处理机制

### 🔒 安全性考虑
- 未发现明显的安全问题

### ⚡ 性能影响
变更对性能影响很小，主要是代码格式调整...

### 🔧 可维护性
代码可读性良好，建议保持一致的代码风格...

### 🧪 测试建议
- 添加main函数的单元测试
- 测试错误处理路径

### 💡 改进建议
- 考虑使用更严格的类型检查
- 添加代码注释说明业务逻辑
```

## ⚙️ 配置选项

```json
{
  "review_settings": {
    "enable_ai_analysis": true,
    "ai_provider": "copilot",  // "openai" | "copilot"
  },
  "ai_config": {
    "openai": {
      "api_key": "YOUR_API_KEY",
      "model": "gpt-4",  // 或 "gpt-3.5-turbo"
      "base_url": "https://api.openai.com/v1"
    }
  }
}
```

## 🎯 最佳实践

1. **对于日常使用** - 推荐Copilot模式（如果有订阅）
2. **对于自动化流水线** - 推荐OpenAI模式
3. **对于大型PR** - 建议使用gpt-3.5-turbo降低成本
4. **对于敏感代码** - 建议使用本地Copilot模式

## 🔄 工作流集成

你可以将此脚本集成到：
- GitLab CI/CD流水线
- GitHub Actions
- 本地开发工作流
- 代码审查流程

## 🛠️ 故障排除

### OpenAI相关问题
- 检查API密钥是否正确
- 确认账户余额充足
- 验证网络连接

### Copilot相关问题
- 确保VS Code已安装并登录Copilot
- 检查Copilot扩展是否启用
- 确认有有效的GitHub Copilot订阅

## 📝 输出文件

运行完成后，会生成：
- `reports/review_gir.text` - 主要的review报告
- `temp/code_review.md` - Copilot模式的分析提示（如果使用）
- `temp/copilot_analysis.md` - Copilot分析结果（如果使用）

脚本返回值为报告文件的绝对路径。
