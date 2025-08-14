# PR Review 自动化工具

## 项目概述

这是一个专为GitLab设计的自动化PR评审工具，支持多种AI智能分析功能，能够自动分析Merge Request并生成详细的评审报告。

## ✨ 核心功能

- 🔍 **自动MR分析** - 获取GitLab MR详细信息和代码变更
- 📊 **智能代码分析** - 统计代码变更、检测潜在问题
- 🤖 **多AI提供商支持** - 支持OpenAI GPT、GitHub Copilot等多种AI分析
- 📝 **结构化报告** - 生成详细的Markdown格式评审报告
- 🛡️ **Flutter专项检查** - 针对Flutter项目的专业代码审查
- 💾 **报告存档** - 自动保存评审报告到指定目录
- 📱 **飞书通知** - 支持自动发送评审结果到飞书群聊

## 🤖 AI 提供商支持

### OpenAI GPT (推荐)
- ✅ 完全自动化，无需GUI环境
- ✅ 响应速度快，分析质量高
- ✅ 支持多种模型：GPT-4o、GPT-4、GPT-3.5-turbo
- ✅ 详细的JSON格式分析结果
- ⚠️ 需要API密钥和网络连接

### GitHub Copilot
- ✅ 与VS Code深度集成
- ✅ 实时代码建议和分析
- ⚠️ 需要VS Code GUI环境
- ⚠️ 需要有效的Copilot订阅
- ⚠️ 分析结果可能不够稳定

### Auto Copilot (实验性)
- 🧪 自动化Copilot分析
- ⚠️ 稳定性有限，仅供测试

## 📦 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

创建 `.env` 文件：

```bash
# GitLab 配置
GITLAB_TOKEN=your_gitlab_access_token

# OpenAI 配置 (推荐)
OPENAI_API_KEY=your_openai_api_key

# 飞书通知配置
FEISHU_WEBHOOK_URL=your_feishu_webhook_url
```

### 3. 配置项目

编辑 `config.json` 文件：

```json
{
  "gitlab": {
    "host": "https://git.dreame.tech",
    "token": "${GITLAB_TOKEN}"
  },
  "projects": {
    "你的项目名": {
      "id": 项目ID,
      "description": "项目描述"
    }
  },
  "review_settings": {
    "enable_ai_analysis": true,
    "ai_provider": "openai"
  },
  "ai_config": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "model": "gpt-4o",
      "base_url": "https://api.openai.com/v1"
    },
    "copilot": {
      "enabled": true,
      "fallback_to_openai": true
    }
  },
  "notification": {
    "feishu": {
      "webhook_url": "${FEISHU_WEBHOOK_URL}",
      "enabled": true
    }
  }
}
```

## 🔧 AI 提供商管理

### 查看当前配置
```bash
node switch-ai-provider.js show
```

### 切换到 OpenAI
```bash
node switch-ai-provider.js switch openai
```

### 切换到 Copilot
```bash
node switch-ai-provider.js switch copilot
```

### 测试AI连接
```bash
node test-ai-analyzers.js
```

### 测试特定提供商
```bash
node switch-ai-provider.js test openai
node switch-ai-provider.js test copilot
```

## 🚀 使用方法

### 基本用法
```bash
# 分析指定MR
node pr-reviewer.js <project_id> <mr_id>

# 例如：分析项目161的MR #175
node pr-reviewer.js 161 175
```

### 高级用法
```bash
# 使用指定配置文件
node pr-reviewer.js 161 175 --config custom-config.json

# 禁用AI分析
node pr-reviewer.js 161 175 --no-ai

# 指定输出目录
node pr-reviewer.js 161 175 --output ./custom-reports
```

## 📁 项目结构

```
pr-review-automation/
├── config.json              # 主配置文件
├── pr-reviewer.js           # 主程序入口
├── openai-analyzer.js       # OpenAI 分析器
├── copilot-extension.js     # Copilot 分析器
├── auto-copilot-analyzer.js # Auto Copilot 分析器
├── switch-ai-provider.js    # AI 提供商切换工具
├── test-ai-analyzers.js     # AI 分析器测试工具
├── config-loader.js         # 配置加载器
├── reports/                 # 评审报告存储目录
├── temp/                   # 临时文件目录
└── README.md               # 项目文档
```

