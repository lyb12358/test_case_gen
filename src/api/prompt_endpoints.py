# -*- coding: utf-8 -*-
"""
API endpoints for prompt management system.
"""

import json
import re
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from .decorators import (
    handle_api_errors,
    service_operation
)
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from ..database.database import DatabaseManager
from ..database.models import (
    Prompt, PromptCategory, PromptVersion, PromptTemplate,
    PromptType, PromptStatus, BusinessType, Project, GenerationStage
)
from ..database.operations import DatabaseOperations

# 设置日志
logger = logging.getLogger(__name__)

from ..models.prompt import (
    Prompt as PromptSchema,
    PromptCreate,
    PromptUpdate,
    PromptPreviewRequest,
    PromptPreviewResponse,
    PromptSummary,
    PromptListResponse,
    PromptSearchRequest,
    PromptValidationResponse,
    PromptStatistics,
    PromptCategory as PromptCategorySchema,
    PromptCategoryCreate,
    PromptCategoryUpdate,
    PromptTemplate as PromptTemplateSchema,
    PromptTemplateCreate,
    PromptTemplateUpdate
)
from ..utils.config import Config
from ..utils.database_prompt_builder import DatabasePromptBuilder
from .dependencies import get_db

# Create router
router = APIRouter(prefix="/api/v1/prompts", tags=["prompts"])




# Temporary helper functions - will be replaced with decorators in next phase
def get_database_manager():
    """Dependency to get database manager."""
    config = Config()
    return DatabaseManager(config)


def get_db_session():
    """Dependency to get database session."""
    config = Config()
    db_manager = DatabaseManager(config)
    return db_manager.get_session().__enter__()


def get_prompt_builder():
    """Dependency to get prompt builder."""
    config = Config()
    return DatabasePromptBuilder(config)


def validate_project_id(project_id: Optional[int], db: Session, use_default: bool = True) -> Project:
    """
    Validate that a project_id exists and return the project.
    If no project_id is provided and use_default is True, returns the default project.

    Args:
        project_id (Optional[int]): Project ID to validate
        db (Session): Database session
        use_default (bool): Whether to use default project when project_id is None

    Returns:
        Project: Valid project (either specified or default)

    Raises:
        HTTPException: If project_id is provided but project doesn't exist
    """
    db_operations = DatabaseOperations(db)

    if project_id is None:
        if use_default:
            # Get or create default project for backward compatibility
            return db_operations.get_or_create_default_project()
        else:
            return None

    project = db_operations.get_project(project_id)
    if project is None:
        raise HTTPException(
            status_code=404,
            detail=f"Project with ID {project_id} not found"
        )
    return project


# Category endpoints
@router.get("/categories", response_model=List[PromptCategorySchema])

async def get_prompt_categories(db: Session = Depends(get_db)):
    """Get all prompt categories."""
    categories = db.query(PromptCategory).order_by(PromptCategory.order, PromptCategory.name).all()
    return categories


@router.post("/categories", response_model=PromptCategorySchema)

async def create_prompt_category(
    category: PromptCategoryCreate,
    db: Session = Depends(get_db)
):
    """Create a new prompt category."""
    # Check if category with same name already exists
    existing = db.query(PromptCategory).filter(PromptCategory.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="同名分类已存在")

    db_category = PromptCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@router.put("/categories/{category_id}", response_model=PromptCategorySchema)

async def update_prompt_category(
    category_id: int,
    category_update: PromptCategoryUpdate,
    db: Session = Depends(get_db)
):
    """Update a prompt category."""
    category = db.query(PromptCategory).filter(PromptCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="分类未找到")

    # Update fields
    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}")

async def delete_prompt_category(category_id: int, db: Session = Depends(get_db)):
    """Delete a prompt category."""
    category = db.query(PromptCategory).filter(PromptCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="分类未找到")

    # Check if category has prompts
    prompt_count = db.query(Prompt).filter(Prompt.category_id == category_id).count()
    if prompt_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"该分类下还有 {prompt_count} 个提示词，无法删除。请先移动或删除这些提示词。"
        )

    db.delete(category)
    db.commit()
    return {"message": "分类删除成功"}


# Prompt endpoints
@router.get("/", response_model=PromptListResponse)

