# TSP Test Case Generation System

A production-ready LLM-powered test case generation system for TSP (Telematics Service Provider) remote control business types, featuring modern React frontend and interactive knowledge graph visualization.

## Quick Start


### Setup & Installation

```bash

# 2. Backend setup
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env file with your API keys and configuration

# 3. Frontend setup
cd web
npm install
cd ..

# 4. Start development servers
# Backend API server (port 8000)
python -m src.api.endpoints

# Frontend dev server (port 5173) - in new terminal
cd web && npm run dev
```

### Access URLs
- **Frontend Application**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Interactive API Docs**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc

## System Overview

This is a comprehensive TSP business test case auto-generation solution with the following capabilities:

1. **AI-Powered Test Generation**: LLM-based test case generation for 26 TSP business types
2. **Interactive Knowledge Graph**: Visual representation of business relationships and test coverage
3. **Real-time Task Monitoring**: Background job processing with progress tracking
4. **Data Persistence**: Complete SQLite database with CRUD operations
5. **Modern Web Interface**: Responsive React application with Chinese localization
6. **Export Capabilities**: Excel export with formatted test cases

## Technology Stack

### Backend (Python)
- **FastAPI 0.118.0**: Modern Python web framework with automatic API documentation
- **SQLAlchemy 2.0.43**: Python ORM with advanced database abstraction
- **Pydantic 2.11.9**: Data validation and serialization
- **OpenAI 2.0.0**: LLM client integration for test case generation
- **SQLite**: Lightweight relational database (current: 552KB)
- **Uvicorn**: ASGI server for production deployment
- **Additional**: pandas, xlsxwriter, tqdm, websockets

### Frontend (TypeScript)
- **React 19.1.0**: Latest React with concurrent features
- **TypeScript 5.8.3**: Type-safe JavaScript development
- **Vite 6.3.5**: Fast build tool and development server
- **Ant Design 5.23.0**: Enterprise-grade UI component library
- **AntV G6 5.0.49**: Graph visualization for knowledge graphs
- **React Query 5.59.15**: Server state management and caching
- **React Router 6.28.0**: Client-side routing
- **Axios 1.12.2**: HTTP client with interceptors
- **React Hook Form 7.53.0**: Form state management

### Development Tools
- **ESLint**: Code quality and style enforcement
- **Vite**: Hot module replacement and optimized builds
- **npm**: Package management and scripting
- **Python testing**: pytest, coverage, mypy, black

## Project Architecture

### Backend Structure
```
src/
├── api/
│   └── endpoints.py           # FastAPI main application (1,359 lines)
├── core/
│   ├── test_case_generator.py # Main test case generation logic (551 lines)
│   ├── business_data_extractor.py # Knowledge graph business logic
│   ├── json_extractor.py      # LLM response processing
│   ├── excel_converter.py     # Excel export functionality
│   └── interface_test_generator.py
├── database/
│   ├── models.py             # SQLAlchemy data models (192 lines)
│   ├── operations.py         # Database CRUD operations
│   └── database.py           # Database connection management
├── llm/
│   └── llm_client.py         # LLM client wrapper
├── models/                   # Pydantic data models
├── utils/
│   ├── prompt_builder.py     # Dynamic prompt construction
│   ├── config.py             # Configuration management
│   └── file_handler.py       # File operations
└── config/
    └── business_types.py     # Business type definitions
```

### Frontend Structure
```
web/
├── src/
│   ├── components/
│   │   └── Layout/
│   │       └── MainLayout.tsx    # Main application layout
│   ├── pages/
│   │   ├── Dashboard/            # Statistics overview
│   │   ├── TestCases/
│   │   │   ├── TestCaseList.tsx  # Test case listing and management
│   │   │   ├── TestCaseDetail.tsx # Detailed test case view
│   │   │   └── TestCaseGenerate.tsx # Test case generation wizard
│   │   ├── Tasks/
│   │   │   ├── TaskList.tsx      # Task monitoring
│   │   │   └── TaskDetail.tsx    # Task details and logs
│   │   └── KnowledgeGraph/
│   │       ├── index.tsx         # Knowledge graph main page
│   │       └── Graph.tsx         # Graph visualization component
│   ├── services/
│   │   ├── testCaseService.ts    # Test case API client
│   │   ├── taskService.ts        # Task monitoring API
│   │   └── knowledgeGraphService.ts # Knowledge graph API
│   ├── types/
│   │   ├── testCases.ts          # Test case type definitions
│   │   └── knowledgeGraph.ts     # Knowledge graph types
│   ├── contexts/
│   │   └── TaskContext.tsx       # Task state management
│   ├── App.tsx                   # Root application component
│   └── main.tsx                  # Application entry point
├── package.json                  # Dependencies and scripts
└── vite.config.ts               # Vite configuration
```

