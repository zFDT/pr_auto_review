#!/bin/bash

# PR评审报告文件服务器自动启动安装脚本

set -e

PROJECT_ROOT="/path/to/pr-review-automation"
PLIST_FILE="$PROJECT_ROOT/com.dreame.pr-review.file-server.plist"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"
SERVICE_LABEL="com.dreame.pr-review.file-server"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

# 安装服务
install_service() {
    log "🚀 安装PR评审报告文件服务器自动启动服务..."
    
    # 确保LaunchAgents目录存在
    mkdir -p "$LAUNCHD_DIR"
    
    # 停止现有服务（如果存在）
    if launchctl list | grep -q "$SERVICE_LABEL"; then
        warn "发现现有服务，正在停止..."
        launchctl unload "$LAUNCHD_DIR/$(basename "$PLIST_FILE")" 2>/dev/null || true
    fi
    
    # 复制plist文件到LaunchAgents目录
    cp "$PLIST_FILE" "$LAUNCHD_DIR/"
    info "✅ 服务配置文件已复制到: $LAUNCHD_DIR/$(basename "$PLIST_FILE")"
    
    # 加载服务
    launchctl load "$LAUNCHD_DIR/$(basename "$PLIST_FILE")"
    info "✅ 服务已加载并启动"
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if launchctl list | grep -q "$SERVICE_LABEL"; then
        log "✅ 文件服务器服务安装成功！"
        info "服务标签: $SERVICE_LABEL"
        info "服务将在开机时自动启动"
        
        # 测试服务器是否运行
        sleep 2
        test_server
    else
        error "❌ 服务安装失败"
        return 1
    fi
}

# 卸载服务
uninstall_service() {
    log "🛑 卸载PR评审报告文件服务器自动启动服务..."
    
    # 停止并卸载服务
    if launchctl list | grep -q "$SERVICE_LABEL"; then
        launchctl unload "$LAUNCHD_DIR/$(basename "$PLIST_FILE")" 2>/dev/null || true
        info "✅ 服务已停止并卸载"
    else
        warn "服务未运行"
    fi
    
    # 删除plist文件
    if [ -f "$LAUNCHD_DIR/$(basename "$PLIST_FILE")" ]; then
        rm "$LAUNCHD_DIR/$(basename "$PLIST_FILE")"
        info "✅ 服务配置文件已删除"
    fi
    
    # 手动停止文件服务器
    "$PROJECT_ROOT/file-server.sh" stop
    
    log "✅ 文件服务器服务卸载完成"
}

# 重启服务
restart_service() {
    log "🔄 重启PR评审报告文件服务器服务..."
    
    if launchctl list | grep -q "$SERVICE_LABEL"; then
        launchctl unload "$LAUNCHD_DIR/$(basename "$PLIST_FILE")"
        sleep 1
        launchctl load "$LAUNCHD_DIR/$(basename "$PLIST_FILE")"
        info "✅ 服务已重启"
        sleep 3
        test_server
    else
        warn "服务未运行，正在启动..."
        install_service
    fi
}

# 检查服务状态
status_service() {
    log "📊 检查PR评审报告文件服务器服务状态..."
    
    if launchctl list | grep -q "$SERVICE_LABEL"; then
        info "✅ launchd服务正在运行"
        
        # 获取服务详细信息
        local service_info=$(launchctl list | grep "$SERVICE_LABEL")
        info "服务信息: $service_info"
        
        # 检查实际的文件服务器
        "$PROJECT_ROOT/file-server.sh" status
    else
        warn "❌ launchd服务未运行"
        return 1
    fi
}

# 测试服务器
test_server() {
    log "🧪 测试文件服务器..."
    
    local server_url="http://localhost:8899"
    
    # 等待服务器启动
    sleep 2
    
    # 测试服务器连接
    if curl -s "$server_url" >/dev/null 2>&1; then
        log "✅ 文件服务器测试成功"
        info "本地访问地址: $server_url"
        info "报告目录: $server_url/reports/"
        
        # 获取外部IP
        local external_ip=$(ifconfig | grep -E "inet [0-9]" | grep -v "127.0.0.1" | head -1 | awk '{print $2}' || echo "localhost")
        if [ "$external_ip" != "localhost" ]; then
            info "外部访问地址: http://$external_ip:8899"
            info "外部报告目录: http://$external_ip:8899/reports/"
        fi
    else
        error "❌ 文件服务器测试失败"
        return 1
    fi
}

# 查看日志
show_logs() {
    log "📋 显示服务日志..."
    
    local log_files=(
        "$PROJECT_ROOT/launchd.log"
        "$PROJECT_ROOT/launchd.error.log"
        "$PROJECT_ROOT/file-server.log"
    )
    
    for log_file in "${log_files[@]}"; do
        if [ -f "$log_file" ]; then
            echo
            info "=== $log_file ==="
            tail -20 "$log_file"
        fi
    done
}

# 使用说明
usage() {
    echo "PR评审报告文件服务器自动启动管理脚本"
    echo
    echo "用法："
    echo "  $0 {install|uninstall|restart|status|test|logs}"
    echo
    echo "命令："
    echo "  install    安装自动启动服务"
    echo "  uninstall  卸载自动启动服务"
    echo "  restart    重启服务"
    echo "  status     查看服务状态"
    echo "  test       测试服务器连接"
    echo "  logs       查看服务日志"
    echo
    echo "安装后，文件服务器将在开机时自动启动"
    echo "默认端口: 8899"
    echo "访问地址: http://localhost:8899"
    echo
}

# 检查必要文件
check_prerequisites() {
    if [ ! -f "$PROJECT_ROOT/file-server.sh" ]; then
        error "文件服务器脚本不存在: $PROJECT_ROOT/file-server.sh"
        exit 1
    fi
    
    if [ ! -f "$PLIST_FILE" ]; then
        error "服务配置文件不存在: $PLIST_FILE"
        exit 1
    fi
    
    if [ ! -x "$PROJECT_ROOT/file-server.sh" ]; then
        error "文件服务器脚本没有执行权限"
        exit 1
    fi
}

# 主逻辑
case "${1:-install}" in
    install)
        check_prerequisites
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    restart)
        check_prerequisites
        restart_service
        ;;
    status)
        status_service
        ;;
    test)
        test_server
        ;;
    logs)
        show_logs
        ;;
    *)
        usage
        exit 1
        ;;
esac