async def get_prompts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    type: Optional[PromptType] = Query(None),
    business_type: Optional[BusinessType] = Query(None),
    status: Optional[PromptStatus] = Query(None),
    generation_stage: Optional[GenerationStage] = Query(None, description="Filter by generation stage"),
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db)
):
    """Get prompts with pagination and filtering."""
    # Helper function to safely get enum value
    def get_enum_value(enum_item):
        if hasattr(enum_item, 'value'):
            return enum_item.value
        return str(enum_item)

    query = db.query(Prompt)

    # Apply filters - Fixed project filtering logic
    if project_id is not None:
        # Validate that the specified project exists
        project = validate_project_id(project_id, db, use_default=False)
        if project is None:
            # Project doesn't exist, return empty results
            return PromptListResponse(
                items=[],
                total=0,
                page=page,
                size=size,
                pages=0
            )
        # Filter by the specified project only
        query = query.filter(Prompt.project_id == project.id)
    else:
        # No project filter specified - use default project for backward compatibility
        default_project = validate_project_id(None, db, use_default=True)
        query = query.filter(Prompt.project_id == default_project.id)
    if type:
        query = query.filter(Prompt.type == type)
    if business_type:
        query = query.filter(Prompt.business_type == business_type)
    if status:
        query = query.filter(Prompt.status == status)
    if generation_stage:
        query = query.filter(Prompt.generation_stage == generation_stage)
    if category_id:
        query = query.filter(Prompt.category_id == category_id)
    if search:
        query = query.filter(Prompt.name.contains(search) | Prompt.content.contains(search))

    # Count total
    total = query.count()

    # Apply pagination
    offset = (page - 1) * size
    prompts = query.order_by(desc(Prompt.updated_at)).offset(offset).limit(size).all()

    # Convert to summary format
    items = []
    for prompt in prompts:
        items.append(PromptSummary(
            id=prompt.id,
            project_id=prompt.project_id or 1,  # Default to project 1 for backward compatibility
            name=prompt.name,
            type=get_enum_value(prompt.type),
            business_type=get_enum_value(prompt.business_type) if prompt.business_type else None,
            status=get_enum_value(prompt.status),
            generation_stage=get_enum_value(prompt.generation_stage) if prompt.generation_stage else None,
            author=prompt.author,
            version=prompt.version,
            created_at=prompt.created_at,
            updated_at=prompt.updated_at,
            category=prompt.category
        ))

    total_pages = (total + size - 1) // size

    return PromptListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=total_pages
    )


@router.get("/{prompt_id}", response_model=PromptSchema)

async def get_prompt(
    prompt_id: int,
    project_id: Optional[int] = Query(None, description="Project ID for context validation"),
    db: Session = Depends(get_db)
):
    """Get a specific prompt by ID with project validation."""
    # Helper function to safely get enum value
    def get_enum_value(enum_item):
        if hasattr(enum_item, 'value'):
            return enum_item.value
        return str(enum_item)

    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="提示词未找到")

    # Validate project context if provided
    if project_id is not None:
        # Check if the prompt belongs to the requested project
        if prompt.project_id != project_id:
            raise HTTPException(
                status_code=404,
                detail=f"Prompt {prompt_id} not found in project {project_id}"
            )

    try:
        # Parse JSON fields safely
        tags = json.loads(prompt.tags) if prompt.tags else None
        variables = json.loads(prompt.variables) if prompt.variables else None
        extra_metadata = json.loads(prompt.extra_metadata) if prompt.extra_metadata else None

        # Handle empty content gracefully
        content = prompt.content if prompt.content is not None else ""

        try:
            return PromptSchema(
                id=prompt.id,
                name=prompt.name,
                content=content,
                type=get_enum_value(prompt.type),
                business_type=get_enum_value(prompt.business_type) if prompt.business_type else None,
                status=get_enum_value(prompt.status),
                generation_stage=get_enum_value(prompt.generation_stage) if prompt.generation_stage else None,
                author=prompt.author,
                version=prompt.version,
                tags=tags,
                variables=variables,
                extra_metadata=extra_metadata,
                category_id=prompt.category_id,
                file_path=prompt.file_path,
                project_id=prompt.project_id,
                created_at=prompt.created_at,
                updated_at=prompt.updated_at,
                category=prompt.category
            )
        except Exception as validation_error:
            # If Pydantic validation fails, provide a more helpful error message
            raise HTTPException(
                status_code=500,
                detail=f"Prompt data validation failed: {str(validation_error)}. "
                       f"Prompt ID: {prompt_id}, Content length: {len(content)}, "
                       f"Name: {prompt.name}"
            )
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing prompt JSON data: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error processing prompt data: {str(e)}"
        )