## Database Schema

### Core Tables
- **test_case_groups**: Test case groups organized by business type and generation batch
- **test_case_items**: Individual test case records with JSON data storage
- **generation_jobs**: Task status tracking with progress and error handling
- **knowledge_entities**: Knowledge graph nodes (scenarios, businesses, services, interfaces, test cases)
- **knowledge_relations**: Knowledge graph edges representing relationships
- **test_case_entities**: Mapping between test cases and knowledge graph entities

### Supported Business Types (26 Total)

#### Climate & Environment
- **RCC**: Remote Climate Control (远程净化)
- **RFD**: Remote Fragrance Control (香氛控制)
- **RPP**: Remote Preconditioning Package (远程预处理包)
- **RHL**: Remote Heating Level (远程加热等级)

#### Vehicle Access & Security
- **RDL_RDU**: Remote Door Lock/Unlock (远程门锁解锁)
- **RDO_RDC**: Remote Door Open/Close (远程车门开关)
- **RCE**: Remote Car Engine (远程车辆引擎)
- **ZAB**: Remote Cabin Temperature Setting (远程恒温座舱设置)
- **ZBA**: Water Flooding Alarm (水淹报警)

#### Vehicle Systems
- **PAE**: Pure Air Engine (纯空气引擎)
- **PAI**: Pure Air Interior (车内空气净化)
- **PAB**: Pure Air Battery (电池空气净化)
- **RES**: Remote Engine Start (远程启动引擎)
- **RSM**: Remote Seat Movement (远程座椅调节)
- **RWS**: Remote Window System (远程车窗系统)

#### Specialized Services
- **VIVO_WATCH**: VIVO Watch integration
- **WEIXIU_RSM**: Maintenance seat movement
- **ZAD-ZBB**: Various Z-series remote controls (temperature, defrost, etc.)

## Core Features

### Test Case Generation Workflow
1. **Business Type Selection**: Choose from 26 supported TSP business types
2. **Dynamic Prompt Construction**: Business-specific prompts with API documentation
3. **LLM Generation**: OpenAI API generates structured JSON test cases
4. **Data Validation**: JSON schema validation and deduplication
5. **Atomic Database Storage**: Transactional storage with proper relationships
6. **Knowledge Graph Integration**: Automatic entity and relation creation
7. **Progress Tracking**: Real-time status updates with detailed progress information

### Knowledge Graph Visualization
- **Entity Types**: Scenario, Business Type, Service, Interface, Test Case
- **Relationship Types**: has_service, provides_interface, has_test_case, belongs_to
- **Interactive Features**: Zoom, pan, drag nodes, filter by business type
- **Node Details**: Click entities for detailed information and associated test cases
- **Dynamic Filtering**: Business type-based graph filtering

### Real-time Task Monitoring
- **Task States**: pending, running, completed, failed
- **Progress Tracking**: Step-by-step progress with detailed status
- **Browser Notifications**: Desktop alerts for task completion
- **Error Handling**: Comprehensive error reporting with stack traces
- **Task History**: Complete audit trail of generation tasks

## API Reference

### Test Case Generation
```http
POST /generate-test-cases
Content-Type: application/json

{
  "business_type": "RCC"
}

Response:
{
  "task_id": "uuid-string",
  "status": "pending",
  "message": "Test case generation started"
}
```

### Task Status
```http
GET /status/{task_id}

Response:
{
  "task_id": "uuid-string",
  "status": "running",
  "progress": 45,
  "current_step": "Generating test cases...",
  "total_steps": 6,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:01:00Z"
}
```

