# TSP测试用例生成系统

基于LLM的TSP（远程控制）业务类型参数化测试用例生成系统，具备现代化Web前端和知识图谱可视化功能。

## 🚀 快速开始

### 环境要求
- Python 3.8+
- Node.js 16+
- npm 或 yarn

### 安装与启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd tsp-testcase-script

# 2. 后端环境配置
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# 安装Python依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置API密钥等

# 3. 前端环境配置
cd web
npm install
cd ..

# 4. 启动服务
# 启动后端API服务器
python -m src.api.endpoints

# 启动前端开发服务器（新终端）
cd web && npm run dev
```

### 访问地址
- **前端界面**: http://localhost:5173
- **API接口**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **API文档(ReDoc)**: http://localhost:8000/redoc

## 🎯 系统概述

本项目是一个完整的TSP业务测试用例自动生成解决方案，主要功能包括：

1. **智能测试用例生成**: 基于LLM的四种TSP业务类型测试用例自动生成
2. **知识图谱可视化**: TSP本体图谱展示业务、服务、接口和测试用例的关系
3. **实时任务监控**: 后台任务生成进度追踪和状态管理
4. **数据持久化**: 完整的SQLite数据库存储和CRUD操作
5. **现代化界面**: 响应式Web界面，支持中文本地化

## 📁 项目架构

### 后端架构 (Python)
```
src/
├── api/                      # API层
│   └── endpoints.py         # FastAPI路由和端点定义
├── core/                     # 核心业务逻辑
│   ├── test_case_generator.py    # 测试用例生成主逻辑
│   ├── interface_test_generator.py # 接口测试生成
│   ├── json_extractor.py          # JSON数据提取
│   ├── excel_converter.py         # Excel文件转换
│   └── business_data_extractor.py # 业务数据提取器
├── database/                 # 数据层
│   ├── models.py           # SQLAlchemy数据模型
│   ├── operations.py       # 数据库CRUD操作
│   └── database.py         # 数据库连接管理
├── llm/                     # LLM集成
│   └── llm_client.py       # LLM客户端封装
├── models/                  # Pydantic数据模型
├── utils/                   # 工具模块
│   ├── config.py           # 配置管理
│   ├── file_handler.py     # 文件操作工具
│   └── prompt_builder.py   # 提示词构建器
└── __init__.py
```

### 前端架构 (React + TypeScript)
```
web/
├── src/
│   ├── components/              # 可复用组件
│   │   └── Layout/            # 布局组件
│   │       └── MainLayout.tsx # 主布局
│   ├── pages/                  # 页面组件
│   │   ├── Dashboard/         # 仪表盘 - 统计概览
│   │   ├── TestCases/         # 测试用例管理
│   │   │   ├── TestCaseList.tsx    # 用例列表
│   │   │   ├── TestCaseDetail.tsx  # 用例详情
│   │   │   └── TestCaseGenerate.tsx # 用例生成
│   │   ├── Tasks/             # 任务监控
│   │   │   ├── TaskList.tsx   # 任务列表
│   │   │   └── TaskDetail.tsx # 任务详情
│   │   └── KnowledgeGraph/    # 知识图谱
│   │       ├── index.tsx      # 图谱主页面
│   │       └── Graph.tsx      # 图谱可视化组件
│   ├── services/              # API服务层
│   │   ├── testCaseService.ts # 测试用例API
│   │   └── knowledgeGraphService.ts # 知识图谱API
│   ├── types/                 # TypeScript类型定义
│   │   ├── testCases.ts       # 测试用例类型
│   │   └── knowledgeGraph.ts  # 知识图谱类型
│   ├── App.tsx               # 主应用组件
│   └── main.tsx              # 应用入口
├── package.json              # 依赖配置
├── vite.config.ts           # Vite构建配置
├── tsconfig.json            # TypeScript配置
└── index.html               # HTML模板
```

### 数据库设计
- **test_case_groups**: 测试用例组（按业务类型和生成批次组织）
- **test_case_items**: 具体测试用例项
- **generation_jobs**: 生成任务状态追踪
- **knowledge_entities**: 知识图谱实体（场景、业务、服务、接口、测试用例）
- **knowledge_relations**: 知识图谱关系三元组
- **test_case_entities**: 测试用例与知识图谱实体的关联

## 🔧 核心功能

### 支持的业务类型
- **RCC**: Remote Climate Control (远程净化)
- **RFD**: Remote Fragrance Control (香氛控制)
- **ZAB**: Remote Cabin Temperature Setting (远程恒温座舱设置)
- **ZBA**: Water Flooding Alarm (水淹报警)

### 测试用例生成流程
1. **业务类型选择**: 选择要生成测试用例的业务类型
2. **提示词构建**: 基于业务类型自动构建针对性的提示词
3. **LLM生成**: 调用大语言模型生成测试用例JSON
4. **数据验证**: 验证生成数据的完整性和格式
5. **数据库存储**: 持久化存储到数据库，自动清理旧数据
6. **知识图谱更新**: 自动创建相关实体和关系

### 知识图谱功能
- **实体类型**: 场景、业务类型、服务、接口、测试用例
- **关系类型**: has_service、provides_interface、has_test_case等
- **可视化**: 交互式网络图，支持缩放、拖拽、筛选
- **过滤**: 按业务类型筛选显示相关实体和关系
- **详情**: 点击实体查看详细信息和关联测试用例

### 任务监控系统
- **实时进度**: WebSocket或轮询获取任务执行进度
- **状态管理**: pending、running、completed、failed
- **错误处理**: 详细的错误信息记录和显示
- **任务历史**: 查看历史生成任务和结果

## 🛠️ 开发指南

### 添加新业务类型
1. **更新枚举**: 在 `src/database/models.py` 中添加 `BusinessType` 枚举值
2. **创建提示词**: 在 `prompts/business_descriptions/` 目录添加业务描述文件
3. **更新提示词构建器**: 在 `src/utils/prompt_builder.py` 中添加新业务类型的提示词逻辑
4. **前端配置**: 更新前端类型定义和业务类型选择器

### API接口文档

#### 测试用例生成
```http
POST /generate-test-cases
Content-Type: application/json

