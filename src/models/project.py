"""
Data models for project management.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class Project(BaseModel):
    """Project model for hierarchical business scenario management."""

    id: int = Field(..., description="Project ID")
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(default=None, description="Project description")
    is_active: bool = Field(default=True, description="Whether the project is active")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    """Model for creating new projects."""

    name: str = Field(..., min_length=1, max_length=100, description="Project name")
    description: Optional[str] = Field(default=None, max_length=500, description="Project description")
    is_active: bool = Field(default=True, description="Whether the project should be active")


class ProjectUpdate(BaseModel):
    """Model for updating existing projects."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=100, description="Project name")
    description: Optional[str] = Field(default=None, max_length=500, description="Project description")
    is_active: Optional[bool] = Field(default=None, description="Whether the project should be active")


class ProjectResponse(BaseModel):
    """Response model for project operations."""

    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    """Response model for project list operations."""

    projects: List[ProjectResponse] = Field(default_factory=list, description="List of projects")
    total: int = Field(..., description="Total number of projects")


class ProjectStats(BaseModel):
    """Statistics for a project."""

    project_id: int
    project_name: str
    test_case_groups_count: int = Field(default=0, description="Number of test case groups")
    test_cases_count: int = Field(default=0, description="Number of test cases")
    generation_jobs_count: int = Field(default=0, description="Number of generation jobs")
    knowledge_entities_count: int = Field(default=0, description="Number of knowledge entities")
    prompts_count: int = Field(default=0, description="Number of prompts")


class ProjectStatsResponse(BaseModel):
    """Response model for project statistics."""

    projects: List[ProjectStats] = Field(default_factory=list, description="Project statistics list")
    total_projects: int = Field(..., description="Total number of projects")