"""
Comprehensive tests for project hierarchy functionality.

This module tests:
- Project CRUD operations
- Project-based data filtering
- Backward compatibility
- API endpoints with project context
- Database operations with project filtering
"""

import pytest
import json
from typing import Optional, Dict, Any
from unittest.mock import Mock, patch, MagicMock

# Import test dependencies
from src.database.models import (
    Project, UnifiedTestCase, GenerationJob, BusinessType,
    EntityType
)
from src.database.operations import DatabaseOperations
from src.api.endpoints import validate_project_id
from src.core.test_case_generator import TestCaseGenerator
from src.utils.config import Config


class TestProjectValidation:
    """Test project validation utility functions."""

    def test_validate_project_id_with_valid_id(self, db_session):
        """Test validation with a valid project ID."""
        # Create a test project
        project = Project(
            name="Test Project",
            description="Test project for validation",
            is_active=True
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)

        # Test validation
        validated_project = validate_project_id(project.id, db_session, use_default=False)
        assert validated_project is not None
        assert validated_project.id == project.id
        assert validated_project.name == "Test Project"

    def test_validate_project_id_with_invalid_id(self, db_session):
        """Test validation with an invalid project ID."""
        with pytest.raises(Exception) as exc_info:
            validate_project_id(99999, db_session, use_default=False)
        assert "not found" in str(exc_info.value)

    def test_validate_project_id_with_none_and_default_enabled(self, db_session):
        """Test validation with None and default project enabled."""
        # This should create the default project
        validated_project = validate_project_id(None, db_session, use_default=True)
        assert validated_project is not None
        assert validated_project.name == "远控场景"

    def test_validate_project_id_with_none_and_default_disabled(self, db_session):
        """Test validation with None and default project disabled."""
        validated_project = validate_project_id(None, db_session, use_default=False)
        assert validated_project is None


class TestProjectCRUD:
    """Test project CRUD operations."""

    def test_create_project(self, db_session):
        """Test creating a new project."""
        db_ops = DatabaseOperations(db_session)

        project = db_ops.create_project(
            name="New Test Project",
            description="A new test project",
            is_active=True
        )

        assert project is not None
        assert project.id is not None
        assert project.name == "New Test Project"
        assert project.description == "A new test project"
        assert project.is_active is True

    def test_get_project(self, db_session):
        """Test retrieving a project by ID."""
        db_ops = DatabaseOperations(db_session)

        # Create a project first
        created_project = db_ops.create_project(
            name="Get Test Project",
            description="Project for get test"
        )

        # Retrieve the project
        retrieved_project = db_ops.get_project(created_project.id)

        assert retrieved_project is not None
        assert retrieved_project.id == created_project.id
        assert retrieved_project.name == "Get Test Project"

    def test_get_all_projects(self, db_session):
        """Test retrieving all projects."""
        db_ops = DatabaseOperations(db_session)

        # Create multiple projects
        project1 = db_ops.create_project("Project 1", "First project")
        project2 = db_ops.create_project("Project 2", "Second project")

        # Retrieve all projects
        all_projects = db_ops.get_all_projects()

        assert len(all_projects) >= 2
        project_names = [p.name for p in all_projects]
        assert "Project 1" in project_names
        assert "Project 2" in project_names

    def test_update_project(self, db_session):
        """Test updating a project."""
        db_ops = DatabaseOperations(db_session)

        # Create a project
        project = db_ops.create_project("Original Name", "Original description")

        # Update the project
        updated_project = db_ops.update_project(
            project.id,
            name="Updated Name",
            description="Updated description",
            is_active=False
        )

        assert updated_project is not None
        assert updated_project.name == "Updated Name"
        assert updated_project.description == "Updated description"
        assert updated_project.is_active is False

    def test_delete_project_soft(self, db_session):
        """Test soft deleting a project."""
        db_ops = DatabaseOperations(db_session)

        # Create a project
        project = db_ops.create_project("Delete Test Project", "To be deleted")

        # Soft delete
        success = db_ops.delete_project(project.id, soft_delete=True)
        assert success is True

        # Check that project is deactivated
        deleted_project = db_ops.get_project(project.id)
        assert deleted_project is None or deleted_project.is_active is False

    def test_delete_project_hard(self, db_session):
        """Test hard deleting a project."""
        db_ops = DatabaseOperations(db_session)

        # Create a project
        project = db_ops.create_project("Hard Delete Test", "To be hard deleted")
        project_id = project.id

        # Hard delete
        success = db_ops.delete_project(project_id, soft_delete=False)
        assert success is True

        # Check that project is completely deleted
        deleted_project = db_ops.get_project(project_id)
        assert deleted_project is None

    def test_get_or_create_default_project(self, db_session):
        """Test getting or creating the default project."""
        db_ops = DatabaseOperations(db_session)

        # First call should create the default project
        default_project1 = db_ops.get_or_create_default_project()
        assert default_project1 is not None
        assert default_project1.name == "远控场景"

        # Second call should return the existing default project
        default_project2 = db_ops.get_or_create_default_project()
        assert default_project2.id == default_project1.id

    def test_get_project_stats(self, db_session):
        """Test getting project statistics."""
        db_ops = DatabaseOperations(db_session)

        # Create a project
        project = db_ops.create_project("Stats Test Project", "For stats testing")

        # Get stats
        stats = db_ops.get_project_stats(project.id)

        assert isinstance(stats, dict)
        assert 'unified_test_cases' in stats  # Updated from test_case_groups
        assert 'test_points' in stats  # Updated from test_case_items
        assert 'generation_jobs' in stats
        assert 'knowledge_entities' in stats
        assert 'knowledge_relations' in stats
        assert 'prompts' in stats


