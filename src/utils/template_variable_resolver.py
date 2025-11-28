"""
Template Variable Resolver

This module provides functionality to resolve and process template variables
used in prompt generation for test cases and test points.
"""

import logging
import json
from typing import Dict, Any, Optional, List

from ..database.database import DatabaseManager
from ..database.models import UnifiedTestCase, BusinessType
from ..utils.config import Config

logger = logging.getLogger(__name__)


class TemplateVariableResolver:
    """
    Resolves template variables used in prompt generation based on AI generation endpoints.

    Supports 3 core variable types:
    - user_input: User provided input from endpoint additional_context parameter
    - test_points: Test points data from endpoint parameters or database queries
    - test_cases: Test cases data from database based on business_type and project_id
    """

    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db_manager = db_manager or DatabaseManager(Config())

    def resolve_variables(self, business_type: str, project_id: Optional[int] = None,
                         endpoint_params: Optional[Dict[str, Any]] = None,
                         generation_stage: Optional[str] = None) -> Dict[str, Any]:
        """
        Resolve template variables for a given business type based on endpoint parameters and generation stage.

        Args:
            business_type: The business type to resolve variables for
            project_id: Project ID from endpoint (optional)
            endpoint_params: Parameters from AI generation endpoints
            generation_stage: Generation stage ('test_point' or 'test_case') (optional)

        Returns:
            Dictionary of resolved template variables with 3 core variables
        """
        variables = {}

        # 1. user_input - from endpoint additional_context
        additional_context = endpoint_params.get('additional_context') if endpoint_params else None
        user_input = self._extract_user_input(additional_context)
        variables['user_input'] = user_input

        # 2. test_points - based on endpoint parameters
        test_points_data = self._get_test_points_from_endpoint(business_type, project_id, endpoint_params)
        variables['test_points'] = json.dumps(test_points_data, ensure_ascii=False, indent=2)

        # 3. test_cases - from database based on business_type, project_id and generation stage
        test_cases_data = self._get_test_cases_from_database(business_type, project_id, generation_stage)
        variables['test_cases'] = json.dumps(test_cases_data, ensure_ascii=False, indent=2)

        logger.debug(f"Resolved 3 variables for business_type: {business_type}, project_id: {project_id}")
        return variables

    def _extract_user_input(self, additional_context: Optional[Dict[str, Any]]) -> str:
        """
        Extract user input from additional_context.

        Args:
            additional_context: Additional context from endpoint

        Returns:
            User input string
        """
        if not additional_context:
            return ""

        # Try to get user_input directly
        if 'user_input' in additional_context:
            return str(additional_context['user_input'])

        # Fall back to converting the entire context to string for simplicity
        try:
            return json.dumps(additional_context, ensure_ascii=False)
        except (TypeError, ValueError):
            return str(additional_context) if additional_context else ""

    def _get_test_points_from_endpoint(self, business_type: str, project_id: Optional[int],
                                     endpoint_params: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Get test points data based on endpoint parameters.

        Args:
            business_type: The business type
            project_id: Project ID (optional)
            endpoint_params: Parameters from AI generation endpoints

        Returns:
            List of test point dictionaries
        """
        if not endpoint_params:
            return []

        # Scenario 1: test_point_ids → database query
        if 'test_point_ids' in endpoint_params and endpoint_params['test_point_ids']:
            return self._get_test_points_by_ids(endpoint_params['test_point_ids'], business_type)

        # Scenario 2: test_points → use directly from endpoint
        if 'test_points' in endpoint_params and endpoint_params['test_points']:
            return endpoint_params['test_points']

        # Scenario 3: test_points_data → extract from nested structure
        if 'test_points_data' in endpoint_params and endpoint_params['test_points_data']:
            test_points_data = endpoint_params['test_points_data']
            if 'test_points' in test_points_data:
                return test_points_data['test_points']

        # Scenario 4: get from current business data if project_id is available
        if project_id:
            return self._get_business_test_points(business_type, project_id)

        return []

    def _get_test_cases_from_database(self, business_type: str, project_id: Optional[int],
                                 generation_stage: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get test cases data from database based on business type, project ID and generation stage.
        Only returns data in test_case generation stage, not in test_point generation stage.

        Args:
            business_type: The business type
            project_id: Project ID (optional)
            generation_stage: Generation stage ('test_point' or 'test_case') (optional)

        Returns:
            List of test case dictionaries
        """
        # Only return test_cases data in test_case generation stage
        # In test_point generation stage, test_cases should be empty as per business logic
        if generation_stage != 'test_case':
            logger.debug(f"Skipping test_cases retrieval for generation_stage: {generation_stage}")
            return []

        if not project_id:
            return []

        try:
            with self.db_manager.get_session() as db:
                # Convert string to enum if needed
                if isinstance(business_type, str):
                    try:
                        business_type_enum = BusinessType(business_type)
                    except ValueError:
                        logger.warning(f"Invalid business type: {business_type}")
                        return []
                else:
                    business_type_enum = business_type

                # Get test cases for this business type and project
                test_cases = db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.business_type == business_type_enum,
                    UnifiedTestCase.project_id == project_id,
                    UnifiedTestCase.steps.isnot(None)  # Test cases have steps, test points don't
                ).all()

                # Convert to dictionary format
                test_cases_data = []
                for tc in test_cases:
                    tc_dict = {
                        'id': tc.id,
                        'test_case_id': tc.test_case_id,
                        'name': tc.name,
                        'description': tc.description,
                        'module': tc.module,
                        'functional_module': tc.functional_module,
                        'functional_domain': tc.functional_domain,
                        'preconditions': tc.preconditions,
                        'steps': tc.steps,
                        'expected_result': tc.expected_result,
                        'remarks': tc.remarks,
                        'priority': tc.priority,
                        'business_type': tc.business_type.value if tc.business_type else None,
                        'project_id': tc.project_id,
                        'created_at': tc.created_at.isoformat() if tc.created_at else None,
                        'updated_at': tc.updated_at.isoformat() if tc.updated_at else None
                    }
                    test_cases_data.append(tc_dict)

                return test_cases_data

        except Exception as e:
            logger.error(f"Failed to get test cases for {business_type}, project {project_id}: {e}")
            return []

    def _get_test_points_by_ids(self, test_point_ids: List[int], business_type: str) -> List[Dict[str, Any]]:
        """
        Get test points by their IDs from database.

        Args:
            test_point_ids: List of test point IDs
            business_type: The business type for validation

        Returns:
            List of test point dictionaries
        """
        if not test_point_ids:
            return []

        try:
            with self.db_manager.get_session() as db:
                # Convert string to enum if needed
                if isinstance(business_type, str):
                    try:
                        business_type_enum = BusinessType(business_type)
                    except ValueError:
                        logger.warning(f"Invalid business type: {business_type}")
                        return []
                else:
                    business_type_enum = business_type

                # Get test points by IDs and business type
                test_points = db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.id.in_(test_point_ids),
                    UnifiedTestCase.business_type == business_type_enum,
                    UnifiedTestCase.steps.is_(None)  # Test points don't have steps
                ).all()

                # Convert to dictionary format
                test_points_data = []
                for tp in test_points:
                    tp_dict = {
                        'id': tp.id,
                        'test_point_id': tp.test_case_id,  # Using test_case_id as test_point_id
                        'title': tp.name,
                        'description': tp.description,
                        'module': tp.module,
                        'functional_module': tp.functional_module,
                        'functional_domain': tp.functional_domain,
                        'priority': tp.priority,
                        'business_type': tp.business_type.value if tp.business_type else None,
                        'project_id': tp.project_id,
                        'created_at': tp.created_at.isoformat() if tp.created_at else None,
                        'updated_at': tp.updated_at.isoformat() if tp.updated_at else None
                    }
                    test_points_data.append(tp_dict)

                return test_points_data

        except Exception as e:
            logger.error(f"Failed to get test points by IDs for {business_type}: {e}")
            return []

    def _get_business_test_points(self, business_type: str, project_id: int) -> List[Dict[str, Any]]:
        """
        Get test points for a business type and project.

        Args:
            business_type: The business type
            project_id: Project ID

        Returns:
            List of test point dictionaries
        """
        try:
            with self.db_manager.get_session() as db:
                # Convert string to enum if needed
                if isinstance(business_type, str):
                    try:
                        business_type_enum = BusinessType(business_type)
                    except ValueError:
                        logger.warning(f"Invalid business type: {business_type}")
                        return []
                else:
                    business_type_enum = business_type

                # Get test points for this business type and project
                test_points = db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.business_type == business_type_enum,
                    UnifiedTestCase.project_id == project_id,
                    UnifiedTestCase.steps.is_(None)  # Test points don't have steps
                ).all()

                # Convert to dictionary format
                test_points_data = []
                for tp in test_points:
                    tp_dict = {
                        'id': tp.id,
                        'test_point_id': tp.test_case_id,
                        'title': tp.name,
                        'description': tp.description,
                        'module': tp.module,
                        'functional_module': tp.functional_module,
                        'functional_domain': tp.functional_domain,
                        'priority': tp.priority,
                        'business_type': tp.business_type.value if tp.business_type else None,
                        'project_id': tp.project_id,
                        'created_at': tp.created_at.isoformat() if tp.created_at else None,
                        'updated_at': tp.updated_at.isoformat() if tp.updated_at else None
                    }
                    test_points_data.append(tp_dict)

                return test_points_data

        except Exception as e:
            logger.error(f"Failed to get business test points for {business_type}, project {project_id}: {e}")
            return []


      

