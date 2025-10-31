# TSP Test Case Generation System

A comprehensive enterprise-grade LLM-powered test case generation system for TSP (Telematics Service Provider) remote control business types, featuring modern React frontend, interactive knowledge graph visualization, and complete prompt management system.

## Quick Start

### Prerequisites
- Python 3.9+
- MySQL 8.0+
- Node.js 18+
- OpenAI API key

### Setup & Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd tsp-testcase-script

# 2. Backend setup
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install Python dependencies
uv pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Edit .env file with your API keys and configuration
# Required: API_KEY, USER, PASSWORD, DATABASE, HOST

# 4. Database setup
# Create MySQL database and user (see MYSQL_MIGRATION.md)
# The system will auto-create tables on first run

# 5. Frontend setup
cd web
npm install
cd ..

# 6. Start development servers
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

This is a comprehensive TSP business test case auto-generation platform with enterprise-grade capabilities:

### Core Features
1. **AI-Powered Test Generation**: LLM-based test case generation for 29 TSP business types
2. **Interactive Knowledge Graph**: Visual representation of business relationships and test coverage
3. **Real-time Task Monitoring**: Background job processing with progress tracking
4. **Data Persistence**: Complete MySQL database with CRUD operations
5. **Prompt Management System**: Database-driven prompt management with version control
6. **Advanced Export Tools**: Complete database export in JSON and Excel formats

### Business Types Supported (29 Total)

#### Climate & Environment
- **RCC**: Remote Climate Control (远程净化)
- **RFD**: Remote Fragrance Control (香氛控制)
- **RPP**: Remote Preconditioning Package (远程预处理包)
- **RHL**: Remote Heating Level (远程加热等级)

#### Vehicle Access & Security
- **RDL_RDU**: Remote Door Lock/Unlock (远程门锁解锁)
- **RDO_RDC**: Remote Door Open/Close (远程车门开关)
- **RCE**: Remote Car Engine (远程车辆引擎)
- **RES**: Remote Engine Start (远程启动引擎)

#### Climate & Air Quality
- **ZAB**: Remote Cabin Temperature Setting (远程恒温座舱设置)
- **ZBA**: Water Flooding Alarm (水淹报警)
- **PAE**: Remote Car Refrigerator (远程车载冰箱)
- **PAI**: Remote Vehicle Location (远程车辆位置查看)

#### Air Purification
- **PAB**: Parrot Remote Light Show (百灵鸟远程灯光秀)
- **PAI**: Pure Air Interior (车内空气净化)
- **PAB**: Pure Air Battery (电池空气净化)

#### Smart Features
- **ZAD**: Remote Storage Box Private Lock (远程储物箱私密锁)
- **ZAE**: Remote Car Refrigerator (远程车载冰箱)
- **ZAF**: New Air Conditioning (新空调/环境调节)
- **ZAG**: Enable/Disable Visitor Mode (开启/关闭访客模式)
- **ZAH**: Remote Authorization Start (远程授权启动、允许驾驶)
- **ZAJ**: Remote Cool/Warm Box Control (远程冷暖箱控制)
- **ZAM**: Remote Air Purification (远程空气净化)
- **ZAN**: Remote Battery Preheating Switch (远程电池预热开关)
- **ZAS**: New Visitor Mode 3.0 (新访客模式)
- **ZAV**: AI Smart Ventilation 3.0 (AI智能通风)
- **ZAY**: Intelligent Driving Wake-up ACDU (智驾唤醒acdu)
- **ZBB**: Oxygen Machine Remote Control (制氧机远控)

#### Specialized Services
- **WEIXIU_RSM**: Maintenance Mode RSM (维修模式RSM)
- **VIVO_WATCH**: VIVO Watch Integration (vivo手表远控)
- **RSM**: Switch Management (开关管理)
- **RWS**: Remote Window System (打开关闭窗户、天窗、遮阳帘)

## Technology Stack

