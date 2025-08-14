# 配置指南

> 完整的配置文件说明和最佳实践，帮助您快速搭建和定制PR Review Automation

## 📁 配置文件结构

```
config/
├── config.json                          # 主配置文件
├── unified-flutter-review-config.json   # Flutter项目专用配置
└── review-standards-config.json         # 评审标准配置（如果存在）
```

## 🔧 主配置文件详解

### config.json 完整结构

```json
{
  "gitlab_config": {
    "url": "https://gitlab.example.com",
    "token": "${GITLAB_TOKEN}",
    "api_version": "v4"
  },
  "projects": [
    {
      "name": "ZM App",
      "id": 123,
      "path": "mobile/zm-app",
      "namespace": "mobile-team",
      "language": "flutter",
      "branch": "master"
    }
  ],
  "review_settings": {
    "ai_provider": "github_copilot",
    "fallback_providers": ["openai"],
    "chunk_size": 3000,
    "chunk_overlap": 200,
    "max_chunks": 10,
    "parallel_analysis": true,
    "enable_security_scan": true,
    "enable_performance_analysis": true
  },
  "ai_config": {
    "github_copilot": {
      "api_key": "${GITHUB_COPILOT_TOKEN}",
      "model": "gpt-4.1",
      "max_tokens": 4000,
      "temperature": 0.3,
      "timeout": 60000,
      "max_retries": 3,
      "retry_delay": 1000
    },
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "model": "gpt-4",
      "base_url": "https://api.openai.com/v1",
      "max_tokens": 4000,
      "temperature": 0.3
    },
    "aliyun_bailian": {
      "api_key": "${ALIYUN_BAILIAN_API_KEY}",
      "model": "qwen-plus",
      "max_tokens": 4000,
      "temperature": 0.3,
      "max_retries": 3,
      "retry_delay": 1000
    }
  },
  "notification": {
    "feishu": {
      "enabled": true,
      "webhook_url": "${FEISHU_WEBHOOK_URL}",
      "mention_all": false,
      "mention_users": ["@user1", "@user2"]
    },
    "email": {
      "enabled": false,
      "smtp_server": "smtp.example.com",
      "smtp_port": 587,
      "username": "${EMAIL_USERNAME}",
      "password": "${EMAIL_PASSWORD}",
      "recipients": ["developer@example.com"]
    }
  },
  "output": {
    "save_reports": true,
    "reports_dir": "reports",
    "format": ["markdown", "json"],
    "include_debug_info": false,
    "enable_file_server": true,
    "file_server_port": 3000
  },
  "security": {
    "data_masking": true,
    "mask_patterns": [
      "password\\s*=\\s*['\"][^'\"]*['\"]",
      "token\\s*=\\s*['\"][^'\"]*['\"]",
      "api_key\\s*=\\s*['\"][^'\"]*['\"]"
    ],
    "network_isolation": false
  },
  "performance": {
    "concurrent_requests": 3,
    "rate_limit": {
      "requests_per_minute": 60,
      "burst_size": 10
    },
    "cache_enabled": false,
    "cache_ttl": 3600
  },
  "logging": {
    "level": "info",
    "enable_file_logging": true,
    "log_dir": "logs",
    "max_log_files": 10,
    "log_requests": true,
    "log_responses": false
  }
}
```

## 📋 配置项详细说明

### 🦊 GitLab配置 (gitlab_config)

```json
{
  "gitlab_config": {
    "url": "https://gitlab.example.com",     // GitLab服务器地址
    "token": "${GITLAB_TOKEN}",              // 访问令牌（从环境变量读取）
    "api_version": "v4"                      // API版本，通常为v4
  }
}
```

**获取GitLab Token步骤：**
1. 登录GitLab → 用户设置 → 访问令牌
2. 创建新令牌，权限选择：`api`, `read_user`, `read_repository`
3. 复制生成的令牌到 `.env` 文件

### 📁 项目配置 (projects)

```json
{
  "projects": [
    {
      "name": "ZM App",                      // 项目显示名称
      "id": 123,                             // GitLab项目ID（可选）
      "path": "mobile/zm-app",               // 项目路径（可选）
      "namespace": "mobile-team",            // 命名空间（可选）
      "language": "flutter",                 // 主要编程语言
      "branch": "master"                     // 默认分支
    }
  ]
}
```

