# -*- coding: utf-8 -*-
"""
Unified test case API endpoints.
Combines test point and test case management in a single unified API.
"""

from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
import json
import uuid
import logging
import time
from datetime import datetime
from pydantic import BaseModel

from ..database.models import (
    UnifiedTestCase, Project,
    BusinessType, GenerationJob, UnifiedTestCaseStatus, UnifiedTestCaseStage as DatabaseUnifiedTestCaseStage
)
from ..models.unified_test_case import (
    UnifiedTestCaseCreate, UnifiedTestCaseUpdate, UnifiedTestCaseResponse,
    UnifiedTestCaseListResponse, UnifiedTestCaseFilter, UnifiedTestCaseStatistics,
    UnifiedTestCaseBatchOperation, UnifiedTestCaseBatchResponse,
    UnifiedTestCaseGenerationRequest, UnifiedTestCaseGenerationResponse,
    UnifiedTestCaseStage as SchemaUnifiedTestCaseStage, UnifiedTestCaseDeleteResponse
)

from .dependencies import get_db
from ..utils.business_type_validator import validate_business_type_or_400
# TestPointGenerator removed - using unified generation system
from ..core.test_case_generator import TestCaseGenerator
from ..services.sync_transaction_manager import SyncTransactionManager
from ..utils.config import Config

# Import the enhanced data validator and repairer
try:
    from ..utils.data_validator_repairer import DataValidatorRepairer
    from ..core.json_extractor import JSONExtractor
except ImportError:
    # Fallback for different import paths
    import sys
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    utils_dir = os.path.join(parent_dir, 'utils')
    core_dir = os.path.join(parent_dir, 'core')

    if utils_dir not in sys.path:
        sys.path.append(utils_dir)
    if core_dir not in sys.path:
        sys.path.append(core_dir)

    from data_validator_repairer import DataValidatorRepairer
    from json_extractor import JSONExtractor

router = APIRouter(prefix="/unified-test-cases", tags=["unified-test-cases"])

logger = logging.getLogger(__name__)

def _get_business_type_value(business_type):
    """
    安全地获取business_type的值（现在只处理字符串类型）
    """
    return business_type  # business_type 现在直接是字符串





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

  
        # 按阶段过滤
        if filter_params.stage == SchemaUnifiedTestCaseStage.TEST_POINT:
            query = query.filter(
                UnifiedTestCase.stage == DatabaseUnifiedTestCaseStage.test_point
            )
        elif filter_params.stage == SchemaUnifiedTestCaseStage.TEST_CASE:
            query = query.filter(
                UnifiedTestCase.stage == DatabaseUnifiedTestCaseStage.test_case
            )

        # 获取总数
        total = query.count()

        # 应用排序
        sort_column = getattr(UnifiedTestCase, filter_params.sort_by, UnifiedTestCase.id)
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
            # Convert database stage enum to schema stage enum
            stage = (
                SchemaUnifiedTestCaseStage.TEST_POINT
                if test_case.is_test_point_stage()
                else SchemaUnifiedTestCaseStage.TEST_CASE
            )

            # 前置条件现在直接返回字符串格式，由前端负责解析

            response_data = UnifiedTestCaseResponse(
                id=test_case.id,
                project_id=test_case.project_id,
                business_type=_get_business_type_value(test_case.business_type),
                case_id=test_case.test_case_id,
                test_case_id=test_case.test_case_id,
                name=test_case.name,
                description=test_case.description,
                priority=test_case.priority,
                status=test_case.status,
                stage=stage,
                module=test_case.module,
                functional_module=test_case.functional_module,
                functional_domain=test_case.functional_domain,
                preconditions=test_case.preconditions,  # 直接返回字符串格式
                steps=_merge_steps_with_expected_results(_parse_steps_field(test_case.steps), test_case.expected_result),
                expected_result=test_case.expected_result,
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
    stage: Optional[SchemaUnifiedTestCaseStage] = Query(None, description="阶段"),
    priority: Optional[str] = Query(None, pattern="^(low|medium|high)$", description="优先级"),
    keyword: Optional[str] = Query(None, description="关键词搜索"),
    sort_by: str = Query("id", description="排序字段"),
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
        sort_by=sort_by,
        sort_order=sort_order
    )
    return await get_unified_test_cases_impl(filter_params, db)


@router.post("/generate-sync", response_model=UnifiedTestCaseGenerationResponse)
async def generate_unified_sync(
    request: UnifiedTestCaseGenerationRequest,
    db: Session = Depends(get_db)
):
    """
    Synchronous unified generation endpoint for debugging and testing.
    Directly executes generation and returns results without background tasks.
    - test_points_only: Generate test points for a business type
    - test_cases_only: Generate test cases from existing test points
    """
    import time
    from datetime import datetime
    from ..database.models import GenerationJob, JobStatus, BusinessTypeConfig

    logger.info(f"🚀 Starting synchronous generation: mode={request.generation_mode}, business_type={request.business_type}")

    try:
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

        # Generate task ID for tracking (even though we're not using background tasks)
        task_id = str(uuid.uuid4())
        start_time = time.time()

        logger.info(f"Task {task_id} started at {datetime.now()}")

        if request.generation_mode == "test_points_only":
            # Execute synchronous test points generation
            logger.info(f"Executing synchronous test points generation for task {task_id}")
            result = await _generate_test_points_sync_unified(
                task_id=task_id,
                business_type=request.business_type.upper(),
                project_id=request.project_id,
                additional_context=request.additional_context,
                db=db
            )
            generation_time = time.time() - start_time

            return UnifiedTestCaseGenerationResponse(
                generation_job_id=task_id,
                status="completed",
                test_points_generated=result['test_points_generated'],
                test_cases_generated=0,
                unified_test_cases=result['unified_test_cases'],
                generation_time=generation_time,
                message=f"同步生成完成: {result['test_points_generated']} 个测试点"
            )

        elif request.generation_mode == "test_cases_only":
            # Validate test points exist
            if not request.test_point_ids or len(request.test_point_ids) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="test_cases_only模式需要提供test_point_ids"
                )

            test_points = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id.in_(request.test_point_ids),
                UnifiedTestCase.business_type == request.business_type.upper(),
                UnifiedTestCase.project_id == request.project_id,
                # Fix: Remove strict steps.is_(None) requirement to allow partially updated test points
                or_(UnifiedTestCase.steps.is_(None), UnifiedTestCase.stage == DatabaseUnifiedTestCaseStage.TEST_POINT)
            ).all()

            if not test_points:
                raise HTTPException(
                    status_code=400,
                    detail="未找到指定的测试点"
                )

            # Execute synchronous test cases generation
            logger.info(f"Executing synchronous test cases generation for task {task_id}")
            result = await _generate_test_cases_sync_unified(
                task_id=task_id,
                business_type=request.business_type.upper(),
                project_id=request.project_id,
                test_point_ids=request.test_point_ids,
                additional_context=request.additional_context,
                db=db
            )
            generation_time = time.time() - start_time

            return UnifiedTestCaseGenerationResponse(
                generation_job_id=task_id,
                status="completed",
                test_points_generated=0,
                test_cases_generated=result['test_cases_generated'],
                unified_test_cases=result['unified_test_cases'],
                generation_time=generation_time,
                message=f"同步生成完成: {result['test_cases_generated']} 个测试用例"
            )
        else:
            raise HTTPException(status_code=400, detail=f"不支持的生成模式: {request.generation_mode}")

    except HTTPException as e:
        logger.error(f"HTTP Exception in synchronous generation: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error in synchronous generation: {str(e)}", exc_info=True)
        error_message = str(e)
        generation_time = time.time() - start_time if 'start_time' in locals() else 0

        raise HTTPException(
            status_code=500,
            detail=f"同步生成失败: {error_message}"
        )


