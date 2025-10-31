"""
Factory for creating appropriate PromptBuilder instances.
"""

from typing import Union
from .config import Config
from .prompt_builder import PromptBuilder
from .database_prompt_builder import DatabasePromptBuilder


class PromptBuilderFactory:
    """Factory for creating prompt builders based on configuration."""

    @staticmethod
    def create_builder(config: Config, use_database: bool = True) -> Union[PromptBuilder, DatabasePromptBuilder]:
        """
        Create a prompt builder instance.

        Args:
            config (Config): Configuration object
            use_database (bool): Whether to use database-based builder (default: True)

        Returns:
            Union[PromptBuilder, DatabasePromptBuilder]: Appropriate prompt builder instance
        """
        if use_database:
            return DatabasePromptBuilder(config)
        else:
            return PromptBuilder(config)

    @staticmethod
    def create_database_builder(config: Config) -> DatabasePromptBuilder:
        """
        Create a database-based prompt builder.

        Args:
            config (Config): Configuration object

        Returns:
            DatabasePromptBuilder: Database prompt builder instance
        """
        return DatabasePromptBuilder(config)

    @staticmethod
    def create_file_builder(config: Config) -> PromptBuilder:
        """
        Create a file-based prompt builder.

        Args:
            config (Config): Configuration object

        Returns:
            PromptBuilder: File-based prompt builder instance
        """
        return PromptBuilder(config)