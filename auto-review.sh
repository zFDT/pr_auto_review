#!/bin/bash
set -e

# macOS 兼容性设置
if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v gdate >/dev/null 2>&1; then
        DATE_CMD="gdate"
    else
        DATE_CMD="date"
    fi
    
    if command -v gsed >/dev/null 2>&1; then
        SED_CMD="gsed"
    else
        SED_CMD="sed"
    fi

    if command -v gbase64 >/dev/null 2>&1; then
        BASE64_CMD="gbase64"
    else
        BASE64_CMD="base64"
    fi
else
    DATE_CMD="date"
    SED_CMD="sed"
    BASE64_CMD="base64"
fi

# 颜色输出函数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[$($DATE_CMD +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }
debug() { echo -e "${PURPLE}[DEBUG] $1${NC}"; }
highlight() { echo -e "${CYAN}$1${NC}"; }

# 使用实际的环境变量，加强容错处理
PROJECT_ID=${gitlabMergeRequestTargetProjectId:-9831}
MR_IID=${gitlabMergeRequestIid:-161}
MR_ID=${gitlabMergeRequestId:-226756}
MR_TITLE="${gitlabMergeRequestTitle:-未设置标题}"
MR_DESCRIPTION="${gitlabMergeRequestDescription:-未设置描述}"
MR_STATE="${gitlabMergeRequestState:-opened}"

# 分支信息，支持多种环境变量格式
SOURCE_BRANCH="${gitlabSourceBranch:-${gitlabBranch:-main}}"
TARGET_BRANCH="${gitlabTargetBranch:-main}"
ACTION_TYPE="${gitlabActionType:-MERGE}"

# 用户信息
USER_NAME="${gitlabUserName:-${gitlabUserUsername:-unknown}}"
USER_EMAIL="${gitlabUserEmail:-unknown@example.com}"
MERGED_BY="${gitlabMergedByUser:-${USER_NAME}}"

# 仓库信息
REPO_NAME="${gitlabSourceRepoName:-${gitlabTargetRepoName:-ZM App}}"
REPO_NAMESPACE="${gitlabSourceNamespace:-${gitlabTargetNamespace:-fdm_printer}}"
REPO_HTTP_URL="${gitlabSourceRepoHttpUrl:-${gitlabTargetRepoHttpUrl:-https://git.dreame.tech/fdm_printer/zm_app.git}}"

# 提交信息
LAST_COMMIT="${gitlabMergeRequestLastCommit:-${gitlabMergeCommitSha:-${gitlabAfter:-HEAD}}}"
GIT_COMMIT="${GIT_COMMIT:-${LAST_COMMIT}}"

# 构建信息
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%s)}"
JOB_NAME="${JOB_NAME:-APP_revicew}"
BUILD_URL="${BUILD_URL:-http://jenkins.atomverse.com.cn:8080/job/$JOB_NAME/$BUILD_NUMBER/console}"
GH_PATH="/opt/homebrew/bin/gh"

# 项目路径和Node.js路径
PROJECT_ROOT="/path/to/pr-review-automation"
NODE_PATH="/opt/homebrew/bin/node"
PR_REVIEWER_SCRIPT="$PROJECT_ROOT/pr-reviewer.js"

# 文件服务器配置
FILE_SERVER_PORT=${FILE_SERVER_PORT:-8899}
FILE_SERVER_HOST=${FILE_SERVER_HOST:-"0.0.0.0"}

