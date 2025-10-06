# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a restructured Python backend project for test case generation and a frontend web application:

1. **Backend Project**: A modular Python backend that uses LLMs to create test cases based on provided requirements
2. **Frontend Web Application**: A React-based admin panel built with Refine framework for managing test cases and requirements

## Backend Project Structure

The backend has been restructured into a clean, modular architecture:

```
src/
├── core/                     # Core business logic
│   ├── test_case_generator.py    # Main test case generation logic
│   ├── interface_test_generator.py # Interface test generation
│   ├── json_extractor.py          # JSON extraction from LLM responses
│   └── excel_converter.py         # Excel file generation
├── api/                      # External API integrations
│   └── llm_client.py             # LLM API client
├── utils/                    # Utility modules
│   ├── config.py               # Configuration management
│   └── file_handler.py         # File operations
└── models/                   # Data models
    └── test_case.py            # Test case data structures

scripts/                     # Entry point scripts
├── generate_test_cases.py        # Main entry point for test case generation
└── generate_interface_tests.py   # Entry point for interface test generation
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
- **src/core/test_case_generator.py**: Core logic for test case generation using LLMs
- **src/core/interface_test_generator.py**: Generates executable interface test scripts
- **src/api/llm_client.py**: Handles communication with LLM APIs
- **src/utils/config.py**: Configuration management using environment variables
- **src/models/test_case.py**: Pydantic models for test case data structures
- **scripts/generate_test_cases.py**: Main entry point script for test case generation
- **scripts/generate_interface_tests.py**: Entry point script for interface test generation

### Configuration
- `.env`: Configuration file for API settings, model selection, and file paths
- `requirements.txt`: Python dependencies including type safety and development tools
- `setup.py`: Package configuration for distribution and installation

### Prompts
- `prompts/system.md`: System prompt defining test case generation format and rules
- `prompts/requirements_*.md`: Various requirement templates for different features

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
- Update LLM integration: Modify `src/api/llm_client.py`

#### Configuration Management
- Update `.env` to configure different API endpoints, models, or file paths
- All configuration is now managed through `src/utils/config.py`
- Environment variables are automatically loaded and validated

#### Adding New Features
- Add new output formats: Create new modules in `src/core/`
- Add new LLM providers: Extend `src/api/llm_client.py`
- Add new data models: Create new files in `src/models/`
- Add new utilities: Create new files in `src/utils/`

### Frontend Development
- Navigate to `web/` directory for frontend development
- Modify React components in `src/components/` and `src/pages/`
- Update authentication logic in `src/authProvider.ts`
- Configure routing and data providers in `src/App.tsx`
- Run `npm run dev` to start the development server with hot reload

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

## Configuration

Key environment variables in `.env`:
- `API_KEY`: LLM API key
- `API_BASE_URL`: LLM API endpoint
- `MODEL`: LLM model name
- `SYSTEM_PROMPT_PATH`: Path to system prompt file
- `REQUIREMENTS_PROMPT_PATH`: Path to requirements prompt file
- `JSON_FILE_PATH`: Path to JSON file for interface test generation
- `OUTPUT_DIR`: Output directory for generated files
- `INTERFACE_TESTS_DIR`: Directory for interface test scripts