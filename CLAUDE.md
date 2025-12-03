# TSP 测试用例生成系统 - AI 助手指南

## 环境设置

**必需环境变量（.env 文件）：**
```env
# API 配置（阿里云 DashScope）
API_KEY=your_dashscope_api_key_here
API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL=qwen3-235b-a22b-instruct-2507

# 数据库配置
USER=tsp
PASSWORD=your_database_password_here
DATABASE=testcase_gen
HOST=127.0.0.1:3306
```

**启动命令：**
```bash
# 后端（端口 8000）
python -m src.api.endpoints

# 前端（端口 5173）
cd web && npm run dev

# 测试
pytest                          # 后端测试
npm run test                     # 前端测试
```

## 核心架构

### 系统概述

TSP 测试用例生成系统是一个基于 AI 的企业级全栈应用，专为汽车 TSP（Telematics Service Provider）远程控制服务的测试用例自动化生成而设计。系统采用先进的两阶段生成架构，支持 29 种业务类型的动态配置。

### 统一生成模式（唯一推荐方式）

**核心端点：POST /api/v1/unified-test-cases/generate**

```typescript
import unifiedGenerationService from '../services';

// 阶段1：生成测试点（基础测试场景和需求）
const testPointsResponse = await unifiedGenerationService.generateUnified({
  business_type: 'RCC',
  project_id: activeProject.id,
  generation_mode: 'test_points_only',
  additional_context: '生成50个风险管理相关的测试点'
});

// 阶段2：基于测试点生成完整测试用例
const testCasesResponse = await unifiedGenerationService.generateUnified({
  business_type: 'RCC',
  project_id: activeProject.id,
  generation_mode: 'test_cases_only',
  test_point_ids: testPointsResponse.data.unified_test_cases.map(tp => tp.id),
  additional_context: '生成详细的测试用例步骤，包含完整的输入、执行和期望结果'
});
```

**架构特点：**
- **统一端点设计**：系统已完成端点清理，现在只有这一个统一的AI生成端点
- **两阶段生成**：先生成测试点，再转换为完整测试用例
- **实时进度监控**：WebSocket 集成提供生成过程的实时状态更新
- **动态业务类型**：支持 29 种 TSP 业务类型的按项目激活配置

**说明：** 所有历史遗留的分散端点已被移除，请使用上述统一模式进行两阶段生成。

### 动态业务类型管理
```typescript
import { useBusinessTypeMapping } from '../hooks';

const {
  getBusinessTypeFullName,
  getAllBusinessTypes,
  businessTypesMapping
} = useBusinessTypeMapping();

// 从 API 动态获取 29 种业务类型
const businessTypes = getAllBusinessTypes();
```

### 动态业务类型管理
```typescript
import { useBusinessTypeMapping } from '../hooks';

const {
  getBusinessTypeFullName,
  getAllBusinessTypes,
  businessTypesMapping
} = useBusinessTypeMapping();

// 从 API 动态获取 29 种业务类型
const businessTypes = getAllBusinessTypes();

// 支持的业务类型包括：
// RCC (远程空调控制), RFD (远程车门控制), ZAB, ZBA
// PAB, PAE, PAI, RCE, RES, RHL, RPP, RSM, RWS 等
```

### WebSocket 实时通信
```typescript
import { useWebSocket } from '../hooks';

const { lastMessage, isConnected } = useWebSocket(taskId);

useEffect(() => {
  if (lastMessage?.type === 'progress') {
    setProgress(lastMessage.data.progress);
    setCurrentStep(lastMessage.data.current_step);
  }

  if (lastMessage?.type === 'completed') {
    setCompleted(true);
    showNotification('生成完成！', 'success');
  }
}, [lastMessage]);

// 连接端点: ws://localhost:8000/ws/{task_id}
```

### 知识图谱集成
```typescript
// 知识图谱可视化使用 @antv/g6
import { Graph } from '@antv/g6';

// 支持实体-关系映射：
// 业务场景 ↔ 接口 ↔ 测试用例
// 提供测试覆盖率的可视化分析
```

## API 端点结构

### 统一端点架构

系统已完成端点整合，现在采用统一的设计模式，主要模块包括：

