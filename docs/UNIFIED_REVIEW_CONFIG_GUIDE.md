# 统一Review配置系统指南

## 📋 概述

我们为您创建了一个统一的Review配置管理系统，将原本分散在各个文件中的review规范整合到一个中心化的配置文件中。这样您可以更方便地管理和更改所有review相关的逻辑。

## 🏗️ 系统架构

### 核心组件

1. **统一配置文件**: `config/review-standards-config.json`
   - 包含所有review标准和规范
   - 支持全局配置和语言特定配置
   - 包含项目类型特定配置

2. **配置管理器**: `src/utils/review-standards-manager.js`
   - 负责加载和管理review标准
   - 提供统一的API访问配置
   - 支持动态语言和项目类型检测

3. **配置管理工具**: `scripts/review-config-manager.js`
   - 命令行工具，方便管理配置
   - 支持查看、更新、验证配置
   - 支持导入导出配置

## 🔧 配置结构

### 全局Review标准
```json
{
  "global_review_standards": {
    "system_prompts": {
      "base_system_prompt": "基础系统提示词",
      "role_definition": "角色定义",
      "analysis_principles": "分析原则"
    },
    "analysis_focus_areas": {
      "code_quality": { "weight": 25, "items": [...] },
      "potential_bugs": { "weight": 30, "items": [...] },
      "security_vulnerabilities": { "weight": 25, "items": [...] }
    }
  }
}
```

### 语言特定标准
```json
{
  "language_specific_standards": {
    "javascript_typescript": {
      "enabled": true,
      "extends": "global_review_standards",
      "specific_checks": {
        "es6_features": "检查现代JavaScript特性使用",
        "async_await": "异步代码处理规范"
      }
    }
  }
}
```

### 项目类型标准
```json
{
  "project_type_standards": {
    "mobile_app": {
      "enabled": true,
      "focus_areas": [
        "用户体验和界面响应性",
        "电池和性能优化"
      ]
    }
  }
}
```

## 🚀 使用方法

### 1. 查看当前配置

```bash
# 查看配置概览
npm run review-config:show

# 查看全局配置
npm run review-config show global

# 查看支持的语言
npm run review-config:languages

# 查看团队规则
npm run review-config:rules
```

### 2. 管理语言配置

```bash
# 启用TypeScript支持
npm run review-config language enable typescript

# 禁用某个语言
npm run review-config language disable python

# 添加新语言支持
npm run review-config language add kotlin
```

### 3. 管理团队规则

```bash
# 查看团队自定义规则
npm run review-config rules list

# 添加新的自定义规则
npm run review-config rules add

# 删除规则
npm run review-config rules remove rule-name
```

### 4. 验证和导出配置

```bash
# 验证配置有效性
npm run review-config:validate

# 导出配置到文件
npm run review-config export my-standards.json

# 从文件导入配置
npm run review-config import my-standards.json
```

## 🎯 主要改进

### 1. 统一配置管理
- ✅ 所有review规范集中在一个文件中
- ✅ 支持继承和扩展机制
- ✅ 减少配置重复和不一致

### 2. 智能语言检测
- ✅ 自动检测代码主要语言
- ✅ 应用语言特定的review标准
- ✅ 支持项目类型识别

### 3. 灵活的配置选项
- ✅ 权重配置，控制分析重点
- ✅ 严重程度分类
- ✅ 团队自定义规则

### 4. 便捷的管理工具
- ✅ 命令行工具管理配置
- ✅ 配置验证和诊断
- ✅ 导入导出功能

## 📁 文件结构变化

### 新增文件
```
config/
├── review-standards-config.json    # 统一review标准配置
└── flutter-review-config.json      # 保留的Flutter特定配置

src/utils/
└── review-standards-manager.js     # 配置管理器

scripts/
└── review-config-manager.js        # 配置管理工具
```

### 更新的文件
```
src/analyzers/
├── aliyun-bailian-analyzer.js      # 使用统一配置
├── openai-analyzer.js              # 使用统一配置

config/
└── config.json                     # 更新review_prompts配置
```

## 🔄 升级指南

### 从旧配置迁移

1. **备份现有配置**
   ```bash
   npm run backup-config
   ```

2. **验证新配置**
   ```bash
   npm run review-config:validate
   ```

3. **查看配置状态**
   ```bash
   npm run review-config:show
   ```

### 自定义配置

1. **编辑配置文件**
   直接编辑 `config/review-standards-config.json`

2. **使用管理工具**
   ```bash
   npm run review-config update global
   npm run review-config language enable your-language
   ```

3. **添加团队规则**
   ```bash
   npm run review-config rules add
   ```

## 🎨 配置示例

### 启用Flutter项目优化
```bash
npm run review-config language enable dart
npm run review-config language enable flutter
```

### 添加自定义规则
```json
{
  "team_customization": {
    "custom_rules": {
      "rules": [
        {
          "name": "禁用console.log",
          "pattern": "console\\.log\\(",
          "severity": "minor",
          "message": "请使用日志库替代console.log"
        }
      ]
    }
  }
}
```

### 调整分析权重
```json
{
  "global_review_standards": {
    "analysis_focus_areas": {
      "security_vulnerabilities": {
        "enabled": true,
        "weight": 35,
        "items": [...]
      }
    }
  }
}
```

## 🛠️ 故障排除

### 常见问题

1. **配置验证失败**
   ```bash
   npm run review-config:validate
   ```

2. **语言检测不准确**
   - 检查文件扩展名映射
   - 确认语言配置已启用

3. **自定义规则不生效**
   - 验证正则表达式语法
   - 检查规则优先级

### 调试命令

```bash
# 查看详细诊断信息
npm run review-config validate

# 查看配置状态
npm run review-config show

# 重新验证AI配置
npm run check-config
```

## 📈 性能优化

### 配置缓存
- 配置文件自动缓存
- 支持热重载
- 减少重复加载

### 智能提示词
- 根据语言动态生成
- 避免冗余信息
- 优化token使用

## 🔮 未来规划

### 短期目标
- [ ] Web界面配置管理
- [ ] 更多语言支持
- [ ] 配置模板库

### 长期目标
- [ ] AI自动配置优化
- [ ] 团队协作配置
- [ ] 配置版本管理

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看配置验证结果
2. 检查日志输出
3. 参考本文档
4. 联系技术支持

---

**提示**: 这个统一配置系统让您可以随着项目情况的变化轻松调整review逻辑，无需修改代码，只需要更新配置文件即可。