**项目查找优先级：**
1. 通过项目名称进行API搜索
2. 使用配置文件中的ID
3. 使用配置文件中的路径

### ⚙️ 评审设置 (review_settings)

```json
{
  "review_settings": {
    "ai_provider": "github_copilot",         // 主要AI提供商
    "fallback_providers": ["openai"],        // 备用AI提供商
    "chunk_size": 3000,                      // 代码分块大小（字符）
    "chunk_overlap": 200,                    // 分块重叠部分
    "max_chunks": 10,                        // 最大分块数量
    "parallel_analysis": true,               // 是否并行分析
    "enable_security_scan": true,            // 启用安全扫描
    "enable_performance_analysis": true      // 启用性能分析
  }
}
```

### 🤖 AI配置 (ai_config)

#### GitHub Copilot配置
```json
{
  "github_copilot": {
    "api_key": "${GITHUB_COPILOT_TOKEN}",   // API密钥
    "model": "gpt-4.1",                     // 模型名称
    "max_tokens": 4000,                     // 最大响应长度
    "temperature": 0.3,                     // 创造性程度(0-1)
    "timeout": 60000,                       // 超时时间(毫秒)
    "max_retries": 3,                       // 最大重试次数
    "retry_delay": 1000                     // 重试间隔(毫秒)
  }
}
```

#### OpenAI配置
```json
{
  "openai": {
    "api_key": "${OPENAI_API_KEY}",         // API密钥
    "model": "gpt-4",                       // 模型名称
    "base_url": "https://api.openai.com/v1", // API基础URL
    "max_tokens": 4000,                     // 最大响应长度
    "temperature": 0.3                      // 创造性程度
  }
}
```

#### 阿里云百炼配置
```json
{
  "aliyun_bailian": {
    "api_key": "${ALIYUN_BAILIAN_API_KEY}", // API密钥
    "model": "qwen-plus",                   // 模型名称
    "max_tokens": 4000,                     // 最大响应长度
    "temperature": 0.3,                     // 创造性程度
    "max_retries": 3,                       // 最大重试次数
    "retry_delay": 1000                     // 重试间隔
  }
}
```

### 📱 通知配置 (notification)

#### 飞书通知
```json
{
  "feishu": {
    "enabled": true,                        // 是否启用飞书通知
    "webhook_url": "${FEISHU_WEBHOOK_URL}", // Webhook地址
    "mention_all": false,                   // 是否@所有人
    "mention_users": ["@user1", "@user2"]   // 特定@用户列表
  }
}
```

#### 邮件通知
```json
{
  "email": {
    "enabled": false,                       // 是否启用邮件通知
    "smtp_server": "smtp.example.com",     // SMTP服务器
    "smtp_port": 587,                       // SMTP端口
    "username": "${EMAIL_USERNAME}",        // 邮箱用户名
    "password": "${EMAIL_PASSWORD}",        // 邮箱密码
    "recipients": ["dev@example.com"]       // 收件人列表
  }
}
```

### 📄 输出配置 (output)

```json
{
  "output": {
    "save_reports": true,                   // 是否保存报告
    "reports_dir": "reports",               // 报告目录
    "format": ["markdown", "json"],         // 输出格式
    "include_debug_info": false,            // 是否包含调试信息
    "enable_file_server": true,             // 启用文件服务器
    "file_server_port": 3000                // 文件服务器端口
  }
}
```

### 🔒 安全配置 (security)

```json
{
  "security": {
    "data_masking": true,                   // 启用数据脱敏
    "mask_patterns": [                      // 脱敏规则
      "password\\s*=\\s*['\"][^'\"]*['\"]",
      "token\\s*=\\s*['\"][^'\"]*['\"]"
    ],
    "network_isolation": false              // 网络隔离
  }
}
```

### ⚡ 性能配置 (performance)

```json
{
  "performance": {
    "concurrent_requests": 3,               // 并发请求数
    "rate_limit": {                         // 速率限制
      "requests_per_minute": 60,
      "burst_size": 10
    },
    "cache_enabled": false,                 // 缓存（注意：不建议启用）
    "cache_ttl": 3600                       // 缓存过期时间
  }
}
```

