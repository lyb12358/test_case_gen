"""
Prompt Builder for dynamically assembling test case generation prompts.
"""

import os
from typing import Optional, Dict, Any
from pathlib import Path

from .file_handler import load_text_file
from .config import Config


class PromptBuilder:
    """Builder class for assembling prompts from template and business-specific content."""

    def __init__(self, config: Config):
        """
        Initialize the prompt builder.

        Args:
            config (Config): Configuration object
        """
        self.config = config
        self.prompts_dir = Path(config.prompts_dir) if hasattr(config, 'prompts_dir') else Path("prompts")
        self.template_path = self.prompts_dir / "requirements_template.md"
        self.shared_dir = self.prompts_dir / "shared"
        self.business_dir = self.prompts_dir / "business_descriptions"

    def load_shared_content(self) -> Dict[str, Optional[str]]:
        """
        Load shared content components.

        Returns:
            Dict[str, Optional[str]]: Dictionary containing shared content
        """
        shared_files = {
            "system_background": self.shared_dir / "system_background.md",
            "error_codes": self.shared_dir / "error_codes.md",
            "swagger_api": self.shared_dir / "swagger_api.md"
        }

        shared_content = {}
        for key, file_path in shared_files.items():
            content = load_text_file(str(file_path))
            if content is None:
                raise FileNotFoundError(f"Failed to load shared content: {file_path}")
            shared_content[key] = content

        return shared_content

    def load_business_description(self, business_type: str) -> Optional[str]:
        """
        Load business-specific description.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[str]: Business description content or None if failed
        """
        business_file = self.business_dir / f"{business_type.upper()}.md"
        return load_text_file(str(business_file))

    def load_template(self) -> Optional[str]:
        """
        Load the main template file.

        Returns:
            Optional[str]: Template content or None if failed
        """
        return load_text_file(str(self.template_path))

    def build_prompt(self, business_type: str) -> Optional[str]:
        """
        Build a complete prompt by combining template with business-specific content.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[str]: Complete assembled prompt or None if failed
        """
        try:
            # Load template
            template = self.load_template()
            if template is None:
                return None

            # Load shared content
            shared_content = self.load_shared_content()

            # Load business description
            business_description = self.load_business_description(business_type)
            if business_description is None:
                return None

            # Replace placeholders
            prompt = template.replace("{{SYSTEM_BACKGROUND}}", shared_content["system_background"])
            prompt = prompt.replace("{{BUSINESS_DESCRIPTION}}", business_description)
            prompt = prompt.replace("{{ERROR_CODES}}", shared_content["error_codes"])
            prompt = prompt.replace("{{SWAGGER_API}}", shared_content["swagger_api"])

            return prompt

        except Exception as e:
            print(f"Error building prompt for {business_type}: {e}")
            return None

    def get_available_business_types(self) -> list[str]:
        """
        Get list of available business types.

        Returns:
            list[str]: List of available business type codes
        """
        if not self.business_dir.exists():
            return []

        business_types = []
        for file_path in self.business_dir.glob("*.md"):
            business_types.append(file_path.stem.upper())

        return sorted(business_types)

    def save_built_prompt(self, business_type: str, output_path: Optional[str] = None) -> bool:
        """
        Build and save a prompt to file.

        Args:
            business_type (str): Business type
            output_path (Optional[str]): Output file path, defaults to prompts/requirements_{business_type}.md

        Returns:
            bool: True if successful, False otherwise
        """
        if output_path is None:
            output_path = str(self.prompts_dir / f"requirements_{business_type.upper()}.md")

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