@router.post("/", response_model=PromptSchema)

async def create_prompt(
    prompt: PromptCreate,
    project_id: Optional[int] = Query(None, description="Project ID for the prompt"),
    db: Session = Depends(get_db)
):
    """Create a new prompt."""
    # Validate project ID with backward compatibility
    project = validate_project_id(project_id, db, use_default=True)

    # Check if prompt with same name already exists
    existing = db.query(Prompt).filter(Prompt.name == prompt.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="同名提示词已存在")

    # Convert lists to JSON
    tags_json = json.dumps(prompt.tags, ensure_ascii=False) if prompt.tags else None
    variables_json = json.dumps(prompt.variables, ensure_ascii=False) if prompt.variables else None
    metadata_json = json.dumps(prompt.extra_metadata, ensure_ascii=False) if prompt.extra_metadata else None

    db_prompt = Prompt(
        name=prompt.name,
        content=prompt.content,
        type=prompt.type,
        business_type=prompt.business_type,
        status=prompt.status,
        generation_stage=prompt.generation_stage,
        author=prompt.author,
        version=prompt.version,
        tags=tags_json,
        variables=variables_json,
        extra_metadata=metadata_json,
        category_id=prompt.category_id,
        file_path=prompt.file_path,
        project_id=project.id
    )

    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)

    # Return the created prompt
    return await get_prompt(db_prompt.id, db_prompt.project_id, db)


@router.put("/{prompt_id}", response_model=PromptSchema)
async def update_prompt(
    prompt_id: int,
    prompt_update: PromptUpdate,
    db: Session = Depends(get_db)
):
    """Update a prompt."""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="提示词未找到")

    # Store old content for version history
    old_content = prompt.content

    # Update fields with simplified logic
    update_data = prompt_update.dict(exclude_unset=True)

    for field, value in update_data.items():
        if field == "generation_stage":
            # Simple generation_stage handling
            if not value:
                setattr(prompt, field, 'general')
            else:
                setattr(prompt, field, value)
        elif field in ["tags", "variables", "extra_metadata"]:
            # Convert lists to JSON with error handling
            if value is not None:
                try:
                    setattr(prompt, field, json.dumps(value, ensure_ascii=False))
                except (TypeError, ValueError):
                    setattr(prompt, field, "[]")
        elif value is not None:
            setattr(prompt, field, value)

    # Update timestamp
    prompt.updated_at = datetime.now()
    db.commit()

    # Create version history if content changed
    if "content" in update_data and old_content != prompt.content:
        try:
            version_parts = prompt.version.split('.')
            major = int(version_parts[0])
            minor = int(version_parts[1])
            patch = int(version_parts[2])
            new_version = f"{major}.{minor}.{patch + 1}"
        except (IndexError, ValueError):
            new_version = f"{prompt.version}.1"

        version = PromptVersion(
            prompt_id=prompt.id,
            version_number=new_version,
            content=old_content,
            changelog="Automatic version created before update",
            created_by=prompt.author
        )
        db.add(version)
        db.commit()

    db.refresh(prompt)
    return await get_prompt(prompt_id, prompt.project_id, db)


@router.get("/{prompt_id}/delete-preview")

async def get_prompt_delete_preview(prompt_id: int, db: Session = Depends(get_db)):
    """Get preview of dependencies before deleting a prompt."""
    db_operations = DatabaseOperations(db)
    dependencies = db_operations.check_prompt_dependencies(prompt_id)
    return dependencies


@router.post("/batch-delete-preview")

async def get_batch_delete_preview(prompt_ids: List[int], db: Session = Depends(get_db)):
    """Get preview of dependencies before batch deleting prompts."""
    if not prompt_ids:
        raise HTTPException(
            status_code=400,
            detail="No prompt IDs provided"
        )

    db_operations = DatabaseOperations(db)
    dependencies = db_operations.check_multiple_prompt_dependencies(prompt_ids)
    return dependencies


