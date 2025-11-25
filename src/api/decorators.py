# -*- coding: utf-8 -*-
"""
Common decorators for API endpoints to reduce code duplication.
Updated to be compatible with FastAPI dependency injection system.
"""

import functools
import logging
import asyncio
from typing import Callable, Any, TypeVar, Type
from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

T = TypeVar('T')
ModelT = TypeVar('ModelT', bound=BaseModel)


def handle_api_errors(operation_name: str = "操作"):
    """
    Decorator to handle common API errors consistently.
    Compatible with FastAPI dependency injection system.

    Args:
        operation_name: Name of the operation for error messages

    Returns:
        Decorated function with consistent error handling
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs) -> T:
                try:
                    return await func(*args, **kwargs)
                except HTTPException as he:
                    # Re-raise HTTPExceptions without modification
                    logger.error(f"HTTP error in {operation_name}: {he.detail}")
                    raise he
                except Exception as e:
                    logger.error(f"Unexpected error in {operation_name}: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"{operation_name}失败: {str(e)}"
                    )
            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs) -> T:
                try:
                    return func(*args, **kwargs)
                except HTTPException as he:
                    # Re-raise HTTPExceptions without modification
                    logger.error(f"HTTP error in {operation_name}: {he.detail}")
                    raise he
                except Exception as e:
                    logger.error(f"Unexpected error in {operation_name}: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"{operation_name}失败: {str(e)}"
                    )
            return sync_wrapper
    return decorator




# New FastAPI-compatible decorators for common patterns
def fastapi_crud_operation(operation_name: str):
    """
    FastAPI-compatible CRUD operation decorator that combines error handling
    with database dependency injection compatibility.

    Args:
        operation_name: Name of the operation for error messages

    Returns:
        Decorated function with error handling that works with FastAPI's Depends()
    """
    return handle_api_errors(operation_name)




def service_operation(
    service_class: Type,
    service_param: str = "service",
    db_param: str = "db"
):
    """
    Decorator to automatically instantiate and manage service objects.
    Compatible with FastAPI dependency injection.

    Args:
        service_class: The service class to instantiate
        service_param: Name to use for the service parameter
        db_param: Name of the database session parameter

    Returns:
        Decorated function with automatic service instantiation
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            try:
                # For FastAPI, the database session is injected as a parameter, not in kwargs
                # We need to inspect the function signature to find the db parameter
                import inspect
                sig = inspect.signature(func)

                # Find database session parameter
                db = None
                for param_name, param in sig.parameters.items():
                    if param_name == db_param:
                        # The database session should be provided as a direct parameter
                        # We need to find it in args or kwargs
                        if len(args) > list(sig.parameters.keys()).index(param_name):
                            param_index = list(sig.parameters.keys()).index(param_name)
                            db = args[param_index]
                        elif param_name in kwargs:
                            db = kwargs[param_name]
                        break

                if not db or not isinstance(db, Session):
                    raise ValueError(f"Database session '{db_param}' not found or not a Session. Use Depends(get_db)")

                # Instantiate service
                service = service_class(db)

                # Add service to kwargs
                kwargs[service_param] = service

                # Handle both sync and async functions
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            except HTTPException:
                # Re-raise HTTPExceptions without modification
                raise
            except Exception as e:
                logger.error(f"Service operation error: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Service operation failed: {str(e)}"
                )
        return wrapper
    return decorator


# Combined decorators for common patterns
def api_crud_operation(operation_name: str, service_class: Type):
    """
    Combined decorator for typical CRUD operations.

    Args:
        operation_name: Name of the operation for error messages
        service_class: The service class to use

    Returns:
        Decorated function with full CRUD operation handling
    """
    def decorator(func):
        # Apply service_operation and handle_api_errors in correct order
        # This ensures proper exception handling and dependency injection
        decorated_func = service_operation(service_class)(func)
        decorated_func = handle_api_errors(operation_name)(decorated_func)
        return decorated_func
    return decorator


