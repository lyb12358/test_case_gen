#!/usr/bin/env python3
"""
Test script to debug the steps conversion function
"""

import json

# Test data - simulate what's in the database
test_steps = json.dumps([
    {"step_number": 1, "action": "打开车辆设置", "expected": "进入设置界面"},
    {"step_number": 2, "action": "点击空调控制", "expected": "显示空调选项"}
])

print(f"Input: {test_steps}")
print(f"Type: {type(test_steps)}")

def _convert_steps_to_simple_list(steps_data):
    """
    Convert complex step objects to simple string list for export.
    """
    if not steps_data:
        return []

    try:
        # If it's a string, try to parse as JSON first
        if isinstance(steps_data, str):
            try:
                steps = json.loads(steps_data)
                print(f"Parsed JSON: {steps}")
            except json.JSONDecodeError:
                # If not valid JSON, treat as single step
                return [steps_data]
        else:
            steps = steps_data

        if not isinstance(steps, list):
            # Single value
            return [str(steps)]

        simple_steps = []
        for i, step in enumerate(steps):
            print(f"Processing step {i}: {step}, type: {type(step)}")
            if isinstance(step, dict):
                # Complex object - extract action or create formatted string
                if 'action' in step:
                    action = step['action']
                    expected = step.get('expected', '')
                    if expected:
                        result = f"{action} (期望: {expected})"
                        print(f"Action + Expected: {result}")
                        simple_steps.append(result)
                    else:
                        print(f"Action only: {action}")
                        simple_steps.append(action)
                elif 'step' in step:
                    result = str(step['step'])
                    print(f"Step field: {result}")
                    simple_steps.append(result)
                elif 'description' in step:
                    result = str(step['description'])
                    print(f"Description field: {result}")
                    simple_steps.append(result)
                else:
                    # Fallback: convert whole dict to string
                    result = str(step)
                    print(f"Fallback dict: {result}")
                    simple_steps.append(result)
            else:
                # Simple string or number
                result = str(step)
                print(f"Simple value: {result}")
                simple_steps.append(result)

        return simple_steps
    except Exception as e:
        print(f"Error: {e}, data: {steps_data}")
        # Return as single item list as fallback
        return [str(steps_data)]

# Test the function
result = _convert_steps_to_simple_list(test_steps)
print(f"Result: {result}")
print(f"Result types: {[type(r) for r in result]}")