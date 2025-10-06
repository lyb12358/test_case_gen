# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start 🚀

```bash
# 1. Start Backend API Server
python -m src.api.endpoints

# 2. Start Frontend (in another terminal)
cd web && npm run dev
```

**Access Points:**
- **Frontend**: http://localhost:5173
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

**Generate Test Cases:**
1. **Web Interface**: Use frontend dashboard (recommended)
2. **API**: POST to `/generate-test-cases`
3. **Script**: `python scripts/generate_test_cases.py`

## Project Overview

Comprehensive test case generation system with modern web frontend:

1. **Backend**: Modular Python backend using LLMs with SQLite storage
2. **Frontend**: Modern React app (TypeScript + Vite + Ant Design + React Query)
3. **API**: RESTful endpoints for business type parameterized test case generation

## Project Structure

### Backend (Python)
```
src/
├── core/                     # Core business logic
│   ├── test_case_generator.py    # Main generation logic
│   ├── interface_test_generator.py # Interface test generation
│   ├── json_extractor.py          # JSON extraction
│   └── excel_converter.py         # Excel generation
├── api/endpoints.py          # FastAPI endpoints
├── database/                 # Database layer
├── utils/                    # Utilities and config
└── models/                   # Data models

scripts/                     # Entry points
├── generate_test_cases.py        # Main script
└── generate_interface_tests.py   # Interface tests

prompts/                     # Prompt templates
├── system.md                   # System prompt
├── requirements_template.md     # Requirements template
└── business_descriptions/       # Business-specific content
```

### Frontend (React/TypeScript)
```
web/
├── src/
│   ├── components/Layout/       # Main layout
│   ├── pages/                   # Page components
│   │   ├── Dashboard/           # Statistics dashboard
│   │   ├── TestCases/           # Test case management
│   │   └── Tasks/               # Task monitoring
│   ├── services/                # API service layers
│   ├── types/                   # TypeScript definitions
│   └── App.tsx                  # Main app with routing
├── package.json                 # Dependencies
├── vite.config.ts              # Vite configuration
└── tsconfig.json               # TypeScript config
```

## Setup

### Backend
```bash
# 1. Create virtual environment
python -m venv .venv

# 2. Activate (Windows)
.venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env  # Edit .env with API keys
```

### Frontend
```bash
cd web
npm install
npm run dev
```

## Key Components

### Backend
- **test_case_generator.py**: Core LLM-based generation
- **endpoints.py**: API endpoints with task tracking
- **database/**: SQLAlchemy models and CRUD operations
- **prompt_builder.py**: Parameterized prompt system

### Frontend
- **Dashboard**: Real-time statistics and quick actions
- **TestCaseGenerate**: Task monitoring with progress tracking
- **Services**: API abstraction with React Query integration
- **MainLayout**: Responsive sidebar navigation

## Development

### Backend Commands
```bash
# Generate test cases
python scripts/generate_test_cases.py

# Generate interface tests
python scripts/generate_interface_tests.py

# Development server
python -m src.api.endpoints --reload
```

### Frontend Commands
```bash
cd web
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview build
```

## Supported Business Types

- **RCC**: Remote Climate Control (远程净化)
- **RFD**: Remote Fragrance Control (香氛控制)
- **ZAB**: Remote Cabin Temperature Setting (远程恒温座舱设置)
- **ZBA**: Water Flooding Alarm (水淹报警)

## Configuration

Key environment variables (`.env`):
- `API_KEY`: LLM API key
- `API_BASE_URL`: LLM endpoint
- `MODEL`: LLM model name
- `DATABASE_PATH`: SQLite database path
- `OUTPUT_DIR`: Generated files directory

## Migration Notes

### Backend (Completed)
- Modularized code into `src/` structure
- Added database integration with SQLAlchemy
- Centralized configuration management
- Enhanced type safety with Pydantic models

### Frontend (October 2024)
- **From**: Refine framework → **To**: Modern React stack
- **Tech**: React 18 + TypeScript + Vite + Ant Design + React Query
- **Features**: Real-time monitoring, Chinese UI, advanced filtering
- **UX**: Improved responsive design and user experience

## API Documentation

When API server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database Schema

- **test_cases**: Generated test case data by business type
- **generation_jobs**: Task status and metadata tracking
- **Auto-cleanup**: Replaces existing data on new generation