@router.delete("/{prompt_id}")

async def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    """Delete a prompt."""
    # First check dependencies
    db_operations = DatabaseOperations(db)
    dependencies = db_operations.check_prompt_dependencies(prompt_id)

    if not dependencies["can_delete"]:
        raise HTTPException(
            status_code=400,
            detail=dependencies["block_reason"]
        )

    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="提示词未找到")

    db.delete(prompt)
    db.commit()
    return {"message": "提示词删除成功"}


@router.post("/{prompt_id}/clone", response_model=PromptSchema)

async def clone_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """Clone a prompt."""
    original = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="提示词未找到")

    # Create clone
    clone = Prompt(
        name=f"{original.name} (副本)",
        content=original.content,
        type=original.type,
        business_type=original.business_type,
        status=PromptStatus.DRAFT,
        author=original.author,
        version="1.0.0",
        tags=original.tags,
        variables=original.variables,
        extra_metadata=original.extra_metadata,
        category_id=original.category_id,
        project_id=original.project_id
    )

    db.add(clone)
    db.commit()
    db.refresh(clone)

    return await get_prompt(clone.id, clone.project_id, db)


# Search and preview endpoints
@router.post("/search", response_model=PromptListResponse)

async def search_prompts(
    search_request: PromptSearchRequest,
    db: Session = Depends(get_db)
):
    """Search prompts with advanced filtering."""
    # Apply project filtering first
    if search_request.project_id is not None:
        # Validate that the specified project exists
        project = validate_project_id(search_request.project_id, db, use_default=False)
        if project is None:
            # Project doesn't exist, return empty results
            return PromptListResponse(
                items=[],
                total=0,
                page=search_request.page,
                size=search_request.size,
                pages=0
            )
        # Filter by the specified project only
        query = db.query(Prompt).filter(Prompt.project_id == project.id)
    else:
        # No project filter specified - use default project for backward compatibility
        default_project = validate_project_id(None, db, use_default=True)
        query = db.query(Prompt).filter(Prompt.project_id == default_project.id)

    # Apply status filter
    query = query.filter(Prompt.status == PromptStatus.ACTIVE)

    # Apply filters
    if search_request.query:
        query = query.filter(
            Prompt.name.contains(search_request.query) |
            Prompt.content.contains(search_request.query)
        )
    if search_request.type:
        query = query.filter(Prompt.type == search_request.type)
    if search_request.business_type:
        query = query.filter(Prompt.business_type == search_request.business_type)
    if search_request.status:
        query = query.filter(Prompt.status == search_request.status)
    if search_request.generation_stage:
        query = query.filter(Prompt.generation_stage == search_request.generation_stage)
    if search_request.category_id:
        query = query.filter(Prompt.category_id == search_request.category_id)
    if search_request.author:
        query = query.filter(Prompt.author.contains(search_request.author))

    # Tag filtering
    if search_request.tags:
        for tag in search_request.tags:
            query = query.filter(Prompt.tags.contains(tag))

    # Count total
    total = query.count()

    # Apply pagination
    offset = (search_request.page - 1) * search_request.size
    prompts = query.order_by(desc(Prompt.updated_at)).offset(offset).limit(search_request.size).all()

    # Convert to summary format
    items = []
    for prompt in prompts:
        items.append(PromptSummary(
            id=prompt.id,
            project_id=prompt.project_id or 1,  # Default to project 1 for backward compatibility
            name=prompt.name,
            type=prompt.type,
            business_type=prompt.business_type,
            status=prompt.status,
            generation_stage=prompt.generation_stage.value if prompt.generation_stage else None,
            author=prompt.author,
            version=prompt.version,
            created_at=prompt.created_at,
            updated_at=prompt.updated_at,
            category=prompt.category
        ))

    total_pages = (total + search_request.size - 1) // search_request.size

    return PromptListResponse(
        items=items,
        total=total,
        page=search_request.page,
        size=search_request.size,
        pages=total_pages
    )




@router.post("/preview", response_model=PromptPreviewResponse)

