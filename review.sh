#!/bin/bash

# PR Review自动化脚本
# 用法: ./review.sh <项目名称> <MR编号>

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}" >&2; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

# 显示帮助信息
show_help() {
    echo "📋 PR自动化评审工具"
    echo
    echo "🚀 用法:"
    echo "  $0 <项目名称> <MR编号>"
    echo
    echo "📝 示例:"
    echo "  $0 \"ZM App\" 161"
    echo "  $0 \"StaticRelease\" 162"
    echo
    echo "⚙️ 选项:"
    echo "  -h, --help    显示此帮助信息"
    echo
    echo "📂 输出文件:"
    echo "  reports/review_git_{MR编号}.txt      - 评审报告"
    echo "  reports/feishu_card_{MR编号}.json     - 飞书卡片数据"
    echo
}

# 获取本机IP地址
get_local_ip() {
    # 尝试获取非127开头的IP地址
    local ip=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
    echo ${ip:-"localhost"}
}

# 参数检查
if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

if [ $# -lt 2 ]; then
    error "参数不足"
    echo
    show_help
    exit 1
fi

PROJECT_NAME="$1"
MR_NUMBER="$2"

# 验证MR编号是数字
if ! [[ "$MR_NUMBER" =~ ^[0-9]+$ ]]; then
    error "MR编号必须是数字: $MR_NUMBER"
    exit 1
fi

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log "开始PR自动评审"
info "项目: $PROJECT_NAME"
info "MR编号: $MR_NUMBER"

# 检查Node.js环境
if ! command -v node >/dev/null 2>&1; then
    error "未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查依赖
if [ ! -f "package.json" ]; then
    error "未找到package.json文件"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    warn "未找到node_modules，正在安装依赖..."
    npm install
fi

# 检查配置文件
if [ ! -f "config.json" ]; then
    error "未找到config.json配置文件，请先配置项目"
    exit 1
fi

# 执行评审
log "启动评审分析..."
if node pr-reviewer.js "$PROJECT_NAME" "$MR_NUMBER"; then
    log "评审完成！"
    
    # 显示生成的报告文件
    REPORT_FILE="reports/review_git_${MR_NUMBER}.txt"
    JSON_FILE="reports/feishu_card_${MR_NUMBER}.json"
    
    if [ -f "$REPORT_FILE" ]; then
        info "报告文件: $REPORT_FILE"
        
        # 获取本机IP地址并生成HTTP链接
        LOCAL_IP=$(get_local_ip)
        FILE_SERVER_PORT=8899
        FILENAME=$(basename "$REPORT_FILE")
        HTTP_URL="http://${LOCAL_IP}:${FILE_SERVER_PORT}/reports/${FILENAME}"
        
        echo
        echo "🌐 在线访问链接: $HTTP_URL"
        echo "📋 可复制分享的链接: $HTTP_URL"
        echo
        echo "📋 评审报告摘要:"
        head -20 "$REPORT_FILE"
        echo "..."
        echo
        info "查看完整报告: cat $REPORT_FILE"
        
        # 如果JSON文件也存在，显示信息
        if [ -f "$JSON_FILE" ]; then
            info "飞书卡片数据: $JSON_FILE"
            JSON_FILENAME=$(basename "$JSON_FILE")
            JSON_HTTP_URL="http://${LOCAL_IP}:${FILE_SERVER_PORT}/reports/${JSON_FILENAME}"
            info "JSON数据链接: $JSON_HTTP_URL"
        fi
        
        # 显示文件大小信息
        REPORT_SIZE=$(wc -l < "$REPORT_FILE" 2>/dev/null || echo "未知")
        info "报告总行数: $REPORT_SIZE 行"
        
        # 提示飞书webhook状态
        echo
        info "💡 提示: 如需发送飞书通知，请确保配置了 FEISHU_WEBHOOK_URL 环境变量"
    else
        warn "未找到报告文件: $REPORT_FILE"
    fi
else
    error "评审失败，请检查错误信息"
    exit 1
fi

log "🎉 PR评审流程完成！"
