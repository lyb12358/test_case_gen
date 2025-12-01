"""
API endpoints for business type and prompt combination management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import logging

from .dependencies import get_db
from ..services.business_service import BusinessService, PromptCombinationService

# Configure logging
logger = logging.getLogger(__name__)

from ..models.business import (
    BusinessTypeCreate, BusinessTypeUpdate, BusinessTypeResponse,
    BusinessTypeListResponse, BusinessTypeActivationRequest,
    PromptCombinationCreate, PromptCombinationUpdate, PromptCombinationResponse,
    PromptCombinationListResponse, PromptCombinationPreviewRequest,
    PromptCombinationPreviewResponse, BusinessTypeStatsResponse
)
from ..models.unified_test_case import UnifiedTestCaseDeleteResponse

router = APIRouter(prefix="/api/v1/business", tags=["business-management"])

# Business Type Management Endpoints

@router.get("/business-types", response_model=BusinessTypeListResponse)
async def get_business_types(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    is_active: Optional[bool] = Query(None, description="Filter by activation status"),
    search: Optional[str] = Query(None, description="Search term"),
    db: Session = Depends(get_db)
):
    """Get business types with filtering."""
    try:
        business_service = BusinessService(db)
        return business_service.get_business_types(
            project_id=project_id,
            is_active=is_active,
            search=search
        )
    except Exception as e:
        logger.error(f"Error getting business types: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取业务类型失败: {str(e)}"
        )


@router.get("/business-types/{id}", response_model=BusinessTypeResponse)
async def get_business_type(
    id: int,
    db: Session = Depends(get_db)
):
    """Get a specific business type by ID."""
    try:
        # Direct database session from dependency injection
            business_service = BusinessService(db)
            return business_service.get_business_type(id)
    except Exception as e:
        logger.error(f"Error getting business type {id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取业务类型失败: {str(e)}"
        )


@router.post("/business-types", response_model=BusinessTypeResponse)
async def create_business_type(
    business_type_data: BusinessTypeCreate,
    db: Session = Depends(get_db)
):
    """Create a new business type."""
    try:
        # Direct database session from dependency injection
            business_service = BusinessService(db)
            return business_service.create_business_type(business_type_data)
    except HTTPException as he:
        # Re-raise HTTPExceptions without modification
        logger.error(f"HTTP error creating business type: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"Unexpected error creating business type: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"创建业务类型失败: {str(e)}"
        )


@router.put("/business-types/{id}", response_model=BusinessTypeResponse)
async def update_business_type(
    id: int,
    business_type_data: BusinessTypeUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing business type."""
    try:
        # Direct database session from dependency injection
            business_service = BusinessService(db)
            return business_service.update_business_type(id, business_type_data)
    except Exception as e:
        logger.error(f"Error updating business type {id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"更新业务类型失败: {str(e)}"
        )


@router.delete("/business-types/{id}", response_model=UnifiedTestCaseDeleteResponse)
async def delete_business_type(
    id: int,
    db: Session = Depends(get_db)
):
    """Delete a business type."""
    try:
        # Direct database session from dependency injection
            business_service = BusinessService(db)
            business_service.delete_business_type(id)
            return UnifiedTestCaseDeleteResponse(message="Business type deleted successfully")
    except Exception as e:
        logger.error(f"Error deleting business type {id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"删除业务类型失败: {str(e)}"
        )


@router.put("/business-types/{id}/activate", response_model=BusinessTypeResponse)
async def activate_business_type(
    id: int,
    activation_data: BusinessTypeActivationRequest,
    db: Session = Depends(get_db)
):
    """Activate or deactivate a business type."""
    try:
        # Direct database session from dependency injection
            business_service = BusinessService(db)
            return business_service.activate_business_type(id, activation_data)
    except Exception as e:
        logger.error(f"Error activating business type {id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"激活业务类型失败: {str(e)}"
        )


