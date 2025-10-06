#!/usr/bin/env python3
"""
Quick start script for TSP Test Case Generator API server.
This script starts the FastAPI server for test case generation.
"""

import sys
import os
import subprocess
from pathlib import Path

def check_requirements():
    """Check if required dependencies are installed."""
    try:
        import uvicorn
        return True
    except ImportError:
        print("uvicorn not found. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "uvicorn"])
        return True

def start_api_server():
    """Start the FastAPI API server."""
    print("Starting TSP Test Case Generator API Server...")
    print("API will be available at: http://localhost:8000")
    print("API Documentation: http://localhost:8000/docs")
    print("ReDoc Documentation: http://localhost:8000/redoc")
    print("Press Ctrl+C to stop the server")
    print("-" * 50)

    try:
        # Start the API server
        import uvicorn
        from src.api.endpoints import app

        uvicorn.run(
            "src.api.endpoints:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\nAPI server stopped by user")
    except Exception as e:
        print(f"Failed to start API server: {e}")
        sys.exit(1)

def main():
    """Main function."""
    # Change to project root directory
    project_root = Path(__file__).parent
    os.chdir(project_root)

    print("TSP Test Case Generator API Server")
    print("=" * 50)

    # Check requirements
    if not check_requirements():
        print("Failed to install required dependencies")
        sys.exit(1)

    # Start the server
    start_api_server()

if __name__ == "__main__":
    main()