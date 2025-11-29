"""
Database-driven Prompt Builder for dynamically assembling test case generation prompts.
Simplified version - only uses prompt combination system.
"""

import json
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

from .config import Config
from ..database.database import DatabaseManager
from ..database.models import (
    Prompt, PromptType, PromptStatus, BusinessType,
    BusinessTypeConfig, PromptCombination, PromptCombinationItem
)
from .template_variable_resolver import TemplateVariableResolver


class DatabasePromptBuilder:
    """Database-driven builder class for assembling prompts from stored components."""

    def __init__(self, config: Config):
        """
        Initialize the database prompt builder.

        Args:
            config (Config): Configuration object
        """
        self.config = config
        self.db_manager = DatabaseManager(config)
        self.variable_resolver = TemplateVariableResolver(self.db_manager)

        # Cache for frequently accessed combinations
        self._combination_cache: Optional[Dict[str, str]] = None

    def _clear_cache(self):
        """Clear all cached data."""
        self._combination_cache = None

    def _apply_template_variables(self, content: str, additional_context: Optional[Dict[str, Any]] = None,
                                business_type: Optional[str] = None, project_id: Optional[int] = None,
                                endpoint_params: Optional[Dict[str, Any]] = None) -> str:
        """
        Apply template variables to content using the new 3-variable TemplateVariableResolver.

        Args:
            content (str): Content with template variables
            additional_context (Optional[Dict[str, Any]]): Additional runtime context
            business_type (Optional[str]): Business type for variable resolution
            project_id (Optional[int]): Project ID for database queries
            endpoint_params (Optional[Dict[str, Any]]): Parameters from AI generation endpoints

        Returns:
            str: Content with template variables resolved
        """
        try:
            # Enhanced variable detection: check if content contains any template variables
            if not content or '{{' not in content:
                logger.debug(f"Content contains no template variables, returning original content")
                return content

            # Extract actual variable names used in the content
            used_variables = self._extract_used_variables(content)
            if not used_variables:
                logger.debug(f"No valid template variables found in content")
                return content

            logger.debug(f"Found {len(used_variables)} variables in content: {used_variables}")

            # Resolve variables using the new 3-variable system with generation stage
            generation_stage = endpoint_params.get('generation_stage') if endpoint_params else None
            variables = self.variable_resolver.resolve_variables(
                business_type=business_type or '',
                project_id=project_id,
                endpoint_params=endpoint_params or {},
                generation_stage=generation_stage
            )

            # Only replace variables that are actually present in the content
            resolved_content = content
            replacement_count = 0

            for variable_name in used_variables:
                variable_value = variables.get(variable_name)
                if variable_value is not None:
                    # Support both {{variable_name}} and {{ variable_name }} formats
                    patterns = [
                        f'{{{{{variable_name}}}}}',
                        f'{{{{ {variable_name} }}}}'
                    ]
                    for pattern in patterns:
                        if pattern in resolved_content:
                            resolved_content = resolved_content.replace(pattern, str(variable_value))
                            replacement_count += 1
                            logger.debug(f"Replaced variable '{variable_name}' with value: {str(variable_value)[:100]}...")

            
            logger.debug(f"Variable replacement completed: {replacement_count} replacements made")
            return resolved_content

        except Exception as e:
            logger.error(f"Error applying template variables: {e}")
            # Return original content if variable resolution fails
            return content

    def _apply_template_variables_with_variables(self, content: str, variables: Dict[str, Any]) -> str:
        """
        Apply pre-resolved variables to content (helper method for backward compatibility).

        Args:
            content (str): Content with template variables
            variables (Dict[str, Any]): Pre-resolved variables

        Returns:
            str: Content with template variables resolved
        """
        try:
            # Check if content contains any template variables
            if not content or '{{' not in content:
                return content

            # Extract actual variable names used in the content
            used_variables = self._extract_used_variables(content)
            if not used_variables:
                return content

            # Replace variables
            resolved_content = content
            for variable_name in used_variables:
                variable_value = variables.get(variable_name)
                if variable_value is not None:
                    patterns = [
                        f'{{{{{variable_name}}}}}',
                        f'{{{{ {variable_name} }}}}'
                    ]
                    for pattern in patterns:
                        if pattern in resolved_content:
                            resolved_content = resolved_content.replace(pattern, str(variable_value))

            return resolved_content

        except Exception as e:
            logger.error(f"Error applying template variables with pre-resolved variables: {e}")
            return content

    def _extract_used_variables(self, content: str) -> List[str]:
        """
        Extract variable names that are actually used in the content.

        Args:
            content (str): Content to analyze

        Returns:
            List[str]: List of variable names found in the content
        """
        try:
            import re
            # Find all {{variable_name}} patterns (with optional whitespace)
            pattern = r'\{\{\s*(\w+)\s*\}\}'
            matches = re.findall(pattern, content)
            # Remove duplicates and preserve order
            seen = set()
            unique_variables = []
            for var in matches:
                if var not in seen:
                    seen.add(var)
                    unique_variables.append(var)
            return unique_variables
        except Exception as e:
            logger.error(f"Error extracting variables from content: {e}")
            return []

    def get_active_prompt_by_name(self, name: str, prompt_type: Optional[PromptType] = None) -> Optional[Prompt]:
        """
        Get an active prompt by name.

        Args:
            name (str): Prompt name
            prompt_type (Optional[PromptType]): Filter by prompt type

        Returns:
            Optional[Prompt]: Found prompt or None
        """
        with self.db_manager.get_session() as db:
            query = db.query(Prompt).filter(
                Prompt.name == name,
                Prompt.status == PromptStatus.ACTIVE
            )
            if prompt_type:
                query = query.filter(Prompt.type == prompt_type)
            return query.first()

    def get_active_prompt_by_business_type(self, business_type: BusinessType) -> Optional[Prompt]:
        """
        Get an active prompt by business type.

        Args:
            business_type (BusinessType): Business type enum

        Returns:
            Optional[Prompt]: Found prompt or None
        """
        with self.db_manager.get_session() as db:
            return db.query(Prompt).filter(
                Prompt.business_type == business_type,
                Prompt.type == PromptType.BUSINESS_DESCRIPTION,
                Prompt.status == PromptStatus.ACTIVE
            ).first()

    def get_system_prompt(self, prompt_name: Optional[str] = None) -> Optional[str]:
        """
        Get the system prompt from database.

        Args:
            prompt_name (Optional[str]): Specific system prompt name to get.
                                       If None, returns the most recent one.

        Returns:
            Optional[str]: System prompt content or None if failed
        """
        with self.db_manager.get_session() as db:
            query = db.query(Prompt).filter(
                Prompt.type == PromptType.SYSTEM,
                Prompt.status == PromptStatus.ACTIVE
            )

            if prompt_name:
                query = query.filter(Prompt.name == prompt_name)

            system_prompt = query.order_by(Prompt.created_at.desc()).first()
            return system_prompt.content if system_prompt else None

    
    
    def validate_two_stage_configuration(self, business_type: str) -> Dict[str, Any]:
        """
        Validate that a business type's two-stage prompt configuration is properly configured.
        This checks for proper test point and test case prompt combinations.

        Args:
            business_type (str): Business type to validate

        Returns:
            Dict[str, Any]: Validation result with details
        """
        try:
            with self.db_manager.get_session() as db:
                # Get business type configuration
                business_config = db.query(BusinessTypeConfig).filter(
                    BusinessTypeConfig.code == business_type,
                    BusinessTypeConfig.is_active == True
                ).first()

                if not business_config:
                    return {
                        "valid": False,
                        "error": "No active business config found",
                        "business_type": business_type
                    }

                # Check two-stage configurations
                test_point_combination_id = business_config.test_point_combination_id
                test_case_combination_id = business_config.test_case_combination_id

                validation_result = {
                    "valid": True,
                    "business_type": business_type,
                    "test_point_config": None,
                    "test_case_config": None,
                    "issues": []
                }

                # Validate test point configuration
                if test_point_combination_id:
                    test_point_items = db.query(PromptCombinationItem).filter(
                        PromptCombinationItem.combination_id == test_point_combination_id
                    ).all()

                    validation_result["test_point_config"] = {
                        "combination_id": test_point_combination_id,
                        "items_count": len(test_point_items),
                        "has_items": len(test_point_items) > 0
                    }
                else:
                    validation_result["valid"] = False
                    validation_result["issues"].append("No test point combination configured")

                # Validate test case configuration
                if test_case_combination_id:
                    unified_test_cases = db.query(PromptCombinationItem).filter(
                        PromptCombinationItem.combination_id == test_case_combination_id
                    ).all()

                    validation_result["test_case_config"] = {
                        "combination_id": test_case_combination_id,
                        "items_count": len(unified_test_cases),
                        "has_items": len(unified_test_cases) > 0
                    }
                else:
                    validation_result["valid"] = False
                    validation_result["issues"].append("No test case combination configured")

                return validation_result

        except Exception as e:
            return {
                "valid": False,
                "error": f"Two-stage validation failed: {str(e)}",
                "business_type": business_type
            }

    def get_available_business_types(self) -> List[str]:
        """
        Get list of available business types from database.

        Returns:
            List[str]: List of available business type codes
        """
        with self.db_manager.get_session() as db:
            business_types = db.query(Prompt.business_type).filter(
                Prompt.type == PromptType.BUSINESS_DESCRIPTION,
                Prompt.status == PromptStatus.ACTIVE,
                Prompt.business_type.isnot(None)
            ).distinct().all()

            return [bt[0].value for bt in business_types if bt[0]]

    def get_two_stage_prompts(self, business_type: str, stage: str) -> tuple[Optional[str], Optional[str]]:
        """
        Get system and user prompts for two-stage generation.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)
            stage (str): Generation stage ('test_point' or 'test_case')

        Returns:
            tuple: (system_prompt, user_prompt) or (None, None) if failed
        """
        try:
            with self.db_manager.get_session() as db:
                # Get business type configuration
                business_config = db.query(BusinessTypeConfig).filter(
                    BusinessTypeConfig.code == business_type,
                    BusinessTypeConfig.is_active == True
                ).first()

                if not business_config:
                    print(f"No active business config found for {business_type}")
                    return None, None

                # Determine which combination ID to use based on stage
                if stage == 'test_point':
                    combination_id = business_config.test_point_combination_id
                elif stage == 'test_case':
                    combination_id = business_config.test_case_combination_id
                else:
                    print(f"Invalid stage: {stage}. Must be 'test_point' or 'test_case'")
                    return None, None

                if not combination_id:
                    print(f"No combination ID configured for {business_type} stage {stage}")
                    return None, None

                # Get the prompt combination
                combination = db.query(PromptCombination).filter(
                    PromptCombination.id == combination_id,
                    PromptCombination.is_active == True,
                    PromptCombination.is_valid == True
                ).first()

                if not combination:
                    print(f"No valid combination found with ID {combination_id}")
                    return None, None

                # Get all items in the combination, ordered by sequence
                prompt_items = db.query(PromptCombinationItem).filter(
                    PromptCombinationItem.combination_id == combination.id
                ).order_by(PromptCombinationItem.order).all()

                if not prompt_items:
                    print(f"No items found in combination {combination_id}")
                    return None, None

                # Get all the prompts referenced in the combination
                prompt_ids = [item.prompt_id for item in prompt_items]
                prompts = db.query(Prompt).filter(
                    Prompt.id.in_(prompt_ids),
                    Prompt.status == PromptStatus.ACTIVE
                ).all()

                # Create a mapping of prompt_id to prompt
                prompt_map = {prompt.id: prompt for prompt in prompts}

                # Separate system and user prompts
                system_prompt_parts = []
                user_prompt_parts = []

                for item in prompt_items:
                    prompt = prompt_map.get(item.prompt_id)
                    if prompt:
                        content = prompt.content
                        if item.section_title:
                            content = f"=== {item.section_title} ===\n{content}"

                        if item.item_type == 'system_prompt':
                            system_prompt_parts.append(content)
                        else:
                            user_prompt_parts.append(content)

                # Join parts
                system_prompt = "\n\n".join(system_prompt_parts) if system_prompt_parts else None
                user_prompt = "\n\n".join(user_prompt_parts) if user_prompt_parts else None

                return system_prompt, user_prompt

        except Exception as e:
            return None, None

    def get_prompt_by_file_path(self, file_path: str) -> Optional[Prompt]:
        """
        Get a prompt by its original file path.

        Args:
            file_path (str): Original file path

        Returns:
            Optional[Prompt]: Found prompt or None
        """
        with self.db_manager.get_session() as db:
            return db.query(Prompt).filter(
                Prompt.file_path == file_path,
                Prompt.status == PromptStatus.ACTIVE
            ).first()

    def save_built_prompt(self, business_type: str, output_path: Optional[str] = None) -> bool:
        """
        Save the built prompt to a file.

        Args:
            business_type (str): Business type
            output_path (Optional[str]): Output file path

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            prompt_content = self.build_prompt(business_type)
            if not prompt_content:
                return False

            if output_path is None:
                output_path = f"built_prompt_{business_type}.md"

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(prompt_content)

            print(f"Saved built prompt for {business_type} to {output_path}")
            return True

        except Exception as e:
            return False