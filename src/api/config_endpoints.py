"""
Configuration API Endpoints

Provides API endpoints for accessing dynamic configuration data
including business types, prompt types, and prompt statuses.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

from src.services.config_service import config_service

router = APIRouter(prefix="/api/config", tags=["configuration"])


class ConfigurationItem(BaseModel):
    """Single configuration item with metadata."""
    value: str
    name: str
    description: str


class BusinessTypeItem(ConfigurationItem):
    """Business type configuration item."""
    category: Optional[str] = None


class ConfigurationResponse(BaseModel):
    """Response containing configuration data."""
    items: Dict[str, ConfigurationItem]
    total: int


class AllConfigurationResponse(BaseModel):
    """Response containing all configuration data."""
    business_types: Dict[str, BusinessTypeItem]
    prompt_types: Dict[str, ConfigurationItem]
    prompt_statuses: Dict[str, ConfigurationItem]


@router.get("/business-types", response_model=Dict[str, BusinessTypeItem])
async def get_business_types(
    refresh: bool = Query(False, description="Force refresh of cached data")
):
    """
    Get all business types with their display names and descriptions.

    Args:
        refresh: Force refresh of cached data

    Returns:
        Dictionary mapping business type values to their metadata
    """
    try:
        business_types = config_service.get_business_types(refresh_cache=refresh)
        return {
            value: BusinessTypeItem(**metadata)
            for value, metadata in business_types.items()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get business types: {str(e)}")


@router.get("/business-types/{business_type}", response_model=BusinessTypeItem)
async def get_business_type(business_type: str):
    """
    Get a specific business type by value.

    Args:
        business_type: The business type value

    Returns:
        Business type metadata
    """
    try:
        business_types = config_service.get_business_types()
        if business_type not in business_types:
            raise HTTPException(status_code=404, detail=f"Business type '{business_type}' not found")

        return BusinessTypeItem(**business_types[business_type])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get business type: {str(e)}")


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
    try:
        prompt_types = config_service.get_prompt_types(refresh_cache=refresh)
        return {
            value: ConfigurationItem(**metadata)
            for value, metadata in prompt_types.items()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompt types: {str(e)}")


@router.get("/prompt-types/{prompt_type}", response_model=ConfigurationItem)
async def get_prompt_type(prompt_type: str):
    """
    Get a specific prompt type by value.

    Args:
        prompt_type: The prompt type value

    Returns:
        Prompt type metadata
    """
    try:
        prompt_types = config_service.get_prompt_types()
        if prompt_type not in prompt_types:
            raise HTTPException(status_code=404, detail=f"Prompt type '{prompt_type}' not found")

        return ConfigurationItem(**prompt_types[prompt_type])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompt type: {str(e)}")


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
    try:
        prompt_statuses = config_service.get_prompt_statuses(refresh_cache=refresh)
        return {
            value: ConfigurationItem(**metadata)
            for value, metadata in prompt_statuses.items()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompt statuses: {str(e)}")


@router.get("/prompt-statuses/{prompt_status}", response_model=ConfigurationItem)
async def get_prompt_status(prompt_status: str):
    """
    Get a specific prompt status by value.

    Args:
        prompt_status: The prompt status value

    Returns:
        Prompt status metadata
    """
    try:
        prompt_statuses = config_service.get_prompt_statuses()
        if prompt_status not in prompt_statuses:
            raise HTTPException(status_code=404, detail=f"Prompt status '{prompt_status}' not found")

        return ConfigurationItem(**prompt_statuses[prompt_status])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompt status: {str(e)}")


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
    try:
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
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")


@router.post("/refresh-cache")
async def refresh_configuration_cache():
    """
    Refresh all configuration cache.

    Returns:
        Success message
    """
    try:
        config_service.clear_cache()
        # This will trigger cache refresh on next access
        config_service.get_all_configuration(refresh_cache=True)

        return {"message": "Configuration cache refreshed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh cache: {str(e)}")


@router.get("/validate/business-type/{business_type}")
async def validate_business_type(business_type: str):
    """
    Validate if a business type exists.

    Args:
        business_type: The business type to validate

    Returns:
        Validation result
    """
    try:
        is_valid = config_service.validate_business_type(business_type)
        return {"valid": is_valid, "value": business_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate business type: {str(e)}")


@router.get("/validate/prompt-type/{prompt_type}")
async def validate_prompt_type(prompt_type: str):
    """
    Validate if a prompt type exists.

    Args:
        prompt_type: The prompt type to validate

    Returns:
        Validation result
    """
    try:
        is_valid = config_service.validate_prompt_type(prompt_type)
        return {"valid": is_valid, "value": prompt_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate prompt type: {str(e)}")


@router.get("/validate/prompt-status/{prompt_status}")
async def validate_prompt_status(prompt_status: str):
    """
    Validate if a prompt status exists.

    Args:
        prompt_status: The prompt status to validate

    Returns:
        Validation result
    """
    try:
        is_valid = config_service.validate_prompt_status(prompt_status)
        return {"valid": is_valid, "value": prompt_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate prompt status: {str(e)}")