### Backend (Python)
- **FastAPI 0.118.0**: Modern Python web framework with automatic API documentation
- **SQLAlchemy 2.0.43**: Python ORM with advanced database abstraction
- **Pydantic 2.11.9**: Data validation and serialization
- **OpenAI 2.0.0**: LLM client integration for test case generation
- **MySQL**: Production-ready relational database with enhanced performance
- **PyMySQL**: MySQL database connector for Python
- **Uvicorn**: ASGI server for production deployment
- **Additional**: pandas, xlsxwriter, tqdm, websockets, openpyxl

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
- **Monaco Editor 0.54.0**: Professional code editor
- **React Markdown 10.1.0**: Markdown rendering with syntax highlighting

### Development Tools
- **ESLint 9.25.0**: Code quality and style enforcement
- **Vite**: Hot module replacement and optimized builds
- **npm**: Package management and scripting
- **Python testing**: pytest, coverage, mypy, black

## Project Architecture

### Backend Structure
```
src/
├── api/
│   └── endpoints.py           # FastAPI main application with all API endpoints
├── core/
│   ├── test_case_generator.py # Main test case generation logic (551 lines)
│   ├── business_data_extractor.py # Knowledge graph business logic
│   ├── json_extractor.py      # LLM response processing
│   ├── excel_converter.py     # Excel export functionality
│   └── interface_test_generator.py
├── database/
│   ├── models.py             # SQLAlchemy data models (10 tables, 400+ lines)
│   ├── operations.py         # Database CRUD operations
│   └── database.py           # Database connection management
├── llm/
│   └── llm_client.py         # LLM client wrapper
├── models/                   # Pydantic data models
├── utils/
│   ├── prompt_builder.py     # Dynamic prompt construction
│   ├── config.py             # Configuration management
│   ├── file_handler.py       # File operations
│   └── database_prompt_builder.py # Database-driven prompt builder
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
│   │   ├── Dashboard/            # Statistics overview and system metrics
│   │   ├── TestCases/
│   │   │   ├── TestCaseList.tsx  # Test case listing and management
│   │   │   ├── TestCaseDetail.tsx # Detailed test case view
│   │   │   └── TestCaseGenerate.tsx # Test case generation wizard
│   │   ├── Tasks/
│   │   │   ├── TaskList.tsx      # Task monitoring dashboard
│   │   │   └── TaskDetail.tsx    # Task details and progress logs
│   │   ├── KnowledgeGraph/
│   │   │   ├── index.tsx         # Knowledge graph main page
│   │   │   └── Graph.tsx         # Graph visualization component
│   │   └── Prompts/               # Complete prompt management system
│   │       ├── PromptList.tsx    # Prompt listing with filtering
│   │       ├── PromptDetail.tsx  # Markdown viewer with syntax highlighting
│   │       ├── PromptEdit.tsx    # Monaco editor with live preview
│   │       └── PromptCreate.tsx  # Prompt creation wizard
│   ├── services/
│   │   ├── testCaseService.ts    # Test case API client
│   │   ├── taskService.ts        # Task monitoring API
│   │   ├── promptService.ts      # Complete prompt management API
│   │   └── knowledgeGraphService.ts # Knowledge graph API
│   ├── types/
│   │   ├── testCases.ts          # Test case type definitions
│   │   ├── knowledgeGraph.ts     # Knowledge graph types
│   │   └── prompts.ts            # Prompt management types
│   ├── contexts/
│   │   └── TaskContext.tsx       # Task state management
│   ├── App.tsx                   # Root application component
│   └── main.tsx                  # Application entry point
├── package.json                  # Dependencies and scripts
└── vite.config.ts               # Vite configuration
```

## Database Schema

### Core Tables (10 Total)

#### 1. business_type_configs
Dynamic business type configurations for TSP services.

#### 2. test_case_groups
Stores test case groups for different business types (generation batches).

#### 3. test_case_items
Stores individual test case items within groups with JSON data storage.

#### 4. generation_jobs
Tracks test case generation jobs and their status with progress monitoring.

#### 5. knowledge_entities
Stores entities for the knowledge graph (scenarios, businesses, services, interfaces, test cases).

