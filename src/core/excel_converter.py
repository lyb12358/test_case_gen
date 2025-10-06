"""
Excel conversion utilities for test cases.
"""

import os
import pandas as pd
import xlsxwriter
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..models.test_case import TestCase, ExcelRow
from ..utils.file_handler import ensure_directory_exists, generate_timestamped_filename


class ExcelConverter:
    """Utility class for converting test cases to Excel format."""

    @staticmethod
    def test_cases_to_excel_rows(test_cases: List[TestCase]) -> List[ExcelRow]:
        """
        Convert test cases to Excel row format.

        Args:
            test_cases (List[TestCase]): List of test cases

        Returns:
            List[ExcelRow]: List of Excel rows
        """
        excel_data = []
        for case in test_cases:
            # Join steps with newline characters
            steps_str = "\n".join(case.steps)

            # Handle preconditions field (string or array)
            preconditions = case.preconditions
            if isinstance(preconditions, list):
                preconditions_str = "\n".join(preconditions)
            else:
                preconditions_str = preconditions

            # Handle expected_result field (string or array)
            expected_result = case.expected_result
            if isinstance(expected_result, list):
                expected_result_str = "\n".join(expected_result)
            else:
                expected_result_str = expected_result

            # Create Excel row
            row = ExcelRow(
                ID=case.id,
                用例名称=case.name,
                所属模块=case.module,
                前置条件=preconditions_str,
                备注=case.remarks,
                步骤描述=steps_str,
                预期结果=expected_result_str,
                功能模块=case.functional_module,
                功能域=case.functional_domain
            )
            excel_data.append(row)

        return excel_data

    @staticmethod
    def generate_excel_filename(test_cases: List[TestCase], output_dir: str) -> str:
        """
        Generate filename for Excel output.

        Args:
            test_cases (List[TestCase]): List of test cases
            output_dir (str): Output directory

        Returns:
            str: Full file path for the Excel file
        """
        # Get functional module from the first test case
        functional_module = ""
        if test_cases:
            functional_module = test_cases[0].functional_module

        # If no functional module, use default name
        if not functional_module:
            functional_module = "test_cases"

        filename = generate_timestamped_filename(functional_module, "xlsx")
        return os.path.join(output_dir, filename)

    @staticmethod
    def create_excel_with_formatting(excel_rows: List[ExcelRow], filepath: str) -> bool:
        """
        Create Excel file with text wrap formatting.

        Args:
            excel_rows (List[ExcelRow]): List of Excel rows
            filepath (str): Output file path

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Convert rows to DataFrame
            data = [row.model_dump() for row in excel_rows]
            df = pd.DataFrame(data)

            # Save to Excel with text wrap formatting
            with pd.ExcelWriter(filepath, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='TestCases')

                # Get the workbook and worksheet objects
                workbook = writer.book
                worksheet = writer.sheets['TestCases']

                # Create a text wrap format
                wrap_format = workbook.add_format({'text_wrap': True, 'valign': 'top'})

                # Apply text wrap format to columns that need it
                # 前置条件 column (D), 步骤描述 column (F), 预期结果 column (G)
                worksheet.set_column('D:D', 30, wrap_format)  # 前置条件
                worksheet.set_column('F:F', 30, wrap_format)  # 步骤描述
                worksheet.set_column('G:G', 30, wrap_format)  # 预期结果

                # Auto-adjust row heights for better visibility
                for i in range(len(df) + 1):  # +1 for header row
                    worksheet.set_row(i, 30)  # Set row height to 30 pixels

            return True

        except Exception as e:
            print(f"Error creating Excel file: {e}")
            return False

    @staticmethod
    def convert_json_to_excel(json_data: Dict[str, Any], output_dir: str = "output") -> Optional[str]:
        """
        Convert JSON test cases to Excel format and save to file.

        Args:
            json_data (Dict[str, Any]): JSON data containing test cases
            output_dir (str): Directory to save the Excel file

        Returns:
            Optional[str]: Path to the created Excel file or None if failed
        """
        try:
            # Create output directory if it doesn't exist
            ensure_directory_exists(output_dir)

            # Extract test cases
            test_cases_data = json_data.get("test_cases", [])

            # Convert to TestCase objects
            test_cases = []
            for case_data in test_cases_data:
                try:
                    test_case = TestCase(**case_data)
                    test_cases.append(test_case)
                except Exception as e:
                    print(f"Error parsing test case {case_data.get('id', 'unknown')}: {e}")
                    continue

            if not test_cases:
                print("No valid test cases found in JSON data")
                return None

            # Convert to Excel rows
            excel_rows = ExcelConverter.test_cases_to_excel_rows(test_cases)

            # Generate filename
            filepath = ExcelConverter.generate_excel_filename(test_cases, output_dir)

            # Create Excel file with formatting
            if ExcelConverter.create_excel_with_formatting(excel_rows, filepath):
                print(f"Excel file saved to: {filepath}")
                return filepath
            else:
                return None

        except Exception as e:
            print(f"Error converting JSON to Excel: {e}")
            return None