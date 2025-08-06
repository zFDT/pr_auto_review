#!/bin/bash

# 测试脚本 - 使用真实的GitLab环境变量
# 基于用户提供的测试环境配置

export gitlabBranch="zhx/zhx_V0.2.1"
export gitlabSourceBranch="zhx/zhx_V0.2.1"
export gitlabTargetBranch="feat_V0.2.1"

export gitlabActionType="MERGE"
export gitlabTriggerPhrase=""

export gitlabUserName="zhanghongxin2"
export gitlabUserUsername=""
export gitlabUserEmail="zhanghongxin2@dreame.tech"
export gitlabMergedByUser="zhanghongxin2"
export gitlabMergeRequestAssignee=""

export gitlabSourceRepoHomepage="https://git.dreame.tech/fdm_printer/zm_app"
export gitlabSourceRepoName="ZM App"
export gitlabSourceNamespace="fdm_printer"
export gitlabSourceRepoURL="git@git.dreame.tech:fdm_printer/zm_app.git"
export gitlabSourceRepoSshUrl="git@git.dreame.tech:fdm_printer/zm_app.git"
export gitlabSourceRepoHttpUrl="https://git.dreame.tech/fdm_printer/zm_app.git"

export gitlabTargetRepoName="ZM App"
export gitlabTargetNamespace="fdm_printer"
export gitlabTargetRepoSshUrl="git@git.dreame.tech:fdm_printer/zm_app.git"
export gitlabTargetRepoHttpUrl="https://git.dreame.tech/fdm_printer/zm_app.git"

export gitlabMergeRequestTitle="[feat](main): 添加代码检测日志以验证正确性"
export gitlabMergeRequestDescription=""
export gitlabMergeRequestId="226756"
export gitlabMergeRequestIid="161"
export gitlabMergeRequestState="opened"
export gitlabMergeRequestTargetProjectId="9831"
export gitlabMergeRequestLabels=""

export gitlabMergeCommitSha=""
export gitlabMergeRequestLastCommit="a4ba1976bddc50e0ff96219e8515af217548e03b"
export gitlabBefore=""
export gitlabAfter=""

# 模拟Jenkins环境变量
export BUILD_NUMBER="123"
export JOB_NAME="zm-app-auto-review"

echo "🧪 使用真实GitLab环境变量测试自动代码评审脚本"
echo "================================================"
echo "📱 项目: $gitlabSourceRepoName"
echo "🆔 MR IID: $gitlabMergeRequestIid"
echo "📝 标题: $gitlabMergeRequestTitle"
echo "🌿 分支: $gitlabSourceBranch → $gitlabTargetBranch"
echo "👤 提交者: $gitlabUserName ($gitlabUserEmail)"
echo "================================================"
echo ""

# 运行自动评审脚本
DEBUG=true bash auto-review.sh
