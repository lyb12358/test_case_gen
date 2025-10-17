"""
Data models for test case representation.
"""

from typing import List, Optional, Union
from pydantic import BaseModel, Field


class TestCase(BaseModel):
    """Test case model representing a single test case."""

    id: str = Field(..., description="Unique identifier for the test case")
    name: str = Field(..., description="Test case name/title")
    description: Optional[str] = Field(default=None, description="Test case description")
    module: str = Field(..., description="Module to which this test case belongs")
    preconditions: Union[str, List[str]] = Field(default="", description="Preconditions for the test")
    remarks: str = Field(default="", description="Additional remarks or notes")
    steps: List[str] = Field(default_factory=list, description="Test execution steps")
    expected_result: Union[str, List[str]] = Field(default="", description="Expected test results")
    functional_module: str = Field(default="", description="Functional module category")
    functional_domain: str = Field(default="", description="Functional domain category")
    test_case_id: Optional[str] = Field(default=None, description="Test case identifier like TC001")
    entity_order: Optional[float] = Field(default=None, description="Entity order for sorting")


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