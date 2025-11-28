# -*- coding: utf-8 -*-
"""
Unified test case API endpoints.
Combines test point and test case management in a single unified API.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
import json
import uuid
import logging
from datetime import datetime
from pydantic import BaseModel

from ..database.models import (
    UnifiedTestCase, Project,
    BusinessType, GenerationJob, UnifiedTestCaseStatus
)
from ..models.unified_test_case import (
    UnifiedTestCaseCreate, UnifiedTestCaseUpdate, UnifiedTestCaseResponse,
    UnifiedTestCaseListResponse, UnifiedTestCaseFilter, UnifiedTestCaseStatistics,
    UnifiedTestCaseBatchOperation, UnifiedTestCaseBatchResponse,
    UnifiedTestCaseGenerationRequest, UnifiedTestCaseGenerationResponse,
    UnifiedTestCaseStage, UnifiedTestCaseDeleteResponse
)

from .dependencies import get_db
from ..core.test_point_generator import TestPointGenerator
from ..core.test_case_generator import TestCaseGenerator
from ..services.sync_transaction_manager import SyncTransactionManager
from ..utils.config import Config

router = APIRouter(prefix="/api/v1/unified-test-cases", tags=["unified-test-cases"])

logger = logging.getLogger(__name__)

def _get_business_type_value(business_type):
    """
    安全地获取business_type的值，处理枚举和字符串类型
    """
    if business_type is None:
        return None
    if hasattr(business_type, 'value'):
        return business_type.value
    return business_type

# Implementation function
async def get_unified_test_cases_impl(
    filter_params: UnifiedTestCaseFilter,
    db: Session
) -> UnifiedTestCaseListResponse:
    """
    获取统一测试用例列表的具体实现
    支持按阶段、状态、业务类型等过滤
    """
    try:
        # 构建查询
        query = db.query(UnifiedTestCase)

        # 应用过滤条件
        if filter_params.project_id:
            query = query.filter(UnifiedTestCase.project_id == filter_params.project_id)

        if filter_params.business_type:
            query = query.filter(UnifiedTestCase.business_type == filter_params.business_type)

        if filter_params.status:
            query = query.filter(UnifiedTestCase.status == filter_params.status.value)

        if filter_params.priority:
            query = query.filter(UnifiedTestCase.priority == filter_params.priority)

        if filter_params.keyword:
            keyword = f"%{filter_params.keyword}%"
            query = query.filter(
                or_(
                    UnifiedTestCase.name.ilike(keyword),
                    UnifiedTestCase.description.ilike(keyword),
                    UnifiedTestCase.test_case_id.ilike(keyword)
                )
            )

        # 按测试点ID过滤
        if filter_params.test_point_ids:
            query = query.filter(UnifiedTestCase.test_point_id.in_(filter_params.test_point_ids))

        # 按阶段过滤
        if filter_params.stage == UnifiedTestCaseStage.TEST_POINT:
            query = query.filter(
                UnifiedTestCase.steps.is_(None)
            )
        elif filter_params.stage == UnifiedTestCaseStage.TEST_CASE:
            query = query.filter(
                UnifiedTestCase.steps.isnot(None)
            )

        # 获取总数
        total = query.count()

        # 应用排序
        sort_column = getattr(UnifiedTestCase, filter_params.sort_by, UnifiedTestCase.created_at)
        if filter_params.sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # 应用分页
        offset = (filter_params.page - 1) * filter_params.size
        test_cases = query.offset(offset).limit(filter_params.size).all()

        # 转换为响应模型
        test_case_responses = []
        for test_case in test_cases:
            stage = (
                UnifiedTestCaseStage.TEST_POINT
                if test_case.is_test_point_stage()
                else UnifiedTestCaseStage.TEST_CASE
            )

            response_data = UnifiedTestCaseResponse(
                id=test_case.id,
                project_id=test_case.project_id,
                business_type=_get_business_type_value(test_case.business_type),
                case_id=test_case.test_case_id,
                name=test_case.name,
                description=test_case.description,
                priority=test_case.priority,
                status=test_case.status,
                stage=stage,
                module=test_case.module,
                functional_module=test_case.functional_module,
                functional_domain=test_case.functional_domain,
                preconditions=_parse_json_field(test_case.preconditions),
                steps=_parse_steps_field(test_case.steps),
                expected_result=_parse_json_field(test_case.expected_result),
                remarks=test_case.remarks,
                generation_job_id=test_case.generation_job_id,
                entity_order=test_case.entity_order,
                created_at=test_case.created_at,
                updated_at=test_case.updated_at
            )
            test_case_responses.append(response_data)

        # 计算总页数
        pages = (total + filter_params.size - 1) // filter_params.size

        return UnifiedTestCaseListResponse(
            items=test_case_responses,
            total=total,
            page=filter_params.page,
            size=filter_params.size,
            pages=pages
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取测试用例列表失败: {str(e)}")


# API endpoints with both path variations
@router.get("/", response_model=UnifiedTestCaseListResponse)
async def get_unified_test_cases(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页大小"),
    project_id: Optional[int] = Query(None, description="项目ID"),
    business_type: Optional[str] = Query(None, description="业务类型"),
    status: Optional[UnifiedTestCaseStatus] = Query(None, description="状态"),
    stage: Optional[UnifiedTestCaseStage] = Query(None, description="阶段"),
    priority: Optional[str] = Query(None, pattern="^(low|medium|high)$", description="优先级"),
    keyword: Optional[str] = Query(None, description="关键词搜索"),
    test_point_ids: Optional[List[int]] = Query(None, description="测试点ID列表"),
    sort_by: str = Query("created_at", description="排序字段"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="排序方向"),
    db: Session = Depends(get_db)
):
    """
    获取统一测试用例列表
    """
    # 手动构建过滤器对象
    filter_params = UnifiedTestCaseFilter(
        page=page,
        size=size,
        project_id=project_id,
        business_type=business_type,
        status=status,
        stage=stage,
        priority=priority,
        keyword=keyword,
        test_point_ids=test_point_ids,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return await get_unified_test_cases_impl(filter_params, db)




@router.get("/{test_case_id}", response_model=UnifiedTestCaseResponse)
async def get_unified_test_case(
    test_case_id: int,
    db: Session = Depends(get_db)
):
    """获取单个统一测试用例详情"""
    try:
        test_case = db.query(UnifiedTestCase).filter(UnifiedTestCase.id == test_case_id).first()

        if not test_case:
            raise HTTPException(status_code=404, detail="测试用例不存在")

        stage = (
            UnifiedTestCaseStage.TEST_POINT
            if test_case.is_test_point_stage()
            else UnifiedTestCaseStage.TEST_CASE
        )

        return UnifiedTestCaseResponse(
            id=test_case.id,
            project_id=test_case.project_id,
            business_type=_get_business_type_value(test_case.business_type),
            case_id=test_case.test_case_id,
            name=test_case.name,
            description=test_case.description,
            priority=test_case.priority,
            status=test_case.status,
            stage=stage,
            module=test_case.module,
            functional_module=test_case.functional_module,
            functional_domain=test_case.functional_domain,
            preconditions=_parse_json_field(test_case.preconditions),
            steps=_parse_json_field(test_case.steps),
            expected_result=_parse_json_field(test_case.expected_result),
            remarks=test_case.remarks,
            generation_job_id=test_case.generation_job_id,
            entity_order=test_case.entity_order,
            created_at=test_case.created_at,
            updated_at=test_case.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取测试用例详情失败: {str(e)}")


@router.post("/", response_model=UnifiedTestCaseResponse)
async def create_unified_test_case(
    test_case_data: UnifiedTestCaseCreate,
    db: Session = Depends(get_db)
):
    """创建新的统一测试用例"""
    try:
        # 验证项目存在
        from ..database.models import Project
        project = db.query(Project).filter(Project.id == test_case_data.project_id).first()
        if not project:
            raise HTTPException(status_code=400, detail="项目不存在")

        # 检查case_id在项目内的唯一性
        existing_case = db.query(UnifiedTestCase).filter(
            and_(
                UnifiedTestCase.project_id == test_case_data.project_id,
                UnifiedTestCase.business_type == test_case_data.business_type,
                UnifiedTestCase.test_case_id == test_case_data.case_id
            )
        ).first()

        if existing_case:
            raise HTTPException(status_code=400, detail="测试用例ID在当前项目和业务类型中已存在")

        # Check for business-scoped name uniqueness
        sync_manager = SyncTransactionManager(db)
        if not sync_manager.validate_business_uniqueness(
            business_type=test_case_data.business_type,
            name=test_case_data.name,
            entity_type='test_case'
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Test case name '{test_case_data.name}' already exists in business type '{test_case_data.business_type}'"
            )

        # 如果有test_point_id，需要从测试点继承字段
        inherited_fields = {}
        if hasattr(test_case_data, 'test_point_id') and test_case_data.test_point_id:
            from ..database.models import TestPoint
            test_point = db.query(TestPoint).filter(TestPoint.id == test_case_data.test_point_id).first()
            if test_point:
                logger.info(f"继承测试点字段: test_point_id={test_case_data.test_point_id}")
                inherited_fields = {
                    'business_type': test_point.business_type,
                    'priority': test_point.priority
                }
                # 也可以继承名称和描述，但这可能导致冲突，根据业务需求决定
                # name=test_point.title,
                # description=test_point.description

        # 创建统一测试用例，继承字段优先使用继承值，前端提供的值作为覆盖
        db_test_case = UnifiedTestCase(
            project_id=test_case_data.project_id,
            business_type=inherited_fields.get('business_type', test_case_data.business_type),
            test_case_id=test_case_data.case_id,
            test_point_id=getattr(test_case_data, 'test_point_id', None),
            name=test_case_data.name,
            description=test_case_data.description,
            priority=inherited_fields.get('priority', test_case_data.priority),
            status=test_case_data.status.value if test_case_data.status else UnifiedTestCaseStatus.DRAFT,
            module=test_case_data.module,
            functional_module=test_case_data.functional_module,
            functional_domain=test_case_data.functional_domain,
            preconditions=_serialize_json_field(test_case_data.preconditions),
            steps=_serialize_json_field(test_case_data.steps),
            expected_result=_serialize_json_field(test_case_data.expected_result),
            remarks=test_case_data.remarks,
            entity_order=test_case_data.entity_order,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        db.add(db_test_case)
        db.commit()
        db.refresh(db_test_case)

        stage = (
            UnifiedTestCaseStage.TEST_POINT
            if db_test_case.is_test_point_stage()
            else UnifiedTestCaseStage.TEST_CASE
        )

        return UnifiedTestCaseResponse(
            id=db_test_case.id,
            project_id=db_test_case.project_id,
            business_type=_get_business_type_value(db_test_case.business_type),
            case_id=db_test_case.test_case_id,
            name=db_test_case.name,
            description=db_test_case.description,
            priority=db_test_case.priority,
            status=db_test_case.status,
            stage=stage,
            module=db_test_case.module,
            functional_module=db_test_case.functional_module,
            functional_domain=db_test_case.functional_domain,
            preconditions=_parse_json_field(db_test_case.preconditions),
            steps=_parse_json_field(db_test_case.steps),
            expected_result=_parse_json_field(db_test_case.expected_result),
            remarks=db_test_case.remarks,
            generation_job_id=db_test_case.generation_job_id,
            entity_order=db_test_case.entity_order,
            created_at=db_test_case.created_at,
            updated_at=db_test_case.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"创建测试用例失败: {str(e)}")


@router.put("/{test_case_id}", response_model=UnifiedTestCaseResponse)
async def update_unified_test_case(
    test_case_id: int,
    test_case_data: UnifiedTestCaseUpdate,
    db: Session = Depends(get_db)
):
    """更新统一测试用例"""
    try:
        test_case = db.query(UnifiedTestCase).filter(UnifiedTestCase.id == test_case_id).first()

        if not test_case:
            raise HTTPException(status_code=404, detail="测试用例不存在")

        # 更新字段
        update_data = test_case_data.dict(exclude_unset=True)

        # 处理枚举值
        if 'status' in update_data:
            update_data['status'] = update_data['status'].value

        # 处理JSON字段
        json_fields = ['preconditions', 'steps', 'expected_result']
        for field in json_fields:
            if field in update_data:
                update_data[field] = _serialize_json_field(update_data[field])

        # 更新时间戳
        update_data['updated_at'] = datetime.now()

        # Track if name is being updated for sync
        name_updated = False
        new_name = None
        if 'name' in update_data and update_data['name'] != test_case.name:
            # Check for business-scoped name uniqueness before updating
            sync_manager = SyncTransactionManager(db)
            if not sync_manager.validate_business_uniqueness(
                business_type=test_case.business_type,
                name=update_data['name'],
                entity_type='test_case',
                exclude_id=test_case.id
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Test case name '{update_data['name']}' already exists in business type '{test_case.business_type}'"
                )

            name_updated = True
            new_name = update_data['name']
            logger.info(f"Test case name update detected: '{test_case.name}' -> '{new_name}' (test_case_id: {test_case_id})")

        # Apply updates to the test case
        for field, value in update_data.items():
            setattr(test_case, field, value)

        # Sync name to test point if name was updated, within the same transaction
        if name_updated and test_case.test_point_id:
            sync_manager = SyncTransactionManager(db)
            logger.info(f"Initiating name sync from test case {test_case_id} to test point {test_case.test_point_id}")
            sync_success = sync_manager.sync_names_within_transaction(
                source_type='test_case',
                source_id=test_case_id,
                new_name=new_name
            )
            if sync_success:
                logger.info(f"Successfully synced name from test case {test_case_id} to test point {test_case.test_point_id}")
            else:
                logger.warning(f"Name sync failed for test case {test_case_id} to test point {test_case.test_point_id}, but test case update proceeded")

        db.commit()

        db.refresh(test_case)

        stage = (
            UnifiedTestCaseStage.TEST_POINT
            if test_case.is_test_point_stage()
            else UnifiedTestCaseStage.TEST_CASE
        )

        return UnifiedTestCaseResponse(
            id=test_case.id,
            project_id=test_case.project_id,
            business_type=_get_business_type_value(test_case.business_type),
            case_id=test_case.test_case_id,
            name=test_case.name,
            description=test_case.description,
            priority=test_case.priority,
            status=test_case.status,
            stage=stage,
            module=test_case.module,
            functional_module=test_case.functional_module,
            functional_domain=test_case.functional_domain,
            preconditions=_parse_json_field(test_case.preconditions),
            steps=_parse_json_field(test_case.steps),
            expected_result=_parse_json_field(test_case.expected_result),
            remarks=test_case.remarks,
            generation_job_id=test_case.generation_job_id,
            entity_order=test_case.entity_order,
            created_at=test_case.created_at,
            updated_at=test_case.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e).lower()
        db.rollback()
        logger.error(f"Failed to update test case {test_case_id}: {str(e)}", exc_info=True)

        # 根据错误类型返回不同的状态码
        if "integrity" in error_str or "constraint" in error_str:
            raise HTTPException(status_code=400, detail=f"数据完整性错误: {str(e)}")
        elif "timeout" in error_str or "connection" in error_str:
            raise HTTPException(status_code=503, detail=f"数据库连接超时: {str(e)}")
        elif "not found" in error_str:
            raise HTTPException(status_code=404, detail=f"测试用例不存在: {str(e)}")
        else:
            raise HTTPException(status_code=500, detail=f"更新测试用例失败: {str(e)}")


@router.delete("/{test_case_id}", response_model=UnifiedTestCaseDeleteResponse)
async def delete_unified_test_case(
    test_case_id: int,
    preserve_test_point: bool = Query(False, description="是否保留测试点（仅对测试用例阶段有效）"),
    db: Session = Depends(get_db)
):
    """
    删除统一测试用例
    支持逻辑删除行为：
    - 删除测试点时，会同时删除对应的测试用例（如果已生成）
    - 删除测试用例时，可选择是否保留测试点（通过preserve_test_point参数）
    """
    try:
        test_case = db.query(UnifiedTestCase).filter(UnifiedTestCase.id == test_case_id).first()

        if not test_case:
            raise HTTPException(status_code=404, detail="测试用例不存在")

        deleted_items = []

        # Check if this is a test point or test case
        is_test_point = test_case.is_test_point_stage()
        is_test_case = test_case.is_test_case_stage()

        if is_test_point:
            # Deleting a test point - also delete associated test case if it exists
            # Find and delete the corresponding test case (same case_id but with execution details)
            associated_test_case = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.project_id == test_case.project_id,
                UnifiedTestCase.business_type == test_case.business_type,
                UnifiedTestCase.test_case_id == test_case.test_case_id,
                UnifiedTestCase.steps.is_not(None)  # Test case stage
            ).first()

            if associated_test_case:
                db.delete(associated_test_case)
                deleted_items.append(f"测试用例: {associated_test_case.name}")

            # Delete the test point itself
            db.delete(test_case)
            deleted_items.append(f"测试点: {test_case.name}")

        elif is_test_case:
            # Deleting a test case
            if preserve_test_point:
                # Option 1: Convert test case back to test point by removing execution details
                test_case.steps = None
                test_case.preconditions = None
                test_case.expected_result = None
                test_case.module = None
                test_case.functional_module = None
                test_case.functional_domain = None
                test_case.remarks = None
                test_case.status = UnifiedTestCaseStatus.DRAFT
                test_case.updated_at = datetime.now()

                deleted_items.append(f"测试用例已转换为测试点: {test_case.name}")
            else:
                # Option 2: Delete both test case and corresponding test point
                # Find and delete the corresponding test point (same case_id but without execution details)
                associated_test_point = db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.project_id == test_case.project_id,
                    UnifiedTestCase.business_type == test_case.business_type,
                    UnifiedTestCase.test_case_id == test_case.test_case_id,
                    UnifiedTestCase.steps.is_(None)  # Test point stage
                ).first()

                if associated_test_point:
                    db.delete(associated_test_point)
                    deleted_items.append(f"测试点: {associated_test_point.name}")

                # Delete the test case itself
                db.delete(test_case)
                deleted_items.append(f"测试用例: {test_case.name}")

        db.commit()

        return UnifiedTestCaseDeleteResponse(message="删除成功")

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除测试用例失败: {str(e)}")


@router.post("/batch", response_model=UnifiedTestCaseBatchResponse)
async def batch_operation_unified_test_cases(
    batch_data: UnifiedTestCaseBatchOperation,
    db: Session = Depends(get_db)
):
    """批量操作统一测试用例"""
    try:
        success_count = 0
        failed_count = 0
        failed_items = []

        test_cases = db.query(UnifiedTestCase).filter(
            UnifiedTestCase.id.in_(batch_data.test_case_ids)
        ).all()

        if batch_data.operation == "delete":
            # 批量删除 - 支持逻辑删除行为
            for test_case in test_cases:
                try:
                    # Apply the same logical deletion logic as single delete
                    is_test_point = test_case.is_test_point_stage()
                    is_test_case = test_case.is_test_case_stage()

                    if is_test_point:
                        # Deleting a test point - also delete associated test case if it exists
                        associated_test_case = db.query(UnifiedTestCase).filter(
                            UnifiedTestCase.project_id == test_case.project_id,
                            UnifiedTestCase.business_type == test_case.business_type,
                            UnifiedTestCase.test_case_id == test_case.test_case_id,
                            UnifiedTestCase.steps.is_not(None)  # Test case stage
                        ).first()

                        if associated_test_case:
                            db.delete(associated_test_case)

                        # Delete the test point itself
                        db.delete(test_case)

                    elif is_test_case:
                        # For batch delete, we delete both test case and corresponding test point
                        # Find and delete the corresponding test point
                        associated_test_point = db.query(UnifiedTestCase).filter(
                            UnifiedTestCase.project_id == test_case.project_id,
                            UnifiedTestCase.business_type == test_case.business_type,
                            UnifiedTestCase.test_case_id == test_case.test_case_id,
                            UnifiedTestCase.steps.is_(None)  # Test point stage
                        ).first()

                        if associated_test_point:
                            db.delete(associated_test_point)

                        # Delete the test case itself
                        db.delete(test_case)

                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    failed_items.append({
                        "test_case_id": test_case.id,
                        "error": str(e)
                    })

        elif batch_data.operation == "update_status":
            # 批量更新状态
            if not batch_data.status:
                raise HTTPException(status_code=400, detail="状态更新操作需要提供status参数")

            for test_case in test_cases:
                try:
                    test_case.status = batch_data.status.value
                    test_case.updated_at = datetime.now()
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    failed_items.append({
                        "test_case_id": test_case.id,
                        "error": str(e)
                    })

        elif batch_data.operation == "update_priority":
            # 批量更新优先级
            if not batch_data.priority:
                raise HTTPException(status_code=400, detail="优先级更新操作需要提供priority参数")

            for test_case in test_cases:
                try:
                    test_case.priority = batch_data.priority
                    test_case.updated_at = datetime.now()
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    failed_items.append({
                        "test_case_id": test_case.id,
                        "error": str(e)
                    })

        db.commit()

        return UnifiedTestCaseBatchResponse(
            success_count=success_count,
            failed_count=failed_count,
            failed_items=failed_items
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"批量操作失败: {str(e)}")


@router.get("/statistics/overview", response_model=UnifiedTestCaseStatistics)
async def get_unified_test_case_statistics(
    project_id: Optional[int] = Query(None, description="项目ID"),
    business_type: Optional[str] = Query(None, description="业务类型"),
    db: Session = Depends(get_db)
):
    """获取统一测试用例统计信息"""
    try:
        query = db.query(UnifiedTestCase)

        if project_id:
            query = query.filter(UnifiedTestCase.project_id == project_id)

        if business_type:
            query = query.filter(UnifiedTestCase.business_type == business_type)

        # 总数量
        total_count = query.count()

        # 按阶段统计
        test_point_count = query.filter(
            UnifiedTestCase.steps.is_(None)
        ).count()

        test_case_count = total_count - test_point_count

        # 按状态统计
        status_stats = db.query(
            UnifiedTestCase.status, func.count(UnifiedTestCase.id)
        ).filter(
            *[UnifiedTestCase.project_id == project_id] if project_id else [],
            *[UnifiedTestCase.business_type == business_type] if business_type else []
        ).group_by(UnifiedTestCase.status).all()

        status_distribution = {
            status.value: count for status, count in status_stats
        }

        # 按业务类型统计
        business_type_stats = db.query(
            UnifiedTestCase.business_type, func.count(UnifiedTestCase.id)
        ).filter(
            *[UnifiedTestCase.project_id == project_id] if project_id else []
        ).group_by(UnifiedTestCase.business_type).all()

        business_type_distribution = {
            str(bt): count for bt, count in business_type_stats
        }

        # 按优先级统计
        priority_stats = db.query(
            UnifiedTestCase.priority, func.count(UnifiedTestCase.id)
        ).filter(
            *[UnifiedTestCase.project_id == project_id] if project_id else [],
            *[UnifiedTestCase.business_type == business_type] if business_type else []
        ).group_by(UnifiedTestCase.priority).all()

        priority_distribution = {
            priority: count for priority, count in priority_stats
        }

        return UnifiedTestCaseStatistics(
            total_count=total_count,
            test_point_count=test_point_count,
            test_case_count=test_case_count,
            status_distribution=status_distribution,
            business_type_distribution=business_type_distribution,
            priority_distribution=priority_distribution
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


# ========================================
# TWO-STAGE GENERATION ENDPOINTS
# ========================================



@router.post("/generate/test-cases", response_model=UnifiedTestCaseGenerationResponse)
async def generate_test_cases_unified(
    request: UnifiedTestCaseGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generate test cases from test points in unified system (Stage 2).
    """
    try:
        from datetime import datetime
        from ..database.models import GenerationJob, JobStatus, BusinessTypeConfig

        # Validate business type
        business_config = db.query(BusinessTypeConfig).filter(
            BusinessTypeConfig.code == request.business_type.upper(),
            BusinessTypeConfig.is_active == True
        ).first()

        if not business_config:
            raise HTTPException(
                status_code=400,
                detail=f"业务类型 '{request.business_type}' 不存在或未激活"
            )

        # Validate project exists
        project = db.query(Project).filter(Project.id == request.project_id).first()
        if not project:
            raise HTTPException(status_code=400, detail="项目不存在")

        # Check if test points exist when test_point_ids is provided
        if request.test_point_ids:
            if len(request.test_point_ids) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="提供的test_point_ids不能为空"
                )

            test_points = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id.in_(request.test_point_ids),
                UnifiedTestCase.business_type == request.business_type.upper(),
                UnifiedTestCase.project_id == request.project_id
            ).all()

            if not test_points:
                raise HTTPException(
                    status_code=400,
                    detail="未找到指定的测试点"
                )

        # Generate task ID
        task_id = str(uuid.uuid4())

        # Create generation job
        job = GenerationJob(
            id=task_id,
            business_type=request.business_type.upper(),
            status=JobStatus.PENDING,
            project_id=request.project_id,
            created_at=datetime.now()
        )
        db.add(job)
        db.commit()

        # Start background task for test case generation
        background_tasks.add_task(
            _generate_test_cases_background_unified,
            task_id=task_id,
            business_type=request.business_type.upper(),
            project_id=request.project_id,
            test_point_ids=request.test_point_ids,
            additional_context=request.additional_context
        )

        return {
            "generation_job_id": task_id,
            "status": JobStatus.PENDING.value,
            "test_points_generated": 0,
            "test_cases_generated": 0,  # Will be updated when job completes
            "test_case_items": None,  # Will be populated when job completes
            "generation_time": None,
            "message": f"测试用例生成任务已创建: {task_id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建测试用例生成任务失败: {str(e)}")


