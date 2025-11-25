# -*- coding: utf-8 -*-
"""
Configuration API Endpoints

Provides API endpoints for accessing dynamic configuration data
including business types, prompt types, and prompt statuses.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

from ..services.config_service import config_service
from ..utils.template_variable_resolver import TemplateVariableResolver
from ..database.database import DatabaseManager
from ..utils.config import Config

router = APIRouter(prefix="/api/v1/config", tags=["configuration"])


class ConfigurationItem(BaseModel):
    """Single configuration item with metadata."""
    value: str
    name: str
    description: str


class BusinessTypeItem(ConfigurationItem):
    """Business type configuration item."""
    category: Optional[str] = None


class TemplateVariableItem(BaseModel):
    """Template variable item with metadata."""
    name: str
    type: str
    business_type: Optional[str] = None
    description: Optional[str] = None
    default_value: Optional[str] = None
    example: Optional[str] = None


class TemplateVariablesResponse(BaseModel):
    """Response containing template variables."""
    variables: List[TemplateVariableItem]
    total: int
    business_type: Optional[str] = None


class ConfigurationResponse(BaseModel):
    """Response containing configuration data."""
    items: Dict[str, ConfigurationItem]
    total: int


class AllConfigurationResponse(BaseModel):
    """Response containing all configuration data."""
    business_types: Dict[str, BusinessTypeItem]
    prompt_types: Dict[str, ConfigurationItem]
    prompt_statuses: Dict[str, ConfigurationItem]
    generation_stages: Dict[str, ConfigurationItem]


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


class ValidationResponse(BaseModel):
    """Validation response."""
    valid: bool
    value: str


@router.get("/business-types", response_model=Dict[str, BusinessTypeItem])
def get_business_types_config(
    refresh: bool = Query(False, description="Force refresh of cached data")
):
    """
    Get all business types with their display names and descriptions.

    Args:
        refresh: Force refresh of cached data

    Returns:
        Dictionary mapping business type values to their metadata
    """
    business_types = config_service.get_business_types(refresh_cache=refresh)
    return {
        value: BusinessTypeItem(**metadata)
        for value, metadata in business_types.items()
    }


@router.get("/business-types/{business_type}", response_model=BusinessTypeItem)
async def get_business_type(business_type: str):
    """
    Get a specific business type by value.

    Args:
        business_type: The business type value

    Returns:
        Business type metadata
    """
    business_types = config_service.get_business_types()
    if business_type not in business_types:
        raise HTTPException(status_code=404, detail=f"业务类型 '{business_type}' 未找到")

    return BusinessTypeItem(**business_types[business_type])


@router.get("/business-types/mapping", response_model=Dict[str, str])
async def get_business_types_mapping():
    """
    Get business types mapping from code to full name.

    Returns:
        Dictionary mapping business type codes to their full names
    """
    try:
        business_types = config_service.get_business_types()

        # Create mapping from business type code to full name
        mapping = {}
        for code, metadata in business_types.items():
            mapping[code] = metadata.get('name', code)

        return mapping

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取业务类型映射失败: {str(e)}"
        )


@router.get("/prompt-types", response_model=Dict[str, ConfigurationItem])
async def get_prompt_types(
    refresh: bool = Query(False, description="Force refresh of cached data")
):
    """
    Get all prompt types with their display names and descriptions.

    Args:
        refresh: Force refresh of cached data

    Returns:
        Dictionary mapping prompt type values to their metadata
    """
    prompt_types = config_service.get_prompt_types(refresh_cache=refresh)
    return {
        value: ConfigurationItem(**metadata)
        for value, metadata in prompt_types.items()
    }


@router.get("/prompt-types/{prompt_type}", response_model=ConfigurationItem)
async def get_prompt_type(prompt_type: str):
    """
    Get a specific prompt type by value.

    Args:
        prompt_type: The prompt type value

    Returns:
        Prompt type metadata
    """
    prompt_types = config_service.get_prompt_types()
    if prompt_type not in prompt_types:
        raise HTTPException(status_code=404, detail=f"提示词类型 '{prompt_type}' 未找到")

    return ConfigurationItem(**prompt_types[prompt_type])


@router.get("/prompt-statuses", response_model=Dict[str, ConfigurationItem])
async def get_prompt_statuses(
    refresh: bool = Query(False, description="Force refresh of cached data")
):
    """
    Get all prompt statuses with their display names and descriptions.

    Args:
        refresh: Force refresh of cached data

    Returns:
        Dictionary mapping prompt status values to their metadata
    """
    prompt_statuses = config_service.get_prompt_statuses(refresh_cache=refresh)
    return {
        value: ConfigurationItem(**metadata)
        for value, metadata in prompt_statuses.items()
    }


@router.get("/prompt-statuses/{prompt_status}", response_model=ConfigurationItem)
async def get_prompt_status(prompt_status: str):
    """
    Get a specific prompt status by value.

    Args:
        prompt_status: The prompt status value

    Returns:
        Prompt status metadata
    """
    prompt_statuses = config_service.get_prompt_statuses()
    if prompt_status not in prompt_statuses:
        raise HTTPException(status_code=404, detail=f"提示词状态 '{prompt_status}' 未找到")

    return ConfigurationItem(**prompt_statuses[prompt_status])


@router.get("/generation-stages", response_model=Dict[str, ConfigurationItem])
async def get_generation_stages(
    refresh: bool = Query(False, description="Force refresh of cached data")
):
    """
    Get all generation stages with their display names and descriptions.

    Args:
        refresh: Force refresh of cached data

    Returns:
        Dictionary mapping generation stage values to their metadata
    """
    generation_stages = config_service.get_generation_stages(refresh_cache=refresh)
    return {
        value: ConfigurationItem(**metadata)
        for value, metadata in generation_stages.items()
    }


@router.get("/generation-stages/{generation_stage}", response_model=ConfigurationItem)
async def get_generation_stage(generation_stage: str):
    """
    Get a specific generation stage by value.

    Args:
        generation_stage: The generation stage value

    Returns:
        Generation stage metadata
    """
    generation_stages = config_service.get_generation_stages()
    if generation_stage not in generation_stages:
        raise HTTPException(status_code=404, detail=f"生成阶段 '{generation_stage}' 未找到")

    return ConfigurationItem(**generation_stages[generation_stage])


@router.get("/all", response_model=AllConfigurationResponse)
async def get_all_configuration(
    refresh: bool = Query(False, description="Force refresh of cached data")
):
    """
    Get all configuration data at once.

    Args:
        refresh: Force refresh of all cached data

    Returns:
        All configuration data
    """
    config_data = config_service.get_all_configuration(refresh_cache=refresh)

    return AllConfigurationResponse(
        business_types={
            value: BusinessTypeItem(**metadata)
            for value, metadata in config_data['business_types'].items()
        },
        prompt_types={
            value: ConfigurationItem(**metadata)
            for value, metadata in config_data['prompt_types'].items()
        },
        prompt_statuses={
            value: ConfigurationItem(**metadata)
            for value, metadata in config_data['prompt_statuses'].items()
        },
        generation_stages={
            value: ConfigurationItem(**metadata)
            for value, metadata in config_data['generation_stages'].items()
        }
    )


@router.post("/refresh-cache", response_model=MessageResponse)
async def refresh_configuration_cache():
    """
    Refresh all configuration cache.

    Returns:
        Success message
    """
    config_service.clear_cache()
    # This will trigger cache refresh on next access
    config_service.get_all_configuration(refresh_cache=True)

    return MessageResponse(message="配置缓存刷新成功")


@router.get("/validate/business-type/{business_type}", response_model=ValidationResponse)
async def validate_business_type(business_type: str):
    """
    Validate if a business type exists.

    Args:
        business_type: The business type to validate

    Returns:
        Validation result
    """
    is_valid = config_service.validate_business_type(business_type)
    return ValidationResponse(valid=is_valid, value=business_type)


@router.get("/validate/prompt-type/{prompt_type}", response_model=ValidationResponse)
async def validate_prompt_type(prompt_type: str):
    """
    Validate if a prompt type exists.

    Args:
        prompt_type: The prompt type to validate

    Returns:
        Validation result
    """
    is_valid = config_service.validate_prompt_type(prompt_type)
    return ValidationResponse(valid=is_valid, value=prompt_type)


@router.get("/validate/prompt-status/{prompt_status}", response_model=ValidationResponse)
async def validate_prompt_status(prompt_status: str):
    """
    Validate if a prompt status exists.

    Args:
        prompt_status: The prompt status to validate

    Returns:
        Validation result
    """
    is_valid = config_service.validate_prompt_status(prompt_status)
    return ValidationResponse(valid=is_valid, value=prompt_status)


@router.get("/validate/generation-stage/{generation_stage}", response_model=ValidationResponse)
async def validate_generation_stage(generation_stage: str):
    """
    Validate if a generation stage exists.

    Args:
        generation_stage: The generation stage to validate

    Returns:
        Validation result
    """
    is_valid = config_service.validate_generation_stage(generation_stage)
    return ValidationResponse(valid=is_valid, value=generation_stage)


@router.get("/template-variables", response_model=TemplateVariablesResponse)
async def get_template_variables(
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    include_examples: bool = Query(True, description="Include usage examples")
):
    """
    Get all available template variables with metadata.

    Args:
        business_type: Optional business type filter
        include_examples: Whether to include usage examples

    Returns:
        Template variables with metadata
    """
    try:
        # Initialize template variable resolver
        db_manager = DatabaseManager(Config())
        resolver = TemplateVariableResolver(db_manager)

        # Get available variables from database
        db_variables = resolver.get_available_variables(business_type)

        # Define built-in variables with examples
        builtin_variables = _get_builtin_variables(include_examples)

        # Combine database variables and built-in variables
        all_variables = []

        # Add database variables
        for var in db_variables:
            variable_item = TemplateVariableItem(
                name=var['name'],
                type=var['type'],
                business_type=var.get('business_type'),
                description=var.get('description'),
                default_value=var.get('default_value')
            )
            all_variables.append(variable_item)

        # Add built-in variables
        for var in builtin_variables:
            # Skip if business_type filter is specified and variable doesn't match
            if business_type and var.get('business_type') and var['business_type'] != business_type:
                continue
            all_variables.append(TemplateVariableItem(**var))

        return TemplateVariablesResponse(
            variables=all_variables,
            total=len(all_variables),
            business_type=business_type
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模板变量失败: {str(e)}")


def _get_builtin_variables(include_examples: bool = True) -> List[Dict[str, Any]]:
    """
    Get built-in template variables with metadata.

    Args:
        include_examples: Whether to include usage examples

    Returns:
        List of built-in template variables
    """
    variables = [
        {
            "name": "{{project_name}}",
            "type": "project",
            "description": "当前项目的名称",
            "example": "项目名称：{{project_name}}" if include_examples else None
        },
        {
            "name": "{{project_description}}",
            "type": "project",
            "description": "当前项目的描述信息",
            "example": "项目描述：{{project_description}}" if include_examples else None
        },
        {
            "name": "{{project_id}}",
            "type": "project",
            "description": "当前项目的ID",
            "example": "项目ID：{{project_id}}" if include_examples else None
        },
        {
            "name": "{{business_type}}",
            "type": "business",
            "description": "业务类型代码（如RCC、RFD等）",
            "example": "业务类型：{{business_type}} (远程净化控制)" if include_examples else None
        },
        {
            "name": "{{business_name}}",
            "type": "business",
            "description": "业务类型的中文名称",
            "example": "业务名称：{{business_name}}" if include_examples else None
        },
        {
            "name": "{{business_description}}",
            "type": "business",
            "description": "业务类型的详细描述",
            "example": "业务描述：{{business_description}}" if include_examples else None
        },
        {
            "name": "{{recent_test_points}}",
            "type": "history_test_points",
            "description": "最近的测试点列表（JSON格式，最多5条）",
            "example": "历史测试点：\n{{recent_test_points}}" if include_examples else None
        },
        {
            "name": "{{related_test_cases}}",
            "type": "history_test_cases",
            "description": "相关的测试用例列表（JSON格式，最多3条）",
            "example": "相关测试用例：\n{{related_test_cases}}" if include_examples else None
        },
        {
            "name": "{{common_test_patterns}}",
            "type": "history_test_cases",
            "description": "常见的测试模式（从历史用例中提取）",
            "example": "常见测试模式：\n{{common_test_patterns}}" if include_examples else None
        },
        {
            "name": "{{SYSTEM_BACKGROUND}}",
            "type": "system",
            "description": "系统背景信息",
            "example": "系统背景：\n{{SYSTEM_BACKGROUND}}" if include_examples else None
        },
        {
            "name": "{{BUSINESS_DESCRIPTION}}",
            "type": "system",
            "description": "业务描述信息",
            "example": "业务描述：\n{{BUSINESS_DESCRIPTION}}" if include_examples else None
        },
        {
            "name": "{{ERROR_CODES}}",
            "type": "system",
            "description": "相关错误码信息",
            "example": "错误码：\n{{ERROR_CODES}}" if include_examples else None
        },
        {
            "name": "{{INTERFACE_INFO}}",
            "type": "system",
            "description": "接口信息",
            "example": "接口信息：\n{{INTERFACE_INFO}}" if include_examples else None
        }
    ]

    return variables