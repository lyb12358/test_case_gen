"""
LLM API client for interacting with language models with enhanced error handling and retry mechanisms.
"""

import logging
import time
import random
import openai
from typing import Dict, Any, Optional
from ..utils.config import Config
from ..exceptions.generation import LLMError, handle_generation_error

logger = logging.getLogger(__name__)


class LLMClient:
    """Enhanced LLM client with comprehensive error handling and retry mechanisms."""

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

        # Retry configuration
        self.default_max_retries = 3
        self.default_base_delay = 1.0  # seconds
        self.max_base_delay = 60.0  # seconds
        self.jitter_factor = 0.1  # Random jitter factor

    @handle_generation_error
    def generate_test_cases(
        self,
        system_prompt: str,
        requirements_prompt: str,
        max_retries: Optional[int] = None
    ) -> Optional[str]:
        """
        Generate test cases using the LLM with enhanced error handling.

        Args:
            system_prompt (str): System prompt for the LLM
            requirements_prompt (str): Requirements prompt for the LLM
            max_retries (Optional[int]): Maximum number of retry attempts

        Returns:
            Optional[str]: LLM response content or None if failed

        Raises:
            LLMError: When all retry attempts fail
        """
        max_attempts = max_retries or self.default_max_retries
        start_time = time.time()
        base_tokens = 80000

        # Adjust token count based on prompt length
        prompt_length = len(system_prompt) + len(requirements_prompt)
        estimated_tokens = max(base_tokens, int(prompt_length * 1.5))

        last_error = None

        for attempt in range(max_attempts + 1):  # +1 for the initial attempt
            try:
                logger.info(f"LLM调用尝试 {attempt + 1}/{max_attempts + 1} - 模型: {self.config.model} - 预估tokens: {estimated_tokens}")

                # Calculate delay for this attempt (exponential backoff with jitter)
                if attempt > 0:
                    delay = self._calculate_retry_delay(attempt, last_error)
                    logger.info(f"等待 {delay:.2f} 秒后重试...")
                    time.sleep(delay)

                api_start = time.time()

                # Prepare the request with proper error handling
                response = self.client.chat.completions.create(
                    model=self.config.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": requirements_prompt}
                    ],
                    max_tokens=8000,  # Reasonable max token limit
                    temperature=0,
                    # top_p=1.0,
                    # frequency_penalty=0.1,
                    # presence_penalty=0.1,
                    timeout=120  # 2 minutes timeout
                )

                api_time = time.time() - api_start
                total_time = time.time() - start_time

                # Extract and validate response
                content = response.choices[0].message.content if response.choices else None

                if not content:
                    raise LLMError(
                        "LLM返回了空响应",
                        model=self.config.model,
                        response_length=0,
                        retry_count=attempt
                    )

                # Log success
                usage = response.usage
                logger.info(
                    f"LLM调用成功 - 尝试次数: {attempt + 1} - "
                    f"API时间: {api_time:.2f}s - "
                    f"总时间: {total_time:.2f}s - "
                    f"输入令牌: {usage.prompt_tokens} - "
                    f"输出令牌: {usage.completion_tokens} - "
                    f"总令牌: {usage.total_tokens}"
                )

                return content

            except openai.RateLimitError as e:
                last_error = e
                logger.warning(f"速率限制错误: {e} (尝试: {attempt + 1})")

                if attempt >= max_attempts:
                    raise LLMError(
                    f"LLM速率限制: {str(e)}",
                    model=self.config.model,
                    retry_count=attempt,
                    details={"error_type": "rate_limit", "retry_after": getattr(e, 'retry_after', None)}
                )

            except openai.TimeoutError as e:
                last_error = e
                logger.error(f"LLM请求超时: {e} (尝试: {attempt + 1})")

                if attempt >= max_attempts:
                    raise LLMError(
                        f"LLM请求超时: {str(e)}",
                        model=self.config.model,
                        retry_count=attempt,
                        details={"error_type": "timeout", "timeout_seconds": 120}
                    )

            except openai.APIError as e:
                last_error = e
                error_code = getattr(e, 'code', 'unknown')
                error_message = str(e)

                logger.error(f"LLM API错误 [{error_code}]: {error_message} (尝试: {attempt + 1})")

                # Determine if error is retryable
                is_retryable = self._is_retryable_error(error_code, error_message)

                if attempt >= max_attempts or not is_retryable:
                    raise LLMError(
                        f"LLM API错误: {error_message}",
                        model=self.config.model,
                        retry_count=attempt,
                        details={"error_code": error_code, "error_type": "api_error", "retryable": is_retryable}
                    )

            except ConnectionError as e:
                last_error = e
                logger.error(f"网络连接错误: {e} (尝试: {attempt + 1})")

                if attempt >= max_attempts:
                    raise LLMError(
                        f"网络连接错误: {str(e)}",
                        model=self.config.model,
                        retry_count=attempt,
                        details={"error_type": "connection"}
                    )

            except Exception as e:
                last_error = e
                logger.error(f"未预期的LLM错误: {type(e).__name__}: {str(e)} (尝试: {attempt + 1})", exc_info=True)

                if attempt >= max_attempts:
                    raise LLMError(
                        f"LLM调用失败: {str(e)}",
                        model=self.config.model,
                        retry_count=attempt,
                        details={"error_type": "unexpected", "exception_type": type(e).__name__}
                    )

        # This should not be reached, but just in case
        raise LLMError(
            f"LLM调用失败，已达到最大重试次数 {max_attempts}",
            model=self.config.model,
            retry_count=max_attempts
        )

    def _calculate_retry_delay(self, attempt: int, last_error: Exception) -> float:
        """
        Calculate retry delay using exponential backoff with jitter.

        Args:
            attempt (int): Current attempt number (0-based)
            last_error (Exception): Last error that occurred

        Returns:
            float: Delay in seconds
        """
        # Base exponential backoff
        base_delay = self.default_base_delay * (2 ** attempt)

        # Cap the delay
        capped_delay = min(base_delay, self.max_base_delay)

        # Add jitter to avoid thundering herd
        jitter = random.uniform(-self.jitter_factor, self.jitter_factor) * capped_delay
        final_delay = max(0.1, capped_delay + jitter)

        # Adjust delay based on error type
        if isinstance(last_error, openai.RateLimitError):
            retry_after = getattr(last_error, 'retry_after', None)
            if retry_after:
                final_delay = max(retry_after, final_delay)

        return final_delay

    def _is_retryable_error(self, error_code: str, error_message: str) -> bool:
        """
        Determine if an LLM error is retryable.

        Args:
            error_code (str): OpenAI error code
            error_message (str): Error message

        Returns:
            bool: Whether the error is retryable
        """
        # Non-retryable error codes
        non_retryable_codes = {
            'invalid_api_key',
            'insufficient_quota',
            'model_not_found',
            'invalid_request_error'
        }

        # Check error code
        if error_code in non_retryable_codes:
            return False

        # Check error message for non-retryable patterns
        non_retryable_patterns = [
            'invalid api key',
            'insufficient quota',
            'model not found',
            'invalid request'
        ]

        error_message_lower = error_message.lower()
        return not any(pattern in error_message_lower for pattern in non_retryable_patterns)

    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the current model configuration.

        Returns:
            Dict[str, Any]: Model information
        """
        return {
            "model": self.config.model,
            "api_base_url": self.config.api_base_url,
            "max_retries": self.default_max_retries,
            "base_delay": self.default_base_delay,
            "max_base_delay": self.max_base_delay
        }

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
            return False