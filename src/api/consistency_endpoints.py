# -*- coding: utf-8 -*-
"""
API endpoints for data consistency validation and management.

This module provides endpoints for:
- Running consistency checks
- Getting detailed consistency reports
- Fixing consistency issues
- Monitoring system integrity
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field

from ..database.database import DatabaseManager
from ..services.data_consistency_validator import DataConsistencyValidator
from ..utils.config import Config

logger = logging.getLogger(__name__)

# Configure router
router = APIRouter(prefix="/api/v1/consistency", tags=["consistency"])


# Pydantic models for API requests/responses
class ConsistencyCheckRequest(BaseModel):
    """Request model for consistency check."""
    business_type: Optional[str] = Field(None, description="Filter by business type")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    check_types: Optional[List[str]] = Field(None, description="Specific check types to run")
    auto_fix: bool = Field(False, description="Automatically fix issues found")


class ConsistencyCheckResponse(BaseModel):
    """Response model for consistency check."""
    success: bool
    message: str
    report_id: Optional[str] = None
    issues_count: int
    error_count: int
    warning_count: int
    can_auto_fix: int
    requires_manual_fix: int


class FixIssuesRequest(BaseModel):
    """Request model for fixing consistency issues."""
    issue_ids: Optional[List[int]] = Field(None, description="Specific issue IDs to fix")
    auto_fix: bool = Field(True, description="Whether to automatically fix issues")
    dry_run: bool = Field(False, description="Preview fixes without applying them")
    business_type: Optional[str] = Field(None, description="Filter by business type")
    project_id: Optional[int] = Field(None, description="Filter by project ID")


class FixIssuesResponse(BaseModel):
    """Response model for fixing issues."""
    success: bool
    message: str
    fixed_count: int
    failed_count: int
    skipped_count: int
    fix_details: List[str]
    dry_run: bool


class ConsistencyReportResponse(BaseModel):
    """Response model for detailed consistency report."""
    report_id: str
    is_consistent: bool
    total_issues: int
    error_count: int
    warning_count: int
    info_count: int
    validation_timestamp: str
    statistics: Dict[str, Any]
    issues: List[Dict[str, Any]]


class SystemHealthResponse(BaseModel):
    """Response model for system health check."""
    status: str  # "healthy", "warning", "error"
    message: str
    last_check: Optional[str] = None
    critical_issues: int
    warnings: int
    recommendations: List[str]


class ConsistencyStatisticsResponse(BaseModel):
    """Response model for consistency statistics."""
    validation_timestamp: str
    total_entities: Dict[str, Any]
    issues_summary: Dict[str, Any]
    issues_by_type: Dict[str, int]
    issues_by_severity: Dict[str, int]
    filters: Dict[str, Any]


# Dependency to get database manager
def get_db_manager() -> DatabaseManager:
    """Get database manager instance."""
    config = Config()
    return DatabaseManager(config)


# Dependency to get consistency validator
def get_consistency_validator(db_manager: DatabaseManager = Depends(get_db_manager)) -> DataConsistencyValidator:
    """Get consistency validator instance."""
    return DataConsistencyValidator(db_manager)


@router.post("/check", response_model=ConsistencyCheckResponse)
async def run_consistency_check(
    request: ConsistencyCheckRequest,
    validator: DataConsistencyValidator = Depends(get_consistency_validator),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Run a comprehensive consistency check on the system.

    - **business_type**: Optional filter for specific business type
    - **project_id**: Optional filter for specific project
    - **check_types**: Optional list of specific check types to run
    - **auto_fix**: Whether to automatically fix issues found
    """
    try:
        logger.info(f"Starting consistency check - business_type: {request.business_type}, project_id: {request.project_id}")

        # Run the consistency validation
        report = validator.validate_two_stage_generation_integrity(
            business_type=request.business_type,
            project_id=request.project_id
        )

        # Analyze fixability
        issues_analysis = validator._analyze_fixability(report.issues) if report.issues else {}
        can_auto_fix = len(issues_analysis.get("auto_fixable", []))
        requires_manual_fix = len(issues_analysis.get("manual_fix_required", []))

        # Auto-fix if requested and possible
        if request.auto_fix and can_auto_fix > 0:
            logger.info(f"Auto-fixing {can_auto_fix} issues")
            fix_result = validator.fix_consistency_issues(report.issues, auto_fix=True)
            logger.info(f"Auto-fix completed: {fix_result['fixed_count']} fixed, {fix_result['failed_count']} failed")

        # Generate report ID for tracking
        import uuid
        report_id = str(uuid.uuid4())

        return ConsistencyCheckResponse(
            success=True,
            message="Consistency check completed successfully",
            report_id=report_id,
            issues_count=report.total_issues,
            error_count=report.error_count,
            warning_count=report.warning_count,
            can_auto_fix=can_auto_fix,
            requires_manual_fix=requires_manual_fix
        )

    except Exception as e:
        logger.error(f"Error during consistency check: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Consistency check failed: {str(e)}"
        )


