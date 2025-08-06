# PR Review 自动化工具

## 概述

这是一个自动化的PR review工具，能够自动分析GitLab上的Merge Request，生成详细的review报告，并保存到文件中。

## 功能特性

- 🔍 自动获取MR详细信息
- 📊 分析代码变更统计
- 💬 提取现有评论和讨论
- ⚠️ 检测潜在代码问题
- 📝 生成结构化review报告
- 💾 保存报告到指定文件

## 安装和配置

### 1. 安装依赖

```bash
npm install
```

### 2. 配置项目

编辑 `config.json` 文件，添加你的项目配置：

```json
{
  "gitlab": {
    "host": "your-gitlab-host.com",
    "token": "your-gitlab-token"
  },
  "projects": {
    "你的项目名": {
      "id": 项目ID,
      "description": "项目描述"
    }
  }
}
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

脚本执行完成后，会在 `reports` 目录下生成 `review_gir.text` 文件，包含：

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
