# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains two main components:

1. **Test Case Generation Script**: A Python script that uses LLMs to create test cases based on provided requirements
2. **Frontend Web Application**: A React-based admin panel built with Refine framework for managing test cases and requirements

## Setup Commands

### Backend (Test Case Generation Script)
1. Install UV package manager
2. Create virtual environment: `uv venv`
3. Activate virtual environment: `source .venv/Scripts/activate` (on Windows) or `source .venv/bin/activate` (on Linux/Mac)
4. Install dependencies: `uv pip install openai python-dotenv pandas xlsxwriter`

### Frontend (Web Application)
1. Navigate to web directory: `cd web`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`

## Key Components

### Backend Components
- `main.py`: Main script that handles API calls, JSON extraction, and Excel conversion
- `generate_interface_tests.py`: Script that generates executable interface test scripts from JSON test cases
- `prompts/system.md`: System prompt that defines the test case generation format and rules
- `prompts/requirements.md`: Template for specifying feature requirements
- `.env`: Configuration file for API settings and test script generation

### Frontend Components (web/)
- React application built with Refine framework and Ant Design
- Authentication system with login/register/forgot password functionality
- Blog posts and categories management pages
- TypeScript configuration with ESLint for code quality
- Docker support for containerized deployment

## Common Development Tasks

### Backend Development
- Update prompt files in the `prompts/` directory to modify test case generation behavior
- Modify `main.py` to change JSON extraction logic or Excel formatting
- Modify `generate_interface_tests.py` to customize interface test script generation
- Update `.env` to configure different API endpoints or models
- Configure `JSON_FILE_PATH` in `.env` to specify which JSON file to use for interface test generation

### Frontend Development
- Navigate to `web/` directory for frontend development
- Modify React components in `src/components/` and `src/pages/`
- Update authentication logic in `src/authProvider.ts`
- Configure routing and data providers in `src/App.tsx`
- Run `npm run dev` to start the development server with hot reload

## Build and Run

### Backend Script
Run the test case generation script with: `python main.py`

The script will:
1. Load prompts from the `prompts/` directory
2. Call the configured LLM API
3. Extract JSON test cases from the response
4. Convert the JSON to Excel format and save in the `output/` directory

### Frontend Application
Navigate to the web directory and run: `npm run dev`

The frontend will:
1. Start a development server (typically on localhost:5173)
2. Provide a Refine-based admin interface
3. Include authentication, blog posts management, and categories management

## Generate Interface Test Scripts

After generating test cases with `main.py`, you can create executable interface test scripts using:

`python generate_interface_tests.py`

The script will:
1. Load the JSON test cases from the file specified by `JSON_FILE_PATH` in `.env`
2. Generate a pytest script with test cases formatted for API testing
3. Save the test script in the `interface_tests/` directory

Configure the `JSON_FILE_PATH` in the `.env` file to specify which JSON file should be used for generating interface tests.