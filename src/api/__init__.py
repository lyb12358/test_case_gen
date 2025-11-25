"""
API module for TSP Test Case Generator.

This module provides FastAPI endpoints for the test case generation service.
"""

# Import conditional to avoid RuntimeWarning when running as script
import sys
if "__main__" not in sys.modules:
    from .endpoints import app, GenerateTestCaseRequest, GenerateResponse, TaskStatusResponse

    __all__ = [
        "app",
        "GenerateTestCaseRequest",
        "GenerateResponse",
        "TaskStatusResponse"
    ]
else:
    __all__ = []