### Test Case Management
```http
# Get test cases by business type
GET /test-cases/{business_type}

# Get all test cases with pagination
GET /test-cases?page=1&size=20

# Delete test cases by business type
DELETE /test-cases/{business_type}

# Export test cases to Excel
GET /test-cases/export?business_type=RCC&format=excel
```

### Knowledge Graph
```http
# Get graph data for visualization
GET /knowledge-graph/data?business_type=RCC

# Get graph statistics
GET /knowledge-graph/stats

# Initialize knowledge graph from business descriptions
POST /knowledge-graph/initialize

# Get entity details with associated test cases
GET /knowledge-graph/entities/{entity_id}/details
```

### System Information
```http
# Get supported business types
GET /business-types

# Get all generation tasks
GET /tasks?status=completed&page=1&size=10
```

## Development Guidelines

### Environment Configuration
Create `.env` file with:
```env
# OpenAI Configuration
API_KEY=your_openai_api_key
API_BASE_URL=https://api.openai.com/v1
MODEL=gpt-4

# Database Configuration
DATABASE_PATH=data/test_cases.db

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### 文档查询指南 (Context7)

当开发过程中对某个技术栈、库或框架的使用方法不明确时，可以使用 Context7 查询最新的官方文档和技术资料。

#### Context7 使用场景
- **API 查询**: 对 FastAPI、React、SQLAlchemy 等框架的具体用法不确定
- **新特性学习**: 了解 React 19、FastAPI 0.118 等新版本的特性和最佳实践
- **问题解决**: 查找特定技术问题的官方解决方案和建议
- **代码示例**: 获取标准化的代码实现示例和配置方法


#### 查询技巧
1. **明确具体**: 指明具体的版本号和功能模块
2. **描述场景**: 说明你要解决的具体问题或实现的功能
3. **请求示例**: 可以直接请求代码示例或配置模板
4. **最佳实践**: 优先查询官方推荐的最佳实践方法

#### 支持的主要技术栈
- **后端**: FastAPI, SQLAlchemy, Pydantic, OpenAI SDK, Uvicorn
- **前端**: React, TypeScript, Vite, Ant Design, React Query, Axios
- **数据库**: SQLite, 数据库设计和优化
- **开发工具**: ESLint, npm, Docker, Git 工作流

通过 Context7 查询到的文档信息可以帮助你：
- 快速掌握不熟悉的技术栈
- 解决开发中的具体技术问题
- 学习最新的开发模式和最佳实践
- 获得官方权威的技术指导

### Adding New Business Types
1. **Update Database Model**: Add new enum value to `BusinessType` in `src/database/models.py`
2. **Create Business Description**: Add markdown file in `prompts/business_descriptions/`
3. **Update Prompt Builder**: Add prompt logic in `src/utils/prompt_builder.py`
4. **Frontend Types**: Update TypeScript types in `web/src/types/testCases.ts`

### Database Operations
```python
from src.database.database import db_manager
from src.database.operations import DatabaseOperations
from src.database.models import BusinessType

# Get database session and operations
with db_manager.get_session() as db:
    db_ops = DatabaseOperations(db)

    # Create test case group
    group = db_ops.create_test_case_group(
        business_type=BusinessType.RCC,
        generation_metadata={"model": "gpt-4", "timestamp": "2024-01-01"}
    )

    # Batch create test cases
    test_cases = [
        {
            "case_id": "TC001",
            "description": "Test remote climate control activation",
            "preconditions": ["Vehicle parked", "AC system available"],
            "steps": ["Send RCC command", "Verify AC activation"],
            "expected_result": "AC system activates successfully"
        }
    ]

    items = db_ops.create_test_case_items_batch(
        group_id=group.id,
        test_cases_data=test_cases
    )
```

### Frontend Development Patterns
```typescript
// API service with React Query
import { useMutation, useQuery } from '@tanstack/react-query';
import { testCaseService } from '../services/testCaseService';