@router.get("/business-types/stats/overview", response_model=BusinessTypeStatsResponse)
async def get_business_type_stats(
    project_id: Optional[int] = Query(None, description="Filter statistics by project ID"),
    db: Session = Depends(get_db)
):
    """Get business type statistics, optionally filtered by project."""
    try:
        # Direct database session from dependency injection
            business_service = BusinessService(db)
            return business_service.get_business_type_stats(project_id)
    except Exception as e:
        logger.error(f"Error getting business type stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取业务类型统计失败: {str(e)}"
        )


# Prompt Combination Management Endpoints

@router.get("/prompt-combinations", response_model=PromptCombinationListResponse)
async def get_prompt_combinations(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get prompt combinations with filtering and pagination."""
    try:
        # Direct database session from dependency injection
            combination_service = PromptCombinationService(db)
            return combination_service.get_prompt_combinations(
                project_id=project_id,
                business_type=business_type,
                page=page,
                size=size
            )
    except Exception as e:
        logger.error(f"Error getting prompt combinations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get prompt combinations: {str(e)}"
        )


@router.get("/prompt-combinations/{combination_id}", response_model=PromptCombinationResponse)
async def get_prompt_combination(
    combination_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific prompt combination by ID."""
    try:
        # Direct database session from dependency injection
            combination_service = PromptCombinationService(db)
            return combination_service.get_prompt_combination(combination_id)
    except Exception as e:
        logger.error(f"Error getting prompt combination {combination_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get prompt combination: {str(e)}"
        )


@router.post("/prompt-combinations", response_model=PromptCombinationResponse)
async def create_prompt_combination(
    combination_data: PromptCombinationCreate,
    db: Session = Depends(get_db)
):
    """Create a new prompt combination."""
    try:
        # Direct database session from dependency injection
            combination_service = PromptCombinationService(db)
            return combination_service.create_prompt_combination(combination_data)
    except Exception as e:
        logger.error(f"Error creating prompt combination: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create prompt combination: {str(e)}"
        )


@router.put("/prompt-combinations/{combination_id}", response_model=PromptCombinationResponse)
async def update_prompt_combination(
    combination_id: int,
    combination_data: PromptCombinationUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing prompt combination."""
    try:
        # Direct database session from dependency injection
        combination_service = PromptCombinationService(db)
        return combination_service.update_prompt_combination(combination_id, combination_data)
    except Exception as e:
        logger.error(f"Error updating prompt combination {combination_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update prompt combination: {str(e)}"
        )


@router.delete("/prompt-combinations/{combination_id}", response_model=UnifiedTestCaseDeleteResponse)
async def delete_prompt_combination(
    combination_id: int,
    db: Session = Depends(get_db)
):
    """Delete a prompt combination."""
    try:
        # Direct database session from dependency injection
            combination_service = PromptCombinationService(db)
            combination_service.delete_prompt_combination(combination_id)
            return UnifiedTestCaseDeleteResponse(message="Prompt combination deleted successfully")
    except Exception as e:
        logger.error(f"Error deleting prompt combination {combination_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete prompt combination: {str(e)}"
        )


@router.post("/prompt-combinations/preview", response_model=PromptCombinationPreviewResponse)
async def preview_prompt_combination(
    preview_data: PromptCombinationPreviewRequest,
    db: Session = Depends(get_db)
):
    """Preview a prompt combination without saving."""
    try:
        # Direct database session from dependency injection
            combination_service = PromptCombinationService(db)
            return combination_service.preview_prompt_combination(preview_data)
    except Exception as e:
        logger.error(f"Error previewing prompt combination: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to preview prompt combination: {str(e)}"
        )


@router.get("/available-prompts", response_model=List[Dict[str, Any]])
async def get_available_prompts(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    db: Session = Depends(get_db)
):
    """Get available prompts for prompt builder."""
    try:
        # Direct database session from dependency injection
            business_service = BusinessService(db)
            return business_service.get_available_prompts(project_id, business_type)
    except Exception as e:
        logger.error(f"Error getting available prompts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get available prompts: {str(e)}"
        )