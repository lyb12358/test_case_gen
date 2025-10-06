"""
LLM API client for interacting with language models.
"""

import openai
from typing import Dict, Any, Optional
from ..utils.config import Config


class LLMClient:
    """Client for interacting with LLM APIs."""

    def __init__(self, config: Config):
        """
        Initialize the LLM client.

        Args:
            config (Config): Configuration object
        """
        self.config = config
        self.client = openai.OpenAI(
            api_key=config.api_key,
            base_url=config.api_base_url
        )

    def generate_test_cases(self, system_prompt: str, requirements_prompt: str) -> Optional[str]:
        """
        Generate test cases using the LLM.

        Args:
            system_prompt (str): System prompt for the LLM
            requirements_prompt (str): Requirements prompt for the LLM

        Returns:
            Optional[str]: LLM response content or None if failed
        """
        try:
            response = self.client.chat.completions.create(
                model=self.config.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": requirements_prompt}
                ],
                temperature=0.7,
                max_tokens=60000
            )

            # Extract response content
            result = response.choices[0].message.content

            # Print usage information if available
            if hasattr(response, 'usage'):
                print(f"Usage: {response.usage}")

            return result

        except Exception as e:
            print(f"Error calling API: {e}")
            return None

    def test_connection(self) -> bool:
        """
        Test the connection to the LLM API.

        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            response = self.client.chat.completions.create(
                model=self.config.model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            return True
        except Exception as e:
            print(f"Error testing API connection: {e}")
            return False