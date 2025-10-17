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
            print(f"=== LLM API Call Started ===")
            print(f"Model: {self.config.model}")
            print(f"API Base: {self.config.api_base_url}")
            print(f"System prompt length: {len(system_prompt)} chars")
            print(f"Requirements prompt length: {len(requirements_prompt)} chars")

            response = self.client.chat.completions.create(
                model=self.config.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": requirements_prompt}
                ],
                temperature=0.7,
                max_tokens=60000,
                response_format={"type": "json_object"}
            )

            # Extract response content (direct JSON format)
            result = response.choices[0].message.content

            # Print usage information if available
            if hasattr(response, 'usage'):
                print(f"API Usage: {response.usage}")
            else:
                print("API Usage: No usage information available")

            print(f"📦 Response received (length: {len(result)} chars)")
            print(f"📄 Response lines: {len(result.splitlines())}")

            # Enhanced response validation for JSON format
            if not result:
                print("❌ Empty response received from LLM")
                return None

            if len(result.strip()) == 0:
                print("❌ Response contains only whitespace")
                return None

            # Quick JSON format validation
            try:
                import json
                json.loads(result)
                print("✅ Response is valid JSON format")
            except json.JSONDecodeError as e:
                print(f"⚠️  Response is not valid JSON: {e}")
                print("🔍 This might indicate a problem with the LLM response format")
                # Don't return None here - let the JSONExtractor handle the detailed parsing

            # Check for common error patterns in response (only for non-JSON responses)
            if not result.strip().startswith('{'):
                error_indicators = ["error", "failed", "exception", "cannot", "unable", "sorry"]
                response_lower = result.lower()
                error_found = False

                for indicator in error_indicators:
                    if indicator in response_lower and len(result) < 500:  # Only check short responses
                        print(f"⚠️  Response contains error indicator: '{indicator}'")
                        print(f"Response preview: {result[:200]}...")
                        error_found = True
                        break

                if error_found:
                    print("❌ Response appears to be an error message")
                    return None

            # Show response preview for debugging (optimized for JSON)
            if result.strip().startswith('{'):
                print("📋 JSON Response preview (first 300 chars):")
                print(result[:300])
                if len(result) > 300:
                    print(f"... (and {len(result) - 300} more characters)")

                # Try to extract and display top-level keys
                try:
                    import json
                    parsed = json.loads(result)
                    if isinstance(parsed, dict):
                        print(f"🔑 JSON top-level keys: {list(parsed.keys())}")
                        if 'test_cases' in parsed:
                            test_cases = parsed.get('test_cases', [])
                            if isinstance(test_cases, list):
                                print(f"📊 Test cases count: {len(test_cases)}")
                except:
                    pass
            else:
                # Show preview for non-JSON responses
                lines = result.splitlines()
                print(f"Response preview (first 5 lines):")
                for i, line in enumerate(lines[:5]):
                    print(f"  {i+1:2d}: {line[:80]}..." if len(line) > 80 else f"  {i+1:2d}: {line}")

                if len(lines) > 5:
                    print(f"  ... and {len(lines) - 5} more lines")

            print(f"✅ LLM API call successful, response ready for JSON extraction")
            return result

        except Exception as e:
            print(f"❌ LLM API call failed:")
            print(f"  Error type: {type(e).__name__}")
            print(f"  Error message: {str(e)}")

            # Enhanced error details for common issues
            error_str = str(e).lower()
            if "openai" in error_str or "api" in error_str:
                if any(word in error_str for word in ["authentication", "unauthorized", "401", "invalid key"]):
                    print(f"  💡 Possible cause: Invalid API key or authentication issue")
                    print(f"     Please check your API_KEY in .env file")
                elif any(word in error_str for word in ["not found", "model", "404"]):
                    print(f"  💡 Possible cause: Model '{self.config.model}' not available")
                    print(f"     Please check if the model name is correct")
                elif any(word in error_str for word in ["timeout", "connection", "network"]):
                    print(f"  💡 Possible cause: Network timeout or connection issue")
                    print(f"     Please check your internet connection")
                elif any(word in error_str for word in ["rate", "limit", "429", "quota"]):
                    print(f"  💡 Possible cause: API rate limit exceeded")
                    print(f"     Please wait and try again later")
                elif any(word in error_str for word in ["length", "token", "too long"]):
                    print(f"  💡 Possible cause: Request too long")
                    print(f"     Consider reducing prompt length")
                elif any(word in error_str for word in ["format", "json", "parse"]):
                    print(f"  💡 Possible cause: Response format issue")
                    print(f"     The model may have returned malformed content")

            # Additional debugging information
            print(f"  API Base URL: {self.config.api_base_url}")
            print(f"  Model: {self.config.model}")
            print(f"  Total prompt length: {len(system_prompt) + len(requirements_prompt)} chars")

            # Save error details for debugging
            try:
                import os
                import time
                os.makedirs("debug", exist_ok=True)
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                error_file = f"debug/llm_error_{timestamp}.txt"

                with open(error_file, 'w', encoding='utf-8') as f:
                    f.write(f"LLM API Error Details\n")
                    f.write(f"Timestamp: {timestamp}\n")
                    f.write(f"Error Type: {type(e).__name__}\n")
                    f.write(f"Error Message: {str(e)}\n")
                    f.write(f"API Base URL: {self.config.api_base_url}\n")
                    f.write(f"Model: {self.config.model}\n")
                    f.write(f"System Prompt Length: {len(system_prompt)}\n")
                    f.write(f"Requirements Prompt Length: {len(requirements_prompt)}\n")

                print(f"  📄 Error details saved to: {error_file}")
            except Exception as save_error:
                print(f"  ⚠️  Could not save error details: {save_error}")

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