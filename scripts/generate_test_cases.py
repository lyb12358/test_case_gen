#!/usr/bin/env python3
"""
Test Case Generation Script

This script generates test cases using LLMs based on provided requirements.
It replaces the original main.py with a cleaner interface to the refactored backend.
"""

import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.utils.config import Config
from src.core.test_case_generator import TestCaseGenerator


def main():
    """Main function to generate test cases"""
    print("=== TSP Test Case Generation Script ===")

    # Initialize configuration
    config = Config()

    # Initialize test case generator
    generator = TestCaseGenerator(config)

    # Run the generation process
    success = generator.run()

    if success:
        print("\n✅ Test case generation completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Test case generation failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()