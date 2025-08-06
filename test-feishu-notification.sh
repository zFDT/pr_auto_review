#!/bin/bash

# 测试飞书通知功能的脚本
# 用法: ./test-feishu-notification.sh [MR_IID]

MR_IID=${1:-161}
PROJECT_ROOT="/path/to/pr-review-automation"
FEISHU_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/your_feishu_webhook_id"

# 颜色输出函数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

# 发送卡片格式通知
send_card_notification() {
    local card_file="$1"
    
    log "📋 发送飞书卡片格式通知..."
    info "卡片文件: $card_file"
    
    if [ ! -f "$card_file" ]; then
        error "❌ 卡片文件不存在: $card_file"
        return 1
    fi
    
    # 预览卡片内容
    if command -v jq >/dev/null 2>&1; then
        info "📋 卡片标题: $(cat "$card_file" | jq -r '.card.header.title.content' 2>/dev/null || echo '无法解析')"
    fi

    local response=$(curl -s -w "%{http_code}" \
                          -X POST "$FEISHU_WEBHOOK" \
                          -H "Content-Type: application/json" \
                          -d @"$card_file")

    local http_code="${response: -3}"
    local response_body="${response%???}"

    if [ "$http_code" = "200" ]; then
        if echo "$response_body" | grep -q '"code":0'; then
            log "✅ 飞书卡片通知发送成功"
            info "📱 ZM App 团队群已收到评审结果卡片"
            return 0
        else
            warn "⚠️ 飞书 API 返回警告: $response_body"
            return 1
        fi
    else
        error "❌ 飞书卡片通知发送失败，HTTP 状态码: $http_code"
        error "响应内容: $response_body"
        return 1
    fi
}

# 发送优化的文本格式通知
send_optimized_text_notification() {
    local mr_iid="$1"
    local review_path="$PROJECT_ROOT/reports/review_git_$mr_iid.text"
    
    log "📝 发送优化文本格式通知..."
    
    if [ ! -f "$review_path" ]; then
        error "❌ 评审报告不存在: $review_path"
        return 1
    fi
    
    # 构建Jenkins链接
    local jenkins_url="http://jenkins.atomverse.com.cn:8080/job/APP_revicew/${BUILD_NUMBER:-$(date +%s)}/console"
    
    # 从评审报告中提取关键信息
    local ai_score=""
    local main_issues=""
    local file_changes=""
    local mr_title=""
    
    # 提取MR标题
    mr_title=$(grep -E "\*\*标题\*\*" "$review_path" | sed 's/.*| \(.*\) |/\1/' || echo "未知标题")
    
    # 提取AI评分
    ai_score=$(grep -E "代码质量评分.*[0-9]+/10" "$review_path" | head -1 | sed 's/.*: \(.*\)/\1/' || echo "")
    
    # 提取文件变更统计
    local file_count=$(grep -E "\*\*总文件数\*\*.*[0-9]+" "$review_path" | sed 's/.*\([0-9]\+\).*/\1/' || echo "0")
    local additions=$(grep -E "\*\*新增行数\*\*.*\+[0-9]+" "$review_path" | sed 's/.*+\([0-9]\+\).*/\1/' || echo "0")
    local deletions=$(grep -E "\*\*删除行数\*\*.*-[0-9]+" "$review_path" | sed 's/.*-\([0-9]\+\).*/\1/' || echo "0")
    
    file_changes="📁 ${file_count}个文件，+${additions}/-${deletions}行"
    
    # 提取主要问题（最多3个）
    main_issues=$(grep -A 10 "潜在问题检测\|🐛 潜在问题" "$review_path" | grep -E "^- |^[0-9]+\. " | head -3 | sed 's/^[0-9]*[.-] */• /' || echo "")
    
    if [ -z "$main_issues" ]; then
        main_issues="✅ 未发现明显问题"
    fi
    
    # 构建优化的文本消息
    local optimized_message
    read -r -d '' optimized_message << TEXT_EOF || true
🏭 **ZM App 代码评审完成**

📝 **MR**: $mr_title
👤 **提交者**: 测试用户  
🌿 **分支**: 测试分支
⏰ **时间**: $(date +'%m/%d %H:%M')

📊 **变更统计**
$file_changes

$([ -n "$ai_score" ] && echo "🤖 **AI评分**: $ai_score" || echo "")

⚠️ **检测结果**
$main_issues

🔗 **查看详情**: https://git.dreame.tech/fdm_printer/zm_app/-/merge_requests/$mr_iid
🏗️ **Jenkins构建**: $jenkins_url

---
💡 详细评审报告请查看Jenkins构建日志
TEXT_EOF

    # 转义特殊字符并构建JSON
    local escaped_message
    escaped_message=$(echo "$optimized_message" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

    cat > /tmp/feishu_message.json << FEISHU_EOF
{
  "msg_type": "text",
  "content": {
    "text": "$escaped_message"
  }
}
FEISHU_EOF

    info "文本消息长度: ${#escaped_message} 字符"

    local response=$(curl -s -w "%{http_code}" \
                          -X POST "$FEISHU_WEBHOOK" \
                          -H "Content-Type: application/json" \
                          -d @/tmp/feishu_message.json)

    local http_code="${response: -3}"
    local response_body="${response%???}"

    if [ "$http_code" = "200" ]; then
        if echo "$response_body" | grep -q '"code":0'; then
            log "✅ 飞书文本通知发送成功"
            info "📱 ZM App 团队群已收到评审结果通知"
            return 0
        else
            warn "⚠️ 飞书 API 返回警告: $response_body"
            return 1
        fi
    else
        error "❌ 飞书文本通知发送失败，HTTP 状态码: $http_code"
        error "响应内容: $response_body"
        return 1
    fi
}

# 主函数
main() {
    log "🧪 测试飞书通知功能"
    info "MR IID: $MR_IID"
    
    # 检查飞书卡片数据文件是否存在
    local feishu_card_path="$PROJECT_ROOT/reports/feishu_card_$MR_IID.json"
    
    if [ -f "$feishu_card_path" ]; then
        # 使用卡片格式发送
        log "📋 找到飞书卡片数据，使用交互式卡片格式..."
        if send_card_notification "$feishu_card_path"; then
            log "✅ 卡片格式通知发送成功"
        else
            warn "⚠️ 卡片格式发送失败，尝试文本格式..."
            send_optimized_text_notification "$MR_IID"
        fi
    else
        warn "📝 未找到卡片数据，使用文本格式..."
        info "期望的卡片文件: $feishu_card_path"
        send_optimized_text_notification "$MR_IID"
    fi
    
    log "🎉 测试完成"
}

# 执行主函数
main "$@"
