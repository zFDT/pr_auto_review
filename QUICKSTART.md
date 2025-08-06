# 快速启动指南

## 常用命令

```bash
# 1. 检查配置是否正确
npm run check-config

# 2. 检查飞书通知配置
npm run check-feishu

# 3. 评审指定MR
node pr-reviewer.js "ZM App" 161

# 4. 使用简化脚本
./review.sh "ZM App" 161

# 5. 开发模式（显示详细日志）
DEBUG=true node pr-reviewer.js "ZM App" 161
```

## 评审报告位置

- 文本报告：`reports/review_git_{MR编号}.txt`
- JSON数据：`reports/feishu_card_{MR编号}.json`

## 飞书通知设置

1. **获取Webhook URL**：在飞书群中添加自定义机器人
2. **配置环境变量**：在 `.env` 文件中设置 `FEISHU_WEBHOOK_URL`
3. **测试配置**：运行 `npm run check-feishu`

成功配置后，每次评审都会自动发送通知到飞书群。

## 故障排除

### 1. 配置错误
```bash
npm run check-config
```

### 2. 飞书通知问题
```bash
npm run check-feishu
```

### 3. 依赖问题
```bash
npm install
```

### 4. 权限问题
```bash
chmod +x ./review.sh
```

### 5. 环境变量
检查 `.env` 文件是否配置正确：
```
GITLAB_TOKEN=your_token_here
OPENAI_API_KEY=your_key_here
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your_id
```
