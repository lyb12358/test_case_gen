# -*- coding: utf-8 -*-
"""
统一异常类模块，用于标准化生成流程中的错误处理。

提供统一的异常类型、错误代码和用户友好的错误信息。
"""

from enum import Enum
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class ErrorCode(Enum):
    """标准化的错误代码枚举。"""

    # 通用错误
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    PERMISSION_DENIED = "PERMISSION_DENIED"

    # 生成相关错误
    GENERATION_FAILED = "GENERATION_FAILED"
    LLM_ERROR = "LLM_ERROR"
    PROMPT_ERROR = "PROMPT_ERROR"
    JSON_VALIDATION_ERROR = "JSON_VALIDATION_ERROR"

    # 业务相关错误
    INVALID_BUSINESS_TYPE = "INVALID_BUSINESS_TYPE"
    BUSINESS_TYPE_INACTIVE = "BUSINESS_TYPE_INACTIVE"
    TEST_POINT_NOT_FOUND = "TEST_POINT_NOT_FOUND"
    PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND"

    # 数据库相关错误
    DATABASE_ERROR = "DATABASE_ERROR"
    DATA_INCONSISTENCY = "DATA_INCONSISTENCY"
    DUPLICATE_RECORD = "DUPLICATE_RECORD"

    # 资源相关错误
    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"


class ErrorSeverity(Enum):
    """错误严重程度。"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GenerationError(Exception):
    """生成流程的基础异常类。"""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        details: Optional[Dict[str, Any]] = None,
        recoverable: bool = False,
        retry_count: int = 0,
        max_retries: int = 3
    ):
        """
        初始化生成异常。

        Args:
            message: 错误信息
            error_code: 错误代码
            severity: 错误严重程度
            details: 错误详细信息
            recoverable: 是否可恢复
            retry_count: 当前重试次数
            max_retries: 最大重试次数
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.severity = severity
        self.details = details or {}
        self.recoverable = recoverable
        self.retry_count = retry_count
        self.max_retries = max_retries
        self.timestamp = None

        # 记录错误日志
        self._log_error()

    def _log_error(self):
        """记录错误日志。"""
        log_method = {
            ErrorSeverity.LOW: logger.info,
            ErrorSeverity.MEDIUM: logger.warning,
            ErrorSeverity.HIGH: logger.error,
            ErrorSeverity.CRITICAL: logger.critical
        }.get(self.severity, logger.error)

        log_method(
            f"GenerationError [{self.error_code.value}]: {self.message} | "
            f"Recoverable: {self.recoverable} | Retry: {self.retry_count}/{self.max_retries} | "
            f"Details: {self.details}"
        )

    def can_retry(self) -> bool:
        """检查是否可以重试。"""
        return self.recoverable and self.retry_count < self.max_retries

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式。"""
        return {
            "error": True,
            "error_code": self.error_code.value,
            "message": self.message,
            "severity": self.severity.value,
            "details": self.details,
            "recoverable": self.recoverable,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "can_retry": self.can_retry()
        }


class LLMError(GenerationError):
    """LLM调用相关错误。"""

    def __init__(
        self,
        message: str,
        model: str = None,
        prompt_length: int = None,
        response_length: int = None,
        retry_count: int = 0,
        max_retries: int = 3
    ):
        details = {}
        if model:
            details["model"] = model
        if prompt_length:
            details["prompt_length"] = prompt_length
        if response_length:
            details["response_length"] = response_length

        super().__init__(
            message=message,
            error_code=ErrorCode.LLM_ERROR,
            severity=ErrorSeverity.HIGH,
            details=details,
            recoverable=True,
            retry_count=retry_count,
            max_retries=max_retries
        )
        self.model = model
        self.prompt_length = prompt_length
        self.response_length = response_length


class ValidationError(GenerationError):
    """数据验证错误。"""

    def __init__(self, message: str, field: str = None, value: Any = None):
        details = {}
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = str(value)

        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            severity=ErrorSeverity.MEDIUM,
            details=details,
            recoverable=False
        )
        self.field = field
        self.value = value


class BusinessTypeError(GenerationError):
    """业务类型相关错误。"""

    def __init__(self, message: str, business_type: str = None, is_inactive: bool = False):
        details = {"business_type": business_type}
        if is_inactive:
            details["is_inactive"] = True

        error_code = ErrorCode.BUSINESS_TYPE_INACTIVE if is_inactive else ErrorCode.INVALID_BUSINESS_TYPE

        super().__init__(
            message=message,
            error_code=error_code,
            severity=ErrorSeverity.MEDIUM,
            details=details,
            recoverable=False
        )
        self.business_type = business_type
        self.is_inactive = is_inactive


class DatabaseError(GenerationError):
    """数据库操作错误。"""

    def __init__(
        self,
        message: str,
        operation: str = None,
        table: str = None,
        query_params: Dict[str, Any] = None
    ):
        details = {}
        if operation:
            details["operation"] = operation
        if table:
            details["table"] = table
        if query_params:
            details["query_params"] = query_params

        super().__init__(
            message=message,
            error_code=ErrorCode.DATABASE_ERROR,
            severity=ErrorSeverity.HIGH,
            details=details,
            recoverable=True,
            max_retries=2
        )
        self.operation = operation
        self.table = table
        self.query_params = query_params


class JSONValidationError(GenerationError):
    """JSON验证错误。"""

    def __init__(self, message: str, json_data: str = None, validation_rules: list = None):
        details = {}
        if json_data:
            details["json_preview"] = json_data[:200] + "..." if len(json_data) > 200 else json_data
        if validation_rules:
            details["validation_rules"] = validation_rules

        super().__init__(
            message=message,
            error_code=ErrorCode.JSON_VALIDATION_ERROR,
            severity=ErrorSeverity.HIGH,
            details=details,
            recoverable=False
        )
        self.json_data = json_data
        self.validation_rules = validation_rules


def handle_generation_error(func):
    """
    装饰器：自动处理生成函数中的异常。

    将标准异常转换为GenerationError，并记录错误信息。
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except GenerationError:
            # 已经是GenerationError，直接重新抛出
            raise
        except ValueError as e:
            raise ValidationError(f"数据验证失败: {str(e)}")
        except ConnectionError as e:
            raise LLMError(f"LLM连接错误: {str(e)}", retry_count=0)
        except TimeoutError as e:
            raise GenerationError(
                f"操作超时: {str(e)}",
                error_code=ErrorCode.TIMEOUT_ERROR,
                severity=ErrorSeverity.HIGH,
                recoverable=True
            )
        except Exception as e:
            logger.error(f"未预期的错误在 {func.__name__}: {str(e)}", exc_info=True)
            raise GenerationError(
                f"内部错误: {str(e)}",
                error_code=ErrorCode.INTERNAL_ERROR,
                severity=ErrorSeverity.CRITICAL,
                details={"function": func.__name__, "original_error": str(e)}
            )

    return wrapper