async def preview_prompt(request: PromptPreviewRequest, db: Session = Depends(get_db)):
    """Preview a prompt with variable substitution and validation."""
    # Basic validation
    validation_warnings = []

    if len(request.content) < 10:
        validation_warnings.append("Prompt content is very short")

    if len(request.content) > 10000:
        validation_warnings.append("Prompt content is very long, may affect performance")

    # Render content with variables
    rendered_content = request.content
    if request.variables:
        for key, value in request.variables.items():
            placeholder = f"{{{{ {key} }}}}"
            if placeholder in rendered_content:
                rendered_content = rendered_content.replace(placeholder, str(value))
            else:
                validation_warnings.append(f"Variable '{key}' not found in prompt content")

    # Estimate token count (rough approximation: ~4 characters per token)
    estimated_tokens = max(1, len(rendered_content) // 4)

    # Build preview metadata
    preview_metadata = {
        "original_length": len(request.content),
        "rendered_length": len(rendered_content),
        "variables_used": len(request.variables) if request.variables else 0,
        "business_type": request.business_type,
        "prompt_type": request.type,
        "generation_stage": request.generation_stage,
        "preview_timestamp": datetime.now().isoformat()
    }

    return PromptPreviewResponse(
        rendered_content=rendered_content,
        estimated_tokens=estimated_tokens,
        preview_metadata=preview_metadata,
        validation_warnings=validation_warnings
    )


@router.post("/{prompt_id}/validate", response_model=PromptValidationResponse)

async def validate_prompt(prompt_id: int, db: Session = Depends(get_db)):
    """Validate a prompt and provide suggestions."""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="提示词未找到")

    errors = []
    warnings = []
    suggestions = []

    # Basic validation
    if not prompt.content.strip():
        errors.append("Prompt content cannot be empty")

    if len(prompt.content) < 50:
        warnings.append("Prompt content is very short")

    if len(prompt.content) > 10000:
        warnings.append("Prompt content is very long, consider breaking it down")

    # Check for template variables
    variables = re.findall(r'\{\{(\w+)\}\}', prompt.content)
    if variables:
        suggestions.append(f"Found {len(variables)} template variables: {', '.join(variables)}")

    # Check for common markdown issues
    if not prompt.content.startswith('#'):
        suggestions.append("Consider adding a main heading at the beginning")

    # Business type specific validation
    if prompt.type == PromptType.BUSINESS_DESCRIPTION:
        if "serviceId" not in prompt.content:
            warnings.append("Business description should mention serviceId")

        if "POST" not in prompt.content and "/v1.0/" not in prompt.content:
            suggestions.append("Consider adding API endpoint information")

    return PromptValidationResponse(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        suggestions=suggestions
    )


# Statistics and utility endpoints
@router.get("/stats/overview", response_model=PromptStatistics)

