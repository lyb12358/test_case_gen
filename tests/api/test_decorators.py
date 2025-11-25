# -*- coding: utf-8 -*-
"""
API装饰器测试
测试统一异常处理装饰器的功能
"""

import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException

# 导入装饰器
try:
    from src.api.decorators import (
        handle_generation_errors,
        standard_generation_endpoint,
        handle_api_errors,
        generation_error_handler
    )
    from src.exceptions.generation import (
        GenerationError,
        ErrorCode,
        ErrorSeverity,
        ValidationError,
        LLMError
    )
except ImportError:
    pytest.skip("无法导入装饰器模块", allow_module_level=True)


@pytest.mark.unit
class TestHandleGenerationErrors:
    """测试生成错误处理装饰器"""

    def test_successful_function_execution(self):
        """测试成功执行函数"""
        @handle_generation_errors
        async def test_function():
            return {"success": True, "data": "test result"}

        # 由于是同步函数，需要手动调用包装器
        import asyncio
        result = asyncio.run(test_function())
        assert result["success"] is True

    def test_handles_generation_error(self):
        """测试处理GenerationError"""
        @handle_generation_errors
        async def test_function():
            raise ValidationError("测试验证错误", field="test_field")

        import asyncio
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(test_function())

        assert exc_info.value.status_code == 400
        error_detail = exc_info.value.detail
        assert error_detail["error_code"] == "VALIDATION_ERROR"
        assert "测试验证错误" in str(error_detail)

    def test_handles_llm_error(self):
        """测试处理LLMError"""
        @handle_generation_errors
        async def test_function():
            raise LLMError("LLM调用失败", model="gpt-4")

        import asyncio
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(test_function())

        assert exc_info.value.status_code == 502
        error_detail = exc_info.value.detail
        assert error_detail["error_code"] == "LLM_ERROR"

    def test_handles_http_exception_passthrough(self):
        """测试HTTPException直接透传"""
        @handle_generation_errors
        async def test_function():
            raise HTTPException(status_code=404, detail="Not Found")

        import asyncio
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(test_function())

        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Not Found"

    def test_handles_unexpected_error(self):
        """测试处理未预期的错误"""
        @handle_generation_errors
        async def test_function():
            raise ValueError("未预期的错误")

        import asyncio
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(test_function())

        assert exc_info.value.status_code == 500
        error_detail = exc_info.value.detail
        assert error_detail["error"]["code"] == "INTERNAL_ERROR"

    def test_error_code_mapping(self):
        """测试错误代码映射"""
        @handle_generation_errors
        async def test_function():
            raise GenerationError(
                "权限拒绝",
                error_code=ErrorCode.PERMISSION_DENIED,
                severity=ErrorSeverity.MEDIUM
            )

        import asyncio
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(test_function())

        assert exc_info.value.status_code == 403

    def test_sync_function_wrapper(self):
        """测试同步函数包装器"""
        @handle_generation_errors
        def test_sync_function():
            return {"success": True}

        result = test_sync_function()
        assert result["success"] is True

    def test_sync_function_with_error(self):
        """测试同步函数错误处理"""
        @handle_generation_errors
        def test_sync_function():
            raise ValidationError("同步函数错误")

        with pytest.raises(HTTPException):
            test_sync_function()


@pytest.mark.unit
class TestHandleApiErrors:
    """测试通用API错误处理装饰器"""

    def test_successful_api_execution(self):
        """测试成功的API执行"""
        @handle_api_errors("测试操作")
        def test_function():
            return {"status": "success"}

        result = test_function()
        assert result["status"] == "success"

    def test_handles_http_exception_in_api(self):
        """测试API中的HTTPException处理"""
        @handle_api_errors("API操作")
        def test_function():
            raise HTTPException(status_code=400, detail="Bad Request")

        with pytest.raises(HTTPException) as exc_info:
            test_function()

        assert exc_info.value.status_code == 400

    def test_handles_general_exception_in_api(self):
        """测试API中的通用异常处理"""
        @handle_api_errors("API操作")
        def test_function():
            raise RuntimeError("运行时错误")

        with pytest.raises(HTTPException) as exc_info:
            test_function()

        assert exc_info.value.status_code == 500
        assert "API操作失败" in str(exc_info.value.detail)


@pytest.mark.unit
class TestStandardGenerationEndpoint:
    """测试标准生成端点装饰器"""

    def test_combined_decorator_application(self):
        """测试组合装饰器应用"""
        @standard_generation_endpoint
        async def test_endpoint():
            return {"task_id": "test-123", "status": "completed"}

        import asyncio
        result = asyncio.run(test_endpoint())
        assert result["task_id"] == "test-123"

    def test_combined_error_handling(self):
        """测试组合错误处理"""
        @standard_generation_endpoint
        async def test_endpoint():
            raise ValidationError("端点验证错误")

        import asyncio
        with pytest.raises(HTTPException):
            asyncio.run(test_endpoint())


