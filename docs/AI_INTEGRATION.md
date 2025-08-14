# AI集成指南

> 完整的AI服务配置和使用指南，支持多种AI提供商

## 🤖 支持的AI提供商

| 提供商 | 状态 | 推荐等级 | 适用场景 |
|--------|------|----------|----------|
| **GitHub Copilot** | ✅ 推荐 | ⭐⭐⭐⭐⭐ | 企业用户首选，稳定可靠 |
| **OpenAI** | ✅ 支持 | ⭐⭐⭐⭐ | 个人用户，功能强大 |
| **阿里云百炼** | ✅ 支持 | ⭐⭐⭐ | 国内用户，合规要求 |
| **VS Code Copilot** | ✅ 实验性 | ⭐⭐ | 开发调试，本地分析 |

## 🚀 GitHub Copilot（推荐）

### 优势特点
- **🏢 企业级**: 官方支持，稳定可靠
- **🔒 安全性**: 企业级安全保障
- **⚡ 性能**: 响应速度快，准确率高
- **💰 成本**: 企业订阅用户免费使用

### 配置步骤

#### 1. 获取API密钥
```bash
# 通过GitHub CLI获取Copilot令牌
gh auth token

# 或访问GitHub设置页面
# https://github.com/settings/personal-access-tokens
```

#### 2. 环境变量配置
```env
# .env文件
GITHUB_COPILOT_TOKEN=your_copilot_token_here
```

#### 3. 配置文件设置
```json
{
  "review_settings": {
    "ai_provider": "github_copilot"
  },
  "ai_config": {
    "github_copilot": {
      "api_key": "${GITHUB_COPILOT_TOKEN}",
      "model": "gpt-4.1",
      "max_tokens": 4000,
      "temperature": 0.3
    }
  }
}
```

### 可用模型

#### Standard Models（标准模型）
```json
{
  "model": "gpt-4.1"        // 🔥 最新GPT-4.1，推理能力更强（推荐）
}
```

```json
{
  "model": "gpt-4"          // ⭐ GPT-4标准版，推理能力强
}
```

```json
{
  "model": "gpt-4o"         // 多模态能力，支持图像理解
}
```

#### Premium Models（高级模型）
```json
{
  "model": "claude-3-5-sonnet"    // Claude 3.5 Sonnet，代码理解优秀
}
```

```json
{
  "model": "gemini-2-5-pro"       // Google Gemini 2.5 Pro，多模态能力强
}
```

#### 经济型模型
```json
{
  "model": "gpt-4o-mini"          // 轻量版，速度快成本低
}
```

## 🔥 OpenAI

### 优势特点
- **🧠 强大**: GPT-4模型能力领先
- **🌐 通用**: 全球可用，API成熟
- **📈 灵活**: 丰富的参数配置选项

### 配置步骤

#### 1. 获取API密钥
访问 [OpenAI Platform](https://platform.openai.com/api-keys) 创建API密钥

#### 2. 环境变量配置
```env
# .env文件
OPENAI_API_KEY=sk-your-api-key-here
```

#### 3. 配置文件设置
```json
{
  "review_settings": {
    "ai_provider": "openai"
  },
  "ai_config": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "model": "gpt-4",
      "base_url": "https://api.openai.com/v1",
      "max_tokens": 4000,
      "temperature": 0.3
    }
  }
}
```

### 可用模型

#### GPT-4系列（推荐）
```json
{
  "model": "gpt-4"                // 最佳质量，推荐使用
}
```

```json
{
  "model": "gpt-4-turbo"          // 更快更便宜的GPT-4
}
```

```json
{
  "model": "gpt-4-turbo-preview"  // 预览版本
}
```

#### GPT-3.5系列（经济型）
```json
{
  "model": "gpt-3.5-turbo"        // 速度快，成本低
}
```

```json
{
  "model": "gpt-3.5-turbo-16k"    // 支持更长上下文
}
```

## 🇨🇳 阿里云百炼

### 优势特点
- **🏠 本土化**: 国内服务，合规性好
- **🚀 高性能**: 专为中文优化
- **💰 经济性**: 价格优势明显

### 配置步骤

#### 1. 获取API密钥
访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/) 获取API密钥

#### 2. 环境变量配置
```env
# .env文件
ALIYUN_BAILIAN_API_KEY=your_bailian_api_key_here
```