async def get_prompt_statistics(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get prompt statistics overview for a specific project."""

    # Fixed project filtering logic - same as list endpoint
    if project_id is not None:
        # Validate that the specified project exists
        project = validate_project_id(project_id, db, use_default=False)
        if project is None:
            # Project doesn't exist, return empty statistics
            return PromptStatistics(
                total_prompts=0,
                active_prompts=0,
                draft_prompts=0,
                archived_prompts=0,
                prompts_by_type={},
                prompts_by_business_type={},
                prompts_by_generation_stage={},
                recent_activity=[],
                most_recent=[]
            )
    else:
        # No project filter specified - use default project for backward compatibility
        project = validate_project_id(None, db, use_default=True)

    # Filter by project
    query = db.query(Prompt).filter(Prompt.project_id == project.id)

    total_prompts = query.count()
    active_prompts = query.filter(Prompt.status == PromptStatus.ACTIVE).count()
    draft_prompts = query.filter(Prompt.status == PromptStatus.DRAFT).count()
    archived_prompts = query.filter(Prompt.status == PromptStatus.ARCHIVED).count()

    prompts_by_type = query.with_entities(
        Prompt.type, func.count(Prompt.id)
    ).group_by(Prompt.type).all()
    prompts_by_business_type = query.with_entities(
        Prompt.business_type, func.count(Prompt.id)
    ).filter(
        Prompt.business_type.isnot(None)
    ).group_by(Prompt.business_type).all()
    prompts_by_generation_stage = query.with_entities(
        Prompt.generation_stage, func.count(Prompt.id)
    ).filter(
        Prompt.generation_stage.isnot(None)
    ).group_by(Prompt.generation_stage).all()

    # Recent activity
    recent_prompts = query.filter(
        Prompt.status == PromptStatus.ACTIVE
    ).order_by(desc(Prompt.updated_at)).limit(5).all()

    recent_activity = []
    for prompt in recent_prompts:
        recent_activity.append(PromptSummary(
            id=prompt.id,
            project_id=prompt.project_id or project.id,
            name=prompt.name,
            type=prompt.type,
            business_type=prompt.business_type,
            status=prompt.status,
            author=prompt.author,
            version=prompt.version,
            created_at=prompt.created_at,
            updated_at=prompt.updated_at,
            category=prompt.category
        ))

    # Recently updated
    most_recent = query.filter(
        Prompt.status == PromptStatus.ACTIVE
    ).order_by(desc(Prompt.updated_at)).limit(5).all()

    most_recent_prompts = []
    for prompt in most_recent:
        most_recent_prompts.append(PromptSummary(
            id=prompt.id,
            project_id=prompt.project_id or project.id,
            name=prompt.name,
            type=prompt.type,
            business_type=prompt.business_type,
            status=prompt.status,
            author=prompt.author,
            version=prompt.version,
            created_at=prompt.created_at,
            updated_at=prompt.updated_at,
            category=prompt.category
        ))

      # Helper function to safely get enum value
    def get_enum_value(enum_item):
        if hasattr(enum_item, 'value'):
            return enum_item.value
        return str(enum_item)

    return PromptStatistics(
        total_prompts=total_prompts,
        active_prompts=active_prompts,
        draft_prompts=draft_prompts,
        archived_prompts=archived_prompts,
        prompts_by_type={get_enum_value(ptype): count for ptype, count in prompts_by_type},
        prompts_by_business_type={get_enum_value(bt): count for bt, count in prompts_by_business_type},
        prompts_by_generation_stage={get_enum_value(gs): count for gs, count in prompts_by_generation_stage},
        recent_activity=recent_activity,
        most_recent=most_recent_prompts
    )


@router.get("/build/{business_type}")

async def build_prompt_for_business_type(
    business_type: str,
    prompt_builder: DatabasePromptBuilder = Depends(get_prompt_builder),
    db: Session = Depends(get_db)
):
    """Build a complete prompt for a business type."""
    prompt = prompt_builder.build_prompt(business_type)
    if prompt:
        return {"content": prompt, "business_type": business_type}
    else:
        raise HTTPException(status_code=404, detail="Failed to build prompt")




# Template endpoints
@router.get("/templates", response_model=List[PromptTemplateSchema])

async def get_prompt_templates(db: Session = Depends(get_db)):
    """Get all prompt templates."""
    templates = db.query(PromptTemplate).order_by(desc(PromptTemplate.updated_at)).all()

    result = []
    for template in templates:
        variables = json.loads(template.variables) if template.variables else None
        result.append(PromptTemplateSchema(
            id=template.id,
            name=template.name,
            template_content=template.template_content,
            description=template.description,
            variables=variables,
            created_at=template.created_at,
            updated_at=template.updated_at
        ))

    return result


@router.post("/templates", response_model=PromptTemplateSchema)

async def create_prompt_template(
    template: PromptTemplateCreate,
    db: Session = Depends(get_db)
):
    """Create a new prompt template."""
    variables_json = json.dumps(template.variables, ensure_ascii=False) if template.variables else None

    db_template = PromptTemplate(
        name=template.name,
        template_content=template.template_content,
        description=template.description,
        variables=variables_json
    )

    db.add(db_template)
    db.commit()
    db.refresh(db_template)

    variables = json.loads(db_template.variables) if db_template.variables else None
    return PromptTemplateSchema(
        id=db_template.id,
        name=db_template.name,
        template_content=db_template.template_content,
        description=db_template.description,
        variables=variables,
        created_at=db_template.created_at,
        updated_at=db_template.updated_at
    )


@router.delete("/templates/{template_id}")

async def delete_prompt_template(template_id: int, db: Session = Depends(get_db)):
    """Delete a prompt template."""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="模板未找到")

    db.delete(template)
    db.commit()
    return {"message": "模板删除成功"}