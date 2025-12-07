"""
Data models for test case representation.
"""

from typing import List, Optional, Union, Any
from pydantic import BaseModel, Field, field_validator
import json


print("=== TestCase MODULE LOADED ===")

class TestCase(BaseModel):
    """Test case model representing a single test case."""

    id: str = Field(..., description="Unique identifier for the test case")
    name: str = Field(..., description="Test case name/title")
    description: Optional[str] = Field(default=None, description="Test case description")
    module: str = Field(..., description="Module to which this test case belongs")
    preconditions: List[str] = Field(default_factory=list, description="Preconditions for the test")
    remarks: str = Field(default="", description="Additional remarks or notes")
    steps: List[str] = Field(default_factory=list, description="Test execution steps")
    expected_result: Union[str, List[str]] = Field(default="", description="Expected test results")
    functional_module: str = Field(default="", description="Functional module category")
    functional_domain: str = Field(default="", description="Functional domain category")
    test_case_id: Optional[str] = Field(default=None, description="Test case identifier like TC001")
    entity_order: Optional[float] = Field(default=None, description="Entity order for sorting")

    @field_validator('steps', mode='before')
    @classmethod
    def convert_steps_to_list(cls, v: Any) -> List[str]:
        """Convert various step formats to List[str]."""
        if not v:
            return []

        if isinstance(v, list):
            result = []
            for item in v:
                if isinstance(item, dict):
                    # Extract action from complex step objects
                    if 'action' in item:
                        action = item['action']
                        expected = item.get('expected', '')
                        if expected:
                            result.append(f"{action} (期望: {expected})")
                        else:
                            result.append(action)
                    elif 'step' in item:
                        result.append(str(item['step']))
                    elif 'description' in item:
                        result.append(str(item['description']))
                    else:
                        # Fallback: convert dict to string
                        result.append(str(item))
                else:
                    result.append(str(item))
            return result
        elif isinstance(v, str):
            try:
                # Try to parse as JSON
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    # Recursively process the parsed list
                    return cls.convert_steps_to_list(parsed)
                else:
                    return [str(parsed)]
            except json.JSONDecodeError:
                # Treat as single step if not valid JSON
                return [v]
        else:
            # Single value
            return [str(v)]

    @field_validator('expected_result', mode='before')
    @classmethod
    def convert_expected_result_to_string(cls, v: Any) -> str:
        """Convert various expected result formats to string."""
        if not v:
            return ""

        if isinstance(v, list):
            # Join multiple results with newlines
            return "\n".join(str(item) for item in v if item)
        elif isinstance(v, str):
            try:
                # Try to parse as JSON
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return "\n".join(str(item) for item in parsed if item)
                else:
                    return str(parsed)
            except json.JSONDecodeError:
                return v
        else:
            # Single value
            return str(v)

    @field_validator('preconditions', mode='before')
    @classmethod
    def convert_preconditions_to_list(cls, v: Any) -> List[str]:
        """Convert various precondition formats to List[str]."""
        if not v:
            return []

        if isinstance(v, list):
            # Ensure all items are strings
            return [str(item) for item in v if item]
        elif isinstance(v, str):
            try:
                # Try to parse as JSON
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(item) for item in parsed if item]
                else:
                    return [str(parsed)]
            except json.JSONDecodeError:
                # Check if comma-separated
                if ',' in v:
                    return [item.strip() for item in v.split(',') if item.strip()]
                else:
                    return [v] if v.strip() else []
        else:
            # Single value
            return [str(v)]


class TestCaseCollection(BaseModel):
    """Collection of test cases with metadata."""

    test_cases: List[TestCase] = Field(default_factory=list, description="List of test cases")

    def add_test_case(self, test_case: TestCase) -> None:
        """Add a test case to the collection."""
        self.test_cases.append(test_case)

    def get_test_case_by_id(self, test_id: str) -> Optional[TestCase]:
        """Get a test case by its ID."""
        for case in self.test_cases:
            if case.id == test_id:
                return case
        return None

    def get_test_cases_by_module(self, module: str) -> List[TestCase]:
        """Get all test cases belonging to a specific module."""
        return [case for case in self.test_cases if case.module == module]


class ExcelRow(BaseModel):
    """Model representing a row in the Excel output."""

    ID: str = Field(default="", description="Test case ID")
    用例名称: str = Field(default="", description="Test case name")
    所属模块: str = Field(default="", description="Module")
    前置条件: str = Field(default="", description="Preconditions")
    备注: str = Field(default="", description="Remarks")
    步骤描述: str = Field(default="", description="Test steps")
    预期结果: str = Field(default="", description="Expected results")
    功能模块: str = Field(default="", description="Functional module")
    功能域: str = Field(default="", description="Functional domain")