class TestProjectBasedFiltering:
    """Test project-based data filtering."""

    def test_generation_job_with_project(self, db_session):
        """Test creating generation job with project context."""
        db_ops = DatabaseOperations(db_session)

        # Create a project
        project = db_ops.create_project("Generation Test Project", "For generation testing")

        # Create generation job with project
        job = db_ops.create_generation_job("test-job-123", BusinessType.RCC, project.id)

        assert job is not None
        assert job.project_id == project.id
        assert job.business_type == BusinessType.RCC

    def test_unified_test_case_with_project(self, db_session):
        """Test creating unified test case with project context."""
        db_ops = DatabaseOperations(db_session)

        # Create a project
        project = db_ops.create_project("Unified TC Test Project", "For unified test case testing")

        # Create unified test case with project
        test_case_data = {
            "title": "Test Case with Project",
            "description": "Test case created with project context",
            "business_type": BusinessType.RCC,
            "project_id": project.id,
            "status": "draft"
        }

        test_case = db_ops.create_unified_test_case(test_case_data)

        assert test_case is not None
        assert test_case.project_id == project.id
        assert test_case.business_type == BusinessType.RCC

    def test_knowledge_graph_data_with_project_filtering(self, db_session):
        """Test knowledge graph data with project filtering."""
        db_ops = DatabaseOperations(db_session)

        # Create projects
        project1 = db_ops.create_project("KG Test Project 1", "For knowledge graph testing")
        project2 = db_ops.create_project("KG Test Project 2", "For knowledge graph testing")

        # Create knowledge entities for different projects
        entity1 = db_ops.create_knowledge_entity(
            "Test Entity 1",
            EntityType.BUSINESS,
            "Test entity for project 1",
            BusinessType.RCC,
            project_id=project1.id
        )

        entity2 = db_ops.create_knowledge_entity(
            "Test Entity 2",
            EntityType.BUSINESS,
            "Test entity for project 2",
            BusinessType.RFD,
            project_id=project2.id
        )

        # Test filtering by project
        graph_data_project1 = db_ops.get_knowledge_graph_data(project_id=project1.id)
        graph_data_project2 = db_ops.get_knowledge_graph_data(project_id=project2.id)

        # Should only return entities for the specified project
        node_names_project1 = [node["name"] for node in graph_data_project1["nodes"]]
        node_names_project2 = [node["name"] for node in graph_data_project2["nodes"]]

        assert "Test Entity 1" in node_names_project1
        assert "Test Entity 2" not in node_names_project1

        assert "Test Entity 2" in node_names_project2
        assert "Test Entity 1" not in node_names_project2

    def test_get_knowledge_entities_by_project(self, db_session):
        """Test retrieving knowledge entities by project."""
        db_ops = DatabaseOperations(db_session)

        # Create projects
        project1 = db_ops.create_project("Entity Test Project 1", "For entity testing")
        project2 = db_ops.create_project("Entity Test Project 2", "For entity testing")

        # Create entities for different projects
        entity1 = db_ops.create_knowledge_entity(
            "Project 1 Entity",
            EntityType.BUSINESS,
            "Entity in project 1",
            BusinessType.RCC,
            project_id=project1.id
        )

        entity2 = db_ops.create_knowledge_entity(
            "Project 2 Entity",
            EntityType.BUSINESS,
            "Entity in project 2",
            BusinessType.RFD,
            project_id=project2.id
        )

        # Test retrieval by project
        entities_project1 = db_ops.get_knowledge_entities_by_project(project1.id)
        entities_project2 = db_ops.get_knowledge_entities_by_project(project2.id)

        assert len(entities_project1) == 1
        assert len(entities_project2) == 1
        assert entities_project1[0].name == "Project 1 Entity"
        assert entities_project2[0].name == "Project 2 Entity"


