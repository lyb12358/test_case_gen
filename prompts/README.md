# 参数化提示词系统使用说明

## 概述

本项目已重构测试用例生成的用户提示词系统，从原来的多个重复文件改为参数化的单一模板系统。通过业务类型参数（如RCC、RFD、ZAB、ZBA）可以动态生成不同业务场景的提示词。

## 目录结构

```
prompts/
├── README.md                           # 本说明文档
├── requirements_template.md            # 主模板文件
├── business_descriptions/              # 业务描述目录
│   ├── RCC.md                         # RCC业务描述
│   ├── RFD.md                         # RFD业务描述
│   ├── ZAB.md                         # ZAB业务描述
│   └── ZBA.md                         # ZBA业务描述
└── shared/                             # 共享内容目录
    ├── system_background.md           # 系统背景介绍
    ├── error_codes.md                 # TSP-APP错误码
    └── swagger_api.md                 # Swagger文档信息
```

## 使用方法

### 1. 列出所有可用业务类型

```bash
python -m scripts.generate_test_cases --list-business-types
```

### 2. 生成特定业务类型的测试用例

```bash
# 生成RCC测试用例
python -m scripts.generate_test_cases --business-type RCC

# 生成RFD测试用例
python -m scripts.generate_test_cases --business-type RFD

# 生成ZAB测试用例
python -m scripts.generate_test_cases --business-type ZAB

# 生成ZBA测试用例
python -m scripts.generate_test_cases --business-type ZBA
```

### 3. 通过环境变量设置默认业务类型

在`.env`文件中设置：
```
BUSINESS_TYPE=RCC
```

然后运行：
```bash
python -m scripts.generate_test_cases
```

## 核心组件

### PromptBuilder类

位置：`src/utils/prompt_builder.py`

主要功能：
- 动态加载共享内容和业务特定描述
- 使用模板组装完整的提示词
- 支持保存生成的提示词到文件
- 提供业务类型列表查询

### 配置系统增强

位置：`src/utils/config.py`

新增功能：
- `business_type` 属性：获取业务类型参数
- `prompts_dir` 属性：获取提示词目录
- `get_requirements_prompt_path()` 方法：根据业务类型生成文件路径

### 脚本功能增强

位置：`scripts/generate_test_cases.py`

新增功能：
- `--business-type` 参数：指定业务类型
- `--list-business-types` 参数：列出所有可用业务类型
- 自动构建和保存业务特定的提示词

## 添加新业务类型

要添加新的业务类型，只需：

1. 在 `prompts/business_descriptions/` 目录下创建新的业务描述文件，如 `NEW_TYPE.md`
2. 业务描述文件格式参考现有的RCC.md、RFD.md等
3. 运行 `python -m scripts.generate_test_cases --list-business-types` 验证新业务类型是否被识别
4. 使用 `python -m scripts.generate_test_cases --business-type NEW_TYPE` 生成新业务类型的测试用例

## 优势

- **消除重复**：共享内容只需维护一份
- **易于维护**：修改共享内容会自动影响所有业务类型
- **一致性**：统一的模板格式确保提示词结构一致
- **可扩展性**：添加新业务类型只需创建业务描述文件
- **灵活性**：支持命令行参数和环境变量两种配置方式

## 向后兼容

原有的提示词文件（如 `requirements_RCC.md`）会在首次使用新系统时自动生成，确保向后兼容。用户可以选择继续使用原有文件，也可以采用新的参数化方式。