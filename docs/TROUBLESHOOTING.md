# 故障排除指南

> 快速诊断和解决PR Review Automation使用过程中的常见问题

## 🚨 常见问题分类

### 📋 问题诊断流程
```
1. 确定问题类型 → 2. 运行诊断命令 → 3. 查看日志 → 4. 应用解决方案
```

| 问题类型 | 诊断命令 | 常见原因 |
|----------|----------|----------|
| **配置问题** | `npm run check-config` | 环境变量、JSON格式错误 |
| **网络连接** | `npm run test-ai` | API密钥、网络阻塞 |
| **权限问题** | `npm run check-project-access` | GitLab Token权限不足 |
| **飞书通知** | `npm run check-feishu` | Webhook URL错误 |

## 🔧 配置相关问题

### ❌ 问题1: 配置文件错误
```bash
Error: Cannot load config file: /path/to/config.json
SyntaxError: Unexpected token } in JSON
```

**诊断命令：**
```bash
npm run check-config
```

**解决方案：**
1. **检查JSON格式**
   ```bash
   # 使用jq验证JSON格式
   jq . config/config.json
   ```

2. **常见JSON错误修复**
   ```json
   // ❌ 错误：多余的逗号
   {
     "ai_provider": "github_copilot",
   }
   
   // ✅ 正确：移除多余逗号
   {
     "ai_provider": "github_copilot"
   }
   ```

3. **重置配置文件**
   ```bash
   # 备份当前配置
   cp config/config.json config/config.json.backup
   
   # 使用默认配置
   npm run reset-config
   ```

### ❌ 问题2: 环境变量未设置
```bash
Error: Environment variable GITLAB_TOKEN is not defined
```

**诊断步骤：**
```bash
# 检查环境变量
echo $GITLAB_TOKEN
echo $GITHUB_COPILOT_TOKEN
echo $OPENAI_API_KEY

# 检查.env文件
cat .env
```

**解决方案：**
1. **创建.env文件**
   ```bash
   cp .env.example .env
   vim .env
   ```

2. **正确配置环境变量**
   ```env
   # GitLab配置
   GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
   
   # AI服务配置（选择一种）
   GITHUB_COPILOT_TOKEN=ghu_xxxxxxxxxxxxxxxxxxxx
   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
   
   # 可选配置
   FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx
   ```

3. **验证配置**
   ```bash
   npm run check-config
   ```

### ❌ 问题3: 项目配置错误
```bash
Error: Project "ZM App" not found in GitLab or config
```

**诊断命令：**
```bash
npm run check-project-access "ZM App"
```

**解决方案：**
1. **检查项目名称**
   ```bash
   # 列出GitLab中的项目
   curl -H "Authorization: Bearer $GITLAB_TOKEN" \
        "$GITLAB_URL/api/v4/projects?membership=true&simple=true"
   ```

2. **更新项目配置**
   ```json
   {
     "projects": [
       {
         "name": "ZM App",           // 确保名称正确
         "id": 123,                  // 可选：直接使用项目ID
         "path": "mobile/zm-app",    // 可选：项目路径
         "namespace": "mobile-team"  // 可选：命名空间
       }
     ]
   }
   ```

## 🔌 网络连接问题

### ❌ 问题4: GitLab API连接失败
```bash
Error: connect ENOTFOUND gitlab.example.com
```

**诊断步骤：**
```bash
# 测试网络连通性
ping gitlab.example.com
curl -I https://gitlab.example.com

# 测试API访问
curl -H "Authorization: Bearer $GITLAB_TOKEN" \
     "https://gitlab.example.com/api/v4/user"
```

**解决方案：**
1. **检查网络连接**
   ```bash
   # 检查DNS解析
   nslookup gitlab.example.com
   
   # 检查防火墙设置
   telnet gitlab.example.com 443
   ```

2. **验证GitLab Token**
   ```bash
   # 检查Token是否有效
   npm run test-gitlab-connection
   ```

3. **配置代理（如果需要）**
   ```bash
   export HTTP_PROXY=http://proxy.company.com:8080
   export HTTPS_PROXY=http://proxy.company.com:8080
   ```

### ❌ 问题5: AI服务连接失败
```bash
Error: Request failed with status code 401
Error: connect ETIMEDOUT 
```

**诊断命令：**
```bash
# 测试不同AI提供商
npm run test-ai github_copilot
npm run test-ai openai
npm run test-ai aliyun_bailian
```

**解决方案：**

#### GitHub Copilot问题
```bash
# 检查Copilot订阅状态
gh copilot status

# 重新获取Token
gh auth token
```

#### OpenAI问题
```bash
# 测试API连接
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     "https://api.openai.com/v1/models"

# 检查账户余额
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     "https://api.openai.com/v1/usage"
```

#### 阿里云百炼问题
```bash
# 测试API连接
curl -H "Authorization: Bearer $ALIYUN_BAILIAN_API_KEY" \
     "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
```

## 🔐 权限相关问题

### ❌ 问题6: GitLab权限不足
```bash
Error: 403 Forbidden - Insufficient permissions
```

**诊断步骤：**
```bash
# 检查当前用户权限
curl -H "Authorization: Bearer $GITLAB_TOKEN" \
     "$GITLAB_URL/api/v4/user"

# 检查项目访问权限
curl -H "Authorization: Bearer $GITLAB_TOKEN" \
     "$GITLAB_URL/api/v4/projects/123"
```

**解决方案：**
1. **检查Token权限范围**
   - 访问GitLab → 用户设置 → 访问令牌
   - 确保包含以下权限：`api`, `read_user`, `read_repository`

