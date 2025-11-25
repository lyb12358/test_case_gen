"""
Factory for creating Database PromptBuilder instances.
"""

from .config import Config
from .database_prompt_builder import DatabasePromptBuilder


class PromptBuilderFactory:
    """Factory for creating database prompt builders."""

    @staticmethod
    def create_builder(config: Config) -> DatabasePromptBuilder:
        """
        Create a database prompt builder instance.

        Args:
            config (Config): Configuration object

        Returns:
            DatabasePromptBuilder: Database prompt builder instance
        """
        return DatabasePromptBuilder(config)

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