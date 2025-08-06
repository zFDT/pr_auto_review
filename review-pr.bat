@echo off

REM PR Review自动化脚本
REM 用法: review-pr.bat "项目名称" PR编号

if "%~2"=="" (
    echo 用法: review-pr.bat "项目名称" PR编号
    echo 示例: review-pr.bat "ZM App" 161
    exit /b 1
)

set "PROJECT_NAME=%~1"
set "PR_NUMBER=%~2"

echo ==========================================
echo        PR Review 自动化工具
echo ==========================================
echo 项目名称: %PROJECT_NAME%
echo PR编号: %PR_NUMBER%
echo ==========================================

REM 检查Node.js是否可用
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请确保已安装Node.js
    exit /b 1
)

REM 检查依赖是否已安装
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 错误: 依赖安装失败
        exit /b 1
    )
)

REM 执行PR review
echo 开始执行PR review...
node pr-reviewer.js "%PROJECT_NAME%" "%PR_NUMBER%"

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo         Review 执行成功！
    echo ==========================================
    echo 报告已保存到 reports\review_gir.text
    for %%I in ("%~dp0reports\review_gir.text") do echo 绝对路径: %%~fI
) else (
    echo.
    echo ==========================================
    echo         Review 执行失败！
    echo ==========================================
    exit /b 1
)

pause
