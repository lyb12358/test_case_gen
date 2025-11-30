# -*- coding: utf-8 -*-
"""
请求验证中间件，用于增强API输入验证和安全性。

提供统一的请求验证、输入清理和安全检查。
"""

import logging
import json
from typing import Callable, Any, Optional, Dict, List
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import ValidationError
import re

from ..exceptions.generation import ValidationError as CustomValidationError, ErrorCode

logger = logging.getLogger(__name__)


class ValidationMiddleware(BaseHTTPMiddleware):
    """请求验证中间件。"""

    def __init__(self, app, max_request_size: int = 10 * 1024 * 1024):  # 10MB
        """
        初始化验证中间件。

        Args:
            app: FastAPI应用实例
            max_request_size: 最大请求大小（字节）
        """
        super().__init__(app)
        self.max_request_size = max_request_size

        # 配置需要验证的路径和规则
        self.validation_rules = {
            # POST /api/v1/unified-generation/test-points/generate
            r"/api/v1/unified-generation/test-points/generate": self._validate_test_points_request,

            # POST /api/v1/unified-generation/test-cases/generate
            r"/api/v1/unified-generation/test-cases/generate": self._validate_test_cases_request,

            # POST /api/v1/unified-generation/generate
            r"/api/v1/unified-generation/generate": self._validate_unified_generation_request,

            # POST /api/v1/unified-generation/test-cases
            r"/api/v1/unified-generation/test-cases$": self._validate_test_case_create_request,

            # PUT /api/v1/unified-generation/test-cases/{id}
            r"/api/v1/unified-generation/test-cases/\d+$": self._validate_test_case_update_request,
        }

        # 危险字段模式
        self.dangerous_patterns = [
            r'<script[^>]*>.*?</script>',  # XSS
            r'javascript:',               # JavaScript URL
            r'on\w+\s*=',                # Event handlers
            r'eval\s*\(',                # eval()
            r'document\.',               # Document access
            r'window\.',                 # Window access
        ]

        # SQL注入模式
        self.sql_injection_patterns = [
            r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"('.*')\s*(OR|AND)\s*('.*')\s*=",
            r"(--|#|/\*|\*/)",           # SQL comments
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        处理请求并进行验证。

        Args:
            request: HTTP请求
            call_next: 下一个中间件或路由处理函数

        Returns:
            HTTP响应
        """
        try:
            # 基础验证
            await self._validate_basic_request(request)

            # 路径特定验证
            await self._validate_path_specific(request)

            # 调用下一个处理器
            response = await call_next(request)
            return response

        except CustomValidationError as e:
            return await self._handle_validation_error(e, request)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"验证中间件错误: {str(e)}", exc_info=True)
            return await self._handle_unexpected_error(e, request)

    async def _validate_basic_request(self, request: Request):
        """
        基础请求验证。

        Args:
            request: HTTP请求
        """
        # 检查请求大小
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_request_size:
            raise CustomValidationError(
                f"请求大小超出限制 ({self.max_request_size} bytes)",
                field="content_length",
                value=content_length
            )

        # 检查Content-Type
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if not any(ct in content_type.lower() for ct in ["application/json", "multipart/form-data"]):
                # 允许表单数据但记录警告
                if "application/x-www-form-urlencoded" not in content_type.lower():
                    logger.warning(f"可疑的Content-Type: {content_type} for {request.url}")

    async def _validate_path_specific(self, request: Request):
        """
        路径特定验证。

        Args:
            request: HTTP请求
        """
        path = str(request.url.path)
        method = request.method

        # 查找匹配的验证规则
        for pattern, validator in self.validation_rules.items():
            if re.match(pattern, path) and method in ["POST", "PUT", "PATCH"]:
                await validator(request)
                break

    async def _validate_test_points_request(self, request: Request):
        """验证测试点生成请求。"""
        try:
            body = await request.json()

            # 必需字段验证
            required_fields = ["business_type", "project_id"]
            for field in required_fields:
                if field not in body:
                    raise CustomValidationError(f"缺少必需字段: {field}", field=field)

            # 业务类型验证
            business_type = body.get("business_type", "")
            if not isinstance(business_type, str) or len(business_type.strip()) == 0:
                raise CustomValidationError("业务类型不能为空", field="business_type")

            if not re.match(r'^[A-Z]{3,6}$', business_type):
                raise CustomValidationError(
                    "业务类型格式无效，应为3-6位大写字母",
                    field="business_type",
                    value=business_type
                )

            # 项目ID验证
            project_id = body.get("project_id")
            if not isinstance(project_id, int) or project_id <= 0:
                raise CustomValidationError(
                    "项目ID必须为正整数",
                    field="project_id",
                    value=project_id
                )

            # 上下文验证
            additional_context = body.get("additional_context", {})
            if additional_context and not isinstance(additional_context, dict):
                raise CustomValidationError(
                    "additional_context必须为对象类型",
                    field="additional_context",
                    value=type(additional_context).__name__
                )

            # 检查危险内容
            await self._check_dangerous_content(body)

        except json.JSONDecodeError as e:
            raise CustomValidationError(f"JSON格式错误: {str(e)}")
        except Exception as e:
            if isinstance(e, CustomValidationError):
                raise
            raise CustomValidationError(f"请求数据验证失败: {str(e)}")

    async def _validate_test_cases_request(self, request: Request):
        """验证测试用例生成请求。"""
        try:
            body = await request.json()

            # 必需字段验证
            required_fields = ["business_type", "test_point_ids", "project_id"]
            for field in required_fields:
                if field not in body:
                    raise CustomValidationError(f"缺少必需字段: {field}", field=field)

            # 业务类型验证
            business_type = body.get("business_type", "")
            if not isinstance(business_type, str) or not re.match(r'^[A-Z]{3,6}$', business_type):
                raise CustomValidationError("业务类型格式无效", field="business_type")

            # 测试点ID验证
            test_point_ids = body.get("test_point_ids", [])
            if not isinstance(test_point_ids, list) or len(test_point_ids) == 0:
                raise CustomValidationError(
                    "test_point_ids必须为非空数组",
                    field="test_point_ids",
                    value=test_point_ids
                )

            # 验证每个测试点ID
            for i, test_point_id in enumerate(test_point_ids):
                if not isinstance(test_point_id, int) or test_point_id <= 0:
                    raise CustomValidationError(
                        f"测试点ID[{i}]必须为正整数",
                        field="test_point_ids",
                        value=test_point_id
                    )

            # 项目ID验证
            project_id = body.get("project_id")
            if not isinstance(project_id, int) or project_id <= 0:
                raise CustomValidationError("项目ID必须为正整数", field="project_id")

            # 检查危险内容
            await self._check_dangerous_content(body)

        except json.JSONDecodeError as e:
            raise CustomValidationError(f"JSON格式错误: {str(e)}")
        except Exception as e:
            if isinstance(e, CustomValidationError):
                raise
            raise CustomValidationError(f"请求数据验证失败: {str(e)}")

    async def _validate_unified_generation_request(self, request: Request):
        """验证统一生成请求。"""
        try:
            body = await request.json()

            # 必需字段验证
            required_fields = ["business_type", "project_id", "generation_mode"]
            for field in required_fields:
                if field not in body:
                    raise CustomValidationError(f"缺少必需字段: {field}", field=field)

            # 生成模式验证
            generation_mode = body.get("generation_mode", "")
            valid_modes = ["test_points_only", "test_cases_only"]
            if generation_mode not in valid_modes:
                raise CustomValidationError(
                    f"生成模式必须为: {', '.join(valid_modes)}",
                    field="generation_mode",
                    value=generation_mode
                )

            # 如果是测试用例模式，需要test_point_ids
            if generation_mode == "test_cases_only":
                test_point_ids = body.get("test_point_ids", [])
                if not isinstance(test_point_ids, list) or len(test_point_ids) == 0:
                    raise CustomValidationError(
                        "test_cases_only模式需要提供test_point_ids",
                        field="test_point_ids"
                    )

            # 业务类型和项目ID验证
            await self._validate_business_type_and_project(body)

            # 检查危险内容
            await self._check_dangerous_content(body)

        except json.JSONDecodeError as e:
            raise CustomValidationError(f"JSON格式错误: {str(e)}")
        except Exception as e:
            if isinstance(e, CustomValidationError):
                raise
            raise CustomValidationError(f"请求数据验证失败: {str(e)}")

    async def _validate_test_case_create_request(self, request: Request):
        """验证测试用例创建请求。"""
        try:
            body = await request.json()

            # 必需字段验证
            required_fields = ["name", "business_type", "project_id", "test_case_id"]
            for field in required_fields:
                if field not in body:
                    raise CustomValidationError(f"缺少必需字段: {field}", field=field)

            # 名称验证
            name = body.get("name", "").strip()
            if len(name) == 0 or len(name) > 200:
                raise CustomValidationError(
                    "名称长度必须在1-200字符之间",
                    field="name",
                    value=name
                )

            # 业务类型和项目ID验证
            await self._validate_business_type_and_project(body)

            # 优先级验证
            priority = body.get("priority", "medium")
            valid_priorities = ["low", "medium", "high"]
            if priority not in valid_priorities:
                raise CustomValidationError(
                    f"优先级必须为: {', '.join(valid_priorities)}",
                    field="priority",
                    value=priority
                )

            # 检查危险内容
            await self._check_dangerous_content(body)

        except json.JSONDecodeError as e:
            raise CustomValidationError(f"JSON格式错误: {str(e)}")
        except Exception as e:
            if isinstance(e, CustomValidationError):
                raise
            raise CustomValidationError(f"请求数据验证失败: {str(e)}")

    async def _validate_test_case_update_request(self, request: Request):
        """验证测试用例更新请求。"""
        try:
            body = await request.json()

            # 检查是否为空请求
            if len(body.keys()) == 0:
                raise CustomValidationError("更新请求不能为空")

            # 名称验证（如果提供）
            if "name" in body:
                name = body["name"].strip()
                if len(name) == 0 or len(name) > 200:
                    raise CustomValidationError(
                        "名称长度必须在1-200字符之间",
                        field="name",
                        value=name
                    )

            # 业务类型验证（如果提供）
            if "business_type" in body:
                business_type = body["business_type"]
                if not isinstance(business_type, str) or not re.match(r'^[A-Z]{3,6}$', business_type):
                    raise CustomValidationError("业务类型格式无效", field="business_type")

            # 优先级验证（如果提供）
            if "priority" in body:
                priority = body["priority"]
                valid_priorities = ["low", "medium", "high"]
                if priority not in valid_priorities:
                    raise CustomValidationError(
                        f"优先级必须为: {', '.join(valid_priorities)}",
                        field="priority",
                        value=priority
                    )

            # 状态验证（如果提供）
            if "status" in body:
                status = body["status"]
                valid_statuses = ["draft", "approved", "rejected", "completed"]
                if status not in valid_statuses:
                    raise CustomValidationError(
                        f"状态必须为: {', '.join(valid_statuses)}",
                        field="status",
                        value=status
                    )

            # 检查危险内容
            await self._check_dangerous_content(body)

        except json.JSONDecodeError as e:
            raise CustomValidationError(f"JSON格式错误: {str(e)}")
        except Exception as e:
            if isinstance(e, CustomValidationError):
                raise
            raise CustomValidationError(f"请求数据验证失败: {str(e)}")

    async def _validate_business_type_and_project(self, body: Dict[str, Any]):
        """验证业务类型和项目ID。"""
        # 业务类型验证
        business_type = body.get("business_type", "")
        if not isinstance(business_type, str) or not re.match(r'^[A-Z]{3,6}$', business_type):
            raise CustomValidationError("业务类型格式无效", field="business_type")

        # 项目ID验证
        project_id = body.get("project_id")
        if not isinstance(project_id, int) or project_id <= 0:
            raise CustomValidationError("项目ID必须为正整数", field="project_id")

    async def _check_dangerous_content(self, data: Any):
        """
        检查危险内容。

        Args:
            data: 要检查的数据
        """
        # 将数据转换为字符串进行检查
        data_str = json.dumps(data, ensure_ascii=False)

        # 检查XSS和恶意脚本
        for pattern in self.dangerous_patterns:
            if re.search(pattern, data_str, re.IGNORECASE):
                raise CustomValidationError(
                    "请求包含不安全的内容",
                    details={"pattern": pattern}
                )

        # 检查SQL注入
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, data_str, re.IGNORECASE):
                raise CustomValidationError(
                    "请求包含可疑的SQL注入内容",
                    details={"pattern": pattern}
                )

    async def _handle_validation_error(self, error: CustomValidationError, request: Request) -> JSONResponse:
        """
        处理验证错误。

        Args:
            error: 验证错误
            request: HTTP请求

        Returns:
            JSON格式的错误响应
        """
        request_id = getattr(request.state, 'request_id', None)

        logger.warning(f"验证错误: {error.message} - 路径: {request.url} - 请求ID: {request_id}")

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": {
                    "code": ErrorCode.VALIDATION_ERROR.value,
                    "message": error.message,
                    "field": error.field,
                    "value": error.value,
                    "details": error.details,
                    "recoverable": True,
                    "can_retry": True
                },
                "timestamp": self._get_timestamp(),
                "path": str(request.url),
                "request_id": request_id
            }
        )

    async def _handle_unexpected_error(self, error: Exception, request: Request) -> JSONResponse:
        """
        处理未预期的错误。

        Args:
            error: 异常实例
            request: HTTP请求

        Returns:
            JSON格式的错误响应
        """
        request_id = getattr(request.state, 'request_id', None)

        logger.error(
            f"验证中间件未预期的错误: {type(error).__name__}: {str(error)} - 路径: {request.url} - 请求ID: {request_id}",
            exc_info=True
        )

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "请求验证失败",
                    "recoverable": True,
                    "can_retry": True
                },
                "timestamp": self._get_timestamp(),
                "path": str(request.url),
                "request_id": request_id
            }
        )

    def _get_timestamp(self) -> str:
        """
        获取当前时间戳。

        Returns:
            ISO格式的时间戳字符串
        """
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"


def setup_validation(app, max_request_size: int = 10 * 1024 * 1024):
    """
    设置FastAPI应用使用验证中间件。

    Args:
        app: FastAPI应用实例
        max_request_size: 最大请求大小（字节）
    """
    app.add_middleware(ValidationMiddleware, max_request_size=max_request_size)