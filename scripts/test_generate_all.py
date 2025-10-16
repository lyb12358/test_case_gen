#!/usr/bin/env python3
"""
Simple test script to verify the all test cases generation script functionality.
"""

import sys
import os

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
src_path = os.path.join(project_root, 'src')
sys.path.insert(0, src_path)

try:
    from config.business_types import BUSINESS_TYPE_NAMES, get_business_type_mapping
    print("SUCCESS: Business types import works")
    print(f"Found {len(BUSINESS_TYPE_NAMES)} business types")

    # Test a few business types
    test_types = ['RCC', 'RFD', 'ZAB', 'ZBA']
    for bt in test_types:
        if bt in BUSINESS_TYPE_NAMES:
            name = BUSINESS_TYPE_NAMES[bt]
            print(f"{bt}: {name}")

    print("\nScript imports are working correctly!")

except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)