@router.post("/generate/full-two-stage", response_model=UnifiedTestCaseGenerationResponse)
async def generate_full_two_stage_unified(
    request: UnifiedTestCaseGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generate test points and test cases in one unified workflow.
    """
    try:
        from datetime import datetime
        from ..database.models import GenerationJob, JobStatus, BusinessTypeConfig

        # Validate business type
        business_config = db.query(BusinessTypeConfig).filter(
            BusinessTypeConfig.code == request.business_type.upper(),
            BusinessTypeConfig.is_active == True
        ).first()

        if not business_config:
            raise HTTPException(
                status_code=400,
                detail=f"业务类型 '{request.business_type}' 不存在或未激活"
            )

        # Validate project exists
        project = db.query(Project).filter(Project.id == request.project_id).first()
        if not project:
            raise HTTPException(status_code=400, detail="项目不存在")

        # Generate task ID
        task_id = str(uuid.uuid4())

        # Create generation job
        job = GenerationJob(
            id=task_id,
            business_type=request.business_type.upper(),
            status=JobStatus.PENDING,
            project_id=request.project_id,
            created_at=datetime.now()
        )
        db.add(job)
        db.commit()

        # Start background task for full two-stage generation
        background_tasks.add_task(
            _generate_full_two_stage_background_unified,
            task_id=task_id,
            business_type=request.business_type.upper(),
            project_id=request.project_id,
            additional_context=request.additional_context
        )

        return {
            "generation_job_id": task_id,
            "status": JobStatus.PENDING.value,
            "test_points_generated": 0,  # Will be updated when job completes
            "test_cases_generated": 0,  # Will be updated when job completes
            "test_case_items": None,  # Will be populated when job completes
            "generation_time": None,
            "message": f"完整两阶段测试生成任务已创建: {task_id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建完整生成任务失败: {str(e)}")


@router.get("/generate/status/{task_id}", response_model=Dict[str, Any])
async def get_generation_status_unified(task_id: str, db: Session = Depends(get_db)):
    """
    Get the status of a generation task.
    """
    try:
        from ..database.models import GenerationJob

        job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="任务未找到")

        return {
            "task_id": task_id,
            "status": job.status.value,
            "business_type": _get_business_type_value(job.business_type),
            "project_id": job.project_id,
            "error_message": job.error_message,
            "result_data": job.result_data,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务状态失败: {str(e)}")


# ========================================
# BACKGROUND TASK FUNCTIONS
# ========================================

async def _generate_test_points_background_unified(
    task_id: str,
    business_type: str,
    project_id: int,
    additional_context: Optional[Dict[str, Any]] = None
):
    """Background task for generating test points in unified system."""
    try:
        from ..core.test_point_generator import TestPointGenerator
        from ..database.models import GenerationJob, JobStatus, object
        from datetime import datetime
        import json

        config = Config()
        generator = TestPointGenerator(config)

        # Update job status to running
        with config.db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                job.current_step = 1
                job.step_description = "开始生成测试点..."
                db.commit()

        # Generate test points
        test_points_data = generator.generate_test_points(
            business_type=business_type,
            additional_context=additional_context
        )

        if not test_points_data:
            raise RuntimeError("测试点生成失败")

        # Create test case group
        with config.db_manager.get_session() as db:
            group = GenerationJob(
                id=str(uuid.uuid4()),
                project_id=project_id,
                business_type=business_type,
                generation_metadata=json.dumps({
                    "mode": "test_points_only",
                    "count": len(test_points_data.get('test_points', [])),
                    "additional_context": additional_context
                }, ensure_ascii=False)
            )
            db.add(group)
            db.commit()
            db.refresh(group)

        # Save test points to unified table
        test_point_count = 0
        with config.db_manager.get_session() as db:
            for i, point_data in enumerate(test_points_data.get('test_points', [])):
                # Create test point record
                test_point = UnifiedTestCase(
                    project_id=project_id,
                    business_type=business_type,
                    case_id=point_data.get('test_point_id', f'TP{str(i+1).zfill(3)}'),
                    name=point_data.get('title', f'测试点 {i+1}'),
                    description=point_data.get('description', ''),
                    status='draft',
                    priority='medium',
                    # Test points don't have execution details
                    preconditions=None,
                    steps=None,
                    expected_result=None,
                    entity_order=float(i + 1),
                    generation_job_id=task_id
                )
                db.add(test_point)
                test_point_count += 1

            db.commit()

        # Update job completion
        with config.db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                job.result_data = json.dumps({
                    "test_points_generated": test_point_count,
                    "project_id": group.id
                }, ensure_ascii=False)
                db.commit()

    except Exception as e:
        # Update job with error
        try:
            config = Config()
            with config.db_manager.get_session() as db:
                job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
                if job:
                    job.status = JobStatus.FAILED
                    job.error_message = str(e)[:2000]
                    db.commit()
        except:
            pass


async def _generate_test_cases_background_unified(
    task_id: str,
    business_type: str,
    project_id: int,
    test_point_ids: Optional[List[int]],
    additional_context: Optional[Dict[str, Any]] = None
):
    """Background task for generating test cases from test points in unified system."""
    try:
        from ..core.test_case_generator import TestCaseGenerator
        from ..database.models import GenerationJob, JobStatus
        from datetime import datetime
        import json

        config = Config()
        generator = TestCaseGenerator(config)

        # Update job status to running
        with config.db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                job.current_step = 1
                job.step_description = "开始基于测试点生成测试用例..."
                db.commit()

        # Get test points
        with config.db_manager.get_session() as db:
            test_points = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id.in_(test_point_ids) if test_point_ids else True,
                UnifiedTestCase.business_type == business_type,
                UnifiedTestCase.project_id == project_id,
                UnifiedTestCase.steps.is_(None)  # Only test points
            ).all()

            if not test_points:
                raise RuntimeError("未找到可用的测试点")

            # Convert test points to expected format
            test_points_data = {
                "test_points": [
                    {
                        "id": tp.id,
                        "test_point_id": tp.case_id,
                        "title": tp.name,
                        "description": tp.description,
                        "priority": tp.priority
                    }
                    for tp in test_points
                ]
            }

        # Generate test cases from test points
        test_cases_data = generator.generate_test_cases_from_points(
            business_type=business_type,
            test_points_data=test_points_data,
            additional_context=additional_context or {}
        )

        if not test_cases_data:
            raise RuntimeError("基于测试点的测试用例生成失败")

        # Save test cases to unified table
        test_case_count = 0
        with config.db_manager.get_session() as db:
            for i, case_data in enumerate(test_cases_data.get('test_cases', [])):
                # Find corresponding test point
                test_point_id = case_data.get('test_point_id')
                test_point = next((tp for tp in test_points if tp.case_id == test_point_id), None)

                if test_point:
                    # Convert test point to test case by adding execution details
                    test_point.steps = json.dumps(case_data.get('steps', []), ensure_ascii=False)
                    test_point.preconditions = json.dumps(case_data.get('preconditions', []), ensure_ascii=False)
                    test_point.expected_result = json.dumps(case_data.get('expected_result', []), ensure_ascii=False)
                    test_point.module = case_data.get('module', '')
                    test_point.functional_module = case_data.get('functional_module', '')
                    test_point.functional_domain = case_data.get('functional_domain', '')
                    test_point.remarks = case_data.get('remarks', '')
                    test_case_count += 1

            db.commit()

        # Update job completion
        with config.db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                job.result_data = json.dumps({
                    "test_cases_generated": test_case_count
                }, ensure_ascii=False)
                db.commit()

    except Exception as e:
        # Update job with error
        try:
            config = Config()
            with config.db_manager.get_session() as db:
                job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
                if job:
                    job.status = JobStatus.FAILED
                    job.error_message = str(e)[:2000]
                    db.commit()
        except:
            pass


async def _generate_full_two_stage_background_unified(
    task_id: str,
    business_type: str,
    project_id: int,
    additional_context: Optional[Dict[str, Any]] = None
):
    """Background task for complete two-stage generation in unified system."""
    try:
        from datetime import datetime
        import json

        # Stage 1: Generate test points
        await _generate_test_points_background_unified(
            task_id, business_type, project_id, additional_context
        )

        # Get the generated test point IDs
        config = Config()
        with config.db_manager.get_session() as db:
            from ..database.models import GenerationJob
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            result_data = json.loads(job.result_data or '{}')

            # Get test points from the group
            test_points = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.project_id == project_id,
                UnifiedTestCase.business_type == business_type,
                UnifiedTestCase.steps.is_(None)  # Test points only
            ).all()

            test_point_ids = [tp.id for tp in test_points]

        # Stage 2: Generate test cases from test points
        await _generate_test_cases_background_unified(
            task_id, business_type, project_id, test_point_ids, additional_context
        )

        # Update final completion status
        with config.db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                from ..database.models import JobStatus
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                job.result_data = json.dumps({
                    "test_points_generated": len(test_point_ids),
                    "message": "完整两阶段生成完成"
                }, ensure_ascii=False)
                db.commit()

    except Exception as e:
        # Update job with error
        try:
            config = Config()
            with config.db_manager.get_session() as db:
                from ..database.models import GenerationJob, JobStatus
                job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
                if job:
                    job.status = JobStatus.FAILED
                    job.error_message = str(e)[:2000]
                    db.commit()
        except:
            pass


# 辅助函数
def _parse_json_field(field_value: Optional[str]) -> Optional[Any]:
    """解析JSON字段"""
    if field_value is None:
        return None
    try:
        return json.loads(field_value)
    except (json.JSONDecodeError, TypeError):
        return field_value


def _serialize_json_field(field_value: Optional[Any]) -> Optional[str]:
    """序列化JSON字段"""
    if field_value is None:
        return None
    try:
        return json.dumps(field_value, ensure_ascii=False)
    except (TypeError, ValueError):
        return str(field_value) if field_value else None


def _parse_steps_field(field_value: Optional[str]) -> Optional[List[Dict[str, Any]]]:
    """解析steps字段，处理JSON和旧格式"""
    if field_value is None:
        return None

    # 首先尝试解析为JSON
    try:
        parsed = json.loads(field_value)
        if isinstance(parsed, list):
            # 检查是否是字符串列表（旧格式）
            if all(isinstance(item, str) for item in parsed):
                # 处理字符串列表格式
                steps = []
                for item in parsed:
                    step_dict = _parse_single_step_string(item)
                    if step_dict:
                        steps.append(step_dict)
                return steps if steps else None
            else:
                # 已经是正确的字典列表格式
                return parsed
    except (json.JSONDecodeError, TypeError):
        pass

    # 如果JSON解析失败，处理旧格式字符串
    if isinstance(field_value, str):
        try:
            # 按行分割步骤
            lines = field_value.strip().split('\n')
            steps = []

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                step_dict = _parse_single_step_string(line)
                if step_dict:
                    steps.append(step_dict)

            return steps if steps else None
        except Exception:
            # 如果所有解析都失败，返回None
            return None

    return None


def _parse_single_step_string(step_str: str) -> Optional[Dict[str, Any]]:
    """解析单个步骤字符串"""
    if not isinstance(step_str, str):
        return None

    step_str = step_str.strip()
    if not step_str:
        return None

    # 处理带编号的步骤格式，如 "1. 步骤描述" 或 "1.{\"key\":\"value\"}..."
    if step_str[0].isdigit() and ('.' in step_str or step_str[1:3].isspace() or (len(step_str) > 1 and step_str[1] == '.')):
        # 提取步骤编号和描述
        if '.' in step_str:
            parts = step_str.split('.', 1)
            if len(parts) == 2:
                step_num = parts[0].strip()
                step_desc = parts[1].strip()

                # 尝试解析步骤描述中的JSON部分
                try:
                    # 检查是否包含JSON内容
                    if '{' in step_desc and '"' in step_desc:
                        # 可能是混合格式： "1.{\"key\":\"value\"}"
                        json_start = step_desc.find('{')
                        if json_start > 0:
                            try:
                                # 提取JSON部分
                                json_part = step_desc[json_start:]
                                parsed_json = json.loads(json_part)
                                text_part = step_desc[:json_start].strip()

                                return {
                                    "step_number": int(step_num),
                                    "description": text_part,
                                    "action": text_part,
                                    "expected": None,
                                    "data": parsed_json
                                }
                            except json.JSONDecodeError:
                                pass

                    return {
                        "step_number": int(step_num),
                        "description": step_desc,
                        "action": step_desc,
                        "expected": None
                    }
                except ValueError:
                    # 如果数字转换失败，作为简单步骤处理
                    return {
                        "step_number": len(step_str.split()) + 1,
                        "description": step_str,
                        "action": step_str,
                        "expected": None
                    }
            else:
                # 没有分割符，整个作为步骤描述
                try:
                    return {
                        "step_number": int(step_str),
                        "description": step_str,
                        "action": step_str,
                        "expected": None
                    }
                except ValueError:
                    return {
                        "step_number": 1,
                        "description": step_str,
                        "action": step_str,
                        "expected": None
                    }
        else:
            # 第一个字符不是数字，作为简单步骤处理
            return {
                "step_number": 1,
                "description": step_str,
                "action": step_str,
                "expected": None
            }
    else:
        # 不以数字开头，作为简单步骤处理
        return {
            "step_number": 1,
            "description": step_str,
            "action": step_str,
            "expected": None
        }