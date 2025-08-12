# 项目结构说明

## 目录结构

```
pr-review-automation/
├── README.md                   # 项目主文档
├── index.js                    # 项目统一入口点
├── pr-reviewer.js              # 核心评审逻辑
├── review.sh                   # 外部调用入口脚本 (保持原位置)
├── package.json               # Node.js项目配置
├── .env                       # 环境变量配置
├── .gitignore                 # Git忽略文件配置
│
├── src/                       # 源代码目录
│   ├── analyzers/             # AI分析器模块
│   │   ├── aliyun-bailian-analyzer.js   # 阿里云百炼分析器
│   │   ├── copilot-extension.js         # VS Code Copilot分析器
│   │   └── openai-analyzer.js           # OpenAI分析器
│   │
│   ├── config/                # 配置管理模块
│   │   └── config-loader.js   # 配置加载器
│   │
│   └── utils/                 # 工具函数模块
│       ├── check-feishu.js    # 飞书连接检查
│       ├── demo-ai-providers.js # AI提供商演示
│       ├── health-check.js    # 健康检查
│       ├── project-cleaner.js # 项目清理工具
│       ├── switch-ai-provider.js # AI提供商切换
│       └── validate-config.js # 配置验证
│
├── config/                    # 配置文件目录
│   ├── config.json           # 主配置文件
│   ├── copilot-config.json   # Copilot配置
│   └── flutter-review-config.json # Flutter评审配置
│
├── scripts/                   # 系统脚本目录
│   ├── file-server.sh        # 文件服务器脚本
│   ├── install-file-server.sh # 文件服务器安装脚本
│   └── setup-env.sh          # 环境设置脚本
│
├── docs/                      # 文档目录
│   ├── AI_MODELS_GUIDE.md     # AI模型使用指南
│   ├── ALIYUN_BAILIAN_SETUP.md # 阿里云百炼设置指南
│   ├── COPILOT_SETUP.md       # Copilot设置指南
│   ├── OPTIMIZATION_REPORT.md # 优化报告
│   ├── QUICKSTART.md          # 快速开始指南
│   └── TECH_SHARING.md        # 技术分享文档
│
├── reports/                   # 评审报告目录
│   └── {MR编号}/             # 按MR编号分组的报告
│
└── temp/                      # 临时文件目录
```

## 核心组件说明

### 1. 入口文件
- **review.sh**: 外部调用的主入口，保持在根目录不变
- **index.js**: Node.js程序的统一入口点
- **pr-reviewer.js**: 核心评审逻辑和类定义

### 2. 源代码模块 (src/)
- **analyzers/**: 各种AI分析器的实现
- **config/**: 配置管理相关功能
- **utils/**: 通用工具函数

### 3. 配置文件 (config/)
- 统一管理所有配置文件
- 支持多环境配置

### 4. 系统脚本 (scripts/)
- 部署和维护相关的Shell脚本
- 文件服务器管理脚本

### 5. 文档 (docs/)
- 项目相关的所有文档
- 用户指南和技术文档

## 重要注意事项

1. **外部入口保护**: `review.sh` 文件保持在根目录，作为外部系统的调用入口
2. **文件服务器**: 已更新LaunchAgent配置以使用新的脚本路径 `scripts/file-server.sh`
3. **配置路径**: 所有配置文件引用已更新为 `config/config.json`
4. **模块化导入**: 更新了所有import路径以反映新的目录结构

## 启动方式

### 通过Shell脚本 (推荐外部调用)
```bash
./review.sh "项目名称" MR编号
```

### 通过Node.js
```bash
node index.js "项目名称" MR编号
# 或
npm start "项目名称" MR编号
```

### 通过npm脚本
```bash
npm run check-config     # 检查配置
npm run check-health     # 健康检查  
npm run switch-ai        # 切换AI提供商
npm run clean           # 清理项目
```