1. **AI 生成端点** (`/api/v1/unified-test-cases/`)
   - **核心生成接口**: `POST /api/v1/unified-test-cases/generate`
   - 两阶段统一生成服务（测试点 + 测试用例）
   - WebSocket 实时进度监控 (`ws://localhost:8000/ws/{task_id}`)
   - 后台任务管理和状态跟踪

2. **业务类型管理** (`/api/v1/business/`)
   - 29 种 TSP 业务类型动态配置
   - 项目级业务类型激活和权限管理
   - 提示词组合管理

3. **项目管理** (`/api/v1/projects/`)
   - 层次化项目组织和权限控制
   - 项目统计和健康监控
   - 业务类型的项目级配置

4. **提示词管理** (`/api/v1/prompts/`)
   - 数据库驱动的提示词系统
   - 版本控制和组合管理
   - 模板变量解析和动态注入

5. **知识图谱** (`/api/v1/knowledge-graph/`)
   - 实体-关系图谱管理
   - 测试覆盖率可视化分析
   - 图谱数据的 CRUD 操作

6. **配置管理** (`/api/v1/config/`)
   - 业务类型配置和系统健康检查
   - 动态配置更新和验证

**重要提示**: 所有历史遗留的分散生成端点已被完全移除，现在统一使用 `/api/v1/unified-test-cases/generate` 进行所有 AI 生成操作。

### 当前功能限制

**未实现的功能:**
- 异步导出任务管理（当前使用同步 Excel 导出）
- 数据库审计日志系统（当前使用 Python logging 模块）
- 基于数据库的系统配置管理（当前基于文件配置）

### 关键 API 调用

```bash
# 获取业务类型（支持动态配置）
curl "http://localhost:8000/api/v1/business/business-types?project_id=1&is_active=true"

# 获取项目列表（层次化管理）
curl "http://localhost:8000/api/v1/projects?active_only=true"

# 获取统一测试用例（支持分阶段查询）
curl "http://localhost:8000/api/v1/unified-test-cases?project_id=1&status=approved&stage=test_case&page=1&size=20"

# 获取知识图谱数据
curl "http://localhost:8000/api/v1/knowledge-graph/entities?project_id=1"

# 系统健康检查
curl "http://localhost:8000/api/v1/config/health"
```

### 核心生成 API（统一端点）

**唯一AI生成端点**
```typescript
// POST /api/v1/unified-test-cases/generate
interface UnifiedGenerationRequest {
  business_type: string;
  project_id: number;
  generation_mode: 'test_points_only' | 'test_cases_only';
  test_point_ids?: number[];      // 仅test_cases_only模式需要
  additional_context?: Record<string, any>;
  save_to_database?: boolean;
}
```

**请求参数说明：**
- `generation_mode`: 生成模式
  - `'test_points_only'`: 只生成测试点
  - `'test_cases_only'`: 基于已有测试点生成测试用例
- `test_point_ids`: 测试点ID数组，仅在`test_cases_only`模式下需要
- `additional_context`: 额外的生成上下文
- `save_to_database`: 是否保存到数据库（默认true）

## 数据库架构

### 核心表结构（13 张表）

**主要业务表：**
- `projects` - 层次化项目管理和权限控制
- `business_type_configs` - 29 种业务类型动态配置
- `unified_test_cases` - 统一测试用例存储（支持两阶段数据）
- `generation_jobs` - 后台任务跟踪和进度监控

**知识图谱表：**
- `knowledge_entities` - 知识图谱实体（业务场景、接口、测试用例）
- `knowledge_relations` - 知识图谱关系映射
- `test_case_entities` - 测试用例与实体的多对多映射

**提示词管理表：**
- `prompt_categories` - 提示词分类管理
- `prompts` - 主提示词存储和版本管理
- `prompt_versions` - 提示词历史版本控制
- `prompt_templates` - 可重用的提示词模板
- `prompt_combinations` - 业务类型特定提示词组合
- `prompt_combination_items` - 提示词组合的具体项目

**未使用的表：**
- `template_variables` - 表结构存在但当前未被使用，系统采用硬编码的3变量模板系统

### 关键数据关系

```sql
-- 主要关系链
Projects → Business_Types → Unified_Test_Cases (两阶段数据)
Projects → Knowledge_Entities ←→ Knowledge_Relations
Business_Types → Prompt_Combinations → Prompt_Combination_Items → Prompts
Unified_Test_Cases ←→ Test_Case_Entities ← Knowledge_Entities
```

