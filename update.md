# 项目更新记录

本文件记录所有项目变更，每次修改都要在此文件中追加记录。

## 2025-01-14

### 独立运行优化 - 移除缓存机制

- **配置加载器优化**：
  - 移除ConfigLoader类中的configCache和envCache缓存机制
  - 简化loadConfig方法，移除useCache参数，每次独立加载
  - 移除配置变更监听和热重载功能（configWatchers）
  - 移除配置哈希检查和变更事件
  - 更新加载统计，移除cacheHits统计项
  - 优化环境变量替换，移除缓存依赖

- **AI分析器缓存移除**：
  - **OpenAI分析器**：
    - 移除resultCache结果缓存机制
    - 删除generateCacheKey、getCachedResult、cacheResult方法
    - 移除分析统计中的cacheHits计数
    - 移除crypto依赖，简化导入
  - **Aliyun百炼分析器**：
    - 移除analysisCache分析缓存机制
    - 删除maxCacheSize和cacheExpireTime配置
    - 删除generateCacheKey、cacheAnalysisResult、getCachedResult、cleanExpiredCache方法
    - 移除crypto依赖，简化导入
    - 移除配置文件中的缓存相关配置项

- **性能优化效果**：
  - 减少内存占用，无缓存数据结构
  - 简化代码逻辑，移除缓存管理复杂性
  - 提高独立运行的可靠性，避免状态残留
  - 符合项目独立执行的设计原则

### 项目查询功能优化

- 修改项目ID获取逻辑，优先使用GitLab API查询最新项目信息
- 配置文件中的projects配置改为备选方案，当API查询失败时使用
- 移除项目缓存功能，支持独立运行模式
- 添加多种项目引用方式支持：项目名称、路径、命名空间路径、项目ID

### 代码结构调整

- 移除PRReviewer类中的projectsCache相关代码
- 简化searchProjectFromAPI方法，直接进行API查询
- 移除模糊匹配和编辑距离计算相关方法
- 简化listProjects函数，直接从API获取项目列表

### 配置文件优化

- 更新config.json中的项目配置说明
- 明确projects配置作为API备选方案的作用

### 功能改进

- 优化错误提示信息，提供更清晰的项目查找建议
- 改进日志输出，明确显示是从API还是配置文件获取项目信息
- 支持项目ID直接查询功能

### GitHub Copilot配置

- 创建.github/copilot-instructions.md文件
- 配置开发规范和项目要求
- 明确独立运行、配置集中管理等开发原则
- 创建.vscode/settings.json配置文件，启用Copilot指令文件功能
- 创建.vscode/tasks.json任务配置，支持快速运行常用命令
- 创建pr-auto-review.code-workspace工作区文件，推荐相关扩展

### 配置文件优化合并

- 分析flutter-review-config.json和review-standards-config.json的重复内容
- 创建unified-flutter-review-config.json统一配置文件
- 合并AI分析配置和具体检查规则，消除重复配置
- 重新组织配置结构，按功能领域分组（Widget设计、GetX状态管理、性能优化等）
- 更新config.json引用新的统一配置文件
- 创建配置迁移脚本scripts/migrate-flutter-configs.js
- 配置集中管理，符合项目设计原则

### 配置清理优化

- 移除config.json中不再使用的review_prompts配置块
- 清理OpenAI分析器中未使用的reviewPrompts变量
- 更新ReviewStandardsManager支持新的unified-flutter-review-config.json
- 实现配置文件自动降级机制：优先使用统一配置，不存在时使用旧配置
- 添加配置格式转换逻辑，保持向后兼容性