@router.post("/fix", response_model=FixIssuesResponse)
async def fix_consistency_issues(
    request: FixIssuesRequest,
    validator: DataConsistencyValidator = Depends(get_consistency_validator)
):
    """
    Fix consistency issues found in the system.

    - **issue_ids**: Optional specific issue IDs to fix (if None, fixes all fixable issues)
    - **auto_fix**: Whether to automatically fix issues
    - **dry_run**: Preview fixes without applying them
    - **business_type**: Optional filter for specific business type
    - **project_id**: Optional filter for specific project
    """
    try:
        logger.info(f"Starting issue fixing - dry_run: {request.dry_run}, auto_fix: {request.auto_fix}")

        # First, run a consistency check to get current issues
        report = validator.validate_two_stage_generation_integrity(
            business_type=request.business_type,
            project_id=request.project_id
        )

        if not report.issues:
            return FixIssuesResponse(
                success=True,
                message="No issues found to fix",
                fixed_count=0,
                failed_count=0,
                skipped_count=0,
                fix_details=[],
                dry_run=request.dry_run
            )

        # Filter issues by IDs if specified
        issues_to_fix = report.issues
        if request.issue_ids:
            issues_to_fix = [issue for issue in report.issues if issue.entity_id in request.issue_ids]

        if request.dry_run:
            # Analyze what could be fixed without actually fixing
            analysis = validator._analyze_fixability(issues_to_fix)
            auto_fixable_count = len(analysis.get("auto_fixable", []))
            manual_fix_count = len(analysis.get("manual_fix_required", []))

            return FixIssuesResponse(
                success=True,
                message=f"Dry run completed: {auto_fixable_count} issues could be auto-fixed, {manual_fix_count} require manual intervention",
                fixed_count=auto_fixable_count,
                failed_count=0,
                skipped_count=manual_fix_count,
                fix_details=[f"Could auto-fix: {issue['description']}" for issue in analysis.get("auto_fixable", [])] +
                            [f"Manual fix required: {issue['description']}" for issue in analysis.get("manual_fix_required", [])],
                dry_run=True
            )

        # Actually fix the issues
        fix_result = validator.fix_consistency_issues(issues_to_fix, auto_fix=request.auto_fix)

        return FixIssuesResponse(
            success=fix_result.get("error") is None,
            message="Issue fixing completed" if fix_result.get("error") is None else f"Error during fixing: {fix_result.get('error')}",
            fixed_count=fix_result["fixed_count"],
            failed_count=fix_result["failed_count"],
            skipped_count=fix_result["skipped_count"],
            fix_details=fix_result["fix_details"],
            dry_run=False
        )

    except Exception as e:
        logger.error(f"Error during issue fixing: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Issue fixing failed: {str(e)}"
        )


