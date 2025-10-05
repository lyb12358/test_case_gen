#!/usr/bin/env python3
"""
Test Case Generation Script

This script generates test cases using LLMs based on provided requirements.
It loads prompts from markdown files and calls an OpenAI-compatible API.
"""

import os
import json
import re
import openai
from dotenv import load_dotenv

# Import required packages for Excel functionality
import pandas as pd
import xlsxwriter


def extract_json_from_response(response_text):
    """Extract JSON from LLM response that may contain explanatory text"""
    # Try to parse the entire response as JSON first
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass

    # Look for JSON code block
    json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Look for any JSON object in the response
    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    # If no valid JSON found, return None
    return None


def json_to_excel(json_data, output_dir="output"):
    """
    Convert JSON test cases to Excel format and save to file

    Args:
        json_data (dict): JSON data containing test cases
        output_dir (str): Directory to save the Excel file

    Returns:
        str: Path to the created Excel file or None if failed
    """
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

        # Extract test cases
        test_cases = json_data.get("test_cases", [])

        # Prepare data for DataFrame
        excel_data = []
        for case in test_cases:
            # Join steps with newline characters
            steps_str = "\n".join(case.get("steps", []))

            # Handle preconditions field (string or array)
            preconditions = case.get("preconditions", "")
            if isinstance(preconditions, list):
                preconditions_str = "\n".join(preconditions)
            else:
                preconditions_str = preconditions

            # Handle expected_result field (string or array)
            expected_result = case.get("expected_result", "")
            if isinstance(expected_result, list):
                expected_result_str = "\n".join(expected_result)
            else:
                expected_result_str = expected_result

            # Create row with required columns
            row = {
                "ID": case.get("id", ""),
                "用例名称": case.get("name", ""),
                "所属模块": case.get("module", ""),
                "前置条件": preconditions_str,
                "备注": case.get("remarks", ""),
                "步骤描述": steps_str,
                "预期结果": expected_result_str,
                "功能模块": case.get("functional_module", ""),
                "功能域": case.get("functional_domain", "")
            }
            excel_data.append(row)

        # Create DataFrame
        df = pd.DataFrame(excel_data)

        # Generate filename with functional module of the first test case and timestamp
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

        # Get functional module from the first test case
        functional_module = ""
        if test_cases and len(test_cases) > 0:
            functional_module = test_cases[0].get("functional_module", "")

        # If no functional module, use default name
        if not functional_module:
            functional_module = "test_cases"

        filename = f"{functional_module}_{timestamp}.xlsx"
        filepath = os.path.join(output_dir, filename)

        # Save to Excel with text wrap formatting
        with pd.ExcelWriter(filepath, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='TestCases')

            # Get the workbook and worksheet objects
            workbook = writer.book
            worksheet = writer.sheets['TestCases']

            # Create a text wrap format
            wrap_format = workbook.add_format({'text_wrap': True, 'valign': 'top'})

            # Apply text wrap format to the precondition, steps and expected result columns
            # Assuming "前置条件" is at column D (index 3), "步骤描述" is at column E (index 4) and "预期结果" is at column G (index 6)
            worksheet.set_column('D:D', 30, wrap_format)  # 前置条件 column
            worksheet.set_column('E:E', 30, wrap_format)  # 步骤描述 column
            worksheet.set_column('G:G', 30, wrap_format)  # 预期结果 column

            # Auto-adjust row heights for better visibility
            for i in range(len(df) + 1):  # +1 for header row
                worksheet.set_row(i, 30)  # Set row height to 30 pixels

        print(f"Excel file saved to: {filepath}")
        return filepath

    except Exception as e:
        print(f"Error converting JSON to Excel: {e}")
        return None


def main():
    """Main function to generate test cases"""
    # Load environment variables
    load_dotenv()

    # Get configuration from environment
    api_key = os.getenv('API_KEY')
    api_base_url = os.getenv('API_BASE_URL')
    model = os.getenv('MODEL')
    system_prompt_path = os.getenv('SYSTEM_PROMPT_PATH')
    requirements_prompt_path = os.getenv('REQUIREMENTS_PROMPT_PATH')

    # Validate configuration
    if not all([api_key, api_base_url, model, system_prompt_path, requirements_prompt_path]):
        print("Error: Missing required environment variables")
        return

    # Load prompts
    try:
        with open(system_prompt_path, 'r', encoding='utf-8') as f:
            system_prompt = f.read()

        with open(requirements_prompt_path, 'r', encoding='utf-8') as f:
            requirements_prompt = f.read()
    except FileNotFoundError as e:
        print(f"Error: Could not find prompt file - {e}")
        return
    except Exception as e:
        print(f"Error: Could not load prompt files - {e}")
        return

    # Initialize OpenAI client
    client = openai.OpenAI(
        api_key=api_key,
        base_url=api_base_url
    )

    # Call API
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": requirements_prompt}
            ],
            temperature=0.7,
            max_tokens=60000
        )

        # Extract and process response
        result = response.choices[0].message.content

        # Print the full response for debugging
        # print("=== Full Response ===")
        # print(f"Response: {result}")
        # print(f"Finish reason: {response.choices[0].finish_reason}")
        if hasattr(response, 'usage'):
            print(f"Usage: {response.usage}")
        print("=====================")

        # Try to extract JSON from the response
        json_result = extract_json_from_response(result)

        if json_result:
            # Pretty print the JSON result
            print("=== Extracted JSON ===")
            print(json.dumps(json_result, indent=2, ensure_ascii=False))

            # Save JSON to file
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            json_filename = f"test_cases_{timestamp}.json"
            json_filepath = os.path.join("output", json_filename)

            # Create output directory if it doesn't exist
            os.makedirs("output", exist_ok=True)

            # Save JSON to file
            with open(json_filepath, 'w', encoding='utf-8') as f:
                json.dump(json_result, f, indent=2, ensure_ascii=False)
            print(f"JSON file saved to: {json_filepath}")

            # Convert JSON to Excel
            print("\n=== Converting to Excel ===")
            excel_path = json_to_excel(json_result)
            if excel_path:
                print(f"Excel file created successfully: {excel_path}")
            else:
                print("Failed to create Excel file.")
        else:
            # If no JSON found, print the raw response
            print("Could not extract JSON from response:")
            print(result)

    except Exception as e:
        print(f"Error calling API: {e}")


if __name__ == "__main__":
    main()