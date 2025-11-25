"""
Business type management service.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from fastapi import HTTPException, status
import json

from src.database.models import (
    BusinessTypeConfig, Project, PromptCombination,
    PromptCombinationItem, Prompt, BusinessType
)
from src.models.business import (
    BusinessTypeCreate, BusinessTypeUpdate, BusinessTypeResponse,
    BusinessTypeListResponse, BusinessTypeActivationRequest,
    PromptCombinationCreate, PromptCombinationUpdate, PromptCombinationResponse,
    PromptCombinationListResponse, PromptCombinationPreviewRequest,
    PromptCombinationPreviewResponse, PromptCombinationItemResponse,
    PromptCombinationItemCreate, BusinessTypeStatsResponse
)
from src.utils.database_prompt_builder import DatabasePromptBuilder


class BusinessService:
    """Service for business type management operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_business_types(
        self,
        project_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None
    ) -> BusinessTypeListResponse:
        """Get business types with filtering."""
        # Load business types with project relationship
        query = self.db.query(BusinessTypeConfig).options(
            joinedload(BusinessTypeConfig.project)
        )

        # Apply filters
        if project_id is not None:
            query = query.filter(BusinessTypeConfig.project_id == project_id)

        if is_active is not None:
            query = query.filter(BusinessTypeConfig.is_active == is_active)

        if search:
            search_filter = or_(
                BusinessTypeConfig.name.ilike(f"%{search}%"),
                BusinessTypeConfig.code.ilike(f"%{search}%"),
                BusinessTypeConfig.description.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)

        # Apply sorting by updated_at in descending order
        query = query.order_by(BusinessTypeConfig.updated_at.desc())

        # Get all items (no pagination)
        items = query.all()

        # Convert to response models
        business_types = []
        for item in items:
            business_type = BusinessTypeResponse(
                id=item.id,
                code=item.code,
                name=item.name,
                description=item.description,
                project_id=item.project_id,
                is_active=item.is_active,
                # Note: BusinessTypeConfig only has test_point_combination_id and test_case_combination_id
                # prompt_combination_id=item.prompt_combination_id,
                test_point_combination_id=item.test_point_combination_id,
                test_case_combination_id=item.test_case_combination_id,
                created_at=item.created_at,
                updated_at=item.updated_at,
                # Get project name from joined relationship
                project_name=item.project.name if item.project else None,
                prompt_combination_id=None,  # Set to None since it doesn't exist in the model
                prompt_combination_name=None,
                # Business is configured only if both test_point_combination_id and test_case_combination_id are set
                has_valid_prompt_combination=(
                    item.test_point_combination_id is not None and
                    item.test_case_combination_id is not None
                ),
                test_point_combination_name=None,
                test_case_combination_name=None,
                has_valid_test_point_combination=item.test_point_combination_id is not None,
                has_valid_test_case_combination=item.test_case_combination_id is not None
            )
            business_types.append(business_type)

        return BusinessTypeListResponse(items=business_types)

    def get_business_type(self, business_type_id: int) -> BusinessTypeResponse:
        """Get a specific business type by ID."""
        # Note: Commented out relationships that don't exist in the database model
        # business_type = self.db.query(BusinessTypeConfig).options(
        #     joinedload(BusinessTypeConfig.project),
        #     joinedload(BusinessTypeConfig.prompt_combination),
        #     joinedload(BusinessTypeConfig.test_point_combination),
        #     joinedload(BusinessTypeConfig.test_case_combination)
        # ).filter(BusinessTypeConfig.id == business_type_id).first()
        business_type = self.db.query(BusinessTypeConfig).filter(BusinessTypeConfig.id == business_type_id).first()

        if not business_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="业务类型不存在"
            )

        # Use joinedload to get project relationship for proper name resolution
        business_type_with_project = self.db.query(BusinessTypeConfig).options(
            joinedload(BusinessTypeConfig.project)
        ).filter(BusinessTypeConfig.id == business_type_id).first()

        # Use the loaded business type with project data
        bt = business_type_with_project if business_type_with_project else business_type

        return BusinessTypeResponse(
            id=bt.id,
            code=bt.code,
            name=bt.name,
            description=bt.description,
            project_id=bt.project_id,
            is_active=bt.is_active,
            test_point_combination_id=bt.test_point_combination_id,
            test_case_combination_id=bt.test_case_combination_id,
            created_at=bt.created_at,
            updated_at=bt.updated_at,
            project_name=bt.project.name if bt.project else None,
            prompt_combination_id=None,  # Set to None since it doesn't exist in the model
            prompt_combination_name=None,
            # Business is configured only if both test_point_combination_id and test_case_combination_id are set
            has_valid_prompt_combination=(
                bt.test_point_combination_id is not None and
                bt.test_case_combination_id is not None
            ),
            test_point_combination_name=None,
            test_case_combination_name=None,
            has_valid_test_point_combination=bt.test_point_combination_id is not None,
            has_valid_test_case_combination=bt.test_case_combination_id is not None
        )

    def create_business_type(self, business_type_data: BusinessTypeCreate) -> BusinessTypeResponse:
        """Create a new business type."""
        try:
            # Validate project (now required)
            project = self.db.query(Project).filter(
                Project.id == business_type_data.project_id
            ).first()
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="项目不存在"
                )

            # Check if code already exists within the same project
            existing_code = self.db.query(BusinessTypeConfig).filter(
                BusinessTypeConfig.code == business_type_data.code,
                BusinessTypeConfig.project_id == business_type_data.project_id
            ).first()
            if existing_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"业务编码 '{business_type_data.code}' 在当前项目中已存在"
                )

            # Check if name already exists within the same project
            existing_name = self.db.query(BusinessTypeConfig).filter(
                BusinessTypeConfig.name == business_type_data.name,
                BusinessTypeConfig.project_id == business_type_data.project_id
            ).first()
            if existing_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"业务名称 '{business_type_data.name}' 在当前项目中已存在"
                )

            # Create business type
            business_type = BusinessTypeConfig(
                code=business_type_data.code,
                name=business_type_data.name,
                description=business_type_data.description,
                project_id=business_type_data.project_id,
                is_active=False  # Start as inactive, need combinations
            )

            self.db.add(business_type)
            self.db.commit()
            self.db.refresh(business_type)

            return self.get_business_type(business_type.id)

        except HTTPException:
            # Re-raise HTTPExceptions without modification
            raise
        except Exception as e:
            # Rollback on other errors
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"创建业务类型失败: {str(e)}"
            )

    def update_business_type(
        self,
        business_type_id: int,
        business_type_data: BusinessTypeUpdate
    ) -> BusinessTypeResponse:
        """Update an existing business type."""
        try:
            business_type = self.db.query(BusinessTypeConfig).filter(
                BusinessTypeConfig.id == business_type_id
            ).first()

            if not business_type:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="业务类型不存在"
                )

            # Determine the target project_id (existing or new)
            target_project_id = business_type.project_id
            if business_type_data.project_id is not None:
                # Validate project if provided
                project = self.db.query(Project).filter(
                    Project.id == business_type_data.project_id
                ).first()
                if not project:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="项目不存在"
                    )
                target_project_id = business_type_data.project_id

            # Note: business code cannot be updated after creation for data integrity

            # Check for duplicate name within the same project (if name is being updated)
            if business_type_data.name is not None and business_type_data.name != business_type.name:
                existing_name = self.db.query(BusinessTypeConfig).filter(
                    BusinessTypeConfig.name == business_type_data.name,
                    BusinessTypeConfig.project_id == target_project_id,
                    BusinessTypeConfig.id != business_type_id
                ).first()
                if existing_name:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"业务名称 '{business_type_data.name}' 在当前项目中已存在"
                    )

            # Update fields (exclude project_id as handled above)
            update_data = business_type_data.model_dump(exclude_unset=True, exclude={'project_id'})
            for field, value in update_data.items():
                setattr(business_type, field, value)

            # Update project_id if provided
            if business_type_data.project_id is not None:
                business_type.project_id = business_type_data.project_id

            self.db.commit()
            self.db.refresh(business_type)

            return self.get_business_type(business_type.id)

        except HTTPException:
            # Re-raise HTTPExceptions without modification
            raise
        except Exception as e:
            # Rollback on other errors
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"更新业务类型失败: {str(e)}"
            )

    def delete_business_type(self, business_type_id: int) -> bool:
        """Delete a business type."""
        business_type = self.db.query(BusinessTypeConfig).filter(
            BusinessTypeConfig.id == business_type_id
        ).first()

        if not business_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="业务类型不存在"
            )

        # Check if business type is in use (has test cases, etc.)
        # Add checks here if needed

        self.db.delete(business_type)
        self.db.commit()
        return True

    def activate_business_type(
        self,
        business_type_id: int,
        activation_data: BusinessTypeActivationRequest
    ) -> BusinessTypeResponse:
        """Activate or deactivate a business type."""
        business_type = self.db.query(BusinessTypeConfig).filter(
            BusinessTypeConfig.id == business_type_id
        ).first()

        if not business_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="业务类型不存在"
            )

        # Note: Simplified activation logic since prompt_combination_id doesn't exist
        # If activating, check if business type has valid combinations
        if activation_data.is_active:
            # Check if business type has either test point or test case combinations
            if not business_type.test_point_combination_id and not business_type.test_case_combination_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot activate business type without test point or test case combinations"
                )

            # Note: Additional validation can be added here when needed
            # For now, just check that at least one combination exists

        business_type.is_active = activation_data.is_active
        self.db.commit()
        self.db.refresh(business_type)

        return self.get_business_type(business_type.id)

    def get_business_type_stats(self, project_id: Optional[int] = None) -> BusinessTypeStatsResponse:
        """Get business type statistics, optionally filtered by project."""
        # Base query
        query = self.db.query(BusinessTypeConfig)

        # Apply project filter if specified
        if project_id is not None:
            query = query.filter(BusinessTypeConfig.project_id == project_id)

        # Total counts
        total_count = query.count()
        active_count = query.filter(BusinessTypeConfig.is_active == True).count()
        inactive_count = total_count - active_count

        # Business is considered configured only if both test_point_combination_id and test_case_combination_id are set
        with_combination = query.filter(
            BusinessTypeConfig.test_point_combination_id.isnot(None),
            BusinessTypeConfig.test_case_combination_id.isnot(None)
        ).count()
        without_combination = total_count - with_combination

        # By project
        project_stats = self.db.query(
            Project.id,
            Project.name,
            func.count(BusinessTypeConfig.id).label('count')
        ).outerjoin(BusinessTypeConfig).group_by(Project.id, Project.name).all()

        by_project = [
            {"project_id": stat.id, "project_name": stat.name or "未分配", "count": stat.count}
            for stat in project_stats
        ]

        return BusinessTypeStatsResponse(
            total_business_types=total_count,
            active_business_types=active_count,
            inactive_business_types=inactive_count,
            business_types_with_prompt_combinations=with_combination,
            business_types_without_prompt_combinations=without_combination,
            by_project=by_project
        )

    def _has_valid_prompt_combination(
        self,
        business_type: BusinessTypeConfig,
        combination_type: str = 'test_point'
    ) -> bool:
        """Check if business type has a valid prompt combination.

        Args:
            business_type: The business type to check
            combination_type: Type of combination ('test_point', 'test_case')
        """
        # Note: prompt_combination_id doesn't exist, only test_point_combination_id and test_case_combination_id
        # Get the appropriate combination ID based on type
        if combination_type == 'test_point':
            combination_id = business_type.test_point_combination_id
        elif combination_type == 'test_case':
            combination_id = business_type.test_case_combination_id
        else:
            return False

        if not combination_id:
            return False

        combination = self.db.query(PromptCombination).filter(
            PromptCombination.id == combination_id
        ).first()

        return combination and combination.is_valid

    def get_available_prompts(self, project_id: Optional[int] = None, business_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get available prompts for prompt builder."""
        from src.database.models import PromptStatus

        # Query specific fields only to avoid loading relationships
        query = self.db.query(
            Prompt.id,
            Prompt.name,
            Prompt.content,
            Prompt.type,
            Prompt.business_type,
            Prompt.status,
            Prompt.updated_at
        ).filter(Prompt.status == PromptStatus.ACTIVE)

        if project_id:
            query = query.filter(Prompt.project_id == project_id)

        if business_type:
            query = query.filter(Prompt.business_type == business_type)

        prompts = query.order_by(Prompt.updated_at.desc()).limit(100).all()

        result = []
        for prompt in prompts:
            # Create description from content (first 200 characters)
            description = ""
            if prompt.content:
                if len(prompt.content) > 200:
                    description = prompt.content[:200] + "..."
                else:
                    description = prompt.content

            result.append({
                "id": prompt.id,
                "name": prompt.name,
                "content": prompt.content or "",
                "type": prompt.type.value if prompt.type else "",
                "business_type": prompt.business_type or "",
                "description": description,
                "is_active": prompt.status == PromptStatus.ACTIVE,
                "category": ""  # Set empty string for now
            })

        return result


class PromptCombinationService:
    """Service for prompt combination management operations."""

    def __init__(self, db: Session):
        self.db = db
        # Note: DatabasePromptBuilder initialization removed to avoid session/database_url issues
        # It can be added later when needed for prompt building operations

    def get_prompt_combinations(
        self,
        project_id: Optional[int] = None,
        business_type: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> PromptCombinationListResponse:
        """Get prompt combinations with filtering and pagination."""
        # Note: Commented out relationships that don't exist in the database model
        # query = self.db.query(PromptCombination).options(
        #     joinedload(PromptCombination.project),
        #     joinedload(PromptCombination.items).joinedload(PromptCombinationItem.prompt)
        # )
        query = self.db.query(PromptCombination)

        # Apply filters
        if project_id is not None:
            query = query.filter(PromptCombination.project_id == project_id)

        if business_type is not None:
            query = query.filter(PromptCombination.business_type == business_type)

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * size
        items = query.offset(offset).limit(size).all()

        # Convert to response models
        combinations = []
        for item in items:
            combination = PromptCombinationResponse(
                id=item.id,
                name=item.name,
                description=item.description,
                business_type=item.business_type,
                is_active=item.is_active,
                is_valid=item.is_valid,
                validation_errors=item.validation_errors,
                created_by=item.created_by,
                created_at=item.created_at,
                updated_at=item.updated_at,
                project_id=item.project_id,
                project_name=item.project.name if item.project else None,
                items=[
                    PromptCombinationItemResponse(
                        id=combo_item.id,
                        combination_id=combo_item.combination_id,
                        prompt_id=combo_item.prompt_id,
                        order=combo_item.order,
                        variable_name=combo_item.variable_name,
                        is_required=combo_item.is_required,
                        created_at=combo_item.created_at,
                        prompt_name=combo_item.prompt.name,
                        prompt_type=combo_item.prompt.type.value,
                        prompt_content=combo_item.prompt.content
                    )
                    for combo_item in sorted(item.items, key=lambda x: x.order)
                ]
            )
            combinations.append(combination)

        return PromptCombinationListResponse(
            items=combinations,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )

    def get_prompt_combination(self, combination_id: int) -> PromptCombinationResponse:
        """Get a specific prompt combination by ID."""
        combination = self.db.query(PromptCombination).options(
            joinedload(PromptCombination.project),
            joinedload(PromptCombination.items).joinedload(PromptCombinationItem.prompt)
        ).filter(PromptCombination.id == combination_id).first()

        if not combination:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prompt combination not found"
            )

        return PromptCombinationResponse(
            id=combination.id,
            name=combination.name,
            description=combination.description,
            business_type=combination.business_type,
            is_active=combination.is_active,
            is_valid=combination.is_valid,
            validation_errors=combination.validation_errors,
            created_by=combination.created_by,
            created_at=combination.created_at,
            updated_at=combination.updated_at,
            project_id=combination.project_id,
            project_name=combination.project.name if combination.project else None,
            items=[
                PromptCombinationItemResponse(
                    id=combo_item.id,
                    combination_id=combo_item.combination_id,
                    prompt_id=combo_item.prompt_id,
                    order=combo_item.order,
                    variable_name=combo_item.variable_name,
                    is_required=combo_item.is_required,
                    created_at=combo_item.created_at,
                    prompt_name=combo_item.prompt.name,
                    prompt_type=combo_item.prompt.type.value,
                    prompt_content=combo_item.prompt.content
                )
                for combo_item in sorted(combination.items, key=lambda x: x.order)
            ]
        )

    def create_prompt_combination(self, combination_data: PromptCombinationCreate) -> PromptCombinationResponse:
        """Create a new prompt combination."""
        # Validate project
        project = self.db.query(Project).filter(Project.id == combination_data.project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="项目不存在"
            )

        # Handle both input formats: items or prompt_ids
        if combination_data.items:
            # Use items format (detailed format with order, variables, etc.)
            prompt_ids = [item.prompt_id for item in combination_data.items]
            items_data = combination_data.items
        elif combination_data.prompt_ids:
            # Use prompt_ids format (simple format from frontend)
            prompt_ids = combination_data.prompt_ids
            # Create simple items with default values
            items_data = [
                PromptCombinationItemCreate(
                    prompt_id=prompt_id,
                    order=index + 1,
                    variable_name=None,
                    is_required=True
                )
                for index, prompt_id in enumerate(combination_data.prompt_ids)
            ]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either items or prompt_ids must be provided"
            )

        # Validate prompts
        prompts = self.db.query(Prompt).filter(Prompt.id.in_(prompt_ids)).all()
        if len(prompts) != len(prompt_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more prompts not found"
            )

        # Create combination
        combination = PromptCombination(
            name=combination_data.name,
            description=combination_data.description,
            project_id=combination_data.project_id,
            business_type=combination_data.business_type,
            is_active=True
        )

        self.db.add(combination)
        self.db.flush()  # Get the ID

        # Create items
        for item_data in items_data:
            item = PromptCombinationItem(
                combination_id=combination.id,
                prompt_id=item_data.prompt_id,
                order=item_data.order,
                variable_name=item_data.variable_name,
                is_required=item_data.is_required
            )
            self.db.add(item)

        # Validate combination
        self._validate_combination(combination)

        self.db.commit()
        self.db.refresh(combination)

        return self.get_prompt_combination(combination.id)

    def update_prompt_combination(
        self,
        combination_id: int,
        combination_data: PromptCombinationUpdate
    ) -> PromptCombinationResponse:
        """Update an existing prompt combination."""
        combination = self.db.query(PromptCombination).filter(
            PromptCombination.id == combination_id
        ).first()

        if not combination:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prompt combination not found"
            )

        # Update fields
        update_data = combination_data.model_dump(exclude_unset=True)
        items_data = update_data.pop('items', None)

        for field, value in update_data.items():
            setattr(combination, field, value)

        # Update items if provided
        if items_data is not None:
            # Remove existing items
            self.db.query(PromptCombinationItem).filter(
                PromptCombinationItem.combination_id == combination_id
            ).delete()

            # Add new items
            for item_data in items_data:
                if item_data.prompt_id:  # Only add if prompt_id is provided
                    item = PromptCombinationItem(
                        combination_id=combination_id,
                        prompt_id=item_data.prompt_id,
                        order=item_data.order or 0,
                        variable_name=item_data.variable_name,
                        is_required=item_data.is_required if item_data.is_required is not None else True
                    )
                    self.db.add(item)

        # Re-validate combination
        self._validate_combination(combination)

        self.db.commit()
        self.db.refresh(combination)

        return self.get_prompt_combination(combination_id)

    def delete_prompt_combination(self, combination_id: int) -> bool:
        """Delete a prompt combination."""
        combination = self.db.query(PromptCombination).filter(
            PromptCombination.id == combination_id
        ).first()

        if not combination:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prompt combination not found"
            )

        # Check if combination is in use by business types
        # Note: Since prompt_combination_id doesn't exist, check both test_point_combination_id and test_case_combination_id
        business_types_count = self.db.query(BusinessTypeConfig).filter(
            (BusinessTypeConfig.test_point_combination_id == combination_id) |
            (BusinessTypeConfig.test_case_combination_id == combination_id)
        ).count()

        if business_types_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete combination. It is used by {business_types_count} business type(s)"
            )

        self.db.delete(combination)
        self.db.commit()
        return True

    def preview_prompt_combination(
        self,
        preview_data: PromptCombinationPreviewRequest
    ) -> PromptCombinationPreviewResponse:
        """Preview a prompt combination without saving."""
        try:
            # Validate prompts
            prompt_ids = [item.prompt_id for item in preview_data.items]
            prompts = self.db.query(Prompt).filter(Prompt.id.in_(prompt_ids)).all()

            if len(prompts) != len(prompt_ids):
                return PromptCombinationPreviewResponse(
                    combined_prompt="",
                    is_valid=False,
                    validation_errors=["One or more prompts not found"],
                    used_prompts=[]
                )

            # Sort items by order
            sorted_items = sorted(preview_data.items, key=lambda x: x.order)

            # Build combined prompt
            prompt_parts = []
            used_prompts_info = []

            for item in sorted_items:
                prompt = next((p for p in prompts if p.id == item.prompt_id), None)
                if prompt:
                    prompt_parts.append(prompt.content)
                    used_prompts_info.append({
                        "id": prompt.id,
                        "name": prompt.name,
                        "type": prompt.type.value,
                        "order": item.order,
                        "variable_name": item.variable_name,
                        "is_required": item.is_required
                    })

            combined_prompt = "\n\n".join(prompt_parts)

            # Extract template variables from combined prompt
            import re
            template_pattern = r'\{\{([^}]+)\}\}'
            variables = list(set(re.findall(template_pattern, combined_prompt)))

            # Validate the combination
            validation_errors = []
            if not combined_prompt.strip():
                validation_errors.append("Combined prompt is empty")

            # Check for required components
            has_system_prompt = any(p.type.value == "system" for p in prompts)
            has_business_description = any(p.type.value == "business_description" for p in prompts)

            if not has_system_prompt:
                validation_errors.append("Missing system prompt")
            if not has_business_description:
                validation_errors.append("Missing business description")

            # Determine status message
            message = "Preview generated successfully" if len(validation_errors) == 0 else f"Preview generated with {len(validation_errors)} warnings"

            return PromptCombinationPreviewResponse(
                combined_prompt=combined_prompt,
                is_valid=len(validation_errors) == 0,
                validation_errors=validation_errors,
                used_prompts=used_prompts_info,
                variables=variables,
                message=message
            )

        except Exception as e:
            return PromptCombinationPreviewResponse(
                combined_prompt="",
                is_valid=False,
                validation_errors=[f"Preview error: {str(e)}"],
                used_prompts=[],
                variables=[],
                message=f"Error: {str(e)}"
            )

    def _validate_combination(self, combination: PromptCombination):
        """Validate a prompt combination and update its status."""
        try:
            # Get items with prompts
            items = self.db.query(PromptCombinationItem).options(
                joinedload(PromptCombinationItem.prompt)
            ).filter(
                PromptCombinationItem.combination_id == combination.id
            ).all()

            if not items:
                combination.is_valid = False
                combination.validation_errors = json.dumps(["No items in combination"])
                return

            # Check for required components
            prompts = [item.prompt for item in items]
            validation_errors = []

            has_system_prompt = any(p.type.value == "system" for p in prompts)
            has_business_description = any(p.type.value == "business_description" for p in prompts)

            if not has_system_prompt:
                validation_errors.append("Missing system prompt")
            if not has_business_description:
                validation_errors.append("Missing business description")

            # Check for duplicate prompt types
            prompt_types = [p.type.value for p in prompts]
            if len(prompt_types) != len(set(prompt_types)):
                validation_errors.append("Duplicate prompt types in combination")

            # Update validation status
            combination.is_valid = len(validation_errors) == 0
            combination.validation_errors = json.dumps(validation_errors) if validation_errors else None

        except Exception as e:
            combination.is_valid = False
            combination.validation_errors = json.dumps([f"Validation error: {str(e)}"])