@router.get("/{test_case_id}", response_model=UnifiedTestCaseResponse)
async def get_unified_test_case(
    test_case_id: int,
    db: Session = Depends(get_db)
):
    """获取单个统一测试用例详情"""
    try:
        logger.info(f"🔍 GET request for test_case_id: {test_case_id}")
        test_case = db.query(UnifiedTestCase).filter(UnifiedTestCase.id == test_case_id).first()

        if not test_case:
            raise HTTPException(status_code=404, detail="测试用例不存在")

        # 记录数据库中的原始数据
        logger.info(f"📋 Database raw steps: {test_case.steps}")
        logger.info(f"🎯 Database raw expected_result: {test_case.expected_result}")
        logger.info(f"📋 Database raw preconditions: {test_case.preconditions}")

        # Convert database stage enum to schema stage enum
        stage = (
            SchemaUnifiedTestCaseStage.TEST_POINT
            if test_case.is_test_point_stage()
            else SchemaUnifiedTestCaseStage.TEST_CASE
        )

        # 解析steps字段，优先使用嵌入的预期结果
        parsed_steps = _parse_steps_field(test_case.steps)
        logger.info(f"📋 Parsed steps: {parsed_steps}")
        logger.info(f"📋 Parsed steps count: {len(parsed_steps) if isinstance(parsed_steps, list) else 'N/A'}")

        # 合并步骤和预期结果（如果steps中没有expected字段）
        merged_steps = _merge_steps_with_expected_results(parsed_steps, test_case.expected_result)

        # 解析preconditions为数组格式
        if test_case.preconditions:
            try:
                final_preconditions = json.loads(test_case.preconditions)
                if not isinstance(final_preconditions, list):
                    final_preconditions = [test_case.preconditions]
            except (json.JSONDecodeError, Exception):
                final_preconditions = [test_case.preconditions]
        else:
            final_preconditions = []

        # 记录最终返回的数据
        logger.info(f"📤 Final steps being returned: {merged_steps}")
        logger.info(f"📤 Final steps count: {len(merged_steps) if isinstance(merged_steps, list) else 'N/A'}")
        logger.info(f"🎯 Database expected_result: {test_case.expected_result}")

        # 详细检查steps中每个步骤的expected字段
        if isinstance(merged_steps, list):
            for i, step in enumerate(merged_steps):
                if isinstance(step, dict) and 'expected' in step:
                    logger.info(f"📋 Step {i+1} expected: {step['expected']}")
                else:
                    logger.warning(f"⚠️ Step {i+1} missing expected field: {step}")

        logger.info(f"✅ GET request completed for test_case_id: {test_case_id}")

        return UnifiedTestCaseResponse(
            id=test_case.id,
            project_id=test_case.project_id,
            business_type=_get_business_type_value(test_case.business_type),
            test_case_id=test_case.test_case_id,
            case_id=test_case.test_case_id,
            name=test_case.name,
            description=test_case.description,
            priority=test_case.priority,
            status=test_case.status,
            stage=stage,
            module=test_case.module,
            functional_module=test_case.functional_module,
            functional_domain=test_case.functional_domain,
            preconditions=test_case.preconditions,  # 直接返回字符串格式
            steps=merged_steps,
            expected_result=test_case.expected_result,
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

  
        # 检查test_case_id在项目内的唯一性
        existing_case = db.query(UnifiedTestCase).filter(
            and_(
                UnifiedTestCase.project_id == test_case_data.project_id,
                UnifiedTestCase.business_type == test_case_data.business_type,
                UnifiedTestCase.test_case_id == test_case_data.test_case_id
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

        # 根据是否有执行步骤确定stage
        has_steps = test_case_data.steps and len(test_case_data.steps) > 0
        has_preconditions = test_case_data.preconditions and len(test_case_data.preconditions) > 0
        stage = DatabaseUnifiedTestCaseStage.test_case if (has_steps or has_preconditions) else DatabaseUnifiedTestCaseStage.test_point

        # Validate business type using database-driven validation
        validate_business_type_or_400(
            db=db,
            business_type=test_case_data.business_type,
            project_id=test_case_data.project_id
        )

        db_test_case = UnifiedTestCase(
            project_id=test_case_data.project_id,
            business_type=test_case_data.business_type.upper(),  # Store as uppercase string
            test_case_id=test_case_data.test_case_id,
            name=test_case_data.name,
            description=test_case_data.description,
            priority=test_case_data.priority,
            status=test_case_data.status.value if test_case_data.status else UnifiedTestCaseStatus.DRAFT,
            stage=stage,
            module=test_case_data.module,
            functional_module=test_case_data.functional_module,
            functional_domain=test_case_data.functional_domain,
            preconditions=test_case_data.preconditions,  # 现在直接是字符串，不需要JSON序列化
            steps=json.dumps(test_case_data.steps, ensure_ascii=False) if test_case_data.steps else None,
            remarks=test_case_data.remarks,
            entity_order=test_case_data.entity_order,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        db.add(db_test_case)
        db.commit()
        db.refresh(db_test_case)

        # Convert database stage enum to schema stage enum
        stage = (
            SchemaUnifiedTestCaseStage.TEST_POINT
            if db_test_case.is_test_point_stage()
            else SchemaUnifiedTestCaseStage.TEST_CASE
        )

        # 前置条件现在直接返回字符串格式，由前端负责解析

        return UnifiedTestCaseResponse(
            id=db_test_case.id,
            project_id=db_test_case.project_id,
            business_type=_get_business_type_value(db_test_case.business_type),
            case_id=db_test_case.test_case_id,
            test_case_id=db_test_case.test_case_id,
            name=db_test_case.name,
            description=db_test_case.description,
            priority=db_test_case.priority,
            status=db_test_case.status,
            stage=stage,
            module=db_test_case.module,
            functional_module=db_test_case.functional_module,
            functional_domain=db_test_case.functional_domain,
            preconditions=db_test_case.preconditions,  # 直接返回字符串格式
            steps=_parse_json_field(db_test_case.steps),
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
        # 添加请求入口调试日志
        logger.info(f"🚀 PUT request received for test_case_id: {test_case_id}")
        raw_data = test_case_data.dict(exclude_unset=True)
        logger.info(f"📋 Raw update data keys: {list(raw_data.keys())}")

        # 详细记录steps和expected_result字段
        if 'steps' in raw_data:
            logger.info(f"📋 Steps in raw data: type={type(raw_data['steps'])}, count={len(raw_data['steps']) if isinstance(raw_data['steps'], list) else 'N/A'}")
            if isinstance(raw_data['steps'], list) and len(raw_data['steps']) > 0:
                logger.info(f"📋 First step sample: {raw_data['steps'][0]}")

        if 'expected_result' in raw_data:
            logger.info(f"🎯 Expected_result in raw data: type={type(raw_data['expected_result'])}, value={raw_data['expected_result']}")
        else:
            logger.info("ℹ️ Expected_result not provided in update (will keep existing value)")

        if 'preconditions' in raw_data:
            logger.info(f"📋 Preconditions in raw data: type={type(raw_data['preconditions'])}, value={raw_data['preconditions']}")

  
        test_case = db.query(UnifiedTestCase).filter(UnifiedTestCase.id == test_case_id).first()

        if not test_case:
            raise HTTPException(status_code=404, detail="测试用例不存在")

        # 更新字段
        update_data = test_case_data.dict(exclude_unset=True)

        # 🔍 Debug: Log preconditions after validation processing
        if 'preconditions' in update_data:
            logger.info(f"🔍 Debug: preconditions processed in update_data: {update_data.get('preconditions', 'NOT_FOUND')}")

        # 处理枚举值
        if 'status' in update_data:
            update_data['status'] = update_data['status'].value

        # 处理stage枚举值
        if 'stage' in update_data:
            if update_data['stage'] == SchemaUnifiedTestCaseStage.TEST_POINT:
                update_data['stage'] = DatabaseUnifiedTestCaseStage.test_point
            elif update_data['stage'] == SchemaUnifiedTestCaseStage.TEST_CASE:
                update_data['stage'] = DatabaseUnifiedTestCaseStage.test_case
            else:
                logger.warning(f"Unknown stage value: {update_data['stage']}")

        # Validate business_type if present in update data
        if 'business_type' in update_data:
            logger.info(f"Validating business_type: '{update_data['business_type']}'")
            validate_business_type_or_400(
                db=db,
                business_type=update_data['business_type'],
                project_id=db_test_case.project_id
            )
            # Store as uppercase string
            update_data['business_type'] = update_data['business_type'].upper()
            logger.info(f"Validated business_type: {update_data['business_type']}")

        # 处理JSON字段 - 简化处理
        json_fields = ['steps', 'expected_result']  # 移除preconditions，因为现在是简单的字符串字段
        for field in json_fields:
            if field in update_data:
                original_value = update_data[field]

                # 特殊处理steps字段，确保预期结果正确嵌入
                if field == 'steps' and isinstance(original_value, list):
                    # 验证steps中的expected字段
                    processed_steps = []
                    for i, step in enumerate(original_value):
                        if isinstance(step, dict):
                            processed_step = {
                                'step_number': step.get('step_number', i + 1),
                                'action': step.get('action', step.get('description', '')),
                                'expected': step.get('expected', '')
                            }
                            processed_steps.append(processed_step)
                            logger.info(f"📋 Processed step {i+1}: action='{processed_step['action'][:50]}...', expected='{processed_step['expected'][:50]}...'")
                        else:
                            logger.warning(f"⚠️ Invalid step format at index {i}: {step}")

                    # 使用处理后的steps
                    update_data[field] = _serialize_json_field(processed_steps)
                    logger.info(f"📋 Steps processed and serialized: {len(processed_steps)} steps")

                    # 当steps包含expected字段时，移除单独的expected_result字段，避免数据重复
                    if 'expected_result' in update_data and any(step.get('expected') for step in processed_steps):
                        logger.info("🗑️ Removing duplicate expected_result field since steps contain expected data")
                        del update_data['expected_result']
                else:
                    # 其他JSON字段正常处理
                    update_data[field] = _serialize_json_field(update_data[field])

                logger.info(f"🔧 JSON field {field} serialized: {type(original_value)} -> {type(update_data.get(field))}")
                logger.info(f"🔧 {field} length: {len(str(update_data.get(field)))}")

        logger.info(f"Final update_data keys: {list(update_data.keys())}")

        # 更新时间戳
        update_data['updated_at'] = datetime.now()

        # Track if name is being updated for sync
        name_updated = False
        new_name = None
        if 'name' in update_data and update_data['name'] != test_case.name:
            # Check for business-scoped name uniqueness before updating
            sync_manager = SyncTransactionManager(db)
            # 优先使用更新后的新业务类型（确保转换为字符串用于验证）
            new_business_type = update_data.get('business_type', test_case.business_type)
            # 如果是枚举类型，转换为字符串值
            if hasattr(new_business_type, 'value'):
                new_business_type = new_business_type.value
            if not sync_manager.validate_business_uniqueness(
                business_type=new_business_type,
                name=update_data['name'],
                entity_type='test_case',
                exclude_id=test_case.id
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Test case name '{update_data['name']}' already exists in business type '{new_business_type}'"
                )

            name_updated = True
            new_name = update_data['name']
            logger.info(f"Test case name update detected: '{test_case.name}' -> '{new_name}' (test_case_id: {test_case_id})")

        # Apply updates to the test case
        for field, value in update_data.items():
            # 特殊处理preconditions字段，将数组转换为JSON字符串存储到数据库
            if field == 'preconditions' and isinstance(value, list):
                setattr(test_case, field, json.dumps(value, ensure_ascii=False))
                logger.info(f"📋 Preconditions array converted to JSON string for database storage: {len(value)} items")
            else:
                setattr(test_case, field, value)

        # 添加数据库操作的错误处理
        try:
            db.commit()
            logger.info(f"Successfully updated test case {test_case_id} with data: {update_data}")
            db.refresh(test_case)
        except Exception as db_error:
            db.rollback()
            logger.error(f"Database error when updating test case {test_case_id}: {str(db_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"数据库更新失败: {str(db_error)}"
            )

        # Convert database stage enum to schema stage enum
        stage = (
            SchemaUnifiedTestCaseStage.TEST_POINT
            if test_case.is_test_point_stage()
            else SchemaUnifiedTestCaseStage.TEST_CASE
        )

        # 解析并合并步骤和预期结果用于返回
        parsed_steps = _parse_steps_field(test_case.steps)
        merged_steps_for_return = _merge_steps_with_expected_results(parsed_steps, test_case.expected_result)

        # 解析preconditions为数组格式用于返回
        if test_case.preconditions:
            try:
                final_preconditions = json.loads(test_case.preconditions)
                if not isinstance(final_preconditions, list):
                    final_preconditions = [test_case.preconditions]
            except (json.JSONDecodeError, Exception):
                final_preconditions = [test_case.preconditions]
        else:
            final_preconditions = []

        return UnifiedTestCaseResponse(
            id=test_case.id,
            project_id=test_case.project_id,
            business_type=_get_business_type_value(test_case.business_type),
            test_case_id=test_case.test_case_id,
            case_id=test_case.test_case_id,
            name=test_case.name,
            description=test_case.description,
            priority=test_case.priority,
            status=test_case.status,
            stage=stage,
            module=test_case.module,
            functional_module=test_case.functional_module,
            functional_domain=test_case.functional_domain,
            preconditions=test_case.preconditions,  # 直接返回字符串格式
            steps=merged_steps_for_return,  # 使用合并后的步骤数据
            expected_result=test_case.expected_result,
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



@router.post("/generate", response_model=UnifiedTestCaseGenerationResponse)
async def generate_unified(
    request: UnifiedTestCaseGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Unified generation endpoint supporting both test points and test cases generation.
    - test_points_only: Generate test points for a business type
    - test_cases_only: Generate test cases from existing test points
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

        # Validate generation mode and parameters
        if request.generation_mode == "test_cases_only":
            if not request.test_point_ids or len(request.test_point_ids) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="test_cases_only模式需要提供test_point_ids"
                )

            # Check if test points exist
            test_points = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id.in_(request.test_point_ids),
                UnifiedTestCase.business_type == request.business_type.upper(),
                UnifiedTestCase.project_id == request.project_id,
                # Fix: Remove strict steps.is_(None) requirement to allow partially updated test points
                or_(UnifiedTestCase.steps.is_(None), UnifiedTestCase.stage == DatabaseUnifiedTestCaseStage.TEST_POINT)
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
            generation_mode=request.generation_mode,  # 添加generation_mode字段
            created_at=datetime.now()
        )
        db.add(job)
        db.commit()

        # Start background task based on generation mode
        if request.generation_mode == "test_points_only":
            background_tasks.add_task(
                _generate_test_points_background_unified,
                task_id=task_id,
                business_type=request.business_type.upper(),
                project_id=request.project_id,
                additional_context=request.additional_context
            )
            message = f"测试点生成任务已创建: {task_id}"
        else:  # test_cases_only
            background_tasks.add_task(
                _generate_test_cases_background_unified,
                task_id=task_id,
                business_type=request.business_type.upper(),
                project_id=request.project_id,
                test_point_ids=request.test_point_ids,
                additional_context=request.additional_context
            )
            message = f"测试用例生成任务已创建: {task_id}"

        return {
            "generation_job_id": task_id,
            "status": JobStatus.PENDING.value,
            "test_points_generated": 0,
            "test_cases_generated": 0,  # Will be updated when job completes
            "unified_test_cases": None,  # Will be populated when job completes
            "generation_time": None,
            "message": message
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建生成任务失败: {str(e)}")




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
# SYNCHRONOUS GENERATION FUNCTIONS
# ========================================

async def _generate_test_points_sync_unified(
    task_id: str,
    business_type: str,
    project_id: int,
    additional_context: Optional[str] = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Synchronous test points generation function for debugging.

    Args:
        task_id: Task identifier for tracking
        business_type: Business type for generation
        project_id: Project ID
        additional_context: Additional context for generation
        db: Database session

    Returns:
        Dict containing generation results
    """
    logger.info(f"🚀 Starting synchronous test points generation: task_id={task_id}, business_type={business_type}")

    try:
        # Import required services
        from ..services.generation_service import UnifiedGenerationService
        from ..utils.config import Config

        config = Config()
        generator_service = UnifiedGenerationService(config)

        logger.info(f"Services initialized for task {task_id}")

        # Generate test points using unified generation service
        logger.info(f"Calling generation service for task {task_id}")
        generation_response = generator_service.generate_test_points(
            business_type=business_type,
            additional_context=additional_context or {},
            save_to_database=False,
            project_id=project_id,
            task_id=task_id  # 传入API端点创建的task_id
        )

        logger.info(f"Generation service completed for task {task_id}")
        logger.info(f"Generation response type: {type(generation_response)}")
        logger.info(f"Generation success: {generation_response.success}")

        # Check if generation was successful and extract test points
        if not generation_response.success:
            error_msg = f"测试点生成失败: {generation_response.message}"
            logger.error(f"Task {task_id} failed: {error_msg}")
            raise RuntimeError(error_msg)

        # Extract test points list directly from GenerationResponse.result.generated_items
        generation_result = generation_response.result
        if not generation_result or not generation_result.generated_items:
            error_msg = "测试点生成结果为空"
            logger.error(f"Task {task_id} failed: {error_msg}")
            raise RuntimeError(error_msg)

        test_points_list = generation_result.generated_items
        logger.info(f"Successfully obtained {len(test_points_list)} test points from generation service for task {task_id}")

        # Save test points to unified table with simplified logic
        test_point_count = 0
        id_conflict_count = 0
        processed_test_points = []
        created_test_cases = []

        # Use provided database session or create new one
        if db is None:
            from ..database.database import DatabaseManager
            db_manager = DatabaseManager(config)
            with db_manager.get_session() as db:
                result = _save_test_points_to_db(
                    db, test_points_list, business_type, project_id, task_id
                )
                test_point_count, id_conflict_count, processed_test_points, created_test_cases = result
        else:
            result = _save_test_points_to_db(
                db, test_points_list, business_type, project_id, task_id
            )
            test_point_count, id_conflict_count, processed_test_points, created_test_cases = result

        logger.info(f"Task {task_id} completed successfully: {test_point_count} test points saved")

        # Convert created test cases to response format
        unified_test_cases = []
        for test_case in created_test_cases:
            # Convert database stage enum to schema stage enum
            stage = (
                SchemaUnifiedTestCaseStage.TEST_POINT
                if test_case.is_test_point_stage()
                else SchemaUnifiedTestCaseStage.TEST_CASE
            )

            # 前置条件现在直接返回字符串格式，由前端负责解析

            response_data = UnifiedTestCaseResponse(
                id=test_case.id,
                project_id=test_case.project_id,
                business_type=_get_business_type_value(test_case.business_type),
                test_case_id=test_case.test_case_id,
                case_id=test_case.test_case_id,
                name=test_case.name,
                description=test_case.description,
                priority=test_case.priority,
                status=test_case.status,
                stage=stage,
                module=test_case.module,
                functional_module=test_case.functional_module,
                functional_domain=test_case.functional_domain,
                preconditions=test_case.preconditions,  # 直接返回字符串格式
                steps=_parse_steps_field(test_case.steps),
                expected_result=test_case.expected_result,
                remarks=test_case.remarks,
                generation_job_id=test_case.generation_job_id,
                entity_order=test_case.entity_order,
                created_at=test_case.created_at,
                updated_at=test_case.updated_at
            )
            unified_test_cases.append(response_data)

        return {
            'test_points_generated': test_point_count,
            'unified_test_cases': unified_test_cases,
            'id_conflicts_resolved': id_conflict_count,
            'processing_details': {
                'total_processed': len(test_points_list),
                'successful': test_point_count,
                'conflicts_resolved': id_conflict_count
            }
        }

    except Exception as e:
        logger.error(f"Error in synchronous test points generation for task {task_id}: {str(e)}", exc_info=True)
        raise RuntimeError(f"同步测试点生成失败: {str(e)}")


def _save_test_points_to_db(
    db: Session,
    test_points_list: List[Dict[str, Any]],
    business_type: str,
    project_id: int,
    generation_job_id: str
) -> tuple:
    """
    Save test points to database and return statistics.

    Returns:
        tuple: (test_point_count, id_conflict_count, processed_test_points, created_test_cases)
    """
    test_point_count = 0
    id_conflict_count = 0
    processed_test_points = []
    created_test_cases = []

    for i, point_data in enumerate(test_points_list):
        try:
            # Extract basic data from test point
            original_id = point_data.get('test_case_id') or point_data.get('id') or f'TP{str(i+1).zfill(3)}'
            title = point_data.get('title', point_data.get('name', f'测试点 {i+1}'))
            description = point_data.get('description', '')

            # Ensure ID uniqueness
            unique_id = _ensure_unique_test_case_id(original_id, business_type, project_id, db)

            # Track ID conflicts
            if unique_id != original_id:
                id_conflict_count += 1
                logger.info(f"测试点ID冲突处理: {original_id} -> {unique_id}")

            # Validate business type using database-driven validation
            validate_business_type_or_400(
                db=db,
                business_type=business_type,
                project_id=project_id
            )

            # Create test point record with clean data
            test_point = UnifiedTestCase(
                project_id=project_id,
                business_type=business_type.upper(),  # Store as uppercase string
                test_case_id=unique_id,
                name=title,
                description=description,
                status=UnifiedTestCaseStatus.DRAFT,
                priority='medium',
                # Test points don't have execution details
                preconditions=None,
                steps=None,
                entity_order=float(i + 1),
                generation_job_id=generation_job_id
            )

            db.add(test_point)
            db.flush()  # Get the ID without committing
            created_test_cases.append(test_point)
            test_point_count += 1

            # Record processing result
            processed_test_points.append({
                'original_id': original_id,
                'final_id': unique_id,
                'was_conflicted': unique_id != original_id,
                'name': title
            })

        except Exception as e:
            logger.error(f"处理测试点时出错 (索引 {i}): {str(e)}")
            continue  # Continue processing other test points

    return test_point_count, id_conflict_count, processed_test_points, created_test_cases


async def _generate_test_cases_sync_unified(
    task_id: str,
    business_type: str,
    project_id: int,
    test_point_ids: List[int],
    additional_context: Optional[str] = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Synchronous test cases generation function for debugging.
    """
    logger.info(f"🚀 Starting synchronous test cases generation: task_id={task_id}, business_type={business_type}")

    try:
        # This would be implemented similarly to test points generation
        # For now, return a placeholder result
        return {
            'test_cases_generated': 0,
            'unified_test_cases': [],
            'message': 'Test cases generation not implemented in sync mode yet'
        }
    except Exception as e:
        logger.error(f"Error in synchronous test cases generation for task {task_id}: {str(e)}", exc_info=True)
        raise RuntimeError(f"同步测试用例生成失败: {str(e)}")


# ========================================
# HELPER FUNCTIONS FOR ID CONFLICT HANDLING
# ========================================

def _is_id_exists(test_case_id: str, business_type: str, project_id: int, db) -> bool:
    """
    检查test_case_id在指定项目和业务类型中是否已存在

    Args:
        test_case_id: 要检查的测试用例ID
        business_type: 业务类型
        project_id: 项目ID
        db: 数据库会话

    Returns:
        bool: 如果ID已存在返回True，否则返回False
    """
    existing_case = db.query(UnifiedTestCase).filter(
        and_(
            UnifiedTestCase.project_id == project_id,
            UnifiedTestCase.business_type == business_type,
            UnifiedTestCase.test_case_id == test_case_id
        )
    ).first()
    return existing_case is not None


def _ensure_unique_test_case_id(test_case_id: str, business_type: str, project_id: int, db) -> str:
    """
    确保test_case_id在项目和业务类型内唯一，冲突时自动重命名

    Args:
        test_case_id: 原始测试用例ID
        business_type: 业务类型
        project_id: 项目ID
        db: 数据库会话

    Returns:
        str: 唯一的测试用例ID
    """
    if not _is_id_exists(test_case_id, business_type, project_id, db):
        return test_case_id

    original_id = test_case_id
    counter = 1

    # 如果原始ID已经有数字后缀，提取基础部分
    base_id = original_id
    if '-' in original_id:
        parts = original_id.rsplit('-', 1)
        if len(parts) == 2 and parts[1].isdigit():
            base_id = parts[0]
            counter = int(parts[1]) + 1

    # 生成新的唯一ID
    while True:
        new_id = f"{base_id}-{counter}"
        if not _is_id_exists(new_id, business_type, project_id, db):
            return new_id
        counter += 1


def _batch_check_existing_ids(test_case_ids: List[str], business_type: str, project_id: int, db) -> set:
    """
    批量检查哪些ID已经存在

    Args:
        test_case_ids: 要检查的ID列表
        business_type: 业务类型
        project_id: 项目ID
        db: 数据库会话

    Returns:
        set: 已存在的ID集合
    """
    if not test_case_ids:
        return set()

    existing_ids = db.query(UnifiedTestCase.test_case_id).filter(
        and_(
            UnifiedTestCase.project_id == project_id,
            UnifiedTestCase.business_type == business_type,
            UnifiedTestCase.test_case_id.in_(test_case_ids)
        )
    ).all()

    return {row.test_case_id for row in existing_ids}


# ========================================
# BACKGROUND TASK FUNCTIONS
# ========================================

async def _generate_test_points_background_unified(
    task_id: str,
    business_type: str,
    project_id: int,
    additional_context: Optional[str] = None
):
    """Background task for generating test points in unified system."""
    logger.info(f"🚀 BACKGROUND TASK STARTING: test_points generation for {business_type}, task_id: {task_id}")

    # Use shared dependencies for background tasks
    from ..database.models import GenerationJob, JobStatus, UnifiedTestCase
    from datetime import datetime
    import json
    from .dependencies import get_database_manager, get_unified_generation_service

    # Import AI logger for test_points generation
    try:
        from ..utils.ai_logger import AILoggerManager
    except ImportError:
        AILoggerManager = None
        logger.warning("AILoggerManager not available for test_points generation")

    # Get shared instances to avoid resource duplication
    db_manager = get_database_manager()
    generator_service = get_unified_generation_service()

    # Initialize AI logger for test_points generation
    ai_logger = None
    if AILoggerManager:
        try:
            ai_logger = AILoggerManager.create_logger(task_id, business_type, project_id)
            logger.info(f"✅ AI Logger initialized successfully for task {task_id}")
        except Exception as e:
            logger.error(f"Failed to initialize AI logger: {e}")
            ai_logger = None

    logger.info(f"✅ Services and DB manager initialized successfully for task {task_id}")

    # Update job status to running using dedicated database session
    try:
        with db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                job.current_step = 1
                job.step_description = "开始生成测试点..."
                db.commit()

        # Generate test points using unified generation service
        logger.info(f"Starting test points generation for business_type: {business_type}, project_id: {project_id}")
        generation_response = generator_service.generate_test_points(
            business_type=business_type,
            additional_context=additional_context or {},
            save_to_database=False,
            project_id=project_id,
            task_id=task_id,
            ai_logger=ai_logger
        )

        # Check if generation was successful and extract test points
        if not generation_response.success:
            raise RuntimeError(f"测试点生成失败: {generation_response.message}")

        # Extract test points list directly from GenerationResponse.result.generated_items
        generation_result = generation_response.result
        if not generation_result or not generation_result.generated_items:
            raise RuntimeError("测试点生成结果为空")

        test_points_list = generation_result.generated_items
        logger.info(f"Successfully obtained {len(test_points_list)} test points from generation service")

        # Save test points to unified table with simplified logic
        test_point_count = 0
        id_conflict_count = 0
        processed_test_points = []

        with db_manager.get_session() as db:
            # Process each test point with simplified logic
            for i, point_data in enumerate(test_points_list):
                try:
                    # Extract basic data from test point
                    original_id = point_data.get('test_case_id') or point_data.get('id') or f'TP{str(i+1).zfill(3)}'
                    title = point_data.get('title', point_data.get('name', f'测试点 {i+1}'))
                    description = point_data.get('description', '')

                    # Ensure ID uniqueness
                    unique_id = _ensure_unique_test_case_id(original_id, business_type, project_id, db)

                    # Track ID conflicts
                    if unique_id != original_id:
                        id_conflict_count += 1
                        logger.info(f"测试点ID冲突处理: {original_id} -> {unique_id}")

                    # Check for duplicate test case by business_type and name
                    existing_test_point = db.query(UnifiedTestCase).filter(
                        UnifiedTestCase.business_type == business_type,
                        UnifiedTestCase.name == title
                    ).first()

                    if existing_test_point:
                        logger.info(f"跳过重复的测试点: {title} (ID: {existing_test_point.id})")
                        # Still record in processing results for tracking
                        processed_test_points.append({
                            'original_id': original_id,
                            'final_id': existing_test_point.test_case_id,
                            'was_conflicted': unique_id != original_id,
                            'name': title,
                            'action': 'skipped_duplicate'
                        })
                        continue  # Skip to next test point

                    # Create test point record with clean data
                    test_point = UnifiedTestCase(
                        project_id=project_id,
                        business_type=business_type,
                        test_case_id=unique_id,
                        name=title,
                        description=description,
                        status='draft',
                        priority='medium',
                        # Test points don't have execution details
                        preconditions=None,
                        steps=None,
                        entity_order=float(i + 1),
                        generation_job_id=task_id
                    )

                    db.add(test_point)
                    test_point_count += 1

                    # Record processing result
                    processed_test_points.append({
                        'original_id': original_id,
                        'final_id': unique_id,
                        'was_conflicted': unique_id != original_id,
                        'name': title
                    })

                except Exception as e:
                    logger.error(f"处理测试点时出错 (索引 {i}): {str(e)}")
                    continue  # Continue processing other test points

            # Commit all changes
            db.commit()
            logger.info(f"测试点生成完成，成功保存 {test_point_count} 个测试点")

        # Update job status to completed
        with db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                job.result_data = json.dumps({
                    "test_points_generated": test_point_count,
                    "project_id": project_id,
                    "id_conflicts_resolved": id_conflict_count,
                    "processing_details": {
                        "total_processed": len(test_points_list),
                        "successful": test_point_count,
                        "conflicts_resolved": id_conflict_count
                    }
                }, ensure_ascii=False)
                db.commit()

                # Finalize AI logging with success
                try:
                    ai_logger.finalize_session(success=True)
                except Exception as log_error:
                    logger.error(f"Failed to finalize AI logging session: {log_error}")

    except Exception as e:
        # Enhanced error logging with full traceback
        logger.error(f"Background task {task_id} failed with error: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Parameters: business_type={business_type}, project_id={project_id}")

        # Update job status to failed with detailed error information using shared dependencies
        try:
            from .dependencies import get_database_manager
            db_manager = get_database_manager()
            with db_manager.get_session() as db:
                job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
                if job:
                    job.status = JobStatus.FAILED
                    job.error_message = f"{str(e)} (Type: {type(e).__name__})"[:2000]
                    db.commit()
                    logger.info(f"Updated job {task_id} status to FAILED")
                else:
                    logger.error(f"Job {task_id} not found for error update")
        except Exception as inner_e:
            logger.error(f"Failed to update job status with error: {str(inner_e)}", exc_info=True)
            # Re-throw to make the error visible at the application level
            raise

        # Finalize AI logging with failure
        try:
            if ai_logger:
                ai_logger.finalize_session(success=False, error_message=f"{str(e)} (Type: {type(e).__name__})")
        except Exception as log_error:
            logger.error(f"Failed to finalize AI logging session: {log_error}")


async def _generate_test_cases_background_unified(
    task_id: str,
    business_type: str,
    project_id: int,
    test_point_ids: Optional[List[int]],
    additional_context: Optional[str] = None
):
    """Background task for generating test cases from test points in unified system."""
    logger.info(f"🚀 BACKGROUND TASK STARTING: test_cases generation for {business_type}, task_id: {task_id}")

    # Use shared dependencies for background tasks
    from ..database.models import GenerationJob, JobStatus
    from datetime import datetime
    import json
    from .dependencies import get_database_manager, get_test_case_generator
    from ..utils.ai_logger import AILoggerManager

    # Get shared instances to avoid resource duplication
    db_manager = get_database_manager()
    generator = get_test_case_generator()

    # Create AI logger for this task
    ai_logger = AILoggerManager.create_logger(task_id, business_type, project_id)
    logger.info(f"✅ AI logger created for task {task_id}: {ai_logger.get_session_path()}")

    logger.info(f"✅ Test cases generator and DB manager initialized successfully for task {task_id}")

    # Update job status to running using dedicated database session
    try:
        with db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                job.current_step = 1
                job.step_description = "开始基于测试点生成测试用例..."
                db.commit()

        # Get test points
        with db_manager.get_session() as db:
            test_points = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id.in_(test_point_ids) if test_point_ids else True,
                UnifiedTestCase.business_type == business_type,
                UnifiedTestCase.project_id == project_id,
                # Fix: Remove strict steps.is_(None) requirement to allow partially updated test points
                or_(UnifiedTestCase.steps.is_(None), UnifiedTestCase.stage == DatabaseUnifiedTestCaseStage.TEST_POINT)
            ).all()

            if not test_points:
                raise RuntimeError("未找到可用的测试点")

            # Convert test points to expected format (fixed field mapping)
            test_points_data = {
                "test_points": [
                    {
                        "id": tp.id,
                        "test_case_id": tp.test_case_id,  # Fixed: use test_case_id instead of case_id
                        "title": tp.name,
                        "description": tp.description,
                        "priority": tp.priority
                    }
                    for tp in test_points
                ]
            }

        # Log test points to prompt transformation
        ai_logger.log_test_points_to_prompt({
            "test_points_data": test_points_data,
            "additional_context": additional_context,
            "business_type": business_type,
            "project_id": project_id,
            "test_point_ids": test_point_ids
        })

        # Generate test cases from test points
        # Fix: Pass test_point_ids to enable template variable resolution
        test_cases_data = generator.generate_test_cases_from_external_points(
            business_type=business_type,
            test_points_data=test_points_data,
            additional_context=additional_context or {},
            save_to_db=True,
            project_id=project_id,
            test_point_ids=test_point_ids,
            ai_logger=ai_logger
        )

        if not test_cases_data:
            raise RuntimeError("基于测试点的测试用例生成失败")

        # Enhanced data validation and repair
        validator = DataValidatorRepairer()

        # Extract and validate test cases with repair functionality
        if isinstance(test_cases_data, str):
            # If test_cases_data is a string response, parse it first
            json_data, validated_test_cases = JSONExtractor.extract_and_validate_json_response(test_cases_data, validate_and_repair=True, ai_logger=ai_logger)
        else:
            # If test_cases_data is already a dict, validate directly
            validated_test_cases = JSONExtractor.extract_test_cases_from_json(test_cases_data, validate_and_repair=True)

        # Log validation summary
        validation_summary = validator.get_processing_summary()
        logger.info(f"Test case validation complete: {validation_summary['total_cases_processed']} cases, "
                   f"success rate: {validation_summary['success_rate']:.1f}%")

        # Save test cases to unified table with enhanced error handling
        test_case_count = 0
        failed_cases = 0

        with db_manager.get_session() as db:
            # Re-fetch test_points in this session to avoid detached instance issues
            test_points = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id.in_(test_point_ids) if test_point_ids else True,
                UnifiedTestCase.business_type == business_type,
                UnifiedTestCase.project_id == project_id,
                or_(UnifiedTestCase.steps.is_(None), UnifiedTestCase.stage == DatabaseUnifiedTestCaseStage.TEST_POINT))
            ).all()

            # Use validated test cases instead of raw data
            test_cases_list = validated_test_cases

            for i, case_data in enumerate(test_cases_list):
                try:
                    # Find corresponding test point by database ID (fix: use tp.id instead of tp.test_case_id)
                    test_point_id = case_data.get('test_point_id') or case_data.get('id')
                    logger.info(f"Looking for test point with ID: {test_point_id}")
                    logger.info(f"Available test points: {[tp.id for tp in test_points]}")
                    test_point = next((tp for tp in test_points if tp.id == test_point_id), None)

                    if test_point:
                        # Convert test point to test case by adding execution details
                        # Use validated and repaired data
                        test_point.steps = _serialize_json_field(case_data.get('steps', []))
                        test_point.preconditions = _serialize_json_field(case_data.get('preconditions', []))
                        test_point.module = case_data.get('module', '')
                        test_point.functional_module = case_data.get('functional_module', '')
                        test_point.functional_domain = case_data.get('functional_domain', '')

                        # Enhanced remarks handling - preserve validation info
                        existing_remarks = test_point.remarks or ''
                        validation_remarks = case_data.get('remarks', '')
                        if validation_remarks and '[自动修复]' in validation_remarks:
                            # Add validation info to remarks
                            combined_remarks = f"{existing_remarks} | {validation_remarks}" if existing_remarks else validation_remarks
                            test_point.remarks = combined_remarks
                        else:
                            test_point.remarks = existing_remarks or validation_remarks or ''

                        test_case_count += 1
                        logger.info(f"Successfully converted test point to test case: {test_point.test_case_id}")
                    else:
                        failed_cases += 1
                        logger.warning(f"未找到对应的测试点，跳过测试用例生成: {test_point_id}")
                        # Create new test case if test point not found (fallback mechanism)
                        try:
                            case_name = case_data.get('name', f'新生成的测试用例 {i+1}')

                            # Check for duplicate test case by business_type and name
                            existing_test_case = db.query(UnifiedTestCase).filter(
                                UnifiedTestCase.business_type == business_type,
                                UnifiedTestCase.name == case_name
                            ).first()

                            if existing_test_case:
                                logger.info(f"跳过重复的测试用例: {case_name} (ID: {existing_test_case.id})")
                                failed_cases += 1
                                continue  # Skip to next test case

                            unique_id = _ensure_unique_test_case_id(case_data.get('test_case_id', f'NEW_TC{str(i+1).zfill(3)}'), business_type, project_id, db)
                            new_test_case = UnifiedTestCase(
                                project_id=project_id,
                                business_type=business_type,
                                test_case_id=unique_id,
                                name=case_name,
                                description=case_data.get('description', ''),
                                status=UnifiedTestCaseStatus.DRAFT,
                                priority=case_data.get('priority', 'medium'),
                                steps=_serialize_json_field(case_data.get('steps', [])),
                                preconditions=_serialize_json_field(case_data.get('preconditions', [])),
                                module=case_data.get('module', ''),
                                functional_module=case_data.get('functional_module', ''),
                                functional_domain=case_data.get('functional_domain', ''),
                                remarks=case_data.get('remarks', '[自动创建] 未找到对应的测试点'),
                                entity_order=float(i + 1),
                                generation_job_id=task_id,
                                stage=DatabaseUnifiedTestCaseStage.test_case
                            )
                            db.add(new_test_case)
                            test_case_count += 1
                            logger.info(f"Created new test case as fallback: {unique_id}")
                        except Exception as create_error:
                            logger.error(f"Failed to create fallback test case: {str(create_error)}")
                            failed_cases += 1

                except Exception as e:
                    failed_cases += 1
                    logger.error(f"处理测试用例时出错 (索引 {i}): {str(e)}")
                    continue

            db.commit()

            # 记录处理结果
            if failed_cases > 0:
                logger.info(f"测试用例生成完成，成功转换 {test_case_count} 个测试用例，失败 {failed_cases} 个")

        # Update job completion with detailed processing results
        with db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                job.result_data = json.dumps({
                    "test_cases_generated": test_case_count,
                    "test_points_used": len(test_points),
                    "failed_cases": failed_cases,
                    "processing_details": {
                        "total_test_cases": len(test_cases_list),
                        "successful": test_case_count,
                        "failed": failed_cases
                    }
                }, ensure_ascii=False)
                db.commit()

    except Exception as e:
        # Enhanced error logging with full traceback
        logger.error(f"Background test case generation task {task_id} failed with error: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Parameters: business_type={business_type}, project_id={project_id}")

        # Finalize AI logging with failure
        try:
            ai_logger.finalize_session(success=False, error_message=f"{str(e)} (Type: {type(e).__name__})")
        except Exception as log_error:
            logger.error(f"Failed to finalize AI logging session: {log_error}")

        # Update job status to failed with detailed error information using shared dependencies
        try:
            # Use shared db_manager for error handling
            with db_manager.get_session() as db:
                job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
                if job:
                    job.status = JobStatus.FAILED
                    job.error_message = f"{str(e)} (Type: {type(e).__name__})"[:2000]
                    db.commit()
        except Exception as inner_e:
            logger.error(f"Failed to update job status with error: {str(inner_e)}", exc_info=True)
            # Don't silently fail - rethrow to make the error visible at the application level
            raise




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
    logger.info(f"🔍 Parsing steps field, input length: {len(str(field_value)) if field_value else 0}")

    if field_value is None:
        logger.info("📋 Steps field is None")
        return None

    # 首先尝试解析为JSON
    try:
        parsed = json.loads(field_value)
        logger.info(f"✅ JSON parsing successful, type: {type(parsed)}")

        if isinstance(parsed, list):
            logger.info(f"📋 Parsed list with {len(parsed)} items")

            # 检查是否是字符串列表（旧格式）
            if all(isinstance(item, str) for item in parsed):
                logger.info("🔄 Converting string list to step objects")
                # 处理字符串列表格式
                steps = []
                for i, item in enumerate(parsed):
                    step_dict = _parse_single_step_string(item)
                    if step_dict:
                        # 确保step_number正确设置
                        step_dict['step_number'] = i + 1
                        logger.debug(f"📋 Converted string {i+1} to step: {step_dict.get('action', '')[:50]}...")
                        steps.append(step_dict)
                    else:
                        logger.warning(f"⚠️ Failed to parse step string: {item[:50]}...")

                logger.info(f"✅ Converted {len(steps)} strings to step objects")
                return steps if steps else None
            else:
                # 已经是字典列表格式，验证并完善
                logger.info("📋 Processing existing dictionary list")
                validated_steps = []
                for i, step in enumerate(parsed):
                    if isinstance(step, dict):
                        # 确保必要字段存在
                        validated_step = {
                            "step_number": step.get("step_number", i + 1),
                            "action": step.get("action", step.get("description", "")),
                            "expected": step.get("expected", "")
                        }
                        # 保留其他字段
                        for key, value in step.items():
                            if key not in validated_step:
                                validated_step[key] = value
                        validated_steps.append(validated_step)
                        logger.debug(f"📋 Validated step {i+1}: {validated_step.get('action', '')[:50]}...")
                    else:
                        logger.warning(f"⚠️ Step {i} is not a dictionary: {step}")

                logger.info(f"✅ Validated {len(validated_steps)} step objects")
                return validated_steps if validated_steps else None
        else:
            logger.warning(f"⚠️ Parsed JSON is not a list: {type(parsed)}")

    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"❌ JSON parsing failed: {str(e)}")
        pass

    # 如果JSON解析失败，处理旧格式字符串
    if isinstance(field_value, str):
        logger.info("🔄 Processing as plain text string")
        try:
            # 按行分割步骤
            lines = field_value.strip().split('\n')
            steps = []

            for i, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue

                step_dict = _parse_single_step_string(line)
                if step_dict:
                    # 确保step_number正确设置
                    step_dict['step_number'] = i + 1
                    steps.append(step_dict)
                    logger.debug(f"📋 Parsed line {i+1}: {step_dict.get('action', '')[:50]}...")

            logger.info(f"✅ Parsed {len(steps)} steps from plain text")
            return steps if steps else None
        except Exception as e:
            logger.error(f"❌ Plain text parsing failed: {str(e)}")
            # 如果所有解析都失败，返回None
            return None

    logger.warning("⚠️ No parsing method succeeded")
    return None


def _merge_steps_with_expected_results(
    steps: Optional[List[Dict[str, Any]]],
    expected_result: Optional[str]
) -> List[Dict[str, Any]]:
    """
    智能合并步骤和预期结果

    Args:
        steps: 解析后的步骤列表
        expected_result: 预期结果字符串（换行分隔）

    Returns:
        List[Dict[str, Any]]: 合并后的步骤列表，每个步骤包含action和expected字段
    """
    logger.info(f"🔍 Starting merge process with {len(steps) if steps else 0} steps")
    logger.info(f"🎯 Expected result type: {type(expected_result)}, length: {len(str(expected_result)) if expected_result else 0}")

    if not steps:
        logger.info("ℹ️ No steps provided for merging (returning empty list)")
        return []

    # 解析预期结果
    expected_results = []
    if expected_result:
        logger.info(f"📋 Parsing expected_result: {expected_result[:100]}...")
        try:
            # 如果expected_result是JSON字符串数组
            if expected_result.startswith('[') and expected_result.endswith(']'):
                parsed_expected = json.loads(expected_result)
                if isinstance(parsed_expected, list):
                    expected_results = [str(item).strip() for item in parsed_expected if str(item).strip()]
                    logger.info(f"✅ Parsed JSON expected results: {len(expected_results)} items")
                else:
                    logger.warning(f"⚠️ Parsed JSON is not a list: {type(parsed_expected)}")
            else:
                # 如果是普通字符串，按换行符分割
                expected_results = [item.strip() for item in expected_result.split('\n') if item.strip()]
                logger.info(f"✅ Parsed text expected results: {len(expected_results)} items")
        except (json.JSONDecodeError, Exception) as e:
            # 解析失败时按换行符分割
            logger.error(f"❌ Failed to parse expected_result: {str(e)}")
            expected_results = [item.strip() for item in str(expected_result).split('\n') if item.strip()]
            logger.info(f"🔄 Fallback parsed: {len(expected_results)} items")
    else:
        logger.info("📋 No expected_result provided")

    # 合并步骤和预期结果
    merged_steps = []
    expected_count = len(expected_results)
    steps_with_expected = 0
    steps_without_expected = 0

    for i, step in enumerate(steps):
        # 优先使用步骤自身的expected字段
        step_expected = step.get("expected", "")
        if step_expected:
            steps_with_expected += 1
            logger.debug(f"📋 Step {i+1} already has expected: {step_expected[:50]}...")

        # 如果步骤没有expected字段，尝试从expected_result中获取
        if not step_expected and i < expected_count:
            step_expected = expected_results[i]
            steps_with_expected += 1
            logger.debug(f"🎯 Assigned expected result to step {i+1}: {step_expected[:50]}...")
        elif not step_expected:
            steps_without_expected += 1
            logger.debug(f"⚠️ No expected result for step {i+1}")

        step_data = {
            "step_number": step.get("step_number", i + 1),
            "action": step.get("action", step.get("description", "")),
            "expected": step_expected
        }

        # 保留步骤的其他字段
        for key, value in step.items():
            if key not in step_data:
                step_data[key] = value

        merged_steps.append(step_data)

    logger.info(f"✅ Merged {len(steps)} steps with {expected_count} expected results")
    logger.info(f"📊 Steps with expected: {steps_with_expected}, without expected: {steps_without_expected}")

    return merged_steps


def _extract_action_and_expected_from_description(description: str) -> tuple[str, str]:
    """
    从描述中提取动作和预期结果

    Args:
        description: 步骤描述文本

    Returns:
        tuple: (action, expected) 动作和预期结果的元组
    """
    if not description:
        return "", ""

    # 尝试按常见的分隔符分离动作和预期结果
    separators = ["预期结果:", "期望:", "预期:", "期望结果:", "Expected:", "Result:"]

    for sep in separators:
        if sep in description:
            parts = description.split(sep, 1)
            if len(parts) == 2:
                action = parts[0].strip()
                expected = parts[1].strip()
                if action and expected:
                    logger.debug(f"Extracted action: '{action}', expected: '{expected}'")
                    return action, expected

    # 如果没有找到分隔符，整个作为动作，预期结果为空
    logger.debug(f"No separator found, using full description as action: '{description}'")
    return description, ""


def _parse_single_step_string(step_str: str) -> Optional[Dict[str, Any]]:
    """解析单个步骤字符串"""
    if not isinstance(step_str, str):
        return None

    step_str = step_str.strip()
    if not step_str:
        return None

    # 首先尝试直接解析为JSON
    try:
        parsed_data = json.loads(step_str)
        if isinstance(parsed_data, dict):
            # 确保返回的字典包含必要的字段
            result = {
                "step_number": parsed_data.get("step_number", 1),
                "description": parsed_data.get("description", parsed_data.get("action", "")),
                "action": parsed_data.get("action", parsed_data.get("description", "")),
                "expected": parsed_data.get("expected", "")
            }
            # 保留其他字段
            for key, value in parsed_data.items():
                if key not in result:
                    result[key] = value
            # 添加调试日志
            logger.debug(f"Parsed JSON step: {result}")
            return result
    except (json.JSONDecodeError, Exception):
        pass

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

                    # 从步骤描述中提取动作和预期结果
                    action, expected = _extract_action_and_expected_from_description(step_desc)
                    result = {
                        "step_number": int(step_num),
                        "description": action,
                        "action": action,
                        "expected": expected
                    }
                    logger.debug(f"Parsed numbered step: {result}")
                    return result
                except ValueError:
                    # 如果数字转换失败，作为简单步骤处理
                    action, expected = _extract_action_and_expected_from_description(step_str)
                    return {
                        "step_number": len(step_str.split()) + 1,
                        "description": action,
                        "action": action,
                        "expected": expected
                    }
            else:
                # 没有分割符，整个作为步骤描述
                try:
                    action, expected = _extract_action_and_expected_from_description(step_str)
                    return {
                        "step_number": int(step_str),
                        "description": action,
                        "action": action,
                        "expected": expected
                    }
                except ValueError:
                    action, expected = _extract_action_and_expected_from_description(step_str)
                    return {
                        "step_number": 1,
                        "description": action,
                        "action": action,
                        "expected": expected
                    }
        else:
            # 第一个字符不是数字，作为简单步骤处理
            action, expected = _extract_action_and_expected_from_description(step_str)
            return {
                "step_number": 1,
                "description": action,
                "action": action,
                "expected": expected
            }
    else:
        # 不以数字开头，作为简单步骤处理
        action, expected = _extract_action_and_expected_from_description(step_str)
        return {
            "step_number": 1,
            "description": action,
            "action": action,
            "expected": expected
        }


def _intelligent_update_test_cases(
    test_cases_data: List[Dict[str, Any]],
    business_type: str,
    project_id: int,
    db,
    generation_job_id: str
) -> Dict[str, Any]:
    """
    智能增量更新测试用例，避免删除重建导致的关联数据丢失

    Args:
        test_cases_data: 新的测试用例数据列表
        business_type: 业务类型
        project_id: 项目ID
        db: 数据库会话
        generation_job_id: 生成任务ID

    Returns:
        Dict: 更新结果统计
    """
    logger.info(f"开始智能增量更新测试用例，业务类型: {business_type}, 项目: {project_id}")

    updated_count = 0
    created_count = 0
    skipped_count = 0
    error_count = 0

    # 获取现有测试用例（按test_case_id索引）
    existing_cases = db.query(UnifiedTestCase).filter(
        UnifiedTestCase.business_type == business_type,
        UnifiedTestCase.project_id == project_id,
        UnifiedTestCase.stage == DatabaseUnifiedTestCaseStage.test_case
    ).all()

    # 创建ID到现有用例的映射
    existing_by_id = {case.test_case_id: case for case in existing_cases}

    # 处理新的测试用例数据
    for i, case_data in enumerate(test_cases_data):
        try:
            new_test_case_id = case_data.get('test_case_id')

            if not new_test_case_id:
                logger.warning(f"测试用例数据缺少test_case_id，跳过处理")
                skipped_count += 1
                continue

            # 检查是否存在相同ID的测试用例
            existing_case = existing_by_id.get(new_test_case_id)

            if existing_case:
                # 执行智能更新
                needs_update = False
                update_fields = {}

                # 比较并更新有变化的字段
                field_mappings = {
                    'name': case_data.get('name'),
                    'description': case_data.get('description'),
                    'priority': case_data.get('priority', 'medium'),
                    'module': case_data.get('module', ''),
                    'functional_module': case_data.get('functional_module', ''),
                    'functional_domain': case_data.get('functional_domain', ''),
                    'remarks': case_data.get('remarks', ''),
                    'steps': _serialize_json_field(case_data.get('steps', [])),
                    'preconditions': _serialize_json_field(case_data.get('preconditions', []))
                }

                for field, new_value in field_mappings.items():
                    old_value = getattr(existing_case, field, None)

                    # 处理JSON字段的比较
                    if field in ['steps', 'preconditions']:
                        old_value = _parse_json_field(old_value)

                    if old_value != new_value:
                        update_fields[field] = new_value
                        needs_update = True

                # 如果有变化，执行更新
                if needs_update:
                    update_fields['updated_at'] = datetime.now()
                    update_fields['generation_job_id'] = generation_job_id

                    # 合并备注信息，保留更新历史
                    if 'remarks' in update_fields:
                        old_remarks = existing_case.remarks or ''
                        new_remarks = update_fields['remarks']
                        if new_remarks and '[自动修复]' in new_remarks:
                            update_fields['remarks'] = f"{old_remarks} | {new_remarks}" if old_remarks else new_remarks

                    for field, value in update_fields.items():
                        setattr(existing_case, field, value)

                    logger.info(f"更新测试用例: {new_test_case_id}, 更新字段: {list(update_fields.keys())}")
                    updated_count += 1
                else:
                    logger.debug(f"测试用例无变化，跳过: {new_test_case_id}")
                    skipped_count += 1

            else:
                # 创建新测试用例
                unique_id = _ensure_unique_test_case_id(new_test_case_id, business_type, project_id, db)

                new_case = UnifiedTestCase(
                    project_id=project_id,
                    business_type=business_type,
                    test_case_id=unique_id,
                    name=case_data.get('name', f'新测试用例 {i+1}'),
                    description=case_data.get('description', ''),
                    status=UnifiedTestCaseStatus.DRAFT,
                    priority=case_data.get('priority', 'medium'),
                    steps=_serialize_json_field(case_data.get('steps', [])),
                    preconditions=_serialize_json_field(case_data.get('preconditions', [])),
                    module=case_data.get('module', ''),
                    functional_module=case_data.get('functional_module', ''),
                    functional_domain=case_data.get('functional_domain', ''),
                    remarks=case_data.get('remarks', '[增量更新] 新创建'),
                    entity_order=float(i + 1),
                    generation_job_id=generation_job_id,
                    stage=DatabaseUnifiedTestCaseStage.test_case
                )

                db.add(new_case)
                logger.info(f"创建新测试用例: {unique_id}")
                created_count += 1

        except Exception as e:
            logger.error(f"处理测试用例时出错: {str(e)}")
            error_count += 1

    # 提交所有更改
    try:
        db.commit()
        logger.info(f"智能增量更新完成 - 更新: {updated_count}, 创建: {created_count}, 跳过: {skipped_count}, 错误: {error_count}")
    except Exception as commit_error:
        db.rollback()
        logger.error(f"提交更改时出错: {str(commit_error)}")
        error_count += len(test_cases_data)

    return {
        'updated_count': updated_count,
        'created_count': created_count,
        'skipped_count': skipped_count,
        'error_count': error_count,
        'total_processed': len(test_cases_data),
        'success_rate': ((updated_count + created_count) / len(test_cases_data) * 100) if test_cases_data else 0
    }


def _batch_update_with_intelligent_mode(
    test_cases_data: List[Dict[str, Any]],
    business_type: str,
    project_id: int,
    db,
    generation_job_id: str
) -> Dict[str, Any]:
    """
    批量智能更新测试用例的包装函数，兼容现有调用方式

    Args:
        test_cases_data: 测试用例数据
        business_type: 业务类型
        project_id: 项目ID
        db: 数据库会话
        generation_job_id: 生成任务ID

    Returns:
        Dict: 更新结果统计
    """
    return _intelligent_update_test_cases(
        test_cases_data=test_cases_data,
        business_type=business_type,
        project_id=project_id,
        db=db,
        generation_job_id=generation_job_id
    )


@router.post("/test-background", response_model=Dict[str, str])
async def test_background_task(
    background_tasks: BackgroundTasks,
    message: str = "Default test message"
):
    """
    Test endpoint to verify BackgroundTasks functionality.
    This creates a simple background task that logs after a delay.
    """
    task_id = f"test-{uuid.uuid4().hex[:8]}"
    logger.info(f"🧪 TEST: Creating background task {task_id}")

    background_tasks.add_task(
        _simple_background_test,
        task_id=task_id,
        message=message
    )

    return {
        "message": "Background task created successfully",
        "task_id": task_id,
        "status": "Check logs for background task execution"
    }


async def _simple_background_test(
    task_id: str,
    message: str
):
    """
    Simple background task for testing BackgroundTasks functionality.
    """
    logger.info(f"🧪 BACKGROUND TASK {task_id} STARTED: message={message}")

    # Simulate some work
    import asyncio
    await asyncio.sleep(2)

    logger.info(f"🧪 BACKGROUND TASK {task_id} COMPLETED: message={message}")

    # Test database connection from background task
    try:
        from ..database.database import DatabaseManager
        from ..utils.config import Config

        config = Config()
        db_manager = DatabaseManager(config)

        with db_manager.get_session() as db:
            # Simple database query to test connection
            from ..database.models import GenerationJob
            job_count = db.query(GenerationJob).count()
            logger.info(f"🧪 BACKGROUND TASK {task_id}: Database connection successful, found {job_count} generation jobs")

    except Exception as e:
        logger.error(f"🧪 BACKGROUND TASK {task_id}: Database connection failed: {str(e)}")
        raise