{
  "business_type": "RCC"
}
```

#### 查询任务状态
```http
GET /status/{task_id}
```

#### 获取测试用例
```http
GET /test-cases/{business_type}
GET /test-cases
```

#### 知识图谱数据
```http
GET /knowledge-graph/data?business_type=RCC
GET /knowledge-graph/stats
GET /knowledge-graph/entities/{entity_id}/details
```

### 数据库操作
```python
# 获取数据库操作实例
with db_manager.get_session() as db:
    db_operations = DatabaseOperations(db)

    # 创建测试用例组
    group = db_operations.create_test_case_group(
        business_type=BusinessType.RCC,
        generation_metadata=metadata
    )

    # 批量创建测试用例项
    items = db_operations.create_test_case_items_batch(
        group_id=group.id,
        test_cases_data=test_cases_list
    )
```

### 前端组件开发
```typescript
// API服务调用示例
import { useMutation, useQuery } from '@tanstack/react-query';
import { testCaseService } from '../services/testCaseService';

// 生成测试用例
const generateMutation = useMutation({
  mutationFn: testCaseService.generateTestCases,
  onSuccess: (data) => {
    console.log('生成成功:', data.task_id);
  }
});

// 查询测试用例
const { data: testCases } = useQuery({
  queryKey: ['testCases', businessType],
  queryFn: () => testCaseService.getTestCases(businessType)
});
```

## ⚙️ 配置说明

### 环境变量 (.env)
```env
# LLM配置
API_KEY=your_llm_api_key
API_BASE_URL=https://api.llm-provider.com/v1
MODEL=gpt-4

# 数据库配置
DATABASE_PATH=data/test_cases.db

# 输出配置
OUTPUT_DIR=output

# 服务器配置
HOST=0.0.0.0
PORT=8000
```

### 提示词配置
- `prompts/system.md`: 系统提示词模板
- `prompts/requirements_template.md`: 需求提示词模板
- `prompts/business_descriptions/`: 各业务类型详细描述

## 🚀 部署

### 开发环境
```bash
# 启动开发服务器
python -m src.api.endpoints --reload
cd web && npm run dev
```

### 生产环境
```bash
# 构建前端
cd web && npm run build

# 启动生产服务器
python -m src.api.endpoints --host 0.0.0.0 --port 8000
```

### Docker部署 (可选)
```dockerfile
# Dockerfile示例
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "-m", "src.api.endpoints"]
```

## 🔍 故障排除

### 常见问题

**Q: LLM API调用失败**
A: 检查 `.env` 文件中的API密钥和基础URL配置，确保网络连接正常

**Q: 数据库连接错误**
A: 确保数据库文件路径正确，检查目录权限，必要时手动创建 `data/` 目录

**Q: 前端无法连接后端**
A: 检查后端服务是否正常启动，确认端口8000未被占用

**Q: 知识图谱显示异常**
A: 尝试重新初始化知识图谱：调用 `POST /knowledge-graph/initialize`

### 日志调试
```bash
# 查看后端日志
python -m src.api.endpoints --log-level debug

# 查看前端开发服务器日志
cd web && npm run dev --verbose
```

## 📊 技术栈

### 后端技术
- **FastAPI**: 现代Python Web框架，自动生成API文档
- **SQLAlchemy**: Python ORM，数据库抽象层
- **Pydantic**: 数据验证和序列化
- **SQLite**: 轻量级关系型数据库
- **Python LLM SDK**: 大语言模型集成

### 前端技术
- **React 19**: 现代化前端框架
- **TypeScript**: 类型安全的JavaScript
- **Vite**: 快速构建工具
- **Ant Design 5**: 企业级UI组件库
- **React Query**: 数据获取和状态管理
- **React Router**: 单页应用路由
- **AntV G6**: 图形可视化库
- **Axios**: HTTP客户端

### 开发工具
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Husky**: Git钩子管理
- **Jest**: 单元测试框架

## 📝 更新日志

### v2.0.0 (当前版本)
- ✨ 全新的React前端架构
- ✨ 知识图谱可视化功能
- ✨ 实时任务监控系统
- ✨ 数据库完全重构
- ✨ RESTful API设计
- ✨ TypeScript类型安全

### v1.0.0 (历史版本)
- 基础测试用例生成功能
- 简单的Web界面
- 文件存储方式

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue: [项目Issues页面]
- 邮件联系: [项目维护者邮箱]

---

**TSP测试用例生成系统** - 让测试用例生成更智能、更高效！ 🚀