"""
Configuration management utilities.
"""

import os
from typing import Optional
from dotenv import load_dotenv


class Config:
    """Configuration class for managing environment variables and settings."""

    def __init__(self, env_file: Optional[str] = None):
        """Initialize configuration with optional environment file."""
        if env_file:
            load_dotenv(env_file)
        else:
            load_dotenv()

    @property
    def api_key(self) -> str:
        """Get API key from environment."""
        return os.getenv('API_KEY', '')

    @property
    def api_base_url(self) -> str:
        """Get API base URL from environment."""
        return os.getenv('API_BASE_URL', '')

    @property
    def model(self) -> str:
        """Get model name from environment."""
        return os.getenv('MODEL', '')

    @property
    def system_prompt_path(self) -> str:
        """Get system prompt file path from environment."""
        return os.getenv('SYSTEM_PROMPT_PATH', 'prompts/system.md')

    @property
    def requirements_prompt_path(self) -> str:
        """Get requirements prompt file path from environment."""
        return os.getenv('REQUIREMENTS_PROMPT_PATH', 'prompts/requirements.md')

    @property
    def business_type(self) -> str:
        """Get business type from environment."""
        return os.getenv('BUSINESS_TYPE', '')

    @property
    def prompts_dir(self) -> str:
        """Get prompts directory path."""
        return os.getenv('PROMPTS_DIR', 'prompts')

    def get_requirements_prompt_path(self, business_type: Optional[str] = None) -> str:
        """
        Get requirements prompt file path, optionally for a specific business type.

        Args:
            business_type (Optional[str]): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            str: Path to requirements prompt file
        """
        if business_type:
            return f'{self.prompts_dir}/requirements_{business_type.upper()}.md'
        return self.requirements_prompt_path

    @property
    def json_file_path(self) -> str:
        """Get JSON file path for interface test generation."""
        return os.getenv('JSON_FILE_PATH', '')

    @property
    def output_dir(self) -> str:
        """Get output directory path."""
        return os.getenv('OUTPUT_DIR', 'output')

    @property
    def interface_tests_dir(self) -> str:
        """Get interface tests directory path."""
        return os.getenv('INTERFACE_TESTS_DIR', 'interface_tests')

    @property
    def database_url(self) -> str:
        """Get MySQL database URL from environment."""
        # Build MySQL connection string from environment variables
        user = os.getenv('USER', '')
        password = os.getenv('PASSWORD', '')
        database = os.getenv('DATABASE', '')
        host = os.getenv('HOST', '127.0.0.1:3306')

        # Validate required MySQL connection parameters
        if not all([user, password, database, host]):
            raise ValueError("Missing required MySQL connection parameters. Please check USER, PASSWORD, DATABASE, and HOST in .env file")

        return f'mysql+pymysql://{user}:{password}@{host}/{database}'

    def validate_main_config(self) -> bool:
        """Validate that all required main configuration is present."""
        required_vars = [
            self.api_key,
            self.api_base_url,
            self.model,
            self.system_prompt_path,
            self.requirements_prompt_path
        ]
        return all(required_vars)

    def validate_interface_config(self) -> bool:
        """Validate that interface test configuration is present."""
        return bool(self.json_file_path)