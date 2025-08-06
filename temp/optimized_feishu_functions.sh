# 发送飞书通知（优化版本，使用卡片格式）
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

---
💡 详细评审报告请查看Jenkins构建日志
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