class TestBackwardCompatibility:
    """Test backward compatibility with existing API calls."""

    def test_api_calls_without_project_id_use_default(self, db_session):
        """Test that API calls without project_id use default project."""
        db_ops = DatabaseOperations(db_session)

        # Ensure default project exists
        default_project = db_ops.get_or_create_default_project()

        # Create generation job without project_id (should use default)
        job = db_ops.create_generation_job("backward-compat-test", BusinessType.RCC)

        assert job.project_id == default_project.id

    def test_mixed_api_calls_with_and_without_project_id(self, db_session):
        """Test mixed API calls with and without project_id."""
        db_ops = DatabaseOperations(db_session)

        # Ensure default project exists
        default_project = db_ops.get_or_create_default_project()

        # Create custom project
        custom_project = db_ops.create_project("Custom Project", "For backward compatibility test")

        # Create jobs with and without project_id
        job_default = db_ops.create_generation_job("job-default", BusinessType.RCC)
        job_custom = db_ops.create_generation_job("job-custom", BusinessType.RFD, custom_project.id)

        assert job_default.project_id == default_project.id
        assert job_custom.project_id == custom_project.id


class TestProjectHierarchyIntegration:
    """Integration tests for project hierarchy functionality."""

    @patch('src.llm.llm_client.LLMClient')
    def test_test_case_generation_with_project_context(self, mock_llm_client, db_session):
        """Test complete test case generation with project context."""
        # Setup mock LLM response
        mock_llm_instance = Mock()
        mock_llm_instance.generate_response.return_value = '''
        {
            "business_scenario": "Remote Climate Control",
            "test_cases": [
                {
                    "case_id": "TC001",
                    "description": "Test RCC activation",
                    "preconditions": ["Vehicle parked"],
                    "steps": ["Send RCC command"],
                    "expected_result": "AC activates successfully"
                }
            ]
        }
        '''
        mock_llm_client.return_value = mock_llm_instance

        # Create project
        db_ops = DatabaseOperations(db_session)
        project = db_ops.create_project("Integration Test Project", "For integration testing")

        # Create test case generator
        config = Mock()
        config.api_key = "test-key"
        config.model = "gpt-4"
        config.database_url = "sqlite:///:memory:"

        generator = TestCaseGenerator(config)

        # Mock database manager to use our test session
        with patch.object(generator, 'db_manager') as mock_db_manager:
            mock_db_manager.get_session.return_value.__enter__.return_value = db_session

            # Generate test cases with project context
            test_cases_data = generator.generate_test_cases_for_business("RCC")

            # Save with project context
            success = generator.save_to_database(test_cases_data, "RCC", project.id)

            assert success is True

            # Verify data was saved with correct project context
            test_cases = db_session.query(UnifiedTestCase).filter(
                UnifiedTestCase.project_id == project.id
            ).all()

            assert len(test_cases) >= 1
            # Check that at least one test case has the correct business type and project
            rcc_test_cases = [tc for tc in test_cases if tc.business_type == BusinessType.RCC]
            assert len(rcc_test_cases) >= 1
            assert rcc_test_cases[0].project_id == project.id

    def test_project_data_isolation(self, db_session):
        """Test that data is properly isolated between projects."""
        db_ops = DatabaseOperations(db_session)

        # Create two projects
        project1 = db_ops.create_project("Isolation Test Project 1", "First isolation test")
        project2 = db_ops.create_project("Isolation Test Project 2", "Second isolation test")

        # Create unified test cases for each project (replacing test case groups)
        test_case1 = db_ops.create_unified_test_case({
            "title": "Test Case for Project 1",
            "description": "Test case in project 1",
            "business_type": BusinessType.RCC,
            "project_id": project1.id
        })
        test_case2 = db_ops.create_unified_test_case({
            "title": "Test Case for Project 2",
            "description": "Test case in project 2",
            "business_type": BusinessType.RFD,
            "project_id": project2.id
        })

        # Create generation jobs for each project
        job1 = db_ops.create_generation_job("job-1", BusinessType.RCC, project1.id)
        job2 = db_ops.create_generation_job("job-2", BusinessType.RFD, project2.id)

        # Test data isolation - using UnifiedTestCase instead of TestCaseGroup
        project1_test_cases = db_session.query(UnifiedTestCase).filter(
            UnifiedTestCase.project_id == project1.id
        ).all()

        project2_test_cases = db_session.query(UnifiedTestCase).filter(
            UnifiedTestCase.project_id == project2.id
        ).all()

        project1_jobs = db_session.query(GenerationJob).filter(
            GenerationJob.project_id == project1.id
        ).all()

        project2_jobs = db_session.query(GenerationJob).filter(
            GenerationJob.project_id == project2.id
        ).all()

        # Verify isolation
        assert len(project1_test_cases) == 1
        assert len(project2_test_cases) == 1
        assert len(project1_jobs) == 1
        assert len(project2_jobs) == 1

        assert project1_test_cases[0].id != project2_test_cases[0].id
        assert project1_jobs[0].id != project2_jobs[0].id