@router.get("/report", response_model=ConsistencyReportResponse)
async def get_consistency_report(
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    validator: DataConsistencyValidator = Depends(get_consistency_validator)
):
    """
    Get a detailed consistency report.

    - **business_type**: Optional filter for specific business type
    - **project_id**: Optional filter for specific project
    """
    try:
        logger.info(f"Generating consistency report - business_type: {business_type}, project_id: {project_id}")

        # Run validation to get current state
        report = validator.validate_two_stage_generation_integrity(
            business_type=business_type,
            project_id=project_id
        )

        # Convert issues to dictionary format for JSON serialization
        issues_dicts = []
        for issue in report.issues:
            issues_dicts.append({
                "type": issue.type.value,
                "severity": issue.severity.value,
                "entity_type": issue.entity_type,
                "entity_id": issue.entity_id,
                "description": issue.description,
                "details": issue.details,
                "suggested_fix": issue.suggested_fix
            })

        return ConsistencyReportResponse(
            report_id=f"report_{business_type or 'all'}_{project_id or 'all'}",
            is_consistent=report.is_consistent,
            total_issues=report.total_issues,
            error_count=report.error_count,
            warning_count=report.warning_count,
            info_count=report.info_count,
            validation_timestamp=report.validation_timestamp,
            statistics=report.statistics,
            issues=issues_dicts
        )

    except Exception as e:
        logger.error(f"Error generating consistency report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed: {str(e)}"
        )


@router.get("/health", response_model=SystemHealthResponse)
async def get_system_health(
    validator: DataConsistencyValidator = Depends(get_consistency_validator)
):
    """
    Get system health status based on consistency checks.
    """
    try:
        # Run a quick consistency check
        report = validator.validate_two_stage_generation_integrity()

        # Determine overall health status
        if report.error_count > 0:
            status = "error"
            message = f"System has {report.error_count} critical consistency issues"
        elif report.warning_count > 0:
            status = "warning"
            message = f"System has {report.warning_count} warnings"
        else:
            status = "healthy"
            message = "System is consistent and healthy"

        # Generate recommendations
        recommendations = []
        if report.error_count > 0:
            recommendations.append("Fix critical consistency issues immediately")
            recommendations.append("Review database integrity")
        if report.warning_count > 0:
            recommendations.append("Address warnings to prevent future issues")
        if report.info_count > 0:
            recommendations.append("Review informational messages for optimization opportunities")

        return SystemHealthResponse(
            status=status,
            message=message,
            last_check=report.validation_timestamp,
            critical_issues=report.error_count,
            warnings=report.warning_count,
            recommendations=recommendations
        )

    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )


@router.get("/statistics", response_model=ConsistencyStatisticsResponse)
async def get_consistency_statistics(
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    validator: DataConsistencyValidator = Depends(get_consistency_validator)
):
    """
    Get consistency statistics summary.

    - **business_type**: Optional filter for specific business type
    - **project_id**: Optional filter for specific project
    """
    try:
        # Run validation to get statistics
        report = validator.validate_two_stage_generation_integrity(
            business_type=business_type,
            project_id=project_id
        )

        # Analyze issues by type and severity
        issues_by_type = {}
        issues_by_severity = {
            "error": 0,
            "warning": 0,
            "info": 0
        }

        for issue in report.issues:
            # Count by type
            issue_type = issue.type.value
            if issue_type not in issues_by_type:
                issues_by_type[issue_type] = 0
            issues_by_type[issue_type] += 1

            # Count by severity
            severity = issue.severity.value
            issues_by_severity[severity] += 1

        return {
            "validation_timestamp": report.validation_timestamp,
            "total_entities": report.statistics,
            "issues_summary": {
                "total_issues": report.total_issues,
                "error_count": report.error_count,
                "warning_count": report.warning_count,
                "info_count": report.info_count,
                "is_consistent": report.is_consistent
            },
            "issues_by_type": issues_by_type,
            "issues_by_severity": issues_by_severity,
            "filters": {
                "business_type": business_type,
                "project_id": project_id
            }
        }

    except Exception as e:
        logger.error(f"Error getting consistency statistics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Statistics retrieval failed: {str(e)}"
        )