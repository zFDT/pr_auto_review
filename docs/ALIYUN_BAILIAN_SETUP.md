# 阿里云百炼大模型配置指南

阿里云百炼大模型服务平台是阿里云提供的企业级大模型服务，支持多种先进的AI模型，包括通义千问系列。

## 配置步骤

### 1. 获取API凭证

1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 登录您的阿里云账号
3. 创建或选择一个工作空间
4. 在工作空间中获取以下信息：
   - API Key (API密钥)
   - Workspace ID (工作空间ID)

### 2. 环境变量配置

将以下环境变量添加到您的 `.env` 文件或系统环境变量中：

```bash
# 阿里云百炼配置
ALIYUN_BAILIAN_API_KEY=your_api_key_here
ALIYUN_BAILIAN_WORKSPACE_ID=your_workspace_id_here
ALIYUN_BAILIAN_MODEL=qwen-max  # 可选，默认使用qwen-max
ALIYUN_BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1  # 可选，默认地址
```

### 3. 配置文件设置

在 `config.json` 中的 `ai_config` 部分已经包含了阿里云百炼的配置：

```json
{
  "ai_config": {
    "aliyun_bailian": {
      "api_key": "${ALIYUN_BAILIAN_API_KEY}",
      "model": "qwen-max",
      "workspace_id": "${ALIYUN_BAILIAN_WORKSPACE_ID}",
      "base_url": "https://dashscope.aliyuncs.com/api/v1",
      "timeout": 30000,
      "max_tokens": 4000,
      "temperature": 0.1
    }
  }
}
```

## 支持的模型

阿里云百炼支持多种模型，您可以根据需求选择：

### 通义千问系列
- `qwen-max`: 最强版本，适合复杂任务
- `qwen-plus`: 增强版本，平衡性能和成本
- `qwen-turbo`: 标准版本，快速响应

### 其他模型
- `baichuan2-13b-chat-v1`: 百川大模型
- `chatglm3-6b`: ChatGLM3模型

## 使用方式

### 1. 作为独立分析器使用

将 `ai_provider` 设置为 `aliyun_bailian` 或 `bailian`：

```json
{
  "review_settings": {
    "ai_provider": "aliyun_bailian",
    "enable_ai_analysis": true
  }
}
```

## 测试配置

运行以下命令测试阿里云百炼配置：

```bash
node test-aliyun-bailian.js
```

测试将验证：
- ✅ 配置完整性
- ✅ API连接状态
- ✅ 分析功能
- ✅ 性能表现

## 特色功能

### 智能代码审查
- 深度语义理解
- 多语言代码分析
- 安全漏洞检测
- 性能优化建议

### 结构化输出
- 量化评分 (1-10分)
- 风险等级评估
- 分类问题报告
- 具体改进建议

### 高性能处理
- 大文件分块处理
- 智能缓存机制
- 并发请求控制
- 错误重试机制

## 成本说明

阿里云百炼为付费服务，定价基于：
- 输入token数量
- 输出token数量
- 选择的模型类型

建议：
- 开发测试时使用 `qwen-turbo`
- 生产环境可选择 `qwen-max`
- 合理配置 `max_tokens` 控制成本

## 故障排除

### 常见错误及解决方案

1. **配置错误**
   ```
   错误: 阿里云百炼配置不完整
   解决: 检查API_KEY和WORKSPACE_ID是否正确设置
   ```

2. **认证失败**
   ```
   错误: 401 Unauthorized
   解决: 验证API密钥是否有效，是否有足够权限
   ```

3. **配额超限**
   ```
   错误: 429 Too Many Requests
   解决: 检查账户配额，考虑升级服务或优化请求频率
   ```

4. **网络超时**
   ```
   错误: Request timeout
   解决: 增加timeout设置或检查网络连接
   ```

## 最佳实践

1. **API密钥安全**
   - 不要在代码中硬编码密钥
   - 使用环境变量或安全的配置管理
   - 定期轮换API密钥

2. **性能优化**
   - 合理设置max_tokens限制
   - 使用缓存避免重复分析
   - 批处理小文件减少API调用

3. **成本控制**
   - 监控token使用量
   - 设置合理的超时时间
   - 选择适合场景的模型

4. **错误处理**
   - 实现重试机制
   - 提供降级方案
   - 记录详细的错误日志

## 技术支持

如遇问题，可以：
1. 查看阿里云百炼官方文档
2. 检查控制台日志输出
3. 运行测试脚本诊断问题
4. 联系阿里云技术支持