### 📝 日志配置 (logging)

```json
{
  "logging": {
    "level": "info",                        // 日志级别
    "enable_file_logging": true,            // 启用文件日志
    "log_dir": "logs",                      // 日志目录
    "max_log_files": 10,                    // 最大日志文件数
    "log_requests": true,                   // 记录请求日志
    "log_responses": false                  // 记录响应日志
  }
}
```

## 🌍 环境变量配置

### .env 文件示例

```env
# GitLab配置
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_URL=https://gitlab.example.com

# AI服务配置
GITHUB_COPILOT_TOKEN=ghu_xxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
ALIYUN_BAILIAN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# 通知配置
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx

# 邮件配置（可选）
EMAIL_USERNAME=notification@example.com
EMAIL_PASSWORD=your_email_password

# 调试配置（可选）
DEBUG=false
DEBUG_AI=false
DEBUG_API=false

# 安全配置（可选）
NODE_TLS_REJECT_UNAUTHORIZED=1
```

## 📊 配置验证

### 自动配置检查
```bash
# 检查所有配置
npm run check-config

# 检查特定AI提供商
npm run test-ai github_copilot
npm run test-ai openai

# 检查飞书通知
npm run check-feishu

# 验证项目访问权限
npm run check-project-access "项目名称"
```

### 配置文件验证
```bash
# 验证JSON格式
npm run validate-config

# 检查必需字段
npm run check-required-fields

# 测试环境变量
npm run test-env-vars
```

## 🛠️ 配置管理命令

### AI提供商切换
```bash
# 切换到GitHub Copilot
npm run switch-ai github_copilot

# 切换到OpenAI
npm run switch-ai openai

# 切换到阿里云百炼
npm run switch-ai aliyun_bailian
```

### 配置备份和恢复
```bash
# 备份当前配置
npm run backup-config

# 恢复配置
npm run restore-config backup-20241201.json

# 重置为默认配置
npm run reset-config
```

## 🎯 不同场景的配置示例

### 企业内网环境
```json
{
  "gitlab_config": {
    "url": "https://gitlab.company.internal",
    "token": "${GITLAB_TOKEN}"
  },
  "security": {
    "data_masking": true,
    "network_isolation": true
  },
  "ai_config": {
    "github_copilot": {
      "timeout": 120000,
      "max_retries": 5
    }
  }
}
```

### 高并发环境
```json
{
  "performance": {
    "concurrent_requests": 5,
    "rate_limit": {
      "requests_per_minute": 120,
      "burst_size": 20
    }
  },
  "review_settings": {
    "parallel_analysis": true,
    "chunk_size": 2000
  }
}
```

### 开发调试环境
```json
{
  "logging": {
    "level": "debug",
    "log_requests": true,
    "log_responses": true
  },
  "output": {
    "include_debug_info": true
  }
}
```

## 🚨 常见配置错误

### 1. 环境变量未设置
```bash
Error: GITLAB_TOKEN is not defined
```
**解决方案**：检查 `.env` 文件是否存在且包含所需变量

### 2. JSON格式错误
```bash
Error: Unexpected token in JSON
```
**解决方案**：使用JSON验证器检查配置文件格式

### 3. API密钥无效
```bash
Error: 401 Unauthorized
```
**解决方案**：检查API密钥是否正确和有效

### 4. 项目访问权限
```bash
Error: Project not found or access denied
```
**解决方案**：检查GitLab Token权限和项目访问权限

## 📈 配置优化建议

### 性能优化
1. **合理设置chunk_size**：根据AI模型限制调整
2. **启用并行分析**：提高处理速度
3. **设置合适的超时时间**：避免长时间等待
4. **配置重试机制**：提高稳定性

### 成本控制
1. **选择合适的AI模型**：平衡质量和成本
2. **设置token限制**：控制单次分析成本
3. **使用经济型模型**：适合大批量分析
4. **启用速率限制**：避免意外超额

### 安全考虑
1. **启用数据脱敏**：保护敏感信息
2. **使用环境变量**：避免硬编码密钥
3. **网络隔离配置**：企业环境必需
4. **日志安全**：避免记录敏感信息

---

**🎯 现在您已经掌握了完整的配置方法，可以根据实际需求定制最适合的配置！**
