# -*- coding: utf-8 -*-
"""
Configuration API Endpoints

Provides API endpoints for accessing dynamic configuration data
including business types, prompt types, and prompt statuses.
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

from ..services.config_service import config_service
from ..utils.template_variable_resolver import TemplateVariableResolver
from ..database.database import DatabaseManager
from ..utils.config import Config

logger = logging.getLogger(__name__)

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
        logger.info(f"🔍 Getting template variables - business_type: {business_type}, include_examples: {include_examples}")

        # Initialize template variable resolver
        db_manager = DatabaseManager(Config())
        resolver = TemplateVariableResolver(db_manager)
        logger.info("✅ TemplateVariableResolver initialized successfully")

        # Get available variables from database
        db_variables = resolver.get_available_variables(business_type)
        logger.info(f"✅ Retrieved {len(db_variables)} variables from database")

        # Define the 3 core working variables
        core_variables = [
            {
                "name": "{{user_input}}",
                "type": "user_input",
                "business_type": None,
                "description": "用户在API调用时提供的额外上下文信息（来自additional_context参数）",
                "default_value": None,
                "example": "用户输入：生成50个风险管理相关的测试点"
            },
            {
                "name": "{{test_points}}",
                "type": "reference_data",
                "business_type": None,
                "description": "参考测试点数据，根据生成阶段智能包装：测试点生成时添加防重复警告，测试用例生成时添加一一对应要求",
                "default_value": None,
                "example": "参考测试点：\n{\n  \"warning\": \"目前已有这些测试点，不要跟这些测试点内容重复。\",\n  \"test_points\": [...]\n}"
            },
            {
                "name": "{{test_cases}}",
                "type": "reference_data",
                "business_type": None,
                "description": "参考测试用例数据，仅在测试用例生成阶段可用，添加防重复警告",
                "default_value": None,
                "example": "参考测试用例：\n{\n  \"warning\": \"目前已有这些测试用例，不要跟这些测试用例内容重复。\",\n  \"test_cases\": [...]\n}"
            }
        ]

        logger.info(f"✅ Retrieved {len(core_variables)} core template variables")

        # Process core variables
        all_variables = []
        for var in core_variables:
            try:
                variable_item = TemplateVariableItem(
                    name=var['name'],
                    type=var['type'],
                    business_type=var.get('business_type'),
                    description=var.get('description'),
                    default_value=var.get('default_value')
                )
                all_variables.append(variable_item)
            except Exception as var_error:
                logger.warning(f"⚠️ Failed to process core variable {var}: {var_error}")

        logger.info(f"✅ Successfully processed total of {len(all_variables)} template variables")

        return TemplateVariablesResponse(
            variables=all_variables,
            total=len(all_variables),
            business_type=business_type
        )

    except Exception as e:
        logger.error(f"❌ Error in get_template_variables: {e}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=f"获取模板变量时发生错误: {str(e)}")