# 获取本机IP地址
get_local_ip() {
    # 尝试多种方法获取本机IP
    local ip=""
    
    # 方法1: 使用ifconfig获取非回环地址
    if command -v ifconfig >/dev/null 2>&1; then
        ip=$(ifconfig | grep -E "inet [0-9]" | grep -v "127.0.0.1" | head -1 | awk '{print $2}')
    fi
    
    # 方法2: 使用ip命令
    if [ -z "$ip" ] && command -v ip >/dev/null 2>&1; then
        ip=$(ip route get 8.8.8.8 2>/dev/null | head -1 | awk '{print $7}')
    fi
    
    # 方法3: 使用hostname -I（Linux）
    if [ -z "$ip" ] && command -v hostname >/dev/null 2>&1; then
        ip=$(hostname -I 2>/dev/null | cut -d' ' -f1)
    fi
    
    # 方法4: 连接外部服务获取本机IP
    if [ -z "$ip" ]; then
        ip=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "localhost")
    fi
    
    # 默认值
    [ -z "$ip" ] && ip="localhost"
    echo "$ip"
}

FILE_SERVER_IP=$(get_local_ip)
FILE_SERVER_BASE_URL="http://${FILE_SERVER_IP}:${FILE_SERVER_PORT}"

# 使用说明和参数检查
usage() {
    echo "========================================="
    echo "       ZM App 自动代码评审工具"
    echo "========================================="
    echo
    echo "用法："
    echo "  $0 [项目名称] [MR编号] [构建编号] [选项]"
    echo
    echo "参数："
    echo "  项目名称    GitLab项目名称 (默认: ZM App)"
    echo "  MR编号      Merge Request IID (默认: 161)"
    echo "  构建编号    Jenkins构建编号 (默认: 时间戳)"
    echo
    echo "选项："
    echo "  -h, --help       显示此帮助信息"
    echo "  -v, --verbose    详细输出模式"
    echo "  -d, --debug      调试模式"
    echo "  --no-notify      不发送飞书通知"
    echo "  --dry-run        预览模式，不执行实际操作"
    echo "  --stop-server    停止文件服务器"
    echo "  --server-port    指定文件服务器端口 (默认: 8899)"
    echo
    echo "示例："
    echo "  $0                           # 使用默认参数"
    echo "  $0 \"ZM App\" 161             # 指定项目和MR"
    echo "  $0 \"ZM App\" 161 31          # 指定项目、MR和构建编号"
    echo "  $0 \"ZM App\" 161 --verbose   # 详细输出"
    echo "  $0 \"ZM App\" 161 --debug     # 调试模式"
    echo
}

# 参数解析
VERBOSE=false
DEBUG=false
DRY_RUN=false
NO_NOTIFY=false
STOP_SERVER=false

# 先处理选项参数
args=()
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
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
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-notify)
            NO_NOTIFY=true
            shift
            ;;
        --stop-server)
            STOP_SERVER=true
            shift
            ;;
        --server-port)
            shift
            if [[ $# -gt 0 && $1 =~ ^[0-9]+$ ]]; then
                FILE_SERVER_PORT="$1"
                shift
            else
                error "错误：--server-port 需要一个数字参数"
                exit 1
            fi
            ;;
        -*)
            error "未知选项: $1"
            usage
            exit 1
            ;;
        *)
            args+=("$1")
            shift
            ;;
    esac
done