### unified_test_cases 表的两阶段设计

```sql
CREATE TABLE unified_test_cases (
  -- === 核心标识字段 ===
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  business_type ENUM('RCC', 'RFD', 'ZAB', 'RCE', 'RES', 'RHL', 'RPP', 'RSM', 'RWS', /* 共29种 */),
  test_case_id VARCHAR(50) UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- === 阶段和状态管理 ===
  stage ENUM('test_point', 'test_case') DEFAULT 'test_point',
  status ENUM('draft', 'approved', 'completed') DEFAULT 'draft',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',

  -- === 测试用例特定字段（test_point阶段为null） ===
  module VARCHAR(100),
  functional_module VARCHAR(100),
  functional_domain VARCHAR(100),
  preconditions TEXT,        -- JSON格式存储前置条件
  steps TEXT,               -- JSON格式存储执行步骤，包含expected字段
  remarks TEXT,

  -- === 元数据字段 ===
  generation_job_id VARCHAR(100),
  entity_order FLOAT DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_project_stage (project_id, stage),
  INDEX idx_business_type (business_type),
  INDEX idx_status (status),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

**两阶段数据设计说明：**

**阶段1：测试点 (`stage = 'test_point'`)**
- 包含基础信息：`id`, `name`, `description`, `business_type`
- 执行相关字段为 `null`：`module`, `steps`, `preconditions`
- 用于快速生成和验证测试场景

**阶段2：完整测试用例 (`stage = 'test_case'`)**
- 包含完整信息：基础信息 + 执行步骤和期望结果
- `steps` 字段存储 JSON 格式的详细执行步骤
- `preconditions` 存储前置条件和环境配置
- 可直接用于测试执行

**状态流转：**
- `draft` → `approved` → `completed`
- 支持批量状态更新和审批工作流
- 状态变更通过 Python logging 模块记录，无专门的数据库审计表

**业务类型支持：**
系统支持完整的 29 种 TSP 业务类型，包括但不限于：
- **RCC**: 远程空调控制
- **RFD**: 远程车门控制
- **RCE**: 远程引擎控制
- **RES**: 远程座椅控制
- **RHL**: 远程灯光控制
- 以及更多汽车远程控制业务类型

### 模板变量系统

**当前实现：**
系统采用硬编码的3变量模板系统，通过 `TemplateVariableResolver` 类实现：
- `{{user_input}}`: 来自API端点的 `additional_context` 参数
- `{{test_points}}`: 测试点数据，根据生成阶段进行智能处理
- `{{test_cases}}`: 数据库中的现有测试用例（仅在测试用例生成阶段使用）

**实现机制：**
- 模板变量在运行时通过正则表达式替换解析
- 变量应用于系统和用户提示词
- 集成到 `DatabasePromptBuilder` 的提示词构建流程中

**未使用的表设计：**
`template_variables` 表结构存在但当前未被使用，该表原本设计用于更动态的模板变量管理，但当前系统采用简化的硬编码实现。

## 开发模式

### 统一 API 调用模式
```typescript
// 使用唯一的服务层调用
import unifiedGenerationService from '@/services/unifiedGenerationService';

// 两阶段生成调用
const response = await unifiedGenerationService.generateUnified({
  business_type: 'RCC',
  project_id: activeProject.id,
  generation_mode: 'test_points_only', // 或 'test_cases_only'
  additional_context: {
    scenario: '风险管理测试',
    complexity: '高',
    coverage: '完整'
  }
});

// React Query 状态管理（推荐模式）
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['unified-test-cases', projectId, stage],
  queryFn: () => unifiedGenerationService.getTestCases({
    project_id: projectId,
    stage: 'test_case'
  })
});

const generateMutation = useMutation({
  mutationFn: unifiedGenerationService.generateUnified,
  onSuccess: (data) => {
    queryClient.invalidateQueries(['unified-test-cases']);
    showNotification('生成成功！', 'success');
  },
  onError: (error) => {
    showNotification(`生成失败: ${error.message}`, 'error');
  }
});

// ⚠️ 重要提示：所有历史遗留的分散端点已完全移除
// 现在只有 /api/v1/unified-test-cases/generate 这一个AI生成端点
```

### 错误处理和重试模式
```typescript
// 统一错误处理
import { notification } from 'antd';

