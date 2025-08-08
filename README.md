# PR Revie- 🤖 **AI辅助评审** - 支持OpenAI GPT-4和自动化Copilot分析
- 📝 **结构化报告** - 生成详细的Markdown格式评审报告
- 🛡️ **Flutter专项检查** - 针对Flutter项目的专业代码审查
- 💾 **报告存档** - 自动保存评审报告到指定目录
- 📱 **飞书通知** - 支持自动发送评审结果到飞书群聊化工具

## 项目概述

这是一个专为GitLab设计的自动化PR评审工具，集成AI智能分析功能，能够自动分析Merge Request并生成详细的评审报告。

## ✨ 核心功能

- 🔍 **自动MR分析** - 获取GitLab MR详细信息和代码变更
- 📊 **智能代码分析** - 统计代码变更、检测潜在问题
- 🤖 **AI辅助评审** - 支持OpenAI GPT-4和自动化Copilot分析
- 📝 **结构化报告** - 生成详细的Markdown格式评审报告
- �️ **Flutter专项检查** - 针对Flutter项目的专业代码审查
- �💾 **报告存档** - 自动保存评审报告到指定目录

## 📦 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置项目

编辑 `config.json` 文件：

```json
{
  "gitlab": {
    "host": "your-gitlab-host.com",
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
    "ai_provider": "auto-copilot"
  },
  "notification": {
    "feishu": {
      "webhook_url": "${FEISHU_WEBHOOK_URL}",
      "enabled": true
    }
  }
}
```

### 3. 设置环境变量

创建 `.env` 文件：

```bash
GITLAB_TOKEN=your_gitlab_token
OPENAI_API_KEY=your_openai_key  # 可选，如使用OpenAI
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your_webhook_id  # 可选，如需飞书通知
```

## 🎯 高级功能

### 飞书通知集成

工具支持自动发送评审结果到飞书群聊：

1. **获取飞书Webhook URL**
   - 在飞书群中添加自定义机器人
   - 复制Webhook URL

2. **配置环境变量**
   ```bash
   FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your_webhook_id
   ```

3. **启用飞书通知**
   ```json
   {
     "notification": {
       "feishu": {
         "webhook_url": "${FEISHU_WEBHOOK_URL}",
         "enabled": true
       }
     }
   }
   ```

通知内容包括：
- MR基本信息
- 代码变更统计
- AI分析结果
- 潜在问题提醒

## 🚀 使用方法

### 命令行使用

```bash
# 基础用法
node pr-reviewer.js "项目名称" MR编号

# 示例
node pr-reviewer.js "ZM App" 161
```

### 脚本快捷方式

```bash
# 使用简化脚本
./review.sh "项目名称" MR编号

# 示例
./review.sh "ZM App" 161
```

### NPM脚本

```bash
# 检查配置
npm run check-config

# 开发模式（详细日志）
npm run dev "项目名称" MR编号
```

## 使用方法

### 方法1: 使用批处理脚本 (推荐Windows用户)

```batch
review-pr.bat "ZM App" 161
```

### 方法2: 使用PowerShell脚本

```powershell
.\review-pr.ps1 "ZM App" 161
```

### 方法3: 直接使用Node.js

```bash
node pr-reviewer.js "ZM App" 161
```

## 参数说明

- **项目名称**: 在config.json中配置的项目名称
- **PR编号**: GitLab中的Merge Request IID (内部编号)

## 输出结果

脚本执行完成后，会在 `reports` 目录下生成 `review_gir.txt` 文件，包含：

- ✅ PR基本信息 (标题、作者、分支等)
- 📈 代码变更统计 (文件数、行数变化)
- 📋 文件变更详情 (新增、修改、删除的文件)
- ⚠️ 潜在问题检测 (console.log、TODO注释等)
- 💬 现有评论汇总
- 🎯 Review建议
- 📄 详细代码差异

## 报告示例

```markdown
# PR Review 报告

## 基本信息
- **项目名称**: ZM App
- **PR编号**: 161
- **PR标题**: 添加用户认证功能
- **状态**: opened
- **作者**: 张三
- **源分支**: feature/user-auth
- **目标分支**: main

## 代码变更分析
- **总文件数**: 5
- **新增行数**: 234
- **删除行数**: 12
- **净增行数**: 222

### 文件变更详情
**新增文件 (2):**
- src/auth/login.js
- src/auth/register.js

**修改文件 (3):**
- src/app.js
- src/routes/index.js
- package.json

## ⚠️ 潜在问题
- src/auth/login.js: 包含 console.log 语句
- src/auth/register.js: 包含 TODO 注释

## Review 建议
- ✅ 未发现明显的代码质量问题
- 📝 建议详细测试所有修改的功能
- 🔍 建议检查是否需要更新相关文档
```

## 高级配置

### 自定义检查规则

在 `config.json` 中的 `review_settings` 部分可以配置：

```json
{
  "review_settings": {
    "max_files_warning": 20,        // 文件数量警告阈值
    "max_lines_warning": 1000,      // 新增行数警告阈值
    "include_detailed_diff": true,  // 是否包含详细代码差异
    "check_console_logs": true,     // 检查console.log
    "check_todos": true             // 检查TODO注释
  }
}
```

### 添加新项目

在 `config.json` 的 `projects` 部分添加新项目：

```json
{
  "projects": {
    "新项目名": {
      "id": 新项目的GitLab项目ID,
      "description": "项目描述"
    }
  }
}
```

## 错误处理

- ❌ 项目未配置: 请在config.json中添加项目配置
- ❌ GitLab连接失败: 检查token和host配置
- ❌ MR不存在: 确认PR编号是否正确
- ❌ 权限不足: 确认GitLab token有足够权限

## 注意事项

1. 确保GitLab token有读取项目和MR的权限
2. PR编号使用的是GitLab中的IID（内部编号），不是全局ID
3. 报告文件会覆盖之前的内容，如需保留多个报告请手动重命名
4. 大型PR的详细代码差异可能很长，可通过配置关闭

## 故障排除

### 常见问题

1. **"未找到Node.js"**
   - 解决方案: 安装Node.js (建议v14+)

2. **"依赖安装失败"**
   - 解决方案: 检查网络连接，尝试 `npm install --registry=https://registry.npmmirror.com`

3. **"项目未配置"**
   - 解决方案: 在config.json中添加项目配置

4. **"GitLab API调用失败"**
   - 解决方案: 检查token权限和网络连接

## 许可证

MIT License
