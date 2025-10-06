# TSP Test Case Generation Backend

A Python backend project for generating test cases using Large Language Models (LLMs). This tool can generate test cases based on provided requirements and convert them to various formats including Excel and executable interface test scripts.

## Features

- **LLM-powered Test Case Generation**: Generate test cases using configurable LLM APIs
- **Multiple Output Formats**: Export test cases as JSON and Excel files
- **Interface Test Script Generation**: Create pytest scripts for API testing
- **Modular Architecture**: Clean, maintainable code structure
- **Type Safety**: Full type annotations with Pydantic models

## Project Structure

```
/
├── src/                          # Core backend code
│   ├── core/                     # Core business logic
│   │   ├── test_case_generator.py    # Main test case generation
│   │   ├── interface_test_generator.py # Interface test generation
│   │   ├── json_extractor.py          # JSON extraction utilities
│   │   └── excel_converter.py         # Excel conversion utilities
│   ├── api/                      # External API integrations
│   │   └── llm_client.py             # LLM API client
│   ├── utils/                    # Utility modules
│   │   ├── config.py               # Configuration management
│   │   └── file_handler.py         # File handling utilities
│   └── models/                   # Data models
│       └── test_case.py            # Test case data models
├── scripts/                     # Entry point scripts
│   ├── generate_test_cases.py        # Test case generation script
│   └── generate_interface_tests.py   # Interface test generation script
├── tests/                       # Test modules
├── prompts/                     # LLM prompt templates
├── output/                      # Generated output files
├── interface_tests/             # Generated interface test scripts
├── requirements.txt             # Python dependencies
├── setup.py                     # Package configuration
└── .env                         # Environment configuration
```

## Installation

### Prerequisites

- Python 3.8+
- UV package manager (recommended) or pip
- API key for compatible LLM service

### Setup with UV (Recommended)

1. Install UV:
   ```bash
   pip install uv
   ```

2. Create virtual environment:
   ```bash
   uv venv
   ```

3. Activate virtual environment:
   - Windows: `source .venv/Scripts/activate`
   - Linux/Mac: `source .venv/bin/activate`

4. Install dependencies:
   ```bash
   uv pip install -r requirements.txt
   ```

### Setup with pip

1. Create virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # or .venv/Scripts/activate on Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

Create a `.env` file in the project root with the following configuration:

```env
# API Configuration
API_KEY=your-api-key-here
API_BASE_URL=https://your-llm-api.com/v1
MODEL=your-model-name

# Prompt Files
SYSTEM_PROMPT_PATH=prompts/system.md
REQUIREMENTS_PROMPT_PATH=prompts/requirements.md

# Interface Test Configuration
JSON_FILE_PATH=output/test_cases_20250918_085324.json

# Output Directories
OUTPUT_DIR=output
INTERFACE_TESTS_DIR=interface_tests
```

## Usage

### Generate Test Cases

Run the test case generation script:

```bash
python scripts/generate_test_cases.py
```

This will:
1. Load prompts from the configured files
2. Call the LLM API to generate test cases
3. Extract JSON from the response
4. Save the results as both JSON and Excel files

### Generate Interface Test Scripts

After generating test cases, create interface test scripts:

```bash
python scripts/generate_interface_tests.py
```

This will:
1. Load test cases from the JSON file specified in `JSON_FILE_PATH`
2. Generate a pytest script with API test cases
3. Save the script in the `interface_tests/` directory

### Running Interface Tests

Execute the generated interface tests:

```bash
cd interface_tests
pytest test_*.py -v
```

## Development

### Code Quality Tools

The project includes several development tools:

- **Black**: Code formatting
- **Flake8**: Linting
- **MyPy**: Type checking
- **Pytest**: Testing

Run them individually:

```bash
# Format code
black src/ scripts/ tests/

# Lint code
flake8 src/ scripts/ tests/

# Type checking
mypy src/

# Run tests
pytest tests/ -v
```

### Project Architecture

The project follows a clean architecture pattern:

- **Core Layer**: Contains business logic and domain models
- **API Layer**: Handles external service integrations
- **Utils Layer**: Provides common utilities and helpers
- **Models Layer**: Defines data structures and validation

### Adding New Features

1. **New Output Formats**: Add converters in `src/core/`
2. **New LLM Providers**: Extend `src/api/llm_client.py`
3. **New Data Models**: Add to `src/models/`
4. **New Utilities**: Add to `src/utils/`

## Testing

Run the test suite:

```bash
pytest tests/ -v --cov=src
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite and quality checks
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.