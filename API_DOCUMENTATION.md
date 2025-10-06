# TSP Test Case Generator API v2.0 Documentation

## Overview

The TSP Test Case Generator API has been refactored to support business type parameters and database integration. This API allows you to generate test cases for different business types (RCC, RFD, ZAB, ZBA) and stores them in a local SQLite database.

## Base URL

```
http://localhost:8000
```

## Supported Business Types

- **RCC** - Remote Climate Control (远程净化)
- **RFD** - Remote Fragrance Control (香氛控制)
- **ZAB** - Remote Cabin Temperature Reduction Setting (远程恒温座舱设置)
- **ZBA** - Water Flooding Alarm (水淹报警)

## API Endpoints

### 1. Generate Test Cases

**Endpoint:** `POST /generate-test-cases`

**Description:** Generate test cases for a specific business type. Each generation will automatically delete existing test cases for that business type.

**Request Body:**
```json
{
  "business_type": "RCC"
}
```

**Response:**
```json
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Test case generation started for RCC"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/generate-test-cases" \
  -H "Content-Type: application/json" \
  -d '{"business_type": "RCC"}'
```

### 2. Get Task Status

**Endpoint:** `GET /status/{task_id}`

**Description:** Get the status of a test case generation task.

**Response:**
```json
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "progress": 100,
  "business_type": "RCC",
  "error": null,
  "test_case_id": 1
}
```

**Task Status Values:**
- `pending` - Task is queued
- `running` - Task is currently running
- `completed` - Task completed successfully
- `failed` - Task failed with an error

### 3. Get Test Cases by Business Type

**Endpoint:** `GET /test-cases/{business_type}`

**Description:** Get all test cases for a specific business type.

**Response:**
```json
{
  "business_type": "RCC",
  "count": 1,
  "test_cases": [
    {
      "id": 1,
      "business_type": "RCC",
      "test_data": {
        "test_cases": [...]
      },
      "created_at": "2025-01-06T18:12:34.567890",
      "updated_at": "2025-01-06T18:12:34.567890"
    }
  ]
}
```

### 4. Get All Test Cases

**Endpoint:** `GET /test-cases`

**Description:** Get all test cases from all business types.

**Response:**
```json
{
  "business_type": null,
  "count": 4,
  "test_cases": [
    {
      "id": 1,
      "business_type": "RCC",
      "test_data": {...},
      "created_at": "...",
      "updated_at": "..."
    },
    ...
  ]
}
```

### 5. Delete Test Cases by Business Type

**Endpoint:** `DELETE /test-cases/{business_type}`

**Description:** Delete all test cases for a specific business type.

**Response:**
```json
{
  "message": "Test cases for RCC deleted successfully"
}
```

### 6. Get Supported Business Types

**Endpoint:** `GET /business-types`

**Description:** Get list of all supported business types.

**Response:**
```json
{
  "business_types": ["RCC", "RFD", "ZAB", "ZBA"]
}
```

### 7. List All Tasks

**Endpoint:** `GET /tasks`

**Description:** Get list of all tasks and their status.

**Response:**
```json
{
  "tasks": [
    {
      "task_id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "completed",
      "progress": 100,
      "business_type": "RCC",
      "error": null
    }
  ]
}
```

### 8. Delete Task

**Endpoint:** `DELETE /tasks/{task_id}`

**Description:** Delete a task from the task store.

**Response:**
```json
{
  "message": "Task deleted successfully"
}
```

### 9. Root Endpoint

**Endpoint:** `GET /`

**Description:** Get API information and available endpoints.

**Response:**
```json
{
  "message": "TSP Test Case Generator API v2.0",
  "description": "API for generating test cases using LLMs with business type support",
  "endpoints": [
    "POST /generate-test-cases - Generate test cases for business type",
    "GET /test-cases/{business_type} - Get test cases by business type",
    "GET /test-cases - Get all test cases",
    "DELETE /test-cases/{business_type} - Delete test cases by business type",
    "GET /business-types - List supported business types"
  ]
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- **400 Bad Request** - Invalid business type or request parameters
- **404 Not Found** - Task or resource not found
- **500 Internal Server Error** - Server error during processing

**Error Response Format:**
```json
{
  "detail": "Invalid business type 'INVALID'. Supported types: ['RCC', 'RFD', 'ZAB', 'ZBA']"
}
```

## Database

The API uses SQLite database to store test cases and generation jobs. Database file is located at `data/test_cases.db`.

### Database Tables

- **test_cases** - Stores generated test cases
- **generation_jobs** - Stores generation job information

## Configuration

The API can be configured through environment variables:

- `API_KEY` - LLM API key
- `API_BASE_URL` - LLM API base URL
- `MODEL` - LLM model name
- `SYSTEM_PROMPT_PATH` - System prompt file path
- `DATABASE_URL` - Database connection URL (optional)
- `DATABASE_PATH` - SQLite database file path (default: data/test_cases.db)

## Usage Examples

### Complete Workflow

```bash
# 1. Get supported business types
curl -X GET "http://localhost:8000/business-types"

# 2. Generate test cases for RCC
curl -X POST "http://localhost:8000/generate-test-cases" \
  -H "Content-Type: application/json" \
  -d '{"business_type": "RCC"}'

# Response: {"task_id": "...", "status": "pending", "message": "..."}

# 3. Check task status
curl -X GET "http://localhost:8000/status/{task_id}"

# 4. Get generated test cases
curl -X GET "http://localhost:8000/test-cases/RCC"
```

### Generate Test Cases for All Business Types

```bash
for business_type in RCC RFD ZAB ZBA; do
  echo "Generating test cases for $business_type..."
  curl -X POST "http://localhost:8000/generate-test-cases" \
    -H "Content-Type: application/json" \
    -d "{\"business_type\": \"$business_type\"}"
  echo ""
done
```

## Running the API

```bash
# Install dependencies
uv pip install -r requirements.txt

# Run the API server
python -m src.api.endpoints

# Or using uvicorn directly
uvicorn src.api.endpoints:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.

## Interactive API Documentation

When running the API server, you can access:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

These provide interactive documentation where you can test the API endpoints directly.