const handleApiError = (error: any) => {
  const message = error?.response?.data?.detail || error?.message || '操作失败';
  notification.error({
    message: '错误',
    description: message,
    duration: 5
  });
};

// 带重试的 API 调用
const generateWithRetry = async (params: GenerationParams, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await unifiedGenerationService.generateUnified(params);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### WebSocket 实时通信模式
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

const TestGenerationProgress = ({ taskId }) => {
  const { lastMessage, isConnected, progress, currentStep } = useWebSocket(taskId);

  useEffect(() => {
    if (lastMessage?.type === 'progress') {
      setProgress(lastMessage.data.progress);
      setCurrentStep(lastMessage.data.current_step);
    }

    if (lastMessage?.type === 'test_case_generated') {
      // 实时添加新生成的测试用例到UI
      addTestCaseToUI(lastMessage.data.test_case);
    }

    if (lastMessage?.type === 'completed') {
      showNotification('生成完成！', 'success');
      // 刷新测试用例列表
      queryClient.invalidateQueries(['unified-test-cases']);
    }
  }, [lastMessage]);

  return (
    <Progress
      percent={progress}
      status={isConnected ? 'active' : 'exception'}
      format={(percent) => `${percent}% - ${currentStep}`}
    />
  );
};
```

## 关键文件

### 后端核心文件
- `src/api/endpoints.py` - FastAPI 主应用和统一路由
- `src/database/models.py` - SQLAlchemy 数据模型（16 张表完整设计）
- `src/services/unified_generation_service.py` - 统一生成服务，支持两阶段生成
- `src/websocket/endpoints.py` - WebSocket 实时通信和进度监控
- `src/core/test_case_generator.py` - 两阶段生成核心逻辑
- `src/utils/template_variable_resolver.py` - 模板变量解析系统
- `src/llm/llm_client.py` - AI 客户端封装，支持重试和错误处理

### 前端核心文件
- `web/src/services/unifiedGenerationService.ts` - 统一生成服务客户端
- `web/src/hooks/useBusinessTypeMapping.ts` - 动态业务类型管理（29种类型）
- `web/src/hooks/useWebSocket.ts` - WebSocket 客户端和实时通信
- `web/src/components/UnifiedTestCaseList.tsx` - 统一测试用例列表组件
- `web/src/components/PromptBuilder.tsx` - 提示词构建器组件
- `web/src/components/KnowledgeGraph.tsx` - 知识图谱可视化组件（基于 @antv/g6）
- `web/vite.config.ts` - Vite 配置和代理设置，支持 WebSocket
- `web/src/main.tsx` - 应用入口和 React 19 兼容性配置

### 配置文件
- `.env` - 环境变量配置（API密钥、数据库连接）
- `pytest.ini` - 后端测试配置
- `web/vitest.config.ts` - 前端测试配置
- `web/package.json` - 前端依赖和脚本（React 19, Vite 6.3.5）
- `web/tsconfig.json` - TypeScript 编译配置

## 常见问题解决

### React 19 兼容性设置
```bash
# 安装 React 19 兼容包
npm install @ant-design/v5-patch-for-react-19

# 在 main.tsx 顶部导入
import '@ant-design/v5-patch-for-react-19';

# 确保 TypeScript 配置正确
# tsconfig.json 中设置 "jsx": "react-jsx"
```

### 端口冲突解决
```bash
# Windows 系统端口占用检查和清理
netstat -ano | findstr :8000    # 检查后端端口
netstat -ano | findstr :5173    # 检查前端端口
taskkill /F /PID <PID>          # 终止占用进程

# Linux/Mac 系统
lsof -ti:8000 | xargs kill -9   # 清理后端端口
lsof -ti:5173 | xargs kill -9   # 清理前端端口
```

### 数据库连接问题
```bash
# 检查 MySQL 服务状态
# Windows
sc query mysql80

# Linux/Mac
brew services list | grep mysql
systemctl status mysql

# 测试数据库连接
mysql -h 127.0.0.1 -P 3306 -u tsp -p

# 常见解决方法：
# 1. 确认 MySQL 服务正在运行
# 2. 验证 .env 文件中的数据库配置
# 3. 检查用户权限和密码
# 4. 确认数据库 testcase_gen 已创建
```

### API 调试和测试
```bash
# 启用后端调试日志
export LOG_LEVEL=debug
python -m src.api.endpoints

# 测试关键 API 端点
curl -X GET "http://localhost:8000/api/v1/config/health"
curl -X GET "http://localhost:8000/api/v1/business/business-types"
curl -X GET "http://localhost:8000/api/v1/projects?active_only=true"

# 测试统一生成端点
curl -X POST "http://localhost:8000/api/v1/unified-test-cases/generate" \
  -H "Content-Type: application/json" \
  -d '{"business_type": "RCC", "project_id": 1, "generation_mode": "test_points_only"}'
```

### 开发环境常见问题

**1. API 404 错误**
- 确认使用正确的 API 前缀：`/api/v1/`
- 检查 Vite 代理配置是否正确
- 验证后端服务是否在 8000 端口运行

**2. React Query 错误**
```typescript
// 错误示例：queryFn 返回格式不正确
const { data } = useQuery({
  queryKey: ['test-cases'],
  queryFn: () => api.get('/test-cases') // ❌ 错误：需要返回 data 属性
});

// 正确示例：
const { data } = useQuery({
  queryKey: ['test-cases'],
  queryFn: async () => {
    const response = await api.get('/test-cases');
    return response.data; // ✅ 正确：返回实际的 data
  }
});
```

**3. WebSocket 连接问题**
- 检查 WebSocket 代理配置：`ws://localhost:8000/ws/{task_id}`
- 确认防火墙设置允许 WebSocket 连接
- 验证 taskId 是否正确传递

**4. 构建和依赖问题**
```bash
# 清理 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install

# 清理 uv 缓存重新安装 Python 依赖
uv cache clean
uv pip install -r requirements.txt

# TypeScript 编译错误
npx tsc --noEmit  # 检查类型错误
```

**5. 环境变量配置**
```bash
# 检查 .env 文件是否存在且格式正确
cat .env

# 确认没有多余的空格或特殊字符
# 验证 API_KEY 是否有效
```

### 性能优化建议
- 使用 React Query 的缓存机制减少 API 调用
- 启用 Vite 的代码分割功能
- 配置数据库连接池提高并发性能
- 使用 WebSocket 减少轮询请求

## 技术栈

### 后端技术栈
- **框架**: FastAPI 0.118.0 - 现代高性能 Python Web 框架
- **数据库 ORM**: SQLAlchemy 2.0.43 - Python SQL 工具包和 ORM
- **数据验证**: Pydantic v2 - 数据解析和验证库
- **AI 集成**: OpenAI 兼容 API (阿里云 DashScope)
- **AI 模型**: Qwen3-235b-a22b-instruct-2507
- **实时通信**: WebSocket 支持
- **测试框架**: pytest + pytest-asyncio
- **Python 版本**: Python 3.11+
- **包管理**: uv (现代 Python 包管理器)

### 前端技术栈
- **框架**: React 19.1.0 - 最新版本的 React
- **类型系统**: TypeScript 5.8.3 - 类型安全的 JavaScript
- **构建工具**: Vite 6.3.5 - 下一代前端构建工具
- **UI 组件库**: Ant Design 5.23.0 + React 19 兼容性补丁
- **状态管理**: React Query 5.59.15 - 服务器状态管理
- **路由**: React Router DOM 6.28.0
- **可视化**: @antv/g6 5.0.49 - 知识图谱可视化
- **代码编辑器**: Monaco Editor 0.54.0
- **拖拽功能**: React DnD 16.0.1
- **表单处理**: React Hook Form 7.53.0
- **测试框架**: Vitest 4.0.8 + React Testing Library
- **包管理**: npm

### 开发工具链
- **代码质量**: ESLint 9.25.0 + TypeScript ESLint
- **测试覆盖率**: @vitest/coverage-v8
- **API 文档**: FastAPI 自动生成的 OpenAPI/Swagger
- **类型安全**: 端到端 TypeScript 支持
- **热重载**: Vite 开发服务器
- **代理配置**: Vite 代理支持 API 和 WebSocket

### 数据库
- **数据库**: MySQL 8.0+
- **连接池**: SQLAlchemy 连接池管理
- **迁移**: Alembic 数据库迁移工具