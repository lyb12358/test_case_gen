# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a comprehensive Python backend project for test case generation with database integration and parameterized API endpoints:

1. **Backend Project**: A modular Python backend that uses LLMs to create test cases based on provided requirements with SQLite database storage
2. **Frontend Web Application**: A React-based admin panel built with Refine framework for managing test cases and requirements
3. **API Service**: RESTful API endpoints for business type parameterized test case generation

## Backend Project Structure

The backend has been restructured into a clean, modular architecture with database integration:

```
src/
├── core/                     # Core business logic
│   ├── test_case_generator.py    # Main test case generation logic with database support
│   ├── interface_test_generator.py # Interface test generation
│   ├── json_extractor.py          # JSON extraction from LLM responses
│   └── excel_converter.py         # Excel file generation
├── api/                      # FastAPI service endpoints
│   ├── __init__.py               # API module initialization
│   └── endpoints.py              # FastAPI endpoint definitions with business type support
├── llm/                      # LLM integration modules
│   └── llm_client.py             # LLM API client
├── utils/                    # Utility modules
│   ├── config.py               # Configuration management
│   ├── file_handler.py         # File operations
│   └── prompt_builder.py       # Parameterized prompt building system
├── database/                 # Database layer
│   ├── models.py               # SQLAlchemy models and enums
│   ├── database.py             # Database connection and session management
│   └── operations.py           # Database CRUD operations
└── models/                   # Data models
    └── test_case.py            # Test case data structures

scripts/                     # Entry point scripts
├── generate_test_cases.py        # Main entry point for test case generation
└── generate_interface_tests.py   # Entry point for interface test generation

prompts/                     # Prompt templates and business descriptions
├── system.md                   # System prompt template
├── requirements_template.md     # Main requirements template with placeholders
├── shared/                      # Shared content files
│   ├── system_background.md     # System background information
│   ├── error_codes.md           # Error code reference
│   └── swagger_api.md           # API endpoint documentation
├── business_descriptions/       # Business-specific descriptions
│   ├── RCC.md                   # Remote Climate Control description
│   ├── RFD.md                   # Remote Fragrance Control description
│   ├── ZAB.md                   # Remote Cabin Temperature Setting description
│   └── ZBA.md                   # Water Flooding Alarm description
└── bak/                         # Backup of original prompt files
    ├── requirements_RCC.md
    ├── requirements_RFD.md
    ├── requirements_ZAB.md
    └── requirements_ZBA.md
```

## Setup Commands

### Backend (Test Case Generation Project)
1. Install UV package manager (recommended) or use pip
2. Create virtual environment: `uv venv`
3. Activate virtual environment: `source .venv/Scripts/activate` (on Windows) or `source .venv/bin/activate` (on Linux/Mac)
4. Install dependencies: `uv pip install -r requirements.txt`

