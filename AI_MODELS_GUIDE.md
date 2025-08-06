# AI 模型配置指南

本项目支持使用GitHub Copilot和OpenAI进行代码审查。以下是各种AI提供商的可用模型说明。

## GitHub Copilot 可用模型

GitHub Copilot基于OpenAI的技术，在使用`github_copilot`作为AI提供商时，可以选择以下模型：

### Standard Models (标准模型)
- **`gpt-4.1`** 🔥 - 最新GPT-4.1模型，推理能力更强，代码理解更准确（强烈推荐）
- **`gpt-4`** ⭐ - GPT-4标准版，推理能力强，代码质量高（当前配置）
- **`gpt-4o`** - GPT-4 Omni，多模态能力，支持图像理解

### Premium Models (高级模型)
根据您的订阅，还可以使用以下高级模型：
- **`claude-3-5-sonnet`** - Claude 3.5 Sonnet，Anthropic最新模型，代码理解优秀
- **`claude-3-7-sonnet`** - Claude 3.7 Sonnet，更强的推理能力
- **`claude-4-sonnet`** - Claude 4 Sonnet，最新版本（如果可用）
- **`gemini-2-5-pro`** - Google Gemini 2.5 Pro预览版，多模态能力强
- **`o4-mini`** - OpenAI o4-mini预览版，轻量级但高效

### 经济型模型
- **`gpt-4o-mini`** - GPT-4o轻量版，速度快，适合简单任务
- **`gpt-3.5-turbo`** - GPT-3.5模型，速度快，成本低，适合基础代码分析

### 使用说明
```json
{
  "ai_config": {
    "github_copilot": {
      "api_key": "${GITHUB_COPILOT_TOKEN}",
      "model": "gpt-4.1"  // 推荐使用最新的GPT-4.1
    }
  }
}
```

### 配置GPT-4.1的完整示例
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

**注意事项：**
- GitHub Copilot具体可用模型取决于您的订阅类型和GitHub的模型策略
- Copilot Chat目前主要使用GPT-4系列模型提供智能代码分析
- 建议使用`gpt-4`获得最佳代码审查质量

## OpenAI 可用模型

如果使用`openai`作为AI提供商，可以选择以下模型：

### GPT-4 系列（推荐）
- **`gpt-4`** - GPT-4标准版，最佳质量
- **`gpt-4-turbo`** - GPT-4 Turbo，更快更便宜
- **`gpt-4-turbo-preview`** - GPT-4 Turbo预览版
- **`gpt-4-0125-preview`** - GPT-4特定版本（2024年1月）
- **`gpt-4-1106-preview`** - GPT-4较早版本（2023年11月）

### GPT-3.5 系列（经济型）
- **`gpt-3.5-turbo`** - GPT-3.5 Turbo，速度快成本低
- **`gpt-3.5-turbo-16k`** - GPT-3.5支持更长上下文（16K tokens）

### 使用说明
```json
{
  "ai_config": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "model": "gpt-4",  // 在这里修改模型名称
      "base_url": "https://api.openai.com/v1"
    }
  }
}
```

## AI 提供商选择

在`config.json`中，通过`review_settings.ai_provider`来选择AI提供商：

```json
{
  "review_settings": {
    "ai_provider": "github_copilot"  // 可选值: "github_copilot", "openai", "copilot", "auto-copilot"
  }
}
```

### 提供商说明
- **`github_copilot`** - 使用GitHub Copilot API（推荐）
- **`auto-copilot`** - 自动化VS Code Copilot分析器（Flutter专用）
- **`copilot`** - VS Code Copilot集成版本（需要手动操作）
- **`openai`** - 直接使用OpenAI API

## 模型选择建议

### 最佳质量（强烈推荐）
- 使用 `gpt-4.1` - 最新最强模型
- 适合：重要项目、复杂代码审查、高质量要求

### 代码理解专家
- 使用 `claude-3-5-sonnet` 或 `claude-3-7-sonnet`
- 适合：复杂逻辑分析、代码架构审查

### 多模态需求
- 使用 `gemini-2-5-pro` 或 `gpt-4o`
- 适合：包含图片、图表的代码审查

### 速度成本平衡
- 使用 `gpt-4o-mini` 或 `o4-mini`
- 适合：日常开发、快速反馈

### Flutter/Dart 项目
- 推荐使用 `auto-copilot` 提供商配合 `gpt-4.1`
- 专门针对Flutter项目优化的分析规则

## 配置示例

### 最高质量配置（强烈推荐）
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

### Claude 3.5 配置（代码理解优秀）
```json
{
  "review_settings": {
    "ai_provider": "github_copilot"
  },
  "ai_config": {
    "github_copilot": {
      "api_key": "${GITHUB_COPILOT_TOKEN}",
      "model": "claude-3-5-sonnet"
    }
  }
}
```

### 多模态配置（支持图像分析）
```json
{
  "review_settings": {
    "ai_provider": "github_copilot"
  },
  "ai_config": {
    "github_copilot": {
      "api_key": "${GITHUB_COPILOT_TOKEN}",
      "model": "gemini-2-5-pro"
    }
  }
}
```

### 高质量配置（原推荐）
```json
{
  "review_settings": {
    "ai_provider": "github_copilot"
  },
  "ai_config": {
    "github_copilot": {
      "api_key": "${GITHUB_COPILOT_TOKEN}",
      "model": "gpt-4"
    }
  }
}
```

### 经济型配置
```json
{
  "review_settings": {
    "ai_provider": "openai"
  },
  "ai_config": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "model": "gpt-3.5-turbo"
    }
  }
}
```

### Flutter专用配置
```json
{
  "review_settings": {
    "ai_provider": "auto-copilot"
  }
}
```

## 环境变量配置

确保在`.env`文件中配置相应的API密钥：

```bash
# GitHub Copilot（如果使用github_copilot提供商）
GITHUB_COPILOT_TOKEN=your_github_copilot_token_here

# OpenAI（如果使用openai提供商）
OPENAI_API_KEY=your_openai_api_key_here
```

---

## 🚀 快速配置GPT-4.1

### 1. 确认订阅权限
确保您的GitHub Copilot订阅包含Premium Models访问权限。

### 2. 直接修改配置
在 `config.json` 中修改模型字段：
```json
{
  "ai_config": {
    "github_copilot": {
      "model": "gpt-4.1"  // 改为gpt-4.1
    }
  }
}
```

### 3. 验证配置
运行PR审查工具，检查是否成功使用GPT-4.1模型。

### 4. 其他高级模型配置
如果想尝试其他模型，可以将`model`字段改为：
- `claude-3-5-sonnet` - 代码理解优秀
- `gemini-2-5-pro` - 多模态能力
- `o4-mini` - 高效轻量级

**提示：** 建议根据项目需求和预算选择合适的模型。对于重要的代码审查，推荐使用GPT-4.1系列获得最佳质量。
