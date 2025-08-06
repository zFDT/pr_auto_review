# PR Review自动化PowerShell脚本
param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$ProjectName,
    
    [Parameter(Mandatory=$true, Position=1)]
    [int]$PRNumber
)

function Write-Banner {
    param([string]$Message)
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Yellow
    Write-Host "===========================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

# 显示横幅
Write-Banner "PR Review 自动化工具"
Write-Info "项目名称: $ProjectName"
Write-Info "PR编号: $PRNumber"
Write-Host ""

# 检查Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Node.js 版本: $nodeVersion"
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Error "未找到Node.js，请确保已安装Node.js"
    exit 1
}

# 检查并安装依赖
if (-not (Test-Path "node_modules")) {
    Write-Info "正在安装依赖..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "依赖安装失败"
        exit 1
    }
    Write-Success "依赖安装完成"
}

# 执行PR review
Write-Info "开始执行PR review..."
Write-Host ""

try {
    $result = node pr-reviewer.js $ProjectName $PRNumber
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Banner "Review 执行成功！"
        
        $reportPath = Join-Path $PSScriptRoot "reports\review_gir.text"
        $absolutePath = Resolve-Path $reportPath -ErrorAction SilentlyContinue
        
        if ($absolutePath) {
            Write-Success "报告已保存到: review_gir.text"
            Write-Success "绝对路径: $($absolutePath.Path)"
            
            # 返回绝对路径
            return $absolutePath.Path
        } else {
            Write-Success "报告已保存到: reports\review_gir.text"
            return "$PSScriptRoot\reports\review_gir.text"
        }
    } else {
        throw "Review执行失败"
    }
} catch {
    Write-Host ""
    Write-Banner "Review 执行失败！"
    Write-Error $_.Exception.Message
    exit 1
}
