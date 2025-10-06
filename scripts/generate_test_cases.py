#!/usr/bin/env python3
"""
Test Case Generation Script

This script generates test cases using LLMs based on provided requirements.
It replaces the original main.py with a cleaner interface to the refactored backend.
Supports business type parameter for generating test cases for specific business domains.
"""

import sys
import os
import argparse

# Add the src directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
src_path = os.path.join(project_root, 'src')
sys.path.insert(0, src_path)

from src.utils.config import Config
from src.core.test_case_generator import TestCaseGenerator
from src.utils.prompt_builder import PromptBuilder


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Generate test cases using LLMs for specific business types'
    )
    parser.add_argument(
        '--business-type', '-b',
        type=str,
        help='Business type (e.g., RCC, RFD, ZAB, ZBA)'
    )
    parser.add_argument(
        '--list-business-types', '-l',
        action='store_true',
        help='List all available business types'
    )
    return parser.parse_args()


def list_business_types(prompt_builder: PromptBuilder):
    """List all available business types."""
    print("=== Available Business Types ===")
    business_types = prompt_builder.get_available_business_types()

    if not business_types:
        print("No business types found. Make sure business_descriptions directory exists.")
        return

    for business_type in business_types:
        print(f"  - {business_type}")

    print(f"\nTotal: {len(business_types)} business type(s)")


def main():
    """Main function to generate test cases"""
    print("=== TSP Test Case Generation Script ===")

    # Parse command line arguments
    args = parse_arguments()

    # Initialize configuration
    config = Config()

    # Initialize prompt builder
    prompt_builder = PromptBuilder(config)

    # Handle list business types flag
    if args.list_business_types:
        list_business_types(prompt_builder)
        sys.exit(0)

    # Handle business type parameter
    business_type = args.business_type or config.business_type

    if business_type:
        business_type = business_type.upper()
        print(f"📋 Using business type: {business_type}")

        # Build prompt for specific business type
        prompt = prompt_builder.build_prompt(business_type)
        if prompt is None:
            print(f"❌ Failed to build prompt for business type: {business_type}")
            sys.exit(1)

        # Update requirements prompt path for this business type
        config.requirements_prompt_path = config.get_requirements_prompt_path(business_type)

        # Save the built prompt for reference/debugging
        if not prompt_builder.save_built_prompt(business_type):
            print(f"⚠️  Warning: Failed to save built prompt for {business_type}")
        else:
            print(f"💾 Saved built prompt to: {config.requirements_prompt_path}")
    else:
        print("📋 Using default requirements prompt")
        if not config.requirements_prompt_path or not os.path.exists(config.requirements_prompt_path):
            print("⚠️  Warning: Default requirements prompt file not found")

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