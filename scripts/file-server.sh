#!/bin/bash

# PR评审报告文件服务器
# 用于对外提供评审报告文件的HTTP访问

# 配置
PROJECT_ROOT="/path/to/pr-review-automation"
SERVER_PORT=${SERVER_PORT:-8899}
SERVER_HOST=${SERVER_HOST:-"0.0.0.0"}
LOG_FILE="$PROJECT_ROOT/file-server.log"
PID_FILE="$PROJECT_ROOT/.file_server.pid"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}" | tee -a "$LOG_FILE"; }
info() { echo -e "${BLUE}[INFO] $1${NC}" | tee -a "$LOG_FILE"; }

# 获取本机IP地址
get_local_ip() {
    local ip=""
    
    # 尝试获取本机IP
    if command -v ifconfig >/dev/null 2>&1; then
        ip=$(ifconfig | grep -E "inet [0-9]" | grep -v "127.0.0.1" | head -1 | awk '{print $2}')
    fi
    
    # 备用方法
    if [ -z "$ip" ]; then
        ip=$(hostname -I 2>/dev/null | cut -d' ' -f1 || echo "localhost")
    fi
    
    [ -z "$ip" ] && ip="localhost"
    echo "$ip"
}

# 启动服务器
start_server() {
    # 检查是否已在运行
    if [ -f "$PID_FILE" ]; then
        local existing_pid=$(cat "$PID_FILE")
        if kill -0 "$existing_pid" 2>/dev/null; then
            log "文件服务器已在运行，PID: $existing_pid"
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    # 检查端口是否被占用
    if lsof -i ":$SERVER_PORT" >/dev/null 2>&1; then
        warn "端口 $SERVER_PORT 已被占用"
        local existing_process=$(lsof -i ":$SERVER_PORT" | tail -1)
        log "占用进程: $existing_process"
        return 1
    fi
    
    # 确保项目目录存在
    mkdir -p "$PROJECT_ROOT/reports"
    
    log "启动PR评审报告文件服务器..."
    log "项目目录: $PROJECT_ROOT"
    log "监听端口: $SERVER_PORT"
    log "绑定地址: $SERVER_HOST"
    
    # 切换到项目目录
    cd "$PROJECT_ROOT"
    
    # 启动Python HTTP服务器并保持运行
    if [ -f "$PROJECT_ROOT/utf8-file-server.py" ]; then
        log "使用UTF-8文件服务器"
        nohup python3 "$PROJECT_ROOT/utf8-file-server.py" --port "$SERVER_PORT" --host "$SERVER_HOST" --directory "$PROJECT_ROOT" > "$LOG_FILE" 2>&1 &
        local server_pid=$!
        echo $server_pid > "$PID_FILE"
        log "✅ UTF-8文件服务器已启动，PID: $server_pid"
        
        # 等待服务器启动
        sleep 2
        if kill -0 "$server_pid" 2>/dev/null; then
            local local_ip=$(get_local_ip)
            log "🌐 服务器访问地址:"
            log "   本地访问: http://localhost:$SERVER_PORT"
            log "   外部访问: http://$local_ip:$SERVER_PORT"
            log "   报告目录: http://$local_ip:$SERVER_PORT/reports/"
        else
            error "服务器启动失败"
            rm -f "$PID_FILE"
            return 1
        fi
    elif command -v python3 >/dev/null 2>&1; then
        log "使用Python3启动HTTP服务器"
        nohup python3 -m http.server "$SERVER_PORT" --bind "$SERVER_HOST" > "$LOG_FILE" 2>&1 &
        local server_pid=$!
        echo $server_pid > "$PID_FILE"
        log "✅ HTTP服务器已启动，PID: $server_pid"
    elif command -v python >/dev/null 2>&1; then
        log "使用Python2启动HTTP服务器"
        nohup python -m SimpleHTTPServer "$SERVER_PORT" > "$LOG_FILE" 2>&1 &
        local server_pid=$!
        echo $server_pid > "$PID_FILE"
        log "✅ HTTP服务器已启动，PID: $server_pid"
    else
        error "未找到Python，无法启动文件服务器"
        return 1
    fi
}

# 停止服务器
stop_server() {
    if [ -f "$PID_FILE" ]; then
        local server_pid=$(cat "$PID_FILE")
        if kill -0 "$server_pid" 2>/dev/null; then
            log "停止文件服务器，PID: $server_pid"
            kill "$server_pid" 2>/dev/null || true
            sleep 2
            # 如果进程仍在运行，强制终止
            if kill -0 "$server_pid" 2>/dev/null; then
                kill -9 "$server_pid" 2>/dev/null || true
            fi
            log "✅ 文件服务器已停止"
        else
            log "文件服务器未运行"
        fi
        rm -f "$PID_FILE"
    else
        log "文件服务器未运行（PID文件不存在）"
    fi
}

# 检查服务器状态
status_server() {
    if [ -f "$PID_FILE" ]; then
        local server_pid=$(cat "$PID_FILE")
        if kill -0 "$server_pid" 2>/dev/null; then
            local local_ip=$(get_local_ip)
            log "✅ 文件服务器正在运行"
            log "PID: $server_pid"
            log "本地访问: http://localhost:$SERVER_PORT"
            log "外部访问: http://$local_ip:$SERVER_PORT"
            log "报告目录: http://$local_ip:$SERVER_PORT/reports/"
            return 0
        else
            log "❌ 文件服务器未运行（PID文件存在但进程不存在）"
            rm -f "$PID_FILE"
            return 1
        fi
    else
        log "❌ 文件服务器未运行"
        return 1
    fi
}

# 重启服务器
restart_server() {
    log "重启文件服务器..."
    stop_server
    sleep 1
    start_server
}

# 使用说明
usage() {
    echo "PR评审报告文件服务器管理脚本"
    echo
    echo "用法："
    echo "  $0 {start|stop|restart|status}"
    echo
    echo "命令："
    echo "  start    启动文件服务器"
    echo "  stop     停止文件服务器"
    echo "  restart  重启文件服务器"
    echo "  status   查看服务器状态"
    echo
    echo "环境变量："
    echo "  SERVER_PORT   服务器端口 (默认: 8899)"
    echo "  SERVER_HOST   绑定地址 (默认: 0.0.0.0)"
    echo
}

# 主逻辑
case "${1:-start}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    *)
        usage
        exit 1
        ;;
esac