// Generate test cases
const generateMutation = useMutation({
  mutationFn: testCaseService.generateTestCases,
  onSuccess: (data) => {
    console.log('Generation started:', data.task_id);
    // Start polling for task status
  },
  onError: (error) => {
    console.error('Generation failed:', error);
  }
});

// Query test cases with pagination
const { data: testCases, isLoading } = useQuery({
  queryKey: ['testCases', businessType, page],
  queryFn: () => testCaseService.getTestCases(businessType, page),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Task monitoring with real-time updates
const { data: taskStatus } = useQuery({
  queryKey: ['taskStatus', taskId],
  queryFn: () => taskService.getTaskStatus(taskId),
  refetchInterval: (data) =>
    data?.status === 'running' ? 2000 : false, // Poll every 2s if running
});
```

## Available Scripts

### Backend Scripts
```bash
# Generate test cases for all business types
python scripts/generate_all_test_cases.py

# Run batch generation with error handling
python scripts/run_batch_test.py

# Initialize knowledge graph from business descriptions
python scripts/initialize_knowledge_graph.py

# Export database to various formats
python scripts/export_database.py

# Test generation pipeline
python scripts/test_generate_all.py
```

### Frontend Scripts
```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## Production Deployment

### Backend Deployment
```bash
# Build frontend for production
cd web && npm run build

# Start production server
python -m src.api.endpoints --host 0.0.0.0 --port 8000

# Or with uvicorn directly
uvicorn src.api.endpoints:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN cd web && npm install && npm run build

EXPOSE 8000
CMD ["python", "-m", "src.api.endpoints"]
```

## Troubleshooting

### Common Issues

**LLM API Failures**
- Verify API key in `.env` file
- Check API base URL and model availability
- Ensure network connectivity to OpenAI endpoints
- Review rate limits and quota usage

**Database Connection Issues**
- Confirm database file path: `data/test_cases.db`
- Check directory permissions for data folder
- Manually create `data/` directory if missing
- Verify SQLite database integrity

**Frontend Connection Problems**
- Ensure backend API server is running on port 8000
- Check CORS configuration in FastAPI
- Verify API base URL in frontend services
- Review browser console for connection errors

**Knowledge Graph Display Issues**
- Reinitialize graph: `POST /knowledge-graph/initialize`
- Check business description files in `prompts/business_descriptions/`
- Verify entity and relation creation in database
- Review browser console for JavaScript errors

### Debug Commands
```bash
# Backend with debug logging
python -m src.api.endpoints --log-level debug

# Frontend with verbose output
cd web && npm run dev --verbose

# Check database integrity
sqlite3 data/test_cases.db ".schema"

# Test API endpoints
curl http://localhost:8000/business-types
curl http://localhost:8000/knowledge-graph/stats
```

## Performance Optimization

### Database Optimizations
- Indexed queries on business_type and timestamp fields
- JSON storage for complex test case data
- Connection pooling with SQLAlchemy
- Atomic transactions for data consistency

### Frontend Optimizations
- React Query caching for API responses
- Lazy loading for large test case lists
- Virtual scrolling for knowledge graph nodes
- Code splitting with Vite

### API Performance
- Background task processing for LLM calls
- Pagination for large datasets
- Efficient JSON serialization with Pydantic
- Response caching where appropriate

## Current Status

This is a **production-ready** system with comprehensive capabilities:

- ✅ **26 Business Types**: Full support for all TSP remote control services
- ✅ **Complete CRUD Operations**: Full test case lifecycle management
- ✅ **Interactive Knowledge Graph**: Visual business relationship mapping
- ✅ **Real-time Monitoring**: Live task progress and status updates
- ✅ **Export Functionality**: Excel export with custom formatting
- ✅ **API Documentation**: Comprehensive OpenAPI/Swagger documentation
- ✅ **Responsive Design**: Mobile-friendly interface
- ✅ **Error Handling**: Robust error management and user feedback
- ✅ **Type Safety**: Full TypeScript coverage
- ✅ **Testing Framework**: Unit and integration test support

The system successfully bridges business requirements and automated test case generation using modern LLM technology, providing an intuitive interface for test management and visualization.

---

*TSP Test Case Generation System* - Intelligent, automated test case generation for modern telematics services.