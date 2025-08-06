#!/bin/bash

# 快速自动评审脚本
# 用法: ./quick-review.sh [MR编号]

set -e

# 默认参数
DEFAULT_PROJECT="ZM App"
DEFAULT_MR="161"

# 获取MR编号
MR_NUMBER="${1:-$DEFAULT_MR}"

# 验证MR编号是数字
if ! [[ "$MR_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "❌ 错误: MR编号必须是数字，当前值: $MR_NUMBER"
    echo "💡 用法: $0 [MR编号]"
    echo "💡 示例: $0 161"
    exit 1
fi

echo "🚀 快速启动自动评审..."
echo "📱 项目: $DEFAULT_PROJECT"
echo "🆔 MR: #$MR_NUMBER"
echo

# 执行自动评审
exec ./auto-review.sh "$DEFAULT_PROJECT" "$MR_NUMBER" --verbose