# 处理位置参数
if [ ${#args[@]} -ge 1 ]; then
    REPO_NAME="${args[0]}"
fi
if [ ${#args[@]} -ge 2 ]; then
    MR_IID="${args[1]}"
fi
if [ ${#args[@]} -ge 3 ]; then
    BUILD_NUMBER="${args[2]}"
fi
if [ ${#args[@]} -gt 3 ]; then
    error "多余的参数: ${args[@]:3}"
    usage
    exit 1
fi

# 设置默认值
REPO_NAME="${REPO_NAME:-ZM App}"
MR_IID="${MR_IID:-161}"

# 构建URL和路径（在参数解析完成后）
MR_URL="https://git.dreame.tech/fdm_printer/zm_app/-/merge_requests/$MR_IID"
REVIEW_GIT_PATH="$PROJECT_ROOT/reports/review_git_$MR_IID.text"
REVIEW_FILE_URL="${FILE_SERVER_BASE_URL}/reports/review_git_${MR_IID}.text"

# 如果只是要停止服务器，执行后退出
if [ "$STOP_SERVER" = "true" ]; then
    log "🛑 管理文件服务器..."
    
    if launchctl list | grep -q "com.dreame.pr-review.file-server"; then
        info "检测到系统服务正在运行"
        info "💡 使用以下命令管理系统服务:"
        info "    $PROJECT_ROOT/install-file-server.sh status    # 查看状态"
        info "    $PROJECT_ROOT/install-file-server.sh restart   # 重启服务"
        info "    $PROJECT_ROOT/install-file-server.sh uninstall # 卸载服务"
    else
        warn "系统服务未运行，清理临时服务器..."
        stop_file_server
        log "✅ 临时文件服务器已停止"
        info "💡 建议安装系统服务: $PROJECT_ROOT/install-file-server.sh install"
    fi
    
    exit 0
fi


if [ "$VERBOSE" = true ]; then
    info "📁 项目路径: $PROJECT_ROOT"
    info "⚙️ Node.js路径: $NODE_PATH"
    info "📄 报告路径: $REVIEW_GIT_PATH"
fi

# 检查文件是否应该被包含在评审中
should_include_file() {
    local file_path="$1"

    # 排除的文件模式
    local exclude_patterns=(
        "*.min.js"
        "*.min.css"
        "node_modules/*"
        "dist/*"
        "build/*"
        ".git/*"
        "*.log"
        "*.lock"
        "package-lock.json"
        "yarn.lock"
        "*.map"
        "*.svg"
        "*.png"
        "*.jpg"
        "*.jpeg"
        "*.gif"
        "*.ico"
        "*.woff"
        "*.woff2"
        "*.ttf"
        "*.eot"
    )

    for pattern in "${exclude_patterns[@]}"; do
        if [[ "$file_path" == $pattern ]]; then
            return 1
        fi
    done

    # 检查文件大小（排除过大文件）
    if [[ -f "$file_path" ]]; then
        local file_size=$(wc -c < "$file_path" 2>/dev/null || echo "0")
        if [[ $file_size -gt 100000 ]]; then  # 100KB
            debug "跳过大文件: $file_path (${file_size} bytes)"
            return 1
        fi
    fi

    return 0
}
pr_reviewer() {
  # 调用 Node.js PR reviewer 获取变更信息
  log "🤖 调用 Node.js pr-reviewer.js 获取 MR #$MR_IID 信息..."
  
  if [ "$VERBOSE" = true ]; then
    info "执行命令: $NODE_PATH $PR_REVIEWER_SCRIPT \"$REPO_NAME\" \"$MR_IID\""
  fi
  
  if [ "$DRY_RUN" = true ]; then
    warn "预览模式：将要执行的命令"
    warn "node \"$PR_REVIEWER_SCRIPT\" \"$REPO_NAME\" \"$MR_IID\""
    return 0
  fi
  
  # 执行Node.js脚本并捕获输出
  local output
  if output=$($NODE_PATH "$PR_REVIEWER_SCRIPT" "$REPO_NAME" "$MR_IID" 2>&1); then
    if [ "$VERBOSE" = true ]; then
      debug "Node.js 脚本输出: $output"
    fi
    
    # 检查是否生成了报告文件
    if [ -f "$REVIEW_GIT_PATH" ]; then
      log "✅ Node.js PR reviewer 执行成功"
      return 0
    else
      warn "Node.js 脚本执行成功但未找到报告文件: $REVIEW_GIT_PATH"
      return 1
    fi
  else
    local exit_code=$?
    error "❌ Node.js pr-reviewer.js 执行失败，退出码: $exit_code"
    error "错误输出: $output"
    return $exit_code
  fi
}

# 启动文件服务器（检查系统服务状态）
start_file_server() {
    # 检查系统服务是否运行
    if launchctl list | grep -q "com.dreame.pr-review.file-server"; then
        debug "文件服务器系统服务正在运行"
        
        # 验证端口是否可访问
        if curl -s "http://localhost:$FILE_SERVER_PORT" >/dev/null 2>&1; then
            log "✅ 文件服务器已通过系统服务运行"
            info "🔗 文件服务器地址: $FILE_SERVER_BASE_URL"
            return 0
        else
            warn "系统服务运行中但端口不可访问，尝试重启服务"
            "$PROJECT_ROOT/install-file-server.sh" restart >/dev/null 2>&1 || true
            sleep 3
            
            if curl -s "http://localhost:$FILE_SERVER_PORT" >/dev/null 2>&1; then
                log "✅ 文件服务器重启成功"
                info "🔗 文件服务器地址: $FILE_SERVER_BASE_URL"
                return 0
            else
                error "❌ 文件服务器重启后仍不可访问"
                return 1
            fi
        fi
    else
        warn "文件服务器系统服务未运行"
        info "💡 请运行以下命令安装自动启动服务:"
        info "    $PROJECT_ROOT/install-file-server.sh install"
        
        # 尝试手动启动临时服务器
        warn "尝试启动临时文件服务器..."
        start_temporary_file_server
        return $?
    fi
}

# 启动临时文件服务器（备用方案）
start_temporary_file_server() {
    local server_pid_file="$PROJECT_ROOT/.temp_file_server.pid"
    
    # 检查临时服务器是否已在运行
    if [ -f "$server_pid_file" ]; then
        local existing_pid=$(cat "$server_pid_file")
        if kill -0 "$existing_pid" 2>/dev/null; then
            debug "临时文件服务器已在运行，PID: $existing_pid"
            return 0
        else
            rm -f "$server_pid_file"
        fi
    fi
    
    # 检查端口是否被占用
    if lsof -i ":$FILE_SERVER_PORT" >/dev/null 2>&1; then
        warn "端口 $FILE_SERVER_PORT 已被占用，尝试使用该服务"
        return 0
    fi
    
    log "🌐 启动临时文件服务器在端口 $FILE_SERVER_PORT..."
    
    # 使用Python启动HTTP服务器
    cd "$PROJECT_ROOT"
    if command -v python3 >/dev/null 2>&1; then
        python3 -m http.server "$FILE_SERVER_PORT" --bind "$FILE_SERVER_HOST" >/dev/null 2>&1 &
        local server_pid=$!
    elif command -v python >/dev/null 2>&1; then
        python -m SimpleHTTPServer "$FILE_SERVER_PORT" >/dev/null 2>&1 &
        local server_pid=$!
    else
        error "未找到Python，无法启动临时文件服务器"
        return 1
    fi
    
    # 保存PID
    echo "$server_pid" > "$server_pid_file"
    
    # 等待服务器启动
    sleep 2
    
    # 验证服务器是否启动成功
    if kill -0 "$server_pid" 2>/dev/null; then
        log "✅ 临时文件服务器启动成功，PID: $server_pid"
        info "🔗 文件服务器地址: $FILE_SERVER_BASE_URL"
        warn "💡 建议安装系统服务以获得更好的稳定性"
        return 0
    else
        error "❌ 临时文件服务器启动失败"
        rm -f "$server_pid_file"
        return 1
    fi
}

# 停止文件服务器（仅清理临时服务器）
stop_file_server() {
    # 只清理临时文件服务器，不影响系统服务
    local temp_pid_file="$PROJECT_ROOT/.temp_file_server.pid"
    
    if [ -f "$temp_pid_file" ]; then
        local server_pid=$(cat "$temp_pid_file")
        if kill -0 "$server_pid" 2>/dev/null; then
            debug "停止临时文件服务器，PID: $server_pid"
            kill "$server_pid" 2>/dev/null || true
            sleep 1
            # 如果进程仍在运行，强制终止
            if kill -0 "$server_pid" 2>/dev/null; then
                kill -9 "$server_pid" 2>/dev/null || true
            fi
        fi
        rm -f "$temp_pid_file"
    fi
    
    # 注意：不停止系统服务，让它继续运行
}

# 解析评审报告获取统计信息
extract_review_statistics() {
    local file_count=0
    local total_additions=0
    local total_deletions=0
    local change_scale="小"
    
    if [ -f "$REVIEW_GIT_PATH" ]; then
        # 从报告中提取统计信息
        file_count=$(grep -E "\*\*总文件数\*\*.*[0-9]+" "$REVIEW_GIT_PATH" | $SED_CMD 's/.*\([0-9]\+\).*/\1/' || echo "0")
        total_additions=$(grep -E "\*\*新增行数\*\*.*\+[0-9]+" "$REVIEW_GIT_PATH" | $SED_CMD 's/.*+\([0-9]\+\).*/\1/' || echo "0")
        total_deletions=$(grep -E "\*\*删除行数\*\*.*-[0-9]+" "$REVIEW_GIT_PATH" | $SED_CMD 's/.*-\([0-9]\+\).*/\1/' || echo "0")
        
        # 根据变更规模确定等级
        local net_changes=$((total_additions + total_deletions))
        if [ $net_changes -gt 500 ]; then
            change_scale="大"
        elif [ $net_changes -gt 100 ]; then
            change_scale="中"
        else
            change_scale="小"
        fi
    fi
    
    # 导出变量供其他函数使用
    export file_count total_additions total_deletions change_scale
    
    if [ "$VERBOSE" = true ]; then
        debug "统计信息: 文件数=$file_count, 新增=$total_additions, 删除=$total_deletions, 规模=$change_scale"
    fi
}

# 发送飞书通知（简化版本，直接发送评审结果）
send_notification() {
    if [ "$NO_NOTIFY" = true ]; then
        info "🔕 跳过飞书通知发送 (--no-notify)"
        return 0
    fi
    
    if [ "$DRY_RUN" = true ]; then
        warn "预览模式：将要发送飞书通知"
        return 0
    fi
    
    log "📱 发送飞书通知到 ZM App 团队群..."

    # 检查飞书卡片数据文件是否存在
    local feishu_card_path="$PROJECT_ROOT/reports/feishu_card_$MR_IID.json"
    
    if [ -f "$feishu_card_path" ]; then
        # 使用卡片格式发送
        log "📋 使用交互式卡片格式发送通知..."
        send_card_notification "$feishu_card_path"
        return $?
    elif [ -f "$REVIEW_GIT_PATH" ]; then
        # 回退到优化的文本格式
        log "📝 使用优化文本格式发送通知..."
        send_optimized_text_notification
        return $?
    else
        error "❌ 评审报告文件不存在: $REVIEW_GIT_PATH"
        return 1
    fi
}

# 发送卡片格式通知
send_card_notification() {
    local card_file="$1"
    
    if [ "$VERBOSE" = true ]; then
        debug "发送飞书卡片: $card_file"
        debug "卡片内容预览:"
        debug "$(cat "$card_file" | jq '.card.header.title.content' 2>/dev/null || echo '无法解析卡片')"
    fi

    local response=$(curl -s -w "%{http_code}" \
                          -X POST "https://open.feishu.cn/open-apis/bot/v2/hook/your_feishu_webhook_id" \
                          -H "Content-Type: application/json" \
                          -d @"$card_file")

    local http_code="${response: -3}"
    local response_body="${response%???}"

    if [ "$http_code" = "200" ]; then
        if echo "$response_body" | grep -q '"code":0'; then
            log "✅ 飞书卡片通知发送成功"
            info "📱 ZM App 团队群已收到评审结果卡片"
        else
            warn "⚠️ 飞书 API 返回警告: $response_body"
            # 如果卡片发送失败，尝试文本格式
            send_optimized_text_notification
        fi
    else
        error "❌ 飞书卡片通知发送失败，HTTP 状态码: $http_code"
        if [ "$VERBOSE" = true ]; then
            error "响应内容: $response_body"
        fi
        # 尝试发送文本格式作为备用方案
        send_optimized_text_notification
    fi
}

# 发送优化的文本格式通知
send_optimized_text_notification() {
    log "📝 发送优化文本格式通知..."
    
    # 构建Jenkins链接
    local jenkins_url="http://jenkins.atomverse.com.cn:8080/job/APP_revicew/${BUILD_NUMBER}/console"
    
    # 从评审报告中提取关键信息
    local ai_score=""
    local main_issues=""
    local file_changes=""
    
    if [ -f "$REVIEW_GIT_PATH" ]; then
        # 提取AI评分
        ai_score=$(grep -E "代码质量评分.*[0-9]+/10" "$REVIEW_GIT_PATH" | head -1 | $SED_CMD 's/.*: \(.*\)/\1/' || echo "")
        
        # 提取文件变更统计
        local file_count=$(grep -E "\*\*总文件数\*\*.*[0-9]+" "$REVIEW_GIT_PATH" | $SED_CMD 's/.*\([0-9]\+\).*/\1/' || echo "0")
        local additions=$(grep -E "\*\*新增行数\*\*.*\+[0-9]+" "$REVIEW_GIT_PATH" | $SED_CMD 's/.*+\([0-9]\+\).*/\1/' || echo "0")
        local deletions=$(grep -E "\*\*删除行数\*\*.*-[0-9]+" "$REVIEW_GIT_PATH" | $SED_CMD 's/.*-\([0-9]\+\).*/\1/' || echo "0")
        
        file_changes="📁 ${file_count}个文件，+${additions}/-${deletions}行"
        
        # 提取主要问题（最多3个）
        main_issues=$(grep -A 10 "潜在问题检测\|🐛 潜在问题" "$REVIEW_GIT_PATH" | grep -E "^- |^[0-9]+\. " | head -3 | $SED_CMD 's/^[0-9]*[.-] */• /' || echo "")
        
        if [ -z "$main_issues" ]; then
            main_issues="✅ 未发现明显问题"
        fi
    fi
    
    # 构建优化的文本消息
    local optimized_message
    read -r -d '' optimized_message << TEXT_EOF || true
🏭 **ZM App 代码评审完成**

📝 **MR**: $MR_TITLE
👤 **提交者**: $USER_NAME  
🌿 **分支**: $SOURCE_BRANCH → $TARGET_BRANCH
⏰ **时间**: $(date +'%m/%d %H:%M')

📊 **变更统计**
$file_changes

$([ -n "$ai_score" ] && echo "🤖 **AI评分**: $ai_score" || echo "")

⚠️ **检测结果**
$main_issues

🔗 **查看详情**: $MR_URL
🏗️ **Jenkins构建**: $jenkins_url
$([ "$REVIEW_FILE_URL" != "$REVIEW_GIT_PATH" ] && echo "📄 **详细报告**: $REVIEW_FILE_URL" || echo "")

---
💡 详细评审报告$([ "$REVIEW_FILE_URL" != "$REVIEW_GIT_PATH" ] && echo "可直接点击上方链接查看" || echo "请查看Jenkins构建日志")
TEXT_EOF

    # 转义特殊字符并构建JSON
    local escaped_message
    escaped_message=$(echo "$optimized_message" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

    cat > feishu_message.json << FEISHU_EOF
{
  "msg_type": "text",
  "content": {
    "text": "$escaped_message"
  }
}
FEISHU_EOF

    # 发送到飞书机器人
    if [ "$VERBOSE" = true ]; then
        debug "发送优化文本消息到飞书 webhook"
        debug "消息长度: ${#escaped_message} 字符"
    fi

    local response=$(curl -s -w "%{http_code}" \
                          -X POST "https://open.feishu.cn/open-apis/bot/v2/hook/your_feishu_webhook_id" \
                          -H "Content-Type: application/json" \
                          -d @feishu_message.json)

    local http_code="${response: -3}"
    local response_body="${response%???}"

    if [ "$http_code" = "200" ]; then
        if echo "$response_body" | grep -q '"code":0'; then
            log "✅ 飞书文本通知发送成功"
            info "📱 ZM App 团队群已收到评审结果通知"
        else
            warn "⚠️ 飞书 API 返回警告: $response_body"
        fi
    else
        error "❌ 飞书文本通知发送失败，HTTP 状态码: $http_code"
        if [ "$VERBOSE" = true ]; then
            error "响应内容: $response_body"
        fi
        # 最后尝试发送简化消息
        send_simple_notification
    fi
}

# 备用的简化通知
send_simple_notification() {
    warn "🔄 尝试发送简化通知..."
    
    local jenkins_url="http://jenkins.atomverse.com.cn:8080/job/APP_revicew/${BUILD_NUMBER}/console"

    local simple_message='{
      "msg_type": "text",
      "content": {
        "text": "🏭 ZM App 代码评审完成\n\n📝 MR: '"$MR_TITLE"'\n🌿 分支: '"$SOURCE_BRANCH"' → '"$TARGET_BRANCH"'\n👤 提交者: '"$USER_NAME"'\n✅ 状态: 建议批准合并\n\n🔗 查看详情: '"$MR_URL"'\n🏗️ Jenkins构建: '"$jenkins_url"'"
      }
    }'

    curl -s -X POST "https://open.feishu.cn/open-apis/bot/v2/hook/your_feishu_webhook_id" \
         -H "Content-Type: application/json" \
         -d "$simple_message"

    log "📱 简化通知已发送"
}

# 清理临时文件
cleanup() {
    if [ "$DRY_RUN" != "true" ]; then
        log "保留临时文件以供调试..."
        # 只清理临时文件服务器，保持系统服务运行
        stop_file_server
    fi
    # 取消注释下面的行来启用清理
    # rm -f mr_changes.json changes_summary.txt review_result.txt feishu_message.json review_context.txt
}

# 错误处理
handle_error() {
    error "脚本执行失败，错误行号: $1"
    error "当前目录: $(pwd)"
    error "Git 状态: $(git status --porcelain 2>/dev/null || echo 'Git 不可用')"
    cleanup
    exit 1
}

# 调试函数
debug_environment() {
    debug "=== 🔍 环境调试信息 ==="
    debug "操作系统: $OSTYPE"
    debug "当前用户: $(whoami)"
    debug "当前目录: $(pwd)"
    debug "Git 分支: $(git branch --show-current 2>/dev/null || echo '无法确定')"
    debug "Git 远程: $(git remote -v 2>/dev/null || echo '无法获取')"
    debug "文件数量: $(find . -name '*.js' -o -name '*.ts' -o -name '*.py' | wc -l | tr -d ' ')"
    debug "GitHub CLI: $([ -x "$GH_PATH" ] && echo '已安装' || echo '未安装')"
    debug "JQ 版本: $(jq --version 2>/dev/null || echo '未安装')"
    debug "Node.js: $($NODE_PATH --version 2>/dev/null || echo '未安装')"
    debug "========================"
}

# 主函数（优化版）
main() {
    log "=== 🔄 ZM App 自动代码评审开始 ==="

    # 输出关键配置信息
    highlight "📱 项目: $REPO_NAME ($REPO_NAMESPACE)"
    info "🆔 MR ID: $MR_ID (IID: $MR_IID)"
    info "📝 标题: $MR_TITLE"
    info "🌿 分支: $SOURCE_BRANCH → $TARGET_BRANCH"
    info "👤 提交者: $USER_NAME ($USER_EMAIL)"
    info "🔄 操作类型: $ACTION_TYPE"
    info "📦 最新提交: ${LAST_COMMIT:0:8}"
    info "🏗️ 构建: #$BUILD_NUMBER"
    info "📁 项目路径: $PROJECT_ROOT"
    info "⚙️ Node.js路径: $NODE_PATH"

    # 调试模式
    if [ "$DEBUG" = "true" ]; then
        debug_environment
    fi

    # 验证必要工具和文件
    if ! validate_environment; then
        error "❌ 环境验证失败，无法继续执行"
        exit 1
    fi

    # 启动文件服务器
    if ! start_file_server; then
        warn "⚠️ 文件服务器启动失败，将使用本地路径"
        REVIEW_FILE_URL="$REVIEW_GIT_PATH"
    fi

    # 执行评审流程
    log "🚀 开始执行评审流程..."
    if ! pr_reviewer; then
        error "❌ 评审流程执行失败"
        exit 1
    fi

    # 解析评审统计信息
    extract_review_statistics

    # 发送通知
    if ! send_notification; then
        warn "⚠️ 发送通知失败，但评审流程已完成"
    fi
    
    cleanup

    highlight "=== ✅ ZM App 自动代码评审完成 ==="
    log "📄 评审报告已生成并发送到团队群"
    log "🔗 MR 链接: $MR_URL"
    log "🏗️ 构建链接: $BUILD_URL"

    # 输出关键文件位置
    info "📁 生成的文件："
    if [[ "$REVIEW_FILE_URL" == http* ]]; then
        info "  - 评审结果: $REVIEW_FILE_URL (可外部访问)"
        info "  - 本地路径: $REVIEW_GIT_PATH"
    else
        info "  - 评审结果: $REVIEW_GIT_PATH (仅本地访问)"
    fi
    # 显示最终报告大小
    if [ -f "$REVIEW_GIT_PATH" ]; then
        local report_size=$(wc -c < "$REVIEW_GIT_PATH" 2>/dev/null || echo "0")
        info "  - 报告大小: ${report_size} 字节"
        
        if [ "$VERBOSE" = true ]; then
            info "💡 使用以下命令查看报告："
            info "  cat \"$REVIEW_GIT_PATH\""
            info "  open \"$REVIEW_GIT_PATH\""
        fi
    fi
}

# 环境验证函数
validate_environment() {
    log "验证运行环境..."
    
    local validation_failed=false
    
    # 检查必要的命令
    local required_commands=("jq" "curl" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            error "缺少必要命令: $cmd"
            validation_failed=true
        else
            debug "✓ 命令可用: $cmd"
        fi
    done
    
    # 检查Node.js
    if [ ! -x "$NODE_PATH" ]; then
        error "Node.js 不可用: $NODE_PATH"
        validation_failed=true
    else
        local node_version=$($NODE_PATH --version 2>/dev/null || echo "unknown")
        debug "✓ Node.js 版本: $node_version"
    fi
    
    # 检查项目目录
    if [ ! -d "$PROJECT_ROOT" ]; then
        error "项目目录不存在: $PROJECT_ROOT"
        validation_failed=true
    else
        debug "✓ 项目目录存在: $PROJECT_ROOT"
    fi
    
    # 检查PR reviewer脚本
    if [ ! -f "$PR_REVIEWER_SCRIPT" ]; then
        error "PR reviewer脚本不存在: $PR_REVIEWER_SCRIPT"
        validation_failed=true
    else
        debug "✓ PR reviewer脚本存在: $PR_REVIEWER_SCRIPT"
    fi
    
    # 检查配置文件
    if [ ! -f "$PROJECT_ROOT/config.json" ]; then
        error "配置文件不存在: $PROJECT_ROOT/config.json"
        validation_failed=true
    else
        debug "✓ 配置文件存在: $PROJECT_ROOT/config.json"
    fi
    
    if [ "$validation_failed" = "true" ]; then
        return 1
    fi
    
    log "环境验证通过 ✅"
    return 0
}

# 设置错误处理
trap 'handle_error $LINENO' ERR
trap cleanup EXIT

# 执行主函数
main "$@"