## 📋 配置说明

### AI 配置项

#### OpenAI 配置
```json
{
  "ai_config": {
    "openai": {
      "api_key": "你的API密钥",
      "model": "gpt-4o",              // 模型选择
      "base_url": "https://api.openai.com/v1",
      "max_tokens": 4000,             // 最大令牌数
      "temperature": 0.1,             // 创造性参数
      "timeout": 60000               // 超时时间(毫秒)
    }
  }
}
```

#### Copilot 配置
```json
{
  "ai_config": {
    "copilot": {
      "enabled": true,
      "vscode_path": "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "timeout": 30000,
      "fallback_to_openai": true     // 失败时回退到OpenAI
    }
  }
}
```

### 审查设置
```json
{
  "review_settings": {
    "max_files_warning": 20,         // 文件数量警告阈值
    "max_lines_warning": 1000,      // 代码行数警告阈值
    "include_detailed_diff": true,   // 包含详细差异
    "check_console_logs": true,      // 检查控制台日志
    "check_todos": true,             // 检查TODO项
    "enable_ai_analysis": true,      // 启用AI分析
    "ai_provider": "openai"          // AI提供商选择
  }
}
```

## 🔍 AI 分析功能

### OpenAI 分析结果包含：
- 📊 **代码质量评分** (1-10分)
- 🐛 **潜在问题检测** (bug、安全、性能)
- 💡 **改进建议** (最佳实践、架构优化)
- ✅ **积极反馈** (代码亮点)
- 📈 **分析元数据** (文件数、代码行数、用量统计)

### Copilot 分析结果包含：
- 🔧 **实时代码建议**
- 📝 **行级别分析**
- 🎯 **智能补全建议**
- ⚡ **性能指标评估**

## 🛠️ 故障排除

### OpenAI 相关问题

1. **API密钥错误**
   ```bash
   # 检查环境变量
   echo $OPENAI_API_KEY
   
   # 测试连接
   node test-ai-analyzers.js
   ```

2. **网络连接问题**
   - 检查防火墙设置
   - 确认代理配置
   - 验证API端点可达性

3. **令牌限制**
   - 减少分析的文件数量
   - 调整max_tokens参数
   - 使用更小的模型

### Copilot 相关问题

1. **扩展未安装**
   ```bash
   # 安装Copilot扩展
   "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension github.copilot
   ```

2. **未登录或订阅过期**
   - 在VS Code中执行 "GitHub Copilot: Sign In"
   - 检查GitHub Copilot订阅状态

3. **连接超时**
   - 检查网络连接
   - 增加timeout配置
   - 尝试重启VS Code

## 📊 使用示例

### 完整的MR分析流程

1. **配置AI提供商**
   ```bash
   node switch-ai-provider.js switch openai
   ```

2. **测试连接**
   ```bash
   node test-ai-analyzers.js
   ```

3. **分析MR**
   ```bash
   node pr-reviewer.js 161 175
   ```

4. **查看报告**
   ```bash
   cat reports/review_git_175.txt
   ```

### 批量分析多个MR

```bash
#!/bin/bash
# 分析多个MR
MR_IDS=(172 173 174 175)
PROJECT_ID=161

for mr_id in "${MR_IDS[@]}"; do
  echo "分析 MR #$mr_id..."
  node pr-reviewer.js $PROJECT_ID $mr_id
  sleep 5  # 避免API限制
done
```

## 🔄 版本更新

### v2.0.0 新功能
- ✨ 多AI提供商支持（OpenAI、Copilot）
- 🔧 AI提供商切换工具
- 🧪 AI分析器测试框架
- 📝 增强的JSON格式分析结果
- 🔄 Copilot回退机制
- 🎯 优化的错误处理和日志

### v1.x.x 功能
- 基础MR分析
- OpenAI GPT-4集成
- 飞书通知
- 报告生成

## 📞 技术支持

如遇问题，请：

1. 查看日志输出
2. 运行测试工具诊断
3. 检查配置文件格式
4. 确认网络和权限设置

## 📄 许可证

MIT License - 详见 LICENSE 文件
