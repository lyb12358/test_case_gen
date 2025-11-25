# -*- coding: utf-8 -*-
"""
Name validation service for checking uniqueness of test points and test cases.
"""

from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy import text
from ..database.database import DatabaseManager
from ..database.models import BusinessType
import logging

logger = logging.getLogger(__name__)


class NameValidationService:
    """
    Service for validating name uniqueness in test points and test cases.
    """

    def __init__(self, db_manager: DatabaseManager):
        """
        Initialize the name validation service.

        Args:
            db_manager (DatabaseManager): Database manager instance
        """
        self.db_manager = db_manager

    def validate_test_point_name_uniqueness(
        self,
        business_type: str,
        name: str,
        exclude_id: Optional[int] = None
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Validate test point name uniqueness within the same business type.

        Args:
            business_type (str): Business type code
            name (str): Test point name to validate
            exclude_id (Optional[int]): ID to exclude from validation (for updates)

        Returns:
            Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
                (is_valid, error_message, similar_names_info)
        """
        try:
            with self.db_manager.get_session() as db:
                # Check for exact matches
                exact_query = text("""
                    SELECT id, title, test_point_id
                    FROM test_points tp
                    JOIN projects tcg ON tp.project_id = tcg.id
                    WHERE tcg.business_type = :business_type
                    AND tp.title = :name
                    AND (:exclude_id IS NULL OR tp.id != :exclude_id)
                """)

                result = db.execute(exact_query, {
                    'business_type': business_type,
                    'name': name,
                    'exclude_id': exclude_id
                }).fetchone()

                if result:
                    return False, f"测试点名称 '{name}' 已存在（ID: {result.id}, 测试点ID: {result.test_point_id}）", {
                        'id': result.id,
                        'title': result.title,
                        'test_point_id': result.test_point_id
                    }

                # Check for similar names (case-insensitive)
                similar_query = text("""
                    SELECT id, title, test_point_id,
                           LOWER(tp.title) as lower_title
                    FROM test_points tp
                    JOIN projects tcg ON tp.project_id = tcg.id
                    WHERE tcg.business_type = :business_type
                    AND LOWER(tp.title) = LOWER(:name)
                    AND (:exclude_id IS NULL OR tp.id != :exclude_id)
                """)

                similar_result = db.execute(similar_query, {
                    'business_type': business_type,
                    'name': name,
                    'exclude_id': exclude_id
                }).fetchone()

                if similar_result:
                    return False, f"测试点名称 '{name}' 与现有名称 '{similar_result.title}' 相似（忽略大小写）", {
                        'id': similar_result.id,
                        'title': similar_result.title,
                        'test_point_id': similar_result.test_point_id
                    }

                return True, None, None

        except Exception as e:
            logger.error(f"Error validating test point name: {str(e)}")
            return False, f"验证测试点名称时发生错误: {str(e)}", None

    def validate_test_case_name_uniqueness(
        self,
        business_type: str,
        name: str,
        exclude_id: Optional[int] = None
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Validate test case name uniqueness within the same business type.

        Args:
            business_type (str): Business type code
            name (str): Test case name to validate
            exclude_id (Optional[int]): ID to exclude from validation (for updates)

        Returns:
            Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
                (is_valid, error_message, similar_names_info)
        """
        try:
            with self.db_manager.get_session() as db:
                # Check for exact matches
                exact_query = text("""
                    SELECT id, name, test_case_id
                    FROM test_case_items tci
                    JOIN projects tcg ON tci.project_id = tcg.id
                    WHERE tcg.business_type = :business_type
                    AND tci.name = :name
                    AND (:exclude_id IS NULL OR tci.id != :exclude_id)
                """)

                result = db.execute(exact_query, {
                    'business_type': business_type,
                    'name': name,
                    'exclude_id': exclude_id
                }).fetchone()

                if result:
                    return False, f"测试用例名称 '{name}' 已存在（ID: {result.id}, 测试用例ID: {result.test_case_id}）", {
                        'id': result.id,
                        'name': result.name,
                        'test_case_id': result.test_case_id
                    }

                # Check for similar names (case-insensitive)
                similar_query = text("""
                    SELECT id, name, test_case_id,
                           LOWER(tci.name) as lower_name
                    FROM test_case_items tci
                    JOIN projects tcg ON tci.project_id = tcg.id
                    WHERE tcg.business_type = :business_type
                    AND LOWER(tci.name) = LOWER(:name)
                    AND (:exclude_id IS NULL OR tci.id != :exclude_id)
                """)

                similar_result = db.execute(similar_query, {
                    'business_type': business_type,
                    'name': name,
                    'exclude_id': exclude_id
                }).fetchone()

                if similar_result:
                    return False, f"测试用例名称 '{name}' 与现有名称 '{similar_result.name}' 相似（忽略大小写）", {
                        'id': similar_result.id,
                        'name': similar_result.name,
                        'test_case_id': similar_result.test_case_id
                    }

                return True, None, None

        except Exception as e:
            logger.error(f"Error validating test case name: {str(e)}")
            return False, f"验证测试用例名称时发生错误: {str(e)}", None

    def get_similar_names_suggestions(
        self,
        business_type: str,
        partial_name: str,
        entity_type: str = 'both'
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get suggestions for similar names based on partial input.

        Args:
            business_type (str): Business type code
            partial_name (str): Partial name to search for
            entity_type (str): 'test_point', 'test_case', or 'both'

        Returns:
            Dict[str, List[Dict[str, Any]]]: Dictionary with suggestions
        """
        suggestions = {
            'test_points': [],
            'test_cases': []
        }

        try:
            with self.db_manager.get_session() as db:
                if entity_type in ['test_point', 'both']:
                    # Get test point suggestions
                    tp_query = text("""
                        SELECT id, title, test_point_id
                        FROM test_points tp
                        JOIN projects tcg ON tp.project_id = tcg.id
                        WHERE tcg.business_type = :business_type
                        AND LOWER(tp.title) LIKE LOWER(:partial_name)
                        ORDER BY tp.title
                        LIMIT 10
                    """)

                    tp_results = db.execute(tp_query, {
                        'business_type': business_type,
                        'partial_name': f'%{partial_name}%'
                    }).fetchall()

                    suggestions['test_points'] = [
                        {
                            'id': row.id,
                            'title': row.title,
                            'test_point_id': row.test_point_id
                        } for row in tp_results
                    ]

                if entity_type in ['test_case', 'both']:
                    # Get test case suggestions
                    tc_query = text("""
                        SELECT id, name, test_case_id
                        FROM test_case_items tci
                        JOIN projects tcg ON tci.project_id = tcg.id
                        WHERE tcg.business_type = :business_type
                        AND LOWER(tci.name) LIKE LOWER(:partial_name)
                        ORDER BY tci.name
                        LIMIT 10
                    """)

                    tc_results = db.execute(tc_query, {
                        'business_type': business_type,
                        'partial_name': f'%{partial_name}%'
                    }).fetchall()

                    suggestions['test_cases'] = [
                        {
                            'id': row.id,
                            'name': row.name,
                            'test_case_id': row.test_case_id
                        } for row in tc_results
                    ]

        except Exception as e:
            logger.error(f"Error getting name suggestions: {str(e)}")

        return suggestions

    def validate_batch_names(
        self,
        business_type: str,
        names: List[str],
        entity_type: str
    ) -> Dict[str, Any]:
        """
        Validate a batch of names for uniqueness.

        Args:
            business_type (str): Business type code
            names (List[str]): List of names to validate
            entity_type (str): 'test_point' or 'test_case'

        Returns:
            Dict[str, Any]: Validation results with duplicates and valid names
        """
        validation_result = {
            'valid_names': [],
            'duplicates': [],
            'conflicts': []
        }

        seen_names = set()

        # Check for duplicates within the batch
        for i, name in enumerate(names):
            if name.lower() in [seen.lower() for seen in seen_names]:
                validation_result['duplicates'].append({
                    'index': i,
                    'name': name,
                    'conflicts_with': [seen for seen in seen_names if seen.lower() == name.lower()]
                })
            else:
                seen_names.add(name)

        # Check for conflicts with existing names
        for name in set(names):  # Remove duplicates for database queries
            if entity_type == 'test_point':
                is_valid, error_msg, conflict_info = self.validate_test_point_name_uniqueness(business_type, name)
            else:
                is_valid, error_msg, conflict_info = self.validate_test_case_name_uniqueness(business_type, name)

            if not is_valid:
                validation_result['conflicts'].append({
                    'name': name,
                    'error_message': error_msg,
                    'conflict_info': conflict_info
                })
            else:
                validation_result['valid_names'].append(name)

        return validation_result