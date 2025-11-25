# -*- coding: utf-8 -*-
"""
错误处理中间件，用于统一处理API异常和响应格式化。

提供标准化的错误响应、用户友好的错误提示和详细日志记录。
"""

import logging
import traceback
from typing import Callable, Any, Optional
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from ..exceptions.generation import GenerationError, ErrorCode

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """错误处理中间件。"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        处理请求并捕获异常。

        Args:
            request: HTTP请求
            call_next: 下一个中间件或路由处理函数

        Returns:
            HTTP响应
        """
        try:
            response = await call_next(request)
            return response
        except GenerationError as e:
            return await self._handle_generation_error(e, request)
        except HTTPException as e:
            return await self._handle_http_exception(e, request)
        except Exception as e:
            return await self._handle_unexpected_error(e, request)

    async def _handle_generation_error(self, error: GenerationError, request: Request) -> JSONResponse:
        """
        处理生成相关异常。

        Args:
            error: GenerationError实例
            request: HTTP请求

        Returns:
            JSON格式的错误响应
        """
        # 获取请求ID用于追踪
        request_id = getattr(request.state, 'request_id', None)

        # 根据错误代码确定HTTP状态码
        status_code = self._get_status_code(error.error_code)

        # 构建用户友好的错误信息
        user_message = self._get_user_message(error.error_code, error.message)

        # 记录详细错误信息
        await self._log_error(error, request, request_id)

        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "error": {
                    "code": error.error_code.value,
                    "message": user_message,
                    "details": error.details,
                    "recoverable": error.recoverable,
                    "can_retry": error.can_retry(),
                    "retry_count": error.retry_count,
                    "max_retries": error.max_retries
                },
                "timestamp": self._get_timestamp(),
                "path": str(request.url),
                "request_id": request_id
            }
        )

    async def _handle_http_exception(self, error: HTTPException, request: Request) -> JSONResponse:
        """
        处理HTTP异常。

        Args:
            error: HTTPException实例
            request: HTTP请求

        Returns:
            JSON格式的错误响应
        """
        # 获取请求ID用于追踪
        request_id = getattr(request.state, 'request_id', None)

        logger.warning(f"HTTP异常: {error.status_code} - {error.detail} - 路径: {request.url} - 请求ID: {request_id}")

        return JSONResponse(
            status_code=error.status_code,
            content={
                "success": False,
                "error": {
                    "code": "HTTP_ERROR",
                    "message": str(error.detail),
                    "recoverable": False,
                    "can_retry": False
                },
                "timestamp": self._get_timestamp(),
                "path": str(request.url),
                "request_id": request_id
            }
        )

    async def _handle_unexpected_error(self, error: Exception, request: Request) -> JSONResponse:
        """
        处理未预期的异常。

        Args:
            error: 异常实例
            request: HTTP请求

        Returns:
            JSON格式的错误响应
        """
        # 获取请求ID用于追踪
        request_id = getattr(request.state, 'request_id', None)

        logger.error(
            f"未预期的错误: {type(error).__name__}: {str(error)} - 路径: {request.url} - 请求ID: {request_id}",
            exc_info=True
        )

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "服务器内部错误，请稍后重试",
                    "recoverable": True,
                    "can_retry": True
                },
                "timestamp": self._get_timestamp(),
                "path": str(request.url),
                "request_id": request_id
            }
        )

    def _get_status_code(self, error_code: ErrorCode) -> int:
        """
        根据错误代码获取HTTP状态码。

        Args:
            error_code: 错误代码

        Returns:
            HTTP状态码
        """
        status_map = {
            ErrorCode.VALIDATION_ERROR: 400,
            ErrorCode.INVALID_BUSINESS_TYPE: 400,
            ErrorCode.BUSINESS_TYPE_INACTIVE: 400,
            ErrorCode.NOT_FOUND: 404,
            ErrorCode.TEST_POINT_NOT_FOUND: 404,
            ErrorCode.PROJECT_NOT_FOUND: 404,
            ErrorCode.PERMISSION_DENIED: 403,
            ErrorCode.DUPLICATE_RECORD: 409,
            ErrorCode.RATE_LIMIT_EXCEEDED: 429,
            ErrorCode.RESOURCE_EXHAUSTED: 503,
            ErrorCode.TIMEOUT_ERROR: 508,
            ErrorCode.GENERATION_FAILED: 422,
            ErrorCode.LLM_ERROR: 502,
            ErrorCode.JSON_VALIDATION_ERROR: 422,
            ErrorCode.PROMPT_ERROR: 422,
            ErrorCode.DATA_INCONSISTENCY: 422,
            ErrorCode.DATABASE_ERROR: 500,
            ErrorCode.INTERNAL_ERROR: 500
        }

        return status_map.get(error_code, 500)

    def _get_user_message(self, error_code: ErrorCode, original_message: str) -> str:
        """
        获取用户友好的错误信息。

        Args:
            error_code: 错误代码
            original_message: 原始错误信息

        Returns:
            用户友好的错误信息
        """
        # 为常见错误提供友好的中文提示
        user_messages = {
            ErrorCode.VALIDATION_ERROR: "请求数据格式不正确",
            ErrorCode.INVALID_BUSINESS_TYPE: "指定的业务类型不存在",
            ErrorCode.BUSINESS_TYPE_INACTIVE: "指定的业务类型已停用",
            ErrorCode.NOT_FOUND: "请求的资源不存在",
            ErrorCode.TEST_POINT_NOT_FOUND: "指定的测试点不存在",
            ErrorCode.PROJECT_NOT_FOUND: "指定的项目不存在",
            ErrorCode.PERMISSION_DENIED: "没有权限执行此操作",
            ErrorCode.DUPLICATE_RECORD: "记录已存在，无法重复创建",
            ErrorCode.RATE_LIMIT_EXCEEDED: "请求过于频繁，请稍后重试",
            ErrorCode.RESOURCE_EXHAUSTED: "系统资源不足，请稍后重试",
            ErrorCode.TIMEOUT_ERROR: "操作超时，请稍后重试",
            ErrorCode.GENERATION_FAILED: "生成失败，请检查输入参数",
            ErrorCode.LLM_ERROR: "AI模型服务暂时不可用，请稍后重试",
            ErrorCode.JSON_VALIDATION_ERROR: "数据格式验证失败",
            ErrorCode.PROMPT_ERROR: "提示词配置错误",
            ErrorCode.DATA_INCONSISTENCY: "数据不一致，请联系管理员",
            ErrorCode.DATABASE_ERROR: "数据库操作失败",
            ErrorCode.INTERNAL_ERROR: "服务器内部错误"
        }

        # 如果原始消息已经是用户友好的中文，直接使用；否则使用预设消息
        if self._is_user_friendly_message(original_message):
            return original_message

        return user_messages.get(error_code, original_message)

    def _is_user_friendly_message(self, message: str) -> bool:
        """
        判断错误信息是否对用户友好。

        Args:
            message: 错误信息

        Returns:
            是否对用户友好
        """
        # 检查是否包含中文用户友好消息
        chinese_keywords = [
            "失败", "错误", "不存在", "无效", "重复", "权限", "超时",
            "不可用", "停用", "格式", "验证", "请", "已", "未"
        ]

        return any(keyword in message for keyword in chinese_keywords)

    async def _log_error(self, error: GenerationError, request: Request, request_id: Optional[str] = None):
        """
        记录错误详细信息。

        Args:
            error: GenerationError实例
            request: HTTP请求
            request_id: 请求ID用于追踪
        """
        error_info = {
            "request_id": request_id,
            "error_code": error.error_code.value,
            "message": error.message,
            "severity": error.severity.value,
            "recoverable": error.recoverable,
            "retry_count": error.retry_count,
            "max_retries": error.max_retries,
            "details": error.details,
            "path": str(request.url),
            "method": request.method,
            "headers": dict(request.headers),
            "query_params": dict(request.query_params),
            "timestamp": self._get_timestamp()
        }

        logger.error(f"生成错误详情: {error_info}", exc_info=True)

    def _get_timestamp(self) -> str:
        """
        获取当前时间戳。

        Returns:
            ISO格式的时间戳字符串
        """
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"


def setup_error_handler(app):
    """
    设置FastAPI应用使用错误处理中间件。

    Args:
        app: FastAPI应用实例
    """
    app.add_middleware(ErrorHandlerMiddleware)