@pytest.mark.unit
class TestGenerationErrorHandler:
    """测试生成错误处理别名"""

    def test_generation_error_handler_alias(self):
        """测试generation_error_handler别名"""
        assert generation_error_handler is handle_generation_errors

        @generation_error_handler
        async def test_function():
            return {"success": True}

        import asyncio
        result = asyncio.run(test_function())
        assert result["success"] is True


@pytest.mark.unit
class TestErrorSeverityAndRecovery:
    """测试错误严重性和恢复机制"""

    def test_recoverable_error_handling(self):
        """测试可恢复错误处理"""
        recoverable_error = GenerationError(
            "临时错误",
            error_code=ErrorCode.TIMEOUT_ERROR,
            severity=ErrorSeverity.MEDIUM,
            recoverable=True,
            retry_count=1,
            max_retries=3
        )

        assert recoverable_error.can_retry() is True

    def test_non_recoverable_error_handling(self):
        """测试不可恢复错误处理"""
        non_recoverable_error = GenerationError(
            "严重错误",
            error_code=ErrorCode.VALIDATION_ERROR,
            severity=ErrorSeverity.HIGH,
            recoverable=False
        )

        assert non_recoverable_error.can_retry() is False

    def test_max_retry_exceeded(self):
        """测试超过最大重试次数"""
        max_retry_error = GenerationError(
            "重试次数耗尽",
            error_code=ErrorCode.TIMEOUT_ERROR,
            recoverable=True,
            retry_count=5,
            max_retries=3
        )

        assert max_retry_error.can_retry() is False

    def test_error_to_dict_conversion(self):
        """测试错误转换为字典"""
        error = GenerationError(
            "测试错误",
            error_code=ErrorCode.INTERNAL_ERROR,
            severity=ErrorSeverity.CRITICAL,
            details={"context": "test"},
            recoverable=False,
            retry_count=0,
            max_retries=3
        )

        error_dict = error.to_dict()

        assert error_dict["error"] is True
        assert error_dict["error_code"] == "INTERNAL_ERROR"
        assert error_dict["message"] == "测试错误"
        assert error_dict["severity"] == "critical"
        assert error_dict["details"]["context"] == "test"
        assert error_dict["recoverable"] is False
        assert error_dict["can_retry"] is False


@pytest.mark.unit
class TestSpecificErrorTypes:
    """测试特定错误类型"""

    def test_validation_error_creation(self):
        """测试验证错误创建"""
        error = ValidationError("字段验证失败", field="email", value="invalid-email")

        assert error.field == "email"
        assert error.value == "invalid-email"
        assert error.error_code == ErrorCode.VALIDATION_ERROR
        assert error.severity == ErrorSeverity.MEDIUM
        assert error.recoverable is False

    def test_llm_error_creation(self):
        """测试LLM错误创建"""
        error = LLMError(
            "模型调用失败",
            model="gpt-4",
            prompt_length=1000,
            response_length=500,
            retry_count=2
        )

        assert error.model == "gpt-4"
        assert error.prompt_length == 1000
        assert error.response_length == 500
        assert error.error_code == ErrorCode.LLM_ERROR
        assert error.severity == ErrorSeverity.HIGH
        assert error.recoverable is True

    def test_business_type_error_creation(self):
        """测试业务类型错误创建"""
        error = GenerationError(
            "业务类型不存在",
            error_code=ErrorCode.INVALID_BUSINESS_TYPE,
            details={"business_type": "INVALID_TYPE"}
        )

        assert error.error_code == ErrorCode.INVALID_BUSINESS_TYPE
        assert error.details["business_type"] == "INVALID_TYPE"


@pytest.mark.integration
class TestDecoratorIntegration:
    """装饰器集成测试"""

    def test_multiple_decorators_stack(self):
        """测试多个装饰器堆叠"""
        @handle_api_errors("第一步")
        @handle_generation_errors
        async def multi_decorated_function():
            return {"step": "completed"}

        import asyncio
        result = asyncio.run(multi_decorated_function())
        assert result["step"] == "completed"

    def test_decorator_order_error_propagation(self):
        """测试装饰器顺序错误传播"""
        @handle_generation_errors
        @handle_api_errors("外层")
        async def nested_function():
            raise ValidationError("内层验证错误")

        import asyncio
        with pytest.raises(HTTPException):
            asyncio.run(nested_function())

    def test_decorator_preserves_function_metadata(self):
        """测试装饰器保留函数元数据"""
        @handle_generation_errors
        @standard_generation_endpoint
        async def documented_function():
            """测试函数文档"""
            return {"result": "success"}

        import asyncio
        assert documented_function.__name__ == "documented_function"
        assert "测试函数文档" in documented_function.__doc__

        result = asyncio.run(documented_function())
        assert result["result"] == "success"