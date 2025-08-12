# PR评审报告文件服务器

## 概述

这个文件服务器为PR评审报告提供HTTP访问功能，支持开机自动启动，让团队成员可以通过URL直接访问评审报告文件。

## 功能特性

- 🚀 **开机自动启动**: 使用macOS launchd服务，系统启动时自动运行
- 🌐 **外部访问**: 支持局域网内其他设备访问报告文件
- 📁 **目录浏览**: 提供reports目录的文件列表和下载功能
- 🔄 **自动恢复**: 服务异常退出时自动重启
- 📊 **状态监控**: 提供服务状态查询和日志查看功能

## 快速开始

### 1. 安装自动启动服务

```bash
# 安装服务（推荐）
./install-file-server.sh install

# 查看服务状态
./install-file-server.sh status

# 测试服务器连接
./install-file-server.sh test
```

### 2. 手动管理服务器

```bash
# 启动文件服务器
./file-server.sh start

# 停止文件服务器
./file-server.sh stop

# 重启文件服务器
./file-server.sh restart

# 查看服务器状态
./file-server.sh status
```

## 访问地址

安装成功后，您可以通过以下地址访问报告文件：

- **本地访问**: http://localhost:8899
- **报告目录**: http://localhost:8899/reports/
- **外部访问**: http://[您的IP]:8899 (例如: http://192.168.1.100:8899)

## 服务管理

### 系统服务管理

```bash
# 安装开机自动启动服务
./install-file-server.sh install

# 卸载自动启动服务
./install-file-server.sh uninstall

# 重启服务
./install-file-server.sh restart

# 查看服务状态
./install-file-server.sh status

# 查看服务日志
./install-file-server.sh logs
```

### 手动服务管理

```bash
# 使用launchctl直接管理
launchctl list | grep com.dreame.pr-review.file-server
launchctl unload ~/Library/LaunchAgents/com.dreame.pr-review.file-server.plist
launchctl load ~/Library/LaunchAgents/com.dreame.pr-review.file-server.plist
```

## 配置选项

### 环境变量

- `SERVER_PORT`: 服务器端口（默认: 8899）
- `SERVER_HOST`: 绑定地址（默认: 0.0.0.0，允许外部访问）

### 修改端口

```bash
# 临时修改端口
SERVER_PORT=9000 ./file-server.sh start

# 修改自动启动服务的端口
# 编辑 com.dreame.pr-review.file-server.plist 文件中的 SERVER_PORT 值
# 然后重新安装服务
./install-file-server.sh uninstall
./install-file-server.sh install
```

## 日志文件

服务运行时会生成以下日志文件：

- `file-server.log`: 文件服务器运行日志
- `launchd.log`: launchd服务标准输出
- `launchd.error.log`: launchd服务错误输出

## 故障排除

### 服务无法启动

1. 检查端口是否被占用：
   ```bash
   lsof -i :8899
   ```

2. 查看服务日志：
   ```bash
   ./install-file-server.sh logs
   ```

3. 检查权限：
   ```bash
   ls -la file-server.sh
   ls -la install-file-server.sh
   ```

### 外部无法访问

1. 检查防火墙设置
2. 确认服务器绑定到 0.0.0.0 而不是 127.0.0.1
3. 获取正确的IP地址：
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

### 重新安装服务

```bash
# 完全重新安装
./install-file-server.sh uninstall
./install-file-server.sh install
```

## 安全注意事项

- 服务器默认允许访问整个项目目录
- 在生产环境中建议限制访问权限
- 考虑使用防火墙限制访问IP范围
- 定期检查和清理旧的报告文件

## 集成使用

自动评审脚本会自动检测文件服务器状态：

- 如果系统服务运行中，直接使用
- 如果系统服务未运行，会启动临时服务器
- 评审完成后，飞书通知中会包含报告文件的URL链接

推荐安装系统服务以获得最佳体验：

```bash
./install-file-server.sh install
```

## 支持

如果遇到问题，请：

1. 查看日志文件
2. 运行状态检查命令
3. 检查系统要求和权限设置

文件服务器基于Python的内置HTTP服务器，要求系统已安装Python 3或Python 2。
