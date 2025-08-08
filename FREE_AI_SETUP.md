# 🤖 免费AI代码审查配置指南

本项目现在支持多种免费AI服务进行代码审查，无需OpenAI API key！

## 🎯 支持的免费AI服务

### 1. 🦙 Ollama (本地AI模型) - **推荐**
- **优点**: 完全免费、快速、隐私安全
- **缺点**: 需要本地安装

#### 安装Ollama
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows - 访问 https://ollama.ai/download
```

#### 下载并启动代码审查模型
```bash
# 启动Ollama服务
ollama serve

# 下载代码专用模型 (推荐)
ollama pull codellama        # 7B参数，适合代码
ollama pull deepseek-coder   # 专业代码模型
ollama pull llama3          # 通用模型

# 测试模型
ollama run codellama "分析这个Python函数的问题"
```

### 2. ⚡ Groq AI (高速免费API)
- **优点**: 速度极快、免费配额大
- **缺点**: 需要注册账号

#### 获取Groq API Key
1. 访问 [Groq Console](https://console.groq.com/)
2. 免费注册账号
3. 创建API Key
4. 每月免费配额充足

```bash
# 设置环境变量
export GROQ_API_KEY="your_groq_api_key"
```

### 3. 🤗 Hugging Face (免费推理API)
- **优点**: 完全免费、模型丰富
- **缺点**: 速度相对较慢

#### 获取Hugging Face Token
1. 访问 [Hugging Face](https://huggingface.co/)
2. 免费注册账号
3. 创建Access Token
4. 完全免费使用

```bash
# 设置环境变量
export HUGGINGFACE_TOKEN="your_hf_token"
```

### 4. 🇨🇳 国产AI服务 (免费配额)

#### 百度文心一言
1. 访问 [百度AI开放平台](https://ai.baidu.com/)
2. 注册并创建应用
3. 获取API Key和Secret Key

```bash
export BAIDU_API_KEY="your_api_key"
export BAIDU_SECRET_KEY="your_secret_key"
```

#### 阿里通义千问
1. 访问 [阿里云AI平台](https://dashscope.aliyun.com/)
2. 注册并获取API Key

```bash
export TONGYI_API_KEY="your_tongyi_key"
```

## 🔧 配置环境变量

创建 `.env` 文件（已在项目中）：

```bash
# 编辑环境变量文件
vi .env

# 添加你想使用的AI服务密钥
GROQ_API_KEY=your_groq_api_key_here
HUGGINGFACE_TOKEN=your_hf_token_here
BAIDU_API_KEY=your_baidu_key_here
BAIDU_SECRET_KEY=your_baidu_secret_here
TONGYI_API_KEY=your_tongyi_key_here
```

## 🚀 快速开始

### 1. 检查AI服务状态
```bash
npm run test:ai
```

### 2. 测试免费AI连接
```bash
node -e "
import('./free-ai-analyzer.js').then(({FreeAIAnalyzer}) => {
  const analyzer = new FreeAIAnalyzer();
  analyzer.testConnection().then(result => {
    console.log('🤖 AI服务状态:', result);
  });
});
"
```

### 3. 运行代码审查
```bash
# 现在使用免费AI进行审查
node pr-reviewer.js "ZM App" 161
```

## 💡 推荐配置方案

### 方案一：纯本地 (完全免费)
```json
{
  "review_settings": {
    "ai_provider": "free"
  },
  "ai_config": {
    "ollama": {
      "enabled": true,
      "model": "codellama"
    }
  }
}
```

### 方案二：免费云服务
```json
{
  "review_settings": {
    "ai_provider": "free"
  },
  "ai_config": {
    "groq": {
      "api_key": "${GROQ_API_KEY}"
    },
    "free_ai": {
      "priority": ["groq", "huggingface", "ollama", "static"]
    }
  }
}
```

### 方案三：混合方案
```json
{
  "review_settings": {
    "ai_provider": "free"
  },
  "ai_config": {
    "free_ai": {
      "priority": ["ollama", "groq", "huggingface", "baidu", "static"]
    }
  }
}
```

## 🔍 AI服务对比

| 服务 | 成本 | 速度 | 质量 | 隐私 | 安装难度 |
|------|------|------|------|------|----------|
| Ollama | 免费 | 快 | 高 | 最佳 | 中等 |
| Groq | 免费配额 | 极快 | 高 | 好 | 简单 |
| HuggingFace | 免费 | 中等 | 中等 | 好 | 简单 |
| 百度文心 | 免费配额 | 快 | 高 | 中等 | 简单 |
| 静态规则 | 免费 | 极快 | 基础 | 最佳 | 无 |

## 🛠️ 故障排除

### Ollama连接失败
```bash
# 检查Ollama是否运行
curl http://localhost:11434/api/tags

# 重启Ollama服务
ollama serve
```

### API配额用完
- Groq: 每月重置免费配额
- HuggingFace: 无限制但有速率限制
- 国产AI: 通常有免费额度

### 备用方案
如果所有AI服务都不可用，系统会自动使用静态规则分析，确保基本的代码审查功能。

## 📈 性能优化建议

1. **优先级设置**: 将最快的服务设为最高优先级
2. **本地优先**: Ollama通常是最快且最稳定的选择
3. **备用策略**: 配置多个AI服务作为备用
4. **缓存结果**: 避免重复分析相同的代码

## 🔐 安全建议

- 使用本地Ollama获得最佳隐私保护
- API密钥存储在环境变量中，不要提交到代码库
- 定期轮换API密钥
- 考虑敏感代码使用本地模型

## 📞 技术支持

如果遇到问题：
1. 运行 `node health-check.js` 进行诊断
2. 检查AI服务连接状态
3. 查看错误日志
4. 尝试不同的AI服务
