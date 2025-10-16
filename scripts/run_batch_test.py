#!/usr/bin/env python3
"""
Simple test runner for batch test case generation without Unicode issues.
"""

import sys
import os
import requests
import json
import time

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
src_path = os.path.join(project_root, 'src')
sys.path.insert(0, src_path)

from config.business_types import BUSINESS_TYPE_NAMES

class SimpleAPIClient:
    def __init__(self, base_url="http://127.0.0.1:8001"):
        self.base_url = base_url

    def check_health(self):
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            return response.status_code == 200
        except:
            return False

    def get_business_types(self):
        try:
            response = requests.get(f"{self.base_url}/business-types/mapping", timeout=5)
            if response.status_code == 200:
                return response.json().get("business_types", {})
        except:
            pass
        return {}

def test_api_connectivity():
    """Test basic API connectivity."""
    print("Testing API connectivity...")
    client = SimpleAPIClient()

    if not client.check_health():
        print("ERROR: API server is not responding")
        return False

    print("SUCCESS: API server is responding")

    business_types = client.get_business_types()
    print(f"SUCCESS: Retrieved {len(business_types)} business types from API")

    return True

def test_single_business_generation(business_type):
    """Test generation for a single business type."""
    print(f"\nTesting generation for {business_type}: {BUSINESS_TYPE_NAMES.get(business_type, business_type)}")

    try:
        # Start generation
        payload = {"business_type": business_type}
        response = requests.post("http://127.0.0.1:8001/generate-test-cases", json=payload, timeout=10)

        if response.status_code != 200:
            print(f"ERROR: Failed to start generation: {response.status_code}")
            return False

        data = response.json()
        task_id = data.get("task_id")

        if not task_id:
            print("ERROR: No task ID returned")
            return False

        print(f"SUCCESS: Generation started with task ID: {task_id}")

        # Monitor status
        max_wait = 300  # 5 minutes max
        start_time = time.time()

        while time.time() - start_time < max_wait:
            status_response = requests.get(f"http://127.0.0.1:8001/status/{task_id}", timeout=10)

            if status_response.status_code == 200:
                status_data = status_response.json()
                status = status_data.get("status")
                progress = status_data.get("progress", 0)

                if status == "completed":
                    test_cases_count = status_data.get("test_case_id", 0)
                    print(f"SUCCESS: Generation completed - {test_cases_count} test cases")
                    return True
                elif status == "failed":
                    error = status_data.get("error", "Unknown error")
                    print(f"ERROR: Generation failed - {error}")
                    return False
                else:
                    print(f"Progress: {progress}% - {status}")

            time.sleep(5)

        print("ERROR: Generation timed out")
        return False

    except Exception as e:
        print(f"ERROR: Exception during generation - {e}")
        return False

def main():
    """Main test function."""
    print("=== TSP Batch Test Case Generation Test ===")

    # Test API connectivity
    if not test_api_connectivity():
        sys.exit(1)

    # Test with a simple business type (RCC is usually fast)
    test_business_type = "RCC"

    print(f"\nTesting with business type: {test_business_type}")
    success = test_single_business_generation(test_business_type)

    if success:
        print("\n=== TEST PASSED ===")
        print("The batch generation system is working correctly!")
        print("You can now run the full script:")
        print("python scripts/generate_all_test_cases.py --dry-run")
        print("python scripts/generate_all_test_cases.py")
    else:
        print("\n=== TEST FAILED ===")
        print("Please check the API server and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()