2. **检查项目访问权限**
   - 确保用户对项目有读取权限
   - 项目设置 → 成员 → 添加用户

3. **重新创建Token**
   ```bash
   # 删除旧Token，创建新Token
   # 在GitLab中重新生成，更新.env文件
   ```

### ❌ 问题7: 文件系统权限
```bash
Error: EACCES: permission denied, mkdir 'reports'
```

**解决方案：**
```bash
# 检查目录权限
ls -la

# 修复权限
chmod 755 .
chmod +x review.sh

# 创建必要目录
mkdir -p reports logs temp
chmod 755 reports logs temp
```

## 📱 飞书通知问题

### ❌ 问题8: 飞书Webhook失败
```bash
Error: Failed to send Feishu notification: 400 Bad Request
```

**诊断命令：**
```bash
npm run check-feishu
```

**解决方案：**
1. **验证Webhook URL**
   ```bash
   # 测试Webhook连接
   curl -X POST -H "Content-Type: application/json" \
        -d '{"msg_type":"text","content":{"text":"测试消息"}}' \
        "$FEISHU_WEBHOOK_URL"
   ```

2. **检查URL格式**
   ```bash
   # 正确格式示例
   FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

3. **重新创建机器人**
   - 在飞书群中删除现有机器人
   - 重新添加自定义机器人
   - 更新Webhook URL

## 🚀 性能相关问题

### ❌ 问题9: 分析速度过慢
```bash
Warning: Analysis taking longer than expected (>5 minutes)
```

**诊断和优化：**
```bash
# 启用性能监控
DEBUG_PERFORMANCE=true node pr-reviewer.js "项目名" MR号
```

**解决方案：**
1. **优化代码分块配置**
   ```json
   {
     "review_settings": {
       "chunk_size": 2000,        // 减小分块大小
       "max_chunks": 5,           // 限制最大分块数
       "parallel_analysis": true   // 启用并行分析
     }
   }
   ```

2. **切换更快的AI模型**
   ```json
   {
     "ai_config": {
       "github_copilot": {
         "model": "gpt-4o-mini"    // 使用更快的模型
       }
     }
   }
   ```

### ❌ 问题10: 内存使用过高
```bash
Error: JavaScript heap out of memory
```

**解决方案：**
```bash
# 增加Node.js内存限制
node --max-old-space-size=4096 pr-reviewer.js "项目名" MR号

# 或者设置环境变量
export NODE_OPTIONS="--max-old-space-size=4096"
```

## 🔍 调试技巧

### 启用详细日志
```bash
# 基础调试
DEBUG=true node pr-reviewer.js "项目名" MR号

# AI调试
DEBUG_AI=true node pr-reviewer.js "项目名" MR号

# API调试
DEBUG_API=true node pr-reviewer.js "项目名" MR号

# 性能调试
DEBUG_PERFORMANCE=true node pr-reviewer.js "项目名" MR号

# 全量调试
DEBUG=true DEBUG_AI=true DEBUG_API=true node pr-reviewer.js "项目名" MR号
```

### 查看系统状态
```bash
# 系统健康检查
npm run health-check

# 查看配置状态
npm run show-config

# 查看项目结构
npm run show-structure

# 清理临时文件
npm run clean
```

### 日志文件分析
```bash
# 查看最新日志
tail -f logs/pr-review-$(date +%Y-%m-%d).log

# 搜索错误信息
grep "ERROR" logs/*.log

# 分析API调用
grep "API Request" logs/*.log | tail -10
```

## 📊 性能优化建议

### 1. 配置优化
```json
{
  "performance": {
    "concurrent_requests": 3,      // 适度并发
    "rate_limit": {
      "requests_per_minute": 60,   // 控制请求频率
      "burst_size": 10
    }
  },
  "review_settings": {
    "chunk_size": 2500,            // 平衡质量和速度
    "parallel_analysis": true,     // 启用并行处理
    "max_chunks": 8                // 限制分块数量
  }
}
```

### 2. 环境优化
```bash
# 使用更快的DNS
export DNS_SERVER=8.8.8.8

# 优化网络连接
export NODE_TLS_REJECT_UNAUTHORIZED=0  # 仅限开发环境

# 增加连接池
export UV_THREADPOOL_SIZE=16
```

## 🆘 紧急恢复方案

### 完全重置系统
```bash
# 1. 备份重要数据
cp config/config.json config/config.json.backup
cp .env .env.backup

# 2. 清理所有临时文件
npm run clean

# 3. 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 4. 重置配置
npm run reset-config

# 5. 重新配置
vim .env
vim config/config.json

# 6. 验证系统
npm run check-config
npm run health-check
```

### 快速验证系统
```bash
# 一键检查所有组件
npm run quick-check

# 输出示例：
# ✅ 配置文件: OK
# ✅ GitLab连接: OK  
# ✅ AI服务: OK
# ✅ 飞书通知: OK
# 🎉 系统状态: 正常
```

## 📞 获取帮助

### 自助诊断
1. **运行完整诊断**
   ```bash
   npm run full-diagnosis
   ```

2. **查看诊断报告**
   ```bash
   cat logs/diagnosis-$(date +%Y-%m-%d).log
   ```

### 技术支持
- **问题反馈**: 创建GitHub Issue，包含诊断日志
- **功能建议**: 参考[技术架构文档](TECHNICAL_ARCHITECTURE.md)
- **配置帮助**: 查看[配置指南](CONFIG_GUIDE.md)

---

**🎯 通过这个故障排除指南，您可以快速诊断和解决99%的常见问题！**

如果遇到文档中未涵盖的问题，请运行 `npm run full-diagnosis` 收集诊断信息，然后联系技术支持。
