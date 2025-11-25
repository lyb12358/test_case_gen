# TSP 测试用例生成系统 - AI 助手指南

## 环境设置

**必需环境变量（.env 文件）：**
```env
# API 配置（阿里云 DashScope）
API_KEY=sk-499331785d3b4ff18460b8220635586c
API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL=qwen3-235b-a22b-instruct-2507

# 数据库配置
USER=tsp
PASSWORD=2222
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

### 两阶段生成流程

**阶段 1：测试点生成**
```typescript
const testPointResponse = await unifiedGenerationService.generateTestPoints({
  business_type: 'RCC',
  project_id: activeProject.id,
  count: 50,
  complexity_level: 'standard'
});
```

**阶段 2：测试用例生成**
```typescript
const testCaseResponse = await unifiedGenerationService.generateFromTestPoints({
  business_type: 'RCC',
  test_point_ids: [1, 2, 3],
  generation_config: {
    complexityLevel: 'comprehensive',
    includeNegativeCases: true
  }
});
```

### 统一服务模式
```typescript
import unifiedGenerationService from '../services';

// 所有操作通过统一服务
const response = await unifiedGenerationService.generateTestCases({
  business_type: 'RCC',
  project_id: activeProject.id,
  generation_config: {
    stage: 'full',
    complexity_level: 'comprehensive',
    include_negative_cases: true
  }
});
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

// 连接端点: ws://localhost:8000/api/v1/generation/ws/{task_id}
```

## API 端点结构

### 7 个主要模块

1. **生成端点** (`/api/v1/generation/`)
   - 统一两阶段生成服务
   - WebSocket 实时进度监控
   - 后台任务管理

2. **业务类型管理** (`/api/v1/business/`)
   - 29 种 TSP 业务类型动态配置
   - 项目级业务类型激活
   - 提示词组合管理

3. **测试点管理** (`/api/v1/test-points/`)
   - 测试点 CRUD 操作
   - 批准工作流（draft → approved → rejected）

4. **统一测试用例管理** (`/api/v1/unified-test-cases/`)
   - 完整测试用例生命周期
   - Excel 导出和批量操作

5. **项目管理** (`/api/v1/projects/`)
   - 层次化项目组织
   - 项目统计和健康监控

6. **提示词管理** (`/api/v1/prompts/`)
   - 数据库驱动的提示词系统
   - 版本控制和组合管理

7. **配置和一致性** (`/api/v1/config/`, `/api/v1/consistency/`)
   - 动态业务类型配置
   - 数据完整性验证

### 关键 API 调用

```bash
# 获取业务类型
curl "http://localhost:8000/api/v1/business/business-types?project_id=1&is_active=true"

# 获取项目列表
curl "http://localhost:8000/api/v1/projects?active_only=true"

# 获取测试用例
curl "http://localhost:8000/api/v1/unified-test-cases?project_id=1&status=approved&page=1&size=20"

# WebSocket 测试
wscat -c ws://localhost:8000/api/v1/generation/ws/test-task-id

# 健康检查
curl "http://localhost:8000/api/v1/generation/health
```

### 统一生成 API

```typescript
// POST /api/v1/generation/generate
interface GenerationRequest {
  business_type: string;
  project_id: number;
  generation_config: {
    stage: 'test_points' | 'test_cases' | 'full';
    complexity_level: 'simple' | 'standard' | 'comprehensive';
    include_negative_cases: boolean;
    test_points_count?: number;
    test_point_ids?: number[];
    additional_context?: string;
  };
}
```

## 数据库架构

### 核心表结构（16 张表）

**主要业务表：**
- `projects` - 层次化项目管理
- `business_type_configs` - 29 种业务类型动态配置
- `unified_test_cases` - 统一测试用例存储
- `test_points` - 第一阶段测试点生成结果
- `generation_jobs` - 后台任务跟踪

**知识图谱表：**
- `knowledge_entities` - 知识图谱实体
- `knowledge_relations` - 知识图谱关系
- `test_case_entities` - 测试用例与实体映射

**提示词管理表：**
- `prompts` - 主提示词存储
- `prompt_versions` - 提示词版本控制
- `prompt_combinations` - 业务类型特定提示词组合
- `prompt_combination_items` - 提示词组合项

**系统配置表：**
- `test_point_templates` - 测试点模板
- `export_jobs` - 导出任务管理
- `system_configs` - 系统配置
- `audit_logs` - 操作审计日志

### 关键数据关系

```sql
-- 主要关系链
Projects → Business_Types → Test_Points → Unified_Test_Cases
Projects → Knowledge_Entities ←→ Knowledge_Relations
Business_Types → Prompt_Combinations → Prompt_Combination_Items → Prompts
```

## 开发模式

### 统一 API 调用模式
```typescript
// 使用服务层统一调用
const response = await unifiedGenerationService.generateTestCases(request);

// React Query 状态管理
const { data, isLoading, error } = useQuery({
  queryKey: ['test-cases', params],
  queryFn: () => unifiedGenerationService.getTestCases(params)
});
```

### 错误处理模式
```typescript
try {
  const result = await service.apiCall();
  showSuccess('操作成功');
} catch (error) {
  showError(error.message);
}
```

### WebSocket 通信模式
```typescript
const { lastMessage } = useWebSocket(taskId);

useEffect(() => {
  if (lastMessage?.type === 'test_case_generated') {
    addTestCaseToUI(lastMessage.data.test_case);
  }
}, [lastMessage]);
```

## 关键文件

### 后端核心文件
- `src/api/endpoints.py` - FastAPI 主应用和路由
- `src/database/models.py` - SQLAlchemy 数据模型（16 张表）
- `src/services/unified_generation_service.py` - 统一生成服务
- `src/websocket/endpoints.py` - WebSocket 实时通信
- `src/core/test_case_generator.py` - 两阶段生成逻辑

### 前端核心文件
- `web/src/services/unifiedGenerationService.ts` - 统一生成服务客户端
- `web/src/hooks/useBusinessTypeMapping.ts` - 动态业务类型管理
- `web/src/hooks/useWebSocket.ts` - WebSocket 客户端
- `web/vite.config.ts` - Vite 配置和代理设置
- `web/src/main.tsx` - 应用入口和 React 19 兼容性

### 配置文件
- `.env` - 环境变量配置
- `pytest.ini` - 后端测试配置
- `web/vitest.config.ts` - 前端测试配置
- `web/package.json` - 前端依赖和脚本

## 常见问题解决

### React 19 兼容性
```bash
# 安装兼容包
npm install @ant-design/v5-patch-for-react-19

# 在 main.tsx 中导入
import '@ant-design/v5-patch-for-react-19';
```

### 端口冲突
```bash
# Windows
netstat -ano | findstr :8000
taskkill /F /PID <PID>

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### API 调试
```bash
# 启用调试日志
python -m src.api.endpoints --log-level debug

# 测试 API 端点
curl http://localhost:8000/api/v1/config/business-types
curl http://localhost:8000/api/v1/projects
```

### 开发环境问题
- **数据库连接**：检查 MySQL 服务状态和权限
- **API 404 错误**：确认使用正确的 API 路径前缀
- **React Query 错误**：检查 queryFn 配置和服务导入
- **数据结构错误**：API 返回 `{items: [...]}` 格式

## 技术栈

**后端：** FastAPI 0.118.0, SQLAlchemy 2.0.43, Pydantic v2, Python 3.11+
**前端：** React 19.1.0, TypeScript 5.8.3, Vite 6.3.5, Ant Design 5.23.0, React Query 5.59.15
**测试：** pytest (后端), Vitest (前端)
**包管理：** uv (Python), npm (Node.js)