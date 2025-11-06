"""
Dynamic Configuration Service

This service provides centralized access to database-driven enums and configuration,
eliminating the need for hardcoded enum definitions throughout the application.
"""

from typing import Dict, List, Optional, Any
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.database.database import DatabaseManager
from src.utils.config import Config
from src.database.models import BusinessType, PromptType, PromptStatus, BusinessTypeConfig


class ConfigurationService:
    """Centralized configuration service for database-driven enums and metadata."""

    def __init__(self):
        self._config = Config()
        self._db_manager = DatabaseManager(self._config)
        self._business_types_cache: Optional[Dict[str, Any]] = None
        self._prompt_types_cache: Optional[Dict[str, Any]] = None
        self._prompt_statuses_cache: Optional[Dict[str, Any]] = None

    def _get_db_session(self) -> Session:
        """Get database session."""
        return self._db_manager.get_session().__enter__()

    def get_business_types(self, refresh_cache: bool = False) -> Dict[str, Any]:
        """
        Get all business types with their metadata.

        Args:
            refresh_cache: Force refresh of cached data

        Returns:
            Dictionary with business type values as keys and metadata as values
        """
        if self._business_types_cache is None or refresh_cache:
            with self._get_db_session() as db:
                # Get business types from BusinessTypeConfig table
                business_type_configs = db.query(BusinessTypeConfig).filter(
                    BusinessTypeConfig.is_active == True
                ).order_by(BusinessTypeConfig.code).all()

                business_types = {}
                for config in business_type_configs:
                    business_types[config.code] = {
                        'value': config.code,
                        'name': config.name,
                        'description': config.description or f"业务类型 {config.code} 的功能描述"
                    }

                self._business_types_cache = business_types

        return self._business_types_cache

    def get_prompt_types(self, refresh_cache: bool = False) -> Dict[str, Any]:
        """
        Get all prompt types with their metadata.

        Args:
            refresh_cache: Force refresh of cached data

        Returns:
            Dictionary with prompt type values as keys and metadata as values
        """
        if self._prompt_types_cache is None or refresh_cache:
            with self._get_db_session() as db:
                # Get prompt types from database enum
                result = db.execute(text("""
                    SELECT 'system' as value, '系统提示词' as name, 'System-level prompts' as description
                    UNION ALL
                    SELECT 'template', '模板', 'Reusable prompt templates'
                    UNION ALL
                    SELECT 'business_description', '业务描述', 'Business type descriptions'
                    UNION ALL
                    SELECT 'shared_content', '共享内容', 'Shared prompt content blocks'
                    UNION ALL
                    SELECT 'requirements', '需求生成', 'Requirements generation prompts'
                """))

                prompt_types = {}
                for row in result:
                    prompt_types[row.value] = {
                        'value': row.value,
                        'name': row.name,
                        'description': row.description
                    }

                self._prompt_types_cache = prompt_types

        return self._prompt_types_cache

    def get_prompt_statuses(self, refresh_cache: bool = False) -> Dict[str, Any]:
        """
        Get all prompt statuses with their metadata.

        Args:
            refresh_cache: Force refresh of cached data

        Returns:
            Dictionary with prompt status values as keys and metadata as values
        """
        if self._prompt_statuses_cache is None or refresh_cache:
            with self._get_db_session() as db:
                # Get prompt statuses from database enum
                result = db.execute(text("""
                    SELECT 'draft' as value, '草稿' as name, 'Draft status' as description
                    UNION ALL
                    SELECT 'active', '活跃', 'Active status'
                    UNION ALL
                    SELECT 'archived', '已归档', 'Archived status'
                    UNION ALL
                    SELECT 'deprecated', '已废弃', 'Deprecated status'
                """))

                prompt_statuses = {}
                for row in result:
                    prompt_statuses[row.value] = {
                        'value': row.value,
                        'name': row.name,
                        'description': row.description
                    }

                self._prompt_statuses_cache = prompt_statuses

        return self._prompt_statuses_cache

    def validate_business_type(self, business_type: str) -> bool:
        """Validate if a business type exists in the database."""
        business_types = self.get_business_types()
        return business_type in business_types

    def validate_prompt_type(self, prompt_type: str) -> bool:
        """Validate if a prompt type exists."""
        prompt_types = self.get_prompt_types()
        return prompt_type in prompt_types

    def validate_prompt_status(self, prompt_status: str) -> bool:
        """Validate if a prompt status exists."""
        prompt_statuses = self.get_prompt_statuses()
        return prompt_status in prompt_statuses

    def get_business_type_name(self, business_type: str) -> str:
        """Get the display name for a business type."""
        business_types = self.get_business_types()
        return business_types.get(business_type, {}).get('name', business_type)

    def get_prompt_type_name(self, prompt_type: str) -> str:
        """Get the display name for a prompt type."""
        prompt_types = self.get_prompt_types()
        return prompt_types.get(prompt_type, {}).get('name', prompt_type)

    def get_prompt_status_name(self, prompt_status: str) -> str:
        """Get the display name for a prompt status."""
        prompt_statuses = self.get_prompt_statuses()
        return prompt_statuses.get(prompt_status, {}).get('name', prompt_status)

    def get_business_type_description(self, business_type: str) -> str:
        """Get the description for a business type."""
        business_types = self.get_business_types()
        return business_types.get(business_type, {}).get('description', '')

    def get_prompt_type_description(self, prompt_type: str) -> str:
        """Get the description for a prompt type."""
        prompt_types = self.get_prompt_types()
        return prompt_types.get(prompt_type, {}).get('description', '')

    def get_prompt_status_description(self, prompt_status: str) -> str:
        """Get the description for a prompt status."""
        prompt_statuses = self.get_prompt_statuses()
        return prompt_statuses.get(prompt_status, {}).get('description', '')

    def get_all_configuration(self, refresh_cache: bool = False) -> Dict[str, Any]:
        """
        Get all configuration data at once.

        Args:
            refresh_cache: Force refresh of all cached data

        Returns:
            Dictionary containing all configuration data
        """
        return {
            'business_types': self.get_business_types(refresh_cache),
            'prompt_types': self.get_prompt_types(refresh_cache),
            'prompt_statuses': self.get_prompt_statuses(refresh_cache)
        }

    def clear_cache(self):
        """Clear all cached configuration data."""
        self._business_types_cache = None
        self._prompt_types_cache = None
        self._prompt_statuses_cache = None


# Global configuration service instance
config_service = ConfigurationService()