#### 6. knowledge_relations
Stores relationships between knowledge graph entities (triples).

#### 7. test_case_entities
Maps test case items to knowledge graph entities.

#### 8. prompt_categories
Stores hierarchical categories for organizing prompts.

#### 9. prompts
Main prompt table for database-driven prompt management with version control.

#### 10. prompt_versions
Stores version history for prompts with change tracking.

#### 11. prompt_templates
Stores reusable prompt templates.

## Prompt Management System

### Features
- **Database Storage**: All prompts stored in MySQL with full CRUD operations
- **Version Control**: Complete version history with change tracking
- **Rich Editor**: Monaco editor with syntax highlighting and live preview
- **Categories**: Hierarchical categorization system
- **Search & Filter**: Advanced search with multiple criteria
- **Statistics**: Real-time statistics and usage tracking
- **Import/Export**: Bulk operations for prompt management

### Prompt Types
- **system**: System-level prompts and configurations
- **template**: Reusable prompt templates
- **business_description**: Business-specific descriptions
- **shared_content**: Shared content components
- **requirements**: Test case generation requirements

### API Endpoints (20+)
- `/prompts/` - CRUD operations
- `/prompts/categories/` - Category management
- `/prompts/templates/` - Template management
- `/prompts/search` - Advanced search
- `/prompts/validate` - Content validation
- `/prompts/build/{business_type}` - Dynamic prompt building
- `/prompts/stats/overview` - Statistics and analytics

## Knowledge Graph Visualization

### Features
- **Interactive Graph**: Visual representation of business relationships
- **Entity Types**: Scenarios, Business Types, Services, Interfaces, Test Cases
- **Relationships**: has_service, provides_interface, has_test_case, belongs_to
- **Dynamic Filtering**: Filter by business type
- **Node Details**: Click entities for detailed information
- **Real-time Updates**: Graph updates with data changes

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

### Prompt Management
```http
# Get all prompts with filtering
GET /prompts?page=1&size=20&type=business_description&status=active

# Create new prompt
POST /prompts/
{
  "name": "Test Generation Prompt",
  "content": "Generate test cases for...",
  "type": "business_description",
  "business_type": "RCC",
  "status": "active"
}

# Build dynamic prompt
GET /prompts/build/RCC
```

### Knowledge Graph
```http
# Get graph data for visualization
GET /knowledge-graph/data?business_type=RCC

# Get graph statistics
GET /knowledge-graph/stats

# Initialize knowledge graph from business descriptions
POST /knowledge-graph/initialize
```

### Database Export
```bash
# Export all database data
python scripts/export_database.py

# Export specific tables
# (modify scripts/export_database.py to select specific tables)
```

## Development Guidelines

### Environment Configuration
Create `.env` file with:
```env
# OpenAI Configuration
API_KEY=your_openai_api_key
API_BASE_URL=https://api.openai.com/v1
MODEL=gpt-4

# MySQL Database Configuration
USER=tsp
PASSWORD=your_mysql_password
DATABASE=testcase_gen
HOST=127.0.0.1:3306

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### Prompt Management Best Practices
1. **Use Categories**: Organize prompts into logical categories
2. **Version Control**: Always create new versions for significant changes
3. **Business Type Association**: Link prompts to specific business types when applicable
4. **Template Variables**: Use consistent variable naming with {{variable}} format
5. **Content Validation**: Use the validation API to ensure prompt quality

### Database Operations
```python
from src.database.database import DatabaseManager
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
import { promptService } from '../services/promptService';

// Generate test cases
const generateMutation = useMutation({
  mutationFn: promptService.generateTestCases,
  onSuccess: (data) => {
    console.log('Generation started:', data.task_id);
    // Start polling for task status
  },
  onError: (error) => {
    console.error('Generation failed:', error);
  }
});

