# AI分析配置说明

## 配置OpenAI API

1. 获取OpenAI API密钥:
   - 访问 https://platform.openai.com/
   - 创建账户并生成API密钥

2. 在config.json中配置:
```json
{
  "ai_config": {
    "openai": {
      "api_key": "sk-your-openai-api-key-here",
      "model": "gpt-4",
      "base_url": "https://api.openai.com/v1"
    }
  },
  "review_settings": {
    "enable_ai_analysis": true,
    "ai_provider": "openai"
  }
}
```

## 使用GitHub Copilot替代方案

如果你有GitHub Copilot订阅，你可以：

1. 使用GitHub Copilot Chat API (如果可用)
2. 使用与Copilot相同的OpenAI模型
3. 通过VS Code扩展API集成Copilot

## AI分析功能

启用AI分析后，脚本将提供：

- 📊 代码质量评分 (1-10分)
- 🐛 潜在bug检测
- 🔒 安全性分析
- ⚡ 性能影响评估
- 🔧 可维护性评估
- 🧪 测试建议
- 💡 改进建议

## 成本考虑

- GPT-4: 约$0.03/1k tokens (输入) + $0.06/1k tokens (输出)
- GPT-3.5-turbo: 约$0.001/1k tokens (输入) + $0.002/1k tokens (输出)

对于大型PR，建议使用GPT-3.5-turbo或限制diff大小。

## 环境变量配置

你也可以通过环境变量配置API密钥：

```bash
export OPENAI_API_KEY="your-api-key-here"
```

然后在config.json中使用：
```json
{
  "ai_config": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "model": "gpt-4"
    }
  }
}
```