#### 3. 配置文件设置
```json
{
  "review_settings": {
    "ai_provider": "aliyun_bailian"
  },
  "ai_config": {
    "aliyun_bailian": {
      "api_key": "${ALIYUN_BAILIAN_API_KEY}",
      "model": "qwen-plus",
      "max_tokens": 4000,
      "temperature": 0.3,
      "max_retries": 3,
      "retry_delay": 1000
    }
  }
}
```

### 可用模型
```json
{
  "model": "qwen-plus"      // 通义千问Plus，推荐使用
}
```

```json
{
  "model": "qwen-turbo"     // 通义千问Turbo，速度优先
}
```

## 🔧 VS Code Copilot（实验性）

### 优势特点
- **🏠 本地**: 利用本地VS Code环境
- **🔍 调试**: 适合开发调试使用
- **🆓 免费**: 不消耗API额度

### 配置步骤
```json
{
  "review_settings": {
    "ai_provider": "auto-copilot"
  },
  "ai_config": {
    "auto_copilot": {
      "enabled": true,
      "timeout": 30000
    }
  }
}
```

## ⚙️ 高级配置

### 多AI提供商切换
```bash
# 快速切换AI提供商
npm run switch-ai github_copilot
npm run switch-ai openai
npm run switch-ai aliyun_bailian
```

### AI提供商优先级配置
```json
{
  "review_settings": {
    "ai_provider": "github_copilot",
    "fallback_providers": ["openai", "aliyun_bailian"]
  }
}
```

### 性能调优配置
```json
{
  "ai_config": {
    "github_copilot": {
      "model": "gpt-4.1",
      "max_tokens": 4000,          // 最大响应长度
      "temperature": 0.3,          // 创造性程度 (0-1)
      "top_p": 0.9,               // 采样参数
      "frequency_penalty": 0.1,    // 重复惩罚
      "presence_penalty": 0.1,     // 存在惩罚
      "timeout": 60000,           // 超时时间(ms)
      "max_retries": 3,           // 最大重试次数
      "retry_delay": 1000         // 重试间隔(ms)
    }
  }
}
```

### 代码分块配置
```json
{
  "review_settings": {
    "chunk_size": 3000,           // 代码分块大小
    "chunk_overlap": 200,         // 分块重叠部分
    "max_chunks": 10,            // 最大分块数量
    "parallel_analysis": true     // 并行分析
  }
}
```

## 📊 使用统计和监控

### Token使用统计
```bash
# 查看Token使用情况
npm run token-stats

# 输出示例：
# GitHub Copilot: 1,234 tokens
# 成本估算: $0.05
# 分析时间: 45秒
```

### 性能监控
```json
{
  "monitoring": {
    "enable_stats": true,
    "log_requests": true,
    "track_performance": true
  }
}
```

## 🚨 故障排除

### 常见问题

#### 1. API密钥问题
```bash
# 测试API连接
npm run test-ai github_copilot
npm run test-ai openai
npm run test-ai aliyun_bailian
```

#### 2. 网络连接问题
```bash
# 检查网络连通性
curl -I https://api.openai.com/v1/models
curl -I https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
```

#### 3. 配置验证
```bash
# 验证配置文件
npm run validate-config

# 检查AI配置
npm run check-ai-config
```

#### 4. 调试模式
```bash
# 启用AI调试日志
DEBUG_AI=true node pr-reviewer.js "项目名称" MR编号

# 查看详细API调用
DEBUG_API=true node pr-reviewer.js "项目名称" MR编号
```

### 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| **401** | API密钥无效 | 检查并更新API密钥 |
| **429** | 请求频率超限 | 增加重试间隔或升级配额 |
| **500** | 服务器错误 | 检查服务状态，稍后重试 |
| **timeout** | 请求超时 | 增加超时时间或检查网络 |

## 📈 最佳实践

### 1. AI提供商选择建议
- **企业用户**: 优先选择 GitHub Copilot
- **个人开发者**: OpenAI GPT-4 性价比最高
- **国内用户**: 阿里云百炼合规性更好
- **开发调试**: VS Code Copilot 适合本地测试

### 2. 模型选择策略
- **代码质量要求高**: 使用 `gpt-4.1` 或 `gpt-4`
- **速度优先**: 使用 `gpt-4o-mini` 或 `gpt-3.5-turbo`
- **成本控制**: 使用经济型模型配合智能分块

### 3. 性能优化建议
- 合理设置 `chunk_size` 避免单次请求过大
- 启用 `parallel_analysis` 提高分析速度
- 设置合适的 `timeout` 和 `max_retries`
- 使用 `fallback_providers` 确保服务可用性

---

**🎯 现在您已经掌握了所有AI集成配置，可以根据需求选择最适合的AI提供商！**
