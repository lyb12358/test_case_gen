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
        import time

        start_time = time.time()
        max_attempts = 3
        base_tokens = 80000

        for attempt in range(max_attempts):
            try:
                print(f"[LLM] API Call Attempt {attempt + 1}/{max_attempts}")
                print(f"[INFO] Model: {self.config.model} | Tokens: {base_tokens}")

                api_start = time.time()
                response = self.client.chat.completions.create(
                    model=self.config.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": requirements_prompt}
                    ],
                    temperature=0.7,
                    max_tokens=base_tokens,
                    response_format={"type": "json_object"}
                )
                api_time = time.time() - api_start

                # Extract response content
                result = response.choices[0].message.content

                if hasattr(response, 'usage'):
                    print(f"[API] Usage: {response.usage} | Time: {api_time:.2f}s")
                else:
                    print(f"[API] Time: {api_time:.2f}s")

                # Enhanced response validation
                if not result or len(result.strip()) == 0:
                    print(f"[ERROR] Empty response on attempt {attempt + 1}")
                    continue

                # Check for truncation indicators
                if self._is_response_truncated(result):
                    print(f"[WARN] Response truncated on attempt {attempt + 1}")
                    if attempt < max_attempts - 1:
                        # Increase token limit for next attempt
                        base_tokens = min(base_tokens + 20000, 120000)
                        print(f"[RETRY] With increased token limit: {base_tokens}")
                        continue
                    else:
                        print("[ERROR] Max attempts reached, response still truncated")
                        return None

                # Quick JSON validation
                try:
                    import json
                    json.loads(result)
                    total_time = time.time() - start_time
                    print(f"[OK] LLM call successful | Total time: {total_time:.2f}s | Length: {len(result)} chars")
                    return result
                except json.JSONDecodeError as e:
                    print(f"[WARN] JSON parsing failed on attempt {attempt + 1}: {str(e)[:100]}")
                    if attempt < max_attempts - 1:
                        print("[RETRY] Parsing...")
                        continue
                    else:
                        print("[ERROR] Max attempts reached, JSON still invalid")
                        # Don't return None here - let JSONExtractor handle repair attempts
                        total_time = time.time() - start_time
                        print(f"[TIME] Total: {total_time:.2f}s | Response length: {len(result)} chars")
                        return result

            except Exception as e:
                print(f"[ERROR] API call failed on attempt {attempt + 1}: {type(e).__name__}: {str(e)[:100]}")
                if attempt < max_attempts - 1:
                    print("[RETRY] With backoff...")
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    print("[ERROR] Max attempts reached")
                    self._log_api_error(e, system_prompt, requirements_prompt)
                    return None

        return None

    def _is_response_truncated(self, response: str) -> bool:
        """
        Check if the response appears to be truncated.

        Args:
            response (str): The LLM response

        Returns:
            bool: True if response appears truncated
        """
        response = response.strip()

        # Check if JSON is properly closed
        if not response.endswith('}') and not response.endswith(']'):
            return True

        # Basic JSON structure validation
        try:
            import json
            json.loads(response)
            return False
        except json.JSONDecodeError as e:
            # Check for common truncation patterns
            error_msg = str(e).lower()
            if any(indicator in error_msg for indicator in ['unterminated string', 'expecting','incomplete']):
                return True
            return False

    def _log_api_error(self, error: Exception, system_prompt: str, requirements_prompt: str) -> None:
        """
        Log API error details for debugging.

        Args:
            error (Exception): The error that occurred
            system_prompt (str): System prompt
            requirements_prompt (str): Requirements prompt
        """
        print(f"[ERROR] LLM API Error: {type(error).__name__}: {str(error)[:100]}...")
        print(f"[INFO] API Base URL: {self.config.api_base_url}")
        print(f"[INFO] Model: {self.config.model}")
        print(f"[INFO] System Prompt Length: {len(system_prompt)}")
        print(f"[INFO] Requirements Prompt Length: {len(requirements_prompt)}")

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