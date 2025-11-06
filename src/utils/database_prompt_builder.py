"""
Database-driven Prompt Builder for dynamically assembling test case generation prompts.
"""

import json
from typing import Optional, Dict, Any, List

from .config import Config
from ..database.database import DatabaseManager
from ..database.models import (
    Prompt, PromptType, PromptStatus, BusinessType,
    BusinessTypeConfig, PromptCombination, PromptCombinationItem
)
from ..config.business_types import get_business_file_mapping, get_business_interface


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

        # Cache for frequently accessed prompts
        self._shared_content_cache: Optional[Dict[str, str]] = None
        self._template_cache: Optional[str] = None
        self._combination_cache: Optional[Dict[str, str]] = None

    def _clear_cache(self):
        """Clear internal caches."""
        self._shared_content_cache = None
        self._template_cache = None
        self._combination_cache = None

    def get_active_prompt_by_name(self, name: str, prompt_type: Optional[PromptType] = None) -> Optional[Prompt]:
        """
        Get an active prompt by name and optionally type.

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
        Get an active business description prompt by business type.

        Args:
            business_type (BusinessType): Business type

        Returns:
            Optional[Prompt]: Found prompt or None
        """
        with self.db_manager.get_session() as db:
            return db.query(Prompt).filter(
                Prompt.business_type == business_type,
                Prompt.type == PromptType.BUSINESS_DESCRIPTION,
                Prompt.status == PromptStatus.ACTIVE
            ).first()

    def load_shared_content(self) -> Dict[str, str]:
        """
        Load shared content components from database.

        Returns:
            Dict[str, str]: Dictionary containing shared content
        """
        if self._shared_content_cache is not None:
            return self._shared_content_cache

        shared_content = {}

        with self.db_manager.get_session() as db:
            # Get all active shared content prompts
            shared_prompts = db.query(Prompt).filter(
                Prompt.type == PromptType.SHARED_CONTENT,
                Prompt.status == PromptStatus.ACTIVE
            ).all()

            for prompt in shared_prompts:
                # Map prompt names to keys expected by the template
                key = self._map_shared_content_key(prompt.name)
                if key:
                    shared_content[key] = prompt.content

        self._shared_content_cache = shared_content
        return shared_content

    def _map_shared_content_key(self, prompt_name: str) -> Optional[str]:
        """
        Map prompt names to template variable keys.

        Args:
            prompt_name (str): Prompt name from database

        Returns:
            Optional[str]: Template variable key or None if not found
        """
        # Mapping based on expected template variables
        name_mapping = {
            "System Background": "system_background",
            "Error Codes": "error_codes",
            "Remote Control Api": "remote_control_api",
            "Ai Climate Inner Api": "ai_climate_inner_api",
            "Remote Control Inner Api": "remote_control_inner_api"
        }

        # Try exact match first
        if prompt_name in name_mapping:
            return name_mapping[prompt_name]

        # Try case-insensitive match
        for key, value in name_mapping.items():
            if prompt_name.lower() == key.lower():
                return value

        return None

    def load_business_description(self, business_type: str) -> Optional[str]:
        """
        Load business-specific description from database.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[str]: Business description content or None if failed
        """
        try:
            # Convert string to BusinessType enum
            business_enum = BusinessType(business_type)
        except ValueError:
            print(f"Invalid business type: {business_type}")
            return None

        with self.db_manager.get_session() as db:
            prompt = db.query(Prompt).filter(
                Prompt.business_type == business_enum,
                Prompt.type == PromptType.BUSINESS_DESCRIPTION,
                Prompt.status == PromptStatus.ACTIVE
            ).first()
            return prompt.content if prompt else None

    def load_template(self) -> Optional[str]:
        """
        Load the main template from database.

        Returns:
            Optional[str]: Template content or None if failed
        """
        if self._template_cache is not None:
            return self._template_cache

        with self.db_manager.get_session() as db:
            template = db.query(Prompt).filter(
                Prompt.type == PromptType.TEMPLATE,
                Prompt.status == PromptStatus.ACTIVE
            ).order_by(Prompt.created_at.desc()).first()

            if template:
                self._template_cache = template.content
                return template.content

        return None

    def get_interface_docs_for_business(self, business_type: str, shared_content: Dict[str, str]) -> str:
        """
        Get relevant interface documentation for a specific business type.

        Args:
            business_type (str): Business type
            shared_content (Dict[str, str]): Loaded shared content

        Returns:
            str: Relevant interface documentation
        """
        # Get interface key from centralized configuration
        interface_key = get_business_interface(business_type)
        return shared_content.get(interface_key, "")

    def get_system_prompt(self) -> Optional[str]:
        """
        Get the system prompt from database.

        Returns:
            Optional[str]: System prompt content or None if failed
        """
        with self.db_manager.get_session() as db:
            system_prompt = db.query(Prompt).filter(
                Prompt.type == PromptType.SYSTEM,
                Prompt.status == PromptStatus.ACTIVE
            ).order_by(Prompt.created_at.desc()).first()

            return system_prompt.content if system_prompt else None

    def get_prompt_combination(self, business_type: str) -> Optional[str]:
        """
        Get prompt combination for a business type using the new dynamic system.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[str]: Combined prompt content or None if failed
        """
        if self._combination_cache and business_type in self._combination_cache:
            return self._combination_cache[business_type]

        with self.db_manager.get_session() as db:
            # Get business type configuration
            business_config = db.query(BusinessTypeConfig).filter(
                BusinessTypeConfig.code == business_type,
                BusinessTypeConfig.is_active == True
            ).first()

            if not business_config or not business_config.prompt_combination_id:
                print(f"No active prompt combination found for business type: {business_type}")
                return None

            # Get prompt combination with all items
            combination = db.query(PromptCombination).filter(
                PromptCombination.id == business_config.prompt_combination_id,
                PromptCombination.is_active == True,
                PromptCombination.is_valid == True
            ).first()

            if not combination:
                print(f"Invalid or inactive prompt combination for business type: {business_type}")
                return None

            # Get all prompt items in order
            prompt_items = db.query(PromptCombinationItem).filter(
                PromptCombinationItem.combination_id == combination.id
            ).order_by(PromptCombinationItem.order).all()

            if not prompt_items:
                print(f"No prompt items found for combination: {combination.name}")
                return None

            # Build combined prompt
            combined_content = []

            for item in prompt_items:
                if item.prompt:
                    combined_content.append(f"=== {item.prompt.name} ===")
                    combined_content.append(item.prompt.content)
                    combined_content.append("")  # Add spacing between prompts

            final_prompt = "\n".join(combined_content).strip()

            # Cache the result
            if self._combination_cache is None:
                self._combination_cache = {}
            self._combination_cache[business_type] = final_prompt

            return final_prompt

    def build_prompt(self, business_type: str) -> Optional[str]:
        """
        Build a complete prompt using the new prompt combination system.
        Falls back to legacy method if no combination exists.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[str]: Complete assembled prompt or None if failed
        """
        try:
            # Try new prompt combination system first
            combined_prompt = self.get_prompt_combination(business_type)
            if combined_prompt:
                return combined_prompt

            print(f"Using legacy prompt building for {business_type} (no combination found)")

            # Fallback to legacy method
            # Load template
            template = self.load_template()
            if template is None:
                print("Failed to load template from database")
                return None

            # Load shared content
            shared_content = self.load_shared_content()
            if not shared_content:
                print("Failed to load shared content from database")
                return None

            # Load business description
            business_description = self.load_business_description(business_type)
            if business_description is None:
                print(f"Failed to load business description for {business_type}")
                return None

            # Get relevant interface documentation
            interface_docs = self.get_interface_docs_for_business(business_type, shared_content)

            # Replace placeholders
            prompt = template.replace("{{SYSTEM_BACKGROUND}}", shared_content.get("system_background", ""))
            prompt = prompt.replace("{{BUSINESS_DESCRIPTION}}", business_description)
            prompt = prompt.replace("{{ERROR_CODES}}", shared_content.get("error_codes", ""))
            prompt = prompt.replace("{{INTERFACE_DOCS}}", interface_docs)

            return prompt

        except Exception as e:
            print(f"Error building prompt for {business_type}: {e}")
            return None

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
        Build and save a prompt to file (for backward compatibility).

        Args:
            business_type (str): Business type
            output_path (Optional[str]): Output file path

        Returns:
            bool: True if successful, False otherwise
        """
        if output_path is None:
            output_path = f"requirements_{business_type.upper()}.md"

        prompt = self.build_prompt(business_type)
        if prompt is None:
            return False

        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(prompt)
            return True
        except Exception as e:
            print(f"Error saving prompt to {output_path}: {e}")
            return False

    def get_prompt_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about prompts in the database.

        Returns:
            Dict[str, Any]: Statistics dictionary
        """
        from sqlalchemy import func

        with self.db_manager.get_session() as db:
            total_prompts = db.query(Prompt).count()
            active_prompts = db.query(Prompt).filter(Prompt.status == PromptStatus.ACTIVE).count()

            prompts_by_type = db.query(Prompt.type, func.count(Prompt.id)).group_by(Prompt.type).all()
            prompts_by_business_type = db.query(Prompt.business_type, func.count(Prompt.id)).filter(
                Prompt.business_type.isnot(None)
            ).group_by(Prompt.business_type).all()

            return {
                "total_prompts": total_prompts,
                "active_prompts": active_prompts,
                "prompts_by_type": {ptype.value: count for ptype, count in prompts_by_type},
                "prompts_by_business_type": {bt.value: count for bt, count in prompts_by_business_type}
            }

    def search_prompts(self, query: str, prompt_type: Optional[PromptType] = None,
                      business_type: Optional[BusinessType] = None,
                      limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search prompts by content and metadata.

        Args:
            query (str): Search query
            prompt_type (Optional[PromptType]): Filter by prompt type
            business_type (Optional[BusinessType]): Filter by business type
            limit (int): Maximum number of results

        Returns:
            List[Dict[str, Any]]: List of matching prompts as dictionaries
        """
        with self.db_manager.get_session() as db:
            db_query = db.query(Prompt).filter(
                Prompt.status == PromptStatus.ACTIVE,
                Prompt.content.contains(query)
            )

            if prompt_type:
                db_query = db_query.filter(Prompt.type == prompt_type)

            if business_type:
                db_query = db_query.filter(Prompt.business_type == business_type)

            prompts = db_query.limit(limit).all()

            # Convert to dictionaries to avoid session issues
            results = []
            for prompt in prompts:
                results.append({
                    'id': prompt.id,
                    'name': prompt.name,
                    'type': prompt.type.value,
                    'business_type': prompt.business_type.value if prompt.business_type else None,
                    'status': prompt.status.value,
                    'author': prompt.author,
                    'version': prompt.version,
                    'created_at': prompt.created_at,
                    'updated_at': prompt.updated_at
                })

            return results

    def refresh_caches(self):
        """Refresh all internal caches."""
        self._clear_cache()
        # Reload caches
        self.load_shared_content()
        self.load_template()
        # Clear combination cache
        self._combination_cache = None