def handle_generation_errors(func: Callable[..., T]) -> Callable[..., T]:
    """
    专门处理生成流程异常的装饰器，统一处理GenerationError异常。
    这将替换所有重复的try-catch块。

    Returns:
        装饰后的函数，具有统一的GenerationError处理逻辑
    """
    if asyncio.iscoroutinefunction(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            operation_name = f"{func.__module__}.{func.__name__}"

            try:
                return await func(*args, **kwargs)

            except HTTPException:
                # 直接重新抛出HTTP异常
                raise

            except Exception as e:
                # 检查是否是GenerationError（通过导入检查）
                try:
                    from ..exceptions.generation import GenerationError, ErrorCode

                    if isinstance(e, GenerationError):
                        # 处理生成相关错误
                        logger.error(f"生成错误在 {operation_name}: {e.message}")

                        # 错误代码到HTTP状态码的映射
                        error_status_mapping = {
                            ErrorCode.VALIDATION_ERROR: 400,
                            ErrorCode.NOT_FOUND: 404,
                            ErrorCode.PERMISSION_DENIED: 403,
                            ErrorCode.INVALID_BUSINESS_TYPE: 400,
                            ErrorCode.BUSINESS_TYPE_INACTIVE: 400,
                            ErrorCode.TEST_POINT_NOT_FOUND: 404,
                            ErrorCode.PROJECT_NOT_FOUND: 404,
                            ErrorCode.DUPLICATE_RECORD: 409,
                            ErrorCode.LLM_ERROR: 502,
                            ErrorCode.PROMPT_ERROR: 400,
                            ErrorCode.JSON_VALIDATION_ERROR: 400,
                            ErrorCode.TIMEOUT_ERROR: 408,
                            ErrorCode.RATE_LIMIT_EXCEEDED: 429,
                            ErrorCode.RESOURCE_EXHAUSTED: 503,
                            ErrorCode.DATABASE_ERROR: 500,
                            ErrorCode.DATA_INCONSISTENCY: 500,
                            ErrorCode.GENERATION_FAILED: 500,
                            ErrorCode.INTERNAL_ERROR: 500,
                        }

                        status_code = error_status_mapping.get(e.error_code, 500)

                        raise HTTPException(
                            status_code=status_code,
                            detail=e.to_dict()
                        )
                    else:
                        # 不是GenerationError，使用通用处理
                        raise

                except ImportError:
                    # 如果无法导入GenerationError，使用通用处理
                    raise

        return async_wrapper
    else:
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            operation_name = f"{func.__module__}.{func.__name__}"

            try:
                return func(*args, **kwargs)

            except HTTPException:
                # 直接重新抛出HTTP异常
                raise

            except Exception as e:
                # 检查是否是GenerationError
                try:
                    from ..exceptions.generation import GenerationError, ErrorCode

                    if isinstance(e, GenerationError):
                        logger.error(f"生成错误在 {operation_name}: {e.message}")

                        error_status_mapping = {
                            ErrorCode.VALIDATION_ERROR: 400,
                            ErrorCode.NOT_FOUND: 404,
                            ErrorCode.PERMISSION_DENIED: 403,
                            ErrorCode.INVALID_BUSINESS_TYPE: 400,
                            ErrorCode.BUSINESS_TYPE_INACTIVE: 400,
                            ErrorCode.TEST_POINT_NOT_FOUND: 404,
                            ErrorCode.PROJECT_NOT_FOUND: 404,
                            ErrorCode.DUPLICATE_RECORD: 409,
                            ErrorCode.LLM_ERROR: 502,
                            ErrorCode.PROMPT_ERROR: 400,
                            ErrorCode.JSON_VALIDATION_ERROR: 400,
                            ErrorCode.TIMEOUT_ERROR: 408,
                            ErrorCode.RATE_LIMIT_EXCEEDED: 429,
                            ErrorCode.RESOURCE_EXHAUSTED: 503,
                            ErrorCode.DATABASE_ERROR: 500,
                            ErrorCode.DATA_INCONSISTENCY: 500,
                            ErrorCode.GENERATION_FAILED: 500,
                            ErrorCode.INTERNAL_ERROR: 500,
                        }

                        status_code = error_status_mapping.get(e.error_code, 500)

                        raise HTTPException(
                            status_code=status_code,
                            detail=e.to_dict()
                        )
                    else:
                        # 不是GenerationError，使用通用处理
                        raise

                except ImportError:
                    # 如果无法导入GenerationError，使用通用处理
                    raise

        return sync_wrapper


# 常用的组合装饰器
def standard_generation_endpoint(func: Callable[..., T]) -> Callable[..., T]:
    """
    标准生成API端点装饰器，结合了通用错误处理和生成特定错误处理。

    这个装饰器应该用在所有生成相关的API端点上，以替换重复的try-catch块。
    """
    return handle_generation_errors(handle_api_errors("生成操作")(func))


# 为了向后兼容，提供一个更简洁的别名
generation_error_handler = handle_generation_errors