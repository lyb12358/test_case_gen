"""
Project management service using BaseService.
Demonstrates how to extend BaseService for standard CRUD operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session

from src.database.models import Project
from src.services.base_service import BaseService


class ProjectService(BaseService[Project]):
    """Service for project management operations."""

    def __init__(self, db: Session):
        """Initialize project service with Project model."""
        super().__init__(db, Project)

    def get_active_projects(self) -> List[Project]:
        """Get all active projects."""
        return self.get_all(is_active=True)

    def get_project_by_name(self, name: str) -> Optional[Project]:
        """Get project by name."""
        projects = self.get_all(name=name)
        return projects[0] if projects else None

    def create_project(self, name: str, description: Optional[str] = None) -> Project:
        """Create a new project with name validation."""
        # Check for duplicate name
        if self.exists(name=name):
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"项目名称 '{name}' 已存在"
            )

        return self.create(name=name, description=description)

    def update_project_status(self, project_id: int, is_active: bool) -> Project:
        """Update project active status."""
        return self.update(project_id, is_active=is_active)

    def search_projects(self, keyword: str) -> List[Project]:
        """Search projects by keyword in name or description."""
        projects = self.get_all()
        keyword_lower = keyword.lower()

        return [
            project for project in projects
            if keyword_lower in project.name.lower() or
               (project.description and keyword_lower in project.description.lower())
        ]