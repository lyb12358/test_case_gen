"""
API endpoints for prompt management system.
"""

import json
import re
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from ..database.database import DatabaseManager
from ..database.models import (
    Prompt, PromptCategory, PromptVersion, PromptTemplate,
    PromptType, PromptStatus, BusinessType, Project
)
from ..database.operations import DatabaseOperations

def validate_project_id(project_id: Optional[int], db: Session, use_default: bool = True):
    """Validate project ID similar to endpoints.py"""
    if project_id is None:
        if use_default:
            db_operations = DatabaseOperations(db)
            return db_operations.get_or_create_default_project()
        else:
            return None

    db_operations = DatabaseOperations(db)
    project = db_operations.get_project(project_id)
    if project is None:
        raise HTTPException(
            status_code=404,
            detail=f"Project with ID {project_id} not found"
        )
    return project
from ..models.prompt import (
    Prompt as PromptSchema,
    PromptCreate,
    PromptUpdate,
    PromptSummary,
    PromptListResponse,
    PromptSearchRequest,
    PromptPreviewRequest,
    PromptPreviewResponse,
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

# Create router
router = APIRouter(prefix="/api/v1/prompts", tags=["prompts"])


def get_database_manager() -> DatabaseManager:
    """Dependency to get database manager."""
    config = Config()
    return DatabaseManager(config)


def get_db_session(db_manager: DatabaseManager = Depends(get_database_manager)):
    """Dependency to get database session."""
    return db_manager.get_session().__enter__()


def get_prompt_builder(db_manager: DatabaseManager = Depends(get_database_manager)) -> DatabasePromptBuilder:
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
async def get_prompt_categories(db: Session = Depends(get_db_session)):
    """Get all prompt categories."""
    categories = db.query(PromptCategory).order_by(PromptCategory.order, PromptCategory.name).all()
    return categories


@router.post("/categories", response_model=PromptCategorySchema)
async def create_prompt_category(
    category: PromptCategoryCreate,
    db: Session = Depends(get_db_session)
):
    """Create a new prompt category."""
    # Check if category with same name already exists
    existing = db.query(PromptCategory).filter(PromptCategory.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    db_category = PromptCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@router.put("/categories/{category_id}", response_model=PromptCategorySchema)
async def update_prompt_category(
    category_id: int,
    category_update: PromptCategoryUpdate,
    db: Session = Depends(get_db_session)
):
    """Update a prompt category."""
    category = db.query(PromptCategory).filter(PromptCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Update fields
    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
async def delete_prompt_category(category_id: int, db: Session = Depends(get_db_session)):
    """Delete a prompt category."""
    category = db.query(PromptCategory).filter(PromptCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if category has prompts
    prompt_count = db.query(Prompt).filter(Prompt.category_id == category_id).count()
    if prompt_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {prompt_count} prompts. Move or delete prompts first."
        )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}


# Prompt endpoints
@router.get("/", response_model=PromptListResponse)
async def get_prompts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    type: Optional[PromptType] = Query(None),
    business_type: Optional[BusinessType] = Query(None),
    status: Optional[PromptStatus] = Query(None),
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db_session)
):
    """Get prompts with pagination and filtering."""
    # Validate project ID with backward compatibility
    project = validate_project_id(project_id, db, use_default=True)

    query = db.query(Prompt)

    # Apply filters
    if project_id:
        query = query.filter(Prompt.project_id == project.id)
    if type:
        query = query.filter(Prompt.type == type)
    if business_type:
        query = query.filter(Prompt.business_type == business_type)
    if status:
        query = query.filter(Prompt.status == status)
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
            type=prompt.type,
            business_type=prompt.business_type,
            status=prompt.status,
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
async def get_prompt(prompt_id: int, db: Session = Depends(get_db_session)):
    """Get a specific prompt by ID."""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Parse JSON fields
    tags = json.loads(prompt.tags) if prompt.tags else None
    variables = json.loads(prompt.variables) if prompt.variables else None
    extra_metadata = json.loads(prompt.extra_metadata) if prompt.extra_metadata else None

    return PromptSchema(
        id=prompt.id,
        name=prompt.name,
        content=prompt.content,
        type=prompt.type,
        business_type=prompt.business_type,
        status=prompt.status,
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


@router.post("/", response_model=PromptSchema)
async def create_prompt(
    prompt: PromptCreate,
    project_id: Optional[int] = Query(None, description="Project ID for the prompt"),
    db: Session = Depends(get_db_session)
):
    """Create a new prompt."""
    # Validate project ID with backward compatibility
    project = validate_project_id(project_id, db, use_default=True)

    # Check if prompt with same name already exists
    existing = db.query(Prompt).filter(Prompt.name == prompt.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Prompt with this name already exists")

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
    return await get_prompt(db_prompt.id, db)


@router.put("/{prompt_id}", response_model=PromptSchema)
async def update_prompt(
    prompt_id: int,
    prompt_update: PromptUpdate,
    db: Session = Depends(get_db_session)
):
    """Update a prompt."""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Store old content for version history
    old_content = prompt.content

    # Update fields
    update_data = prompt_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["tags", "variables", "extra_metadata"] and value is not None:
            # Convert lists to JSON
            setattr(prompt, field, json.dumps(value, ensure_ascii=False))
        else:
            setattr(prompt, field, value)

    # Update timestamp
    prompt.updated_at = datetime.now()

    db.commit()

    # Create version history if content changed
    if "content" in update_data and old_content != prompt.content:
        # Parse semantic version and increment patch version
        try:
            version_parts = prompt.version.split('.')
            major = int(version_parts[0])
            minor = int(version_parts[1])
            patch = int(version_parts[2])
            new_version = f"{major}.{minor}.{patch + 1}"
        except (IndexError, ValueError):
            # Fallback if version format is unexpected
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
    return await get_prompt(prompt_id, db)


@router.delete("/{prompt_id}")
async def delete_prompt(prompt_id: int, db: Session = Depends(get_db_session)):
    """Delete a prompt."""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    db.delete(prompt)
    db.commit()
    return {"message": "Prompt deleted successfully"}


@router.post("/{prompt_id}/clone", response_model=PromptSchema)
async def clone_prompt(
    prompt_id: int,
    db: Session = Depends(get_db_session)
):
    """Clone a prompt."""
    original = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Prompt not found")

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

    return await get_prompt(clone.id, db)


# Search and preview endpoints
@router.post("/search", response_model=PromptListResponse)
async def search_prompts(
    search_request: PromptSearchRequest,
    db: Session = Depends(get_db_session)
):
    """Search prompts with advanced filtering."""
    query = db.query(Prompt).filter(Prompt.status == PromptStatus.ACTIVE)

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
async def preview_prompt(
    preview_request: PromptPreviewRequest,
    prompt_builder: DatabasePromptBuilder = Depends(get_prompt_builder)
):
    """Preview a prompt with variable substitution."""
    content = preview_request.content

    # Extract variables from content
    variable_pattern = r'\{\{(\w+)\}\}'
    detected_variables = list(set(re.findall(variable_pattern, content)))

    # Substitute variables if provided
    if preview_request.variables:
        for var_name, var_value in preview_request.variables.items():
            content = content.replace(f"{{{{{var_name}}}}}", var_value)

    return PromptPreviewResponse(
        rendered_content=content,
        detected_variables=detected_variables
    )


@router.post("/{prompt_id}/validate", response_model=PromptValidationResponse)
async def validate_prompt(prompt_id: int, db: Session = Depends(get_db_session)):
    """Validate a prompt and provide suggestions."""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

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
    db: Session = Depends(get_db_session)
):
    """Get prompt statistics overview for a specific project."""
    # Validate project ID with backward compatibility
    project = validate_project_id(project_id, db, use_default=True)

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

    return PromptStatistics(
        total_prompts=total_prompts,
        active_prompts=active_prompts,
        draft_prompts=draft_prompts,
        archived_prompts=archived_prompts,
        prompts_by_type={ptype.value: count for ptype, count in prompts_by_type},
        prompts_by_business_type={bt.value: count for bt, count in prompts_by_business_type},
        recent_activity=recent_activity,
        most_recent=most_recent_prompts
    )


@router.get("/build/{business_type}")
async def build_prompt_for_business_type(
    business_type: str,
    prompt_builder: DatabasePromptBuilder = Depends(get_prompt_builder)
):
    """Build a complete prompt for a business type."""
    try:
        prompt = prompt_builder.build_prompt(business_type)
        if prompt:
            return {"content": prompt, "business_type": business_type}
        else:
            raise HTTPException(status_code=404, detail="Failed to build prompt")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))




# Template endpoints
@router.get("/templates", response_model=List[PromptTemplateSchema])
async def get_prompt_templates(db: Session = Depends(get_db_session)):
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
    db: Session = Depends(get_db_session)
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
async def delete_prompt_template(template_id: int, db: Session = Depends(get_db_session)):
    """Delete a prompt template."""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}