# Fixtures for test setup
@pytest.fixture
def db_session():
    """Create a test database session."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from src.database.models import Base

    # Use in-memory SQLite for testing
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    yield session

    session.close()


class TestProjectAPIEndpoints:
    """Test project API endpoints."""

    def test_create_project_endpoint(self, client):
        """Test the create project API endpoint."""
        project_data = {
            "name": "API Test Project",
            "description": "Project created via API",
            "is_active": True
        }

        response = client.post("/projects", json=project_data)
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == "API Test Project"
        assert data["description"] == "Project created via API"
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data

    def test_get_projects_endpoint(self, client):
        """Test the get projects API endpoint."""
        # Create a project first
        project_data = {
            "name": "List Test Project",
            "description": "Project for listing test"
        }
        client.post("/projects", json=project_data)

        # Get all projects
        response = client.get("/projects")
        assert response.status_code == 200

        data = response.json()
        assert "projects" in data
        assert "total_projects" in data
        assert len(data["projects"]) >= 1

    def test_get_project_by_id_endpoint(self, client):
        """Test the get project by ID API endpoint."""
        # Create a project first
        project_data = {
            "name": "Get By ID Test Project",
            "description": "Project for get by ID test"
        }
        create_response = client.post("/projects", json=project_data)
        project_id = create_response.json()["id"]

        # Get project by ID
        response = client.get(f"/projects/{project_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == project_id
        assert data["name"] == "Get By ID Test Project"

    def test_update_project_endpoint(self, client):
        """Test the update project API endpoint."""
        # Create a project first
        project_data = {
            "name": "Original Name",
            "description": "Original description"
        }
        create_response = client.post("/projects", json=project_data)
        project_id = create_response.json()["id"]

        # Update the project
        update_data = {
            "name": "Updated Name",
            "description": "Updated description"
        }
        response = client.put(f"/projects/{project_id}", json=update_data)
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["description"] == "Updated description"

    def test_project_stats_endpoint(self, client):
        """Test the project statistics API endpoint."""
        # Create a project first
        project_data = {
            "name": "Stats Test Project",
            "description": "Project for stats testing"
        }
        create_response = client.post("/projects", json=project_data)
        project_id = create_response.json()["id"]

        # Get project stats
        response = client.get(f"/projects/{project_id}/stats")
        assert response.status_code == 200

        data = response.json()
        assert "projects" in data
        assert "total_projects" in data
        assert len(data["projects"]) == 1

        project_stats = data["projects"][0]
        assert project_stats["project_id"] == project_id
        assert project_stats["project_name"] == "Stats Test Project"

    def test_business_types_with_project_context(self, client):
        """Test business types endpoints with project context."""
        # Create a project first
        project_data = {
            "name": "Business Types Test Project",
            "description": "Project for business types testing"
        }
        create_response = client.post("/projects", json=project_data)
        project_id = create_response.json()["id"]

        # Test business types with project context
        response = client.get("/business-types?project_id={project_id}")
        assert response.status_code == 200

        data = response.json()
        assert "business_types" in data
        assert isinstance(data["business_types"], list)

    def test_knowledge_graph_with_project_filtering(self, client):
        """Test knowledge graph endpoint with project filtering."""
        # Create a project first
        project_data = {
            "name": "KG Test Project",
            "description": "Project for knowledge graph testing"
        }
        create_response = client.post("/projects", json=project_data)
        project_id = create_response.json()["id"]

        # Test knowledge graph with project filtering
        response = client.get(f"/knowledge-graph/data?project_id={project_id}")
        assert response.status_code == 200

        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert isinstance(data["nodes"], list)
        assert isinstance(data["edges"], list)


if __name__ == "__main__":
    pytest.main([__file__])