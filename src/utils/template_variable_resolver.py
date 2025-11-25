"""
Template Variable Resolver

This module provides functionality to resolve and process template variables
used in prompt generation for test cases and test points.
"""

import json
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database.models import TemplateVariable, TemplateVariableType, BusinessTypeConfig, Project, Project, UnifiedTestCase
from ..database.database import DatabaseManager
from ..utils.config import Config

logger = logging.getLogger(__name__)


class TemplateVariableResolver:
    """
    Resolves template variables used in prompt generation.

    Supports the following variable types:
    - project: Project dimension variables
    - business: Business dimension variables
    - history_test_points: Historical test points
    - history_test_cases: Historical test cases
    - context: Runtime context variables
    - custom: User-defined variables
    """

    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db_manager = db_manager or DatabaseManager(Config())

    def resolve_variables(self, business_type: str, additional_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Resolve all template variables for a given business type and context.

        Args:
            business_type: The business type to resolve variables for
            additional_context: Additional runtime context variables

        Returns:
            Dictionary of resolved template variables
        """
        variables = {}

        # Resolve project variables
        variables.update(self._get_project_variables(additional_context))

        # Resolve business variables
        variables.update(self._get_business_variables(business_type))

        # Resolve historical content variables
        variables.update(self._get_history_variables(business_type))

        # Add runtime context variables
        if additional_context:
            variables.update(additional_context)

        logger.info(f"Resolved {len(variables)} template variables for business_type: {business_type}")
        return variables

    def _get_project_variables(self, additional_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Get project dimension variables.

        Args:
            additional_context: Additional context that may contain project_id

        Returns:
            Dictionary of project variables
        """
        variables = {}

        project_id = additional_context.get('project_id') if additional_context else None

        if project_id:
            try:
                with self.db_manager.get_session() as db:
                    project = db.query(Project).filter(Project.id == project_id).first()
                    if project:
                        variables.update({
                            'project_name': project.name,
                            'project_description': project.description,
                            'project_id': project.id,
                            'project_created_at': project.created_at.isoformat() if project.created_at else None
                        })
                        logger.debug(f"Loaded project variables for project_id: {project_id}")
            except Exception as e:
                logger.error(f"Error loading project variables for project_id {project_id}: {e}")

        return variables

    def _get_business_variables(self, business_type: str) -> Dict[str, Any]:
        """
        Get business dimension variables for a specific business type.

        Args:
            business_type: The business type

        Returns:
            Dictionary of business variables
        """
        variables = {
            'business_type': business_type,
            'business_name': self._get_business_name(business_type)
        }

        # Get business type config from database
        try:
            with self.db_manager.get_session() as db:
                config = db.query(BusinessTypeConfig).filter(
                    BusinessTypeConfig.code == business_type,
                    BusinessTypeConfig.is_active == True
                ).first()

                if config:
                    variables.update({
                        'business_description': config.description,
                        'business_config': config.template_config or {}
                    })
                    logger.debug(f"Loaded business config for {business_type}")
        except Exception as e:
            logger.error(f"Error loading business config for {business_type}: {e}")

        return variables

    def _get_history_variables(self, business_type: str) -> Dict[str, Any]:
        """
        Get historical content variables for a business type.

        Args:
            business_type: The business type

        Returns:
            Dictionary of historical variables
        """
        variables = {}

        try:
            with self.db_manager.get_session() as db:
                # Get recent test points
                test_points = self._get_recent_test_points(db, business_type)
                variables['recent_test_points'] = test_points

                # Get common test patterns
                common_patterns = self._get_common_test_patterns(db, business_type)
                variables['common_test_patterns'] = common_patterns

                # Get related test cases
                test_cases = self._get_related_test_cases(db, business_type)
                variables['related_test_cases'] = test_cases

        except Exception as e:
            logger.error(f"Error loading historical variables for {business_type}: {e}")

        return variables

    def _get_recent_test_points(self, db: Session, business_type: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recent test points for a business type."""
        try:
            query = text("""
                SELECT tp.test_point_id, tp.title, tp.description, tp.priority, tp.status,
                       tcg.created_at as group_created_at
                FROM test_points tp
                JOIN projects tcg ON tp.project_id = tcg.id
                JOIN projects p ON tcg.project_id = p.id
                WHERE tcg.business_type = :business_type
                  AND tp.status = 'COMPLETED'
                ORDER BY tp.created_at DESC
                LIMIT :limit
            """)

            result = db.execute(query, {"business_type": business_type, "limit": limit})

            test_points = []
            for row in result:
                test_points.append({
                    'test_point_id': row.test_point_id,
                    'title': row.title,
                    'description': row.description,
                    'priority': row.priority,
                    'status': row.status,
                    'created_at': row.group_created_at.isoformat() if row.group_created_at else None
                })

            return test_points

        except Exception as e:
            logger.error(f"Error getting recent test points for {business_type}: {e}")
            return []

    def _get_common_test_patterns(self, db: Session, business_type: str) -> List[Dict[str, Any]]:
        """Get common test patterns for a business type."""
        try:
            # Extract patterns from test case descriptions
            query = text("""
                SELECT DISTINCT
                       SUBSTRING_INDEX(tci.description, ' ', 3) as pattern,
                       COUNT(*) as frequency
                FROM test_case_items tci
                JOIN projects tcg ON tci.project_id = tcg.id
                WHERE tcg.business_type = :business_type
                  AND tci.description IS NOT NULL
                GROUP BY SUBSTRING_INDEX(tci.description, ' ', 3)
                HAVING COUNT(*) >= 2
                ORDER BY frequency DESC
                LIMIT 10
            """)

            result = db.execute(query, {"business_type": business_type})

            patterns = []
            for row in result:
                patterns.append({
                    'pattern': row.pattern.strip(),
                    'frequency': row.frequency
                })

            return patterns

        except Exception as e:
            logger.error(f"Error getting common test patterns for {business_type}: {e}")
            return []

    def _get_related_test_cases(self, db: Session, business_type: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Get related test cases for a business type."""
        try:
            query = text("""
                SELECT tci.case_id, tci.description, tci.preconditions,
                       tci.steps, tci.expected_result, tci.priority,
                       tcg.created_at as group_created_at
                FROM test_case_items tci
                JOIN projects tcg ON tci.project_id = tcg.id
                WHERE tcg.business_type = :business_type
                ORDER BY tcg.created_at DESC
                LIMIT :limit
            """)

            result = db.execute(query, {"business_type": business_type, "limit": limit})

            test_cases = []
            for row in result:
                test_cases.append({
                    'case_id': row.case_id,
                    'description': row.description,
                    'preconditions': row.preconditions,
                    'steps': row.steps,
                    'expected_result': row.expected_result,
                    'priority': row.priority,
                    'created_at': row.group_created_at.isoformat() if row.group_created_at else None
                })

            return test_cases

        except Exception as e:
            logger.error(f"Error getting related test cases for {business_type}: {e}")
            return []

    def _get_business_name(self, business_type: str) -> str:
        """Get a human-readable name for the business type."""
        business_names = {
            "RCC": "远程净化控制",
            "RFD": "燃油余量检测",
            "ZAB": "车门锁定解锁",
            "ZBA": "车窗控制",
            "PAB": "安全气囊",
            "PAE": "紧急制动",
            "PAI": "智能交互",
            "RCE": "车况监测",
            "RES": "远程紧急服务",
            "RHL": "远程寻车",
            "RPP": "远程泊车",
            "RSM": "远程座椅调节",
            "RWS": "远程车窗控制",
            "ZAD": "车门解锁",
            "ZAE": "车门上锁",
            "ZAF": "车窗关闭",
            "ZAG": "空调控制",
            "ZAH": "座椅调节",
            "ZAJ": "音乐控制",
            "ZAM": "氛围灯调节",
            "ZAN": "导航控制",
            "ZAS": "语音控制",
            "ZAV": "视频控制",
            "ZAY": "系统设置",
            "ZBB": "后备箱开启",
            "WEIXIU_RSM": "维修座椅调节",
            "VIVO_WATCH": "VIVO手表控制",
            "RDL_RDU": "车门锁定解锁",
            "RDO_RDC": "车门开关控制"
        }
        return business_names.get(business_type, business_type)

    def get_available_variables(self, business_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get available template variables from database.

        Args:
            business_type: Optional business type filter

        Returns:
            List of available template variables
        """
        try:
            with self.db_manager.get_session() as db:
                query = db.query(TemplateVariable).filter(TemplateVariable.is_active == True)

                if business_type:
                    query = query.filter(
                        (TemplateVariable.business_type == business_type) |
                        (TemplateVariable.business_type.is_(None))
                    )

                variables = query.all()

                result = []
                for var in variables:
                    result.append({
                        'id': var.id,
                        'name': var.name,
                        'type': var.variable_type.value,
                        'business_type': var.business_type,
                        'description': var.description,
                        'default_value': var.default_value
                    })

                return result

        except Exception as e:
            logger.error(f"Error getting available template variables: {e}")
            return []