// Query prompts with pagination
const { data: prompts, isLoading } = useQuery({
  queryKey: ['prompts', businessType, page],
  queryFn: () => promptService.getPrompts(businessType, page),
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

# Migrate prompts from files to database
python scripts/migrate_prompts_to_database.py
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

## Database Export

### Complete Export
The system provides comprehensive database export functionality:

```bash
python scripts/export_database.py
```

**Export Features:**
- **All 10 Tables**: Complete database export
- **Dual Formats**: JSON and Excel files
- **Rich Data**: JSON fields properly parsed, relationships maintained
- **Schema Documentation**: Complete database structure documentation
- **Summary Reports**: Detailed export statistics and file listings

**Exported Tables:**
1. business_type_configs (29 records)
2. generation_jobs (2 records)
3. knowledge_entities (15 records)
4. knowledge_relations (14 records)
5. test_case_groups (1 record)
6. test_case_items (14 records)
7. test_case_entities (14 records)
8. prompt_categories (5 records)
9. prompts (41 records)
10. prompt_versions (1 record)
11. prompt_templates (2 records)

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
- Verify MySQL server is running and accessible
- Confirm MySQL connection parameters in .env file
- Ensure database `testcase_gen` exists
- Check user permissions for MySQL database

**Frontend Connection Problems**
- Ensure backend API server is running on port 8000
- Check CORS configuration in FastAPI
- Verify API base URL in frontend services
- Review browser console for connection errors

**Knowledge Graph Display Issues**
- Reinitialize graph: `POST /knowledge-graph/initialize`
- Check business description files in database
- Verify entity and relation creation in database
- Review browser console for JavaScript errors

**Prompt Management Issues**
- Verify database connection and table creation
- Check prompt category hierarchy
- Validate JSON field formats in database
- Review Monaco editor initialization

### Debug Commands
```bash
# Backend with debug logging
python -m src.api.endpoints --log-level debug

# Frontend with verbose output
cd web && npm run dev --verbose

# Check database connection and tables
python -c "from src.database.database import DatabaseManager; from src.utils.config import Config; db_manager = DatabaseManager(Config()); print('Database connected successfully')"

# Test API endpoints
curl http://localhost:8000/business-types
curl http://localhost:8000/knowledge-graph/stats
curl http://localhost:8000/prompts/stats/overview
```

## Performance Optimization

### Database Optimizations
- Indexed queries on business_type and timestamp fields
- JSON storage for complex test case data
- Connection pooling with SQLAlchemy
- Atomic transactions for data consistency
- MySQL-specific optimizations for large datasets

### Frontend Optimizations
- React Query caching for API responses
- Lazy loading for large datasets
- Virtual scrolling for knowledge graph nodes
- Code splitting with Vite
- Monaco editor lazy loading

### API Performance
- Background task processing for LLM calls
- Pagination for large datasets
- Efficient JSON serialization with Pydantic
- Response caching where appropriate
- Database query optimization

## Current Status

This is a **production-ready** enterprise-grade system with comprehensive capabilities:

### ✅ Completed Features
- **29 Business Types**: Full support for all TSP remote control services
- **Complete CRUD Operations**: Full test case lifecycle management
- **Interactive Knowledge Graph**: Visual business relationship mapping
- **Real-time Monitoring**: Live task progress and status updates
- **Export Functionality**: Excel export with custom formatting
- **Prompt Management System**: Complete database-driven prompt management
- **API Documentation**: Comprehensive OpenAPI/Swagger documentation
- **MySQL Database**: Production-ready database with 10 tables
- **Frontend Management Interface**: Professional React interface for all features
- **Version Control**: Complete prompt versioning system
- **Advanced Search**: Multi-criteria search and filtering

### 🔧 Technical Excellence
- **Modern Tech Stack**: Latest versions of all frameworks
- **Type Safety**: Full TypeScript coverage
- **Testing Framework**: Unit and integration test support
- **Error Handling**: Robust error management and user feedback
- **Security**: Proper authentication and authorization
- **Performance**: Optimized for large datasets
- **Documentation**: Comprehensive documentation and guides

The system successfully bridges business requirements and automated test case generation using modern LLM technology, providing an intuitive interface for prompt management, test management, and visualization.