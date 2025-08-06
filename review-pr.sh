#!/bin/bash

# PR Review 自动化工具启动脚本
# 支持参数验证、环境检查和错误处理

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

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 使用说明
show_usage() {
    echo "PR Review 自动化工具"
    echo ""
    echo "用法："
    echo "  $0 <项目名称> <MR编号> [选项]"
    echo ""
    echo "参数："
    echo "  项目名称    在config.json中配置的项目名称"
    echo "  MR编号      GitLab Merge Request IID"
    echo ""
    echo "选项："
    echo "  -h, --help     显示此帮助信息"
    echo "  -v, --verbose  详细输出模式"
    echo "  -d, --debug    调试模式"
    echo "  --no-ai        禁用AI分析"
    echo "  --dry-run      预览模式，不执行实际操作"
    echo ""
    echo "示例："
    echo "  $0 \"ZM App\" 161"
    echo "  $0 \"ZM App\" 161 --verbose"
    echo "  $0 \"ZM App\" 161 --debug --no-ai"
    echo ""
}

# 检查环境
check_environment() {
    info "检查运行环境..."
    
    # 检查Node.js
    if ! command -v node >/dev/null 2>&1; then
        error "未找到Node.js，请先安装Node.js (https://nodejs.org/)"
        exit 1
    fi
    
    local node_version=$(node --version)
    info "Node.js版本: $node_version"
    
    # 检查依赖
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        warn "依赖未安装，正在安装..."
        cd "$SCRIPT_DIR"
        npm install
        if [ $? -ne 0 ]; then
            error "依赖安装失败"
            exit 1
        fi
        log "依赖安装完成"
    fi
    
    # 检查配置文件
    if [ ! -f "$SCRIPT_DIR/config.json" ]; then
        error "配置文件 config.json 不存在"
        error "请参考 README.md 配置项目"
        exit 1
    fi
    
    # 检查环境变量配置
    if [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
        warn "未找到 .env 文件，建议复制 .env.example 并配置环境变量"
        info "cp .env.example .env"
    fi
    
    log "环境检查完成"
}

# 参数解析
parse_arguments() {
    PROJECT_NAME=""
    MR_NUMBER=""
    VERBOSE=false
    DEBUG=false
    NO_AI=false
    DRY_RUN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -d|--debug)
                DEBUG=true
                VERBOSE=true
                shift
                ;;
            --no-ai)
                NO_AI=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -*|--*)
                error "未知选项: $1"
                show_usage
                exit 1
                ;;
            *)
                if [ -z "$PROJECT_NAME" ]; then
                    PROJECT_NAME="$1"
                elif [ -z "$MR_NUMBER" ]; then
                    MR_NUMBER="$1"
                else
                    error "过多的参数: $1"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # 验证必需参数
    if [ -z "$PROJECT_NAME" ] || [ -z "$MR_NUMBER" ]; then
        error "缺少必需参数"
        echo ""
        show_usage
        exit 1
    fi
    
    # 验证MR编号是数字
    if ! [[ "$MR_NUMBER" =~ ^[0-9]+$ ]]; then
        error "MR编号必须是数字: $MR_NUMBER"
        exit 1
    fi
}

# 设置环境变量
setup_environment() {
    if [ "$DEBUG" = true ]; then
        export DEBUG=true
        export NODE_ENV=development
    fi
    
    if [ "$NO_AI" = true ]; then
        export DISABLE_AI_ANALYSIS=true
    fi
    
    if [ "$VERBOSE" = true ]; then
        export VERBOSE=true
    fi
}

# 执行review
run_review() {
    info "开始执行PR Review..."
    info "项目: $PROJECT_NAME"
    info "MR编号: $MR_NUMBER"
    
    if [ "$DRY_RUN" = true ]; then
        warn "预览模式：以下是将要执行的命令"
        echo "node \"$SCRIPT_DIR/pr-reviewer.js\" \"$PROJECT_NAME\" \"$MR_NUMBER\""
        return 0
    fi
    
    cd "$SCRIPT_DIR"
    
    # 执行Node.js脚本
    if [ "$VERBOSE" = true ]; then
        node "pr-reviewer.js" "$PROJECT_NAME" "$MR_NUMBER"
    else
        node "pr-reviewer.js" "$PROJECT_NAME" "$MR_NUMBER" 2>/dev/null
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "PR Review 执行成功！"
        
        # 显示报告文件位置
        local report_file="$SCRIPT_DIR/reports/review_git_${MR_NUMBER}.text"
        if [ -f "$report_file" ]; then
            info "报告文件: $report_file"
            if command -v open >/dev/null 2>&1; then
                info "使用 'open \"$report_file\"' 查看报告"
            fi
        fi
    else
        error "PR Review 执行失败，退出码: $exit_code"
        exit $exit_code
    fi
}

# 主函数
main() {
    echo "========================================"
    echo "       PR Review 自动化工具"
    echo "========================================"
    echo ""
    
    parse_arguments "$@"
    check_environment
    setup_environment
    run_review
    
    echo ""
    log "任务完成！"
}

# 错误处理
trap 'error "脚本执行过程中发生错误，行号: $LINENO"' ERR

# 执行主函数
main "$@"