### Frontend (Web Application)
1. Navigate to web directory: `cd web`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`

## Key Components

### Backend Components
- **src/core/test_case_generator.py**: Core logic for test case generation using LLMs with database integration
- **src/core/interface_test_generator.py**: Generates executable interface test scripts
- **src/llm/llm_client.py**: Handles communication with LLM APIs
- **src/api/endpoints.py**: FastAPI endpoints with business type parameter support and database operations
- **src/utils/config.py**: Configuration management using environment variables
- **src/utils/prompt_builder.py**: Parameterized prompt building system for different business types
- **src/database/models.py**: SQLAlchemy models for test cases and generation jobs
- **src/database/operations.py**: Database CRUD operations with automatic cleanup
- **src/models/test_case.py**: Pydantic models for test case data structures
- **scripts/generate_test_cases.py**: Main entry point script for test case generation
- **scripts/generate_interface_tests.py**: Entry point script for interface test generation

### Configuration
- `.env`: Configuration file for API settings, model selection, and file paths
- `requirements.txt`: Python dependencies including type safety and development tools
- `setup.py`: Package configuration for distribution and installation

### Prompts
- `prompts/system.md`: System prompt defining test case generation format and rules
- `prompts/requirements_template.md`: Main template with placeholders for dynamic content
- `prompts/shared/`: Shared content files used across all business types
- `prompts/business_descriptions/`: Business-specific descriptions (RCC, RFD, ZAB, ZBA)
- **src/utils/prompt_builder.py**: Builds parameterized prompts from templates and business descriptions

### Frontend Components (web/)
- React application built with Refine framework and Ant Design
- Authentication system with login/register/forgot password functionality
- Blog posts and categories management pages
- TypeScript configuration with ESLint for code quality
- Docker support for containerized deployment

## Common Development Tasks

### Backend Development

#### Running Test Case Generation
Use the new entry point script:
```bash
python scripts/generate_test_cases.py
```

#### Running Interface Test Generation
Use the new interface test script:
```bash
python scripts/generate_interface_tests.py
```

#### Modifying Core Logic
- Update test case generation: Modify `src/core/test_case_generator.py`
- Change Excel formatting: Update `src/core/excel_converter.py`
- Modify JSON extraction: Edit `src/core/json_extractor.py`
- Update LLM integration: Modify `src/llm/llm_client.py`
- Add new API endpoints: Edit `src/api/endpoints.py`

#### Configuration Management
- Update `.env` to configure different API endpoints, models, or file paths
- All configuration is now managed through `src/utils/config.py`
- Environment variables are automatically loaded and validated

#### Adding New Features
- Add new output formats: Create new modules in `src/core/`
- Add new LLM providers: Extend `src/llm/llm_client.py`
- Add new API endpoints: Add routes in `src/api/endpoints.py`
- Add new data models: Create new files in `src/models/` or database models in `src/database/`
- Add new utilities: Create new files in `src/utils/`
- Add new business types: Create business description in `prompts/business_descriptions/` and update BusinessType enum

### Frontend Development
- Navigate to `web/` directory for frontend development
- Modify React components in `src/components/` and `src/pages/`
- Update authentication logic in `src/authProvider.ts`
- Configure routing and data providers in `src/App.tsx`
- Run `npm run dev` to start the development server with hot reload
- Frontend is built with Refine framework - for documentation on specific Refine features or components, use context7 to query the latest Refine documentation

## Development Tools

### Code Quality
The backend project includes comprehensive development tools:
- **Black**: Code formatting (`black src/ scripts/ tests/`)
- **Flake8**: Linting (`flake8 src/ scripts/ tests/`)
- **MyPy**: Type checking (`mypy src/`)
- **Pytest**: Testing (`pytest tests/ -v`)

### Testing
Run tests with coverage:
```bash
pytest tests/ -v --cov=src
```

For basic functionality testing without pytest:
```bash
python tests/test_config.py
python tests/test_models.py
python tests/test_json_extractor.py
```

## Build and Run

### Backend Scripts

#### Test Case Generation
```bash
python scripts/generate_test_cases.py
```
The script will:
1. Load configuration from `.env`
2. Load prompts from the `prompts/` directory
3. Call the configured LLM API via `src/api/llm_client.py`
4. Extract JSON test cases using `src/core/json_extractor.py`
5. Convert to Excel format using `src/core/excel_converter.py`
6. Save results in the `output/` directory

#### Interface Test Generation
```bash
python scripts/generate_interface_tests.py
```
The script will:
1. Load JSON test cases from the file specified by `JSON_FILE_PATH` in `.env`
2. Generate pytest scripts using `src/core/interface_test_generator.py`
3. Save test scripts in the `interface_tests/` directory

### Frontend Application
Navigate to the web directory and run: `npm run dev`

The frontend will:
1. Start a development server (typically on localhost:5173)
2. Provide a Refine-based admin interface
3. Include authentication, blog posts management, and categories management

## Migration Notes

- The old `main.py` and `generate_interface_tests.py` have been **removed** from the project root
- All functionality is now accessed through the new entry points in `scripts/`
- All core logic has been modularized and moved to the `src/` directory
- Configuration is now centralized in `src/utils/config.py`
- Type safety has been added throughout with Pydantic models
- Error handling and logging have been improved
- The project now follows standard Python packaging conventions

## API Usage

### Running the API Server
```bash
# Start the FastAPI server
python -m src.api.endpoints

# Or using uvicorn directly
uvicorn src.api.endpoints:app --host 0.0.0.0 --port 8000 --reload
```

### API Endpoints

#### Generate Test Cases for Business Type
```bash
curl -X POST "http://localhost:8000/generate-test-cases" \
  -H "Content-Type: application/json" \
  -d '{"business_type": "RCC"}'
```

#### Get Test Cases by Business Type
```bash
curl -X GET "http://localhost:8000/test-cases/RCC"
```

#### Get All Test Cases
```bash
curl -X GET "http://localhost:8000/test-cases"
```

#### Delete Test Cases by Business Type
```bash
curl -X DELETE "http://localhost:8000/test-cases/RCC"
```

#### Get Task Status
```bash
curl -X GET "http://localhost:8000/status/{task_id}"
```

#### Get Supported Business Types
```bash
curl -X GET "http://localhost:8000/business-types"
```

### Interactive API Documentation
When the API server is running, you can access:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Database Integration

### Database Schema
- **test_cases** table: Stores generated test case JSON data for each business type
- **generation_jobs** table: Tracks generation job status and metadata
- Automatic cleanup: Each generation deletes existing test cases for that business type

### Supported Business Types
- **RCC**: Remote Climate Control (远程净化)
- **RFD**: Remote Fragrance Control (香氛控制)
- **ZAB**: Remote Cabin Temperature Reduction Setting (远程恒温座舱设置)
- **ZBA**: Water Flooding Alarm (水淹报警)

## Configuration

Key environment variables in `.env`:
- `API_KEY`: LLM API key
- `API_BASE_URL`: LLM API endpoint
- `MODEL`: LLM model name
- `SYSTEM_PROMPT_PATH`: Path to system prompt file
- `REQUIREMENTS_PROMPT_PATH`: Path to requirements prompt file (now uses template system)
- `JSON_FILE_PATH`: Path to JSON file for interface test generation
- `OUTPUT_DIR`: Output directory for generated files
- `INTERFACE_TESTS_DIR`: Directory for interface test scripts
- `DATABASE_PATH`: SQLite database file path (default: data/test_cases.db)
- `DATABASE_URL`: Database connection URL (optional)