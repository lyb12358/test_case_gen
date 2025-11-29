# -*- coding: utf-8 -*-
"""
Data consistency validation service for TSP two-stage test generation system.

This service provides comprehensive validation and consistency checking for:
- Two-stage generation integrity
- Test point-test case relationships
- Name consistency across entities
- Orphaned record detection
- Referential integrity validation
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from ..database.database import DatabaseManager
from ..database.operations import DatabaseOperations
from ..database.models import (
    UnifiedTestCase, Project, BusinessType,
    KnowledgeEntity, KnowledgeRelation, EntityType
)

logger = logging.getLogger(__name__)


class ConsistencyIssueType(Enum):
    """Types of consistency issues."""
    ORPHANED_TEST_POINT = "orphaned_test_point"
    ORPHANED_TEST_CASE = "orphaned_test_case"
    MISSING_RELATIONSHIP = "missing_relationship"
    NAME_CONFLICT = "name_conflict"
    INVALID_STATUS = "invalid_status"
    INVALID_BUSINESS_TYPE = "invalid_business_type"
    BROKEN_ASSOCOCIATION = "broken_association"
    DUPLICATE_TEST_POINT_ID = "duplicate_test_point_id"
    EMPTY_TEST_CASES = "empty_test_cases"


class SeverityLevel(Enum):
    """Severity levels for consistency issues."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ConsistencyIssue:
    """Represents a single consistency issue."""
    type: ConsistencyIssueType
    severity: SeverityLevel
    entity_type: str
    entity_id: Optional[int]
    description: str
    details: Dict[str, Any]
    suggested_fix: Optional[str] = None


@dataclass
class ConsistencyReport:
    """Complete consistency validation report."""
    is_consistent: bool
    total_issues: int
    error_count: int
    warning_count: int
    info_count: int
    issues: List[ConsistencyIssue]
    validation_timestamp: str
    statistics: Dict[str, Any]


class DataConsistencyValidator:
    """
    Comprehensive data consistency validation service.

    Validates data integrity across the TSP two-stage generation system
    and provides detailed reports on any inconsistencies found.
    """

    def __init__(self, db_manager: DatabaseManager):
        """
        Initialize the consistency validator.

        Args:
            db_manager (DatabaseManager): Database manager instance
        """
        self.db_manager = db_manager

    def validate_two_stage_generation_integrity(self, business_type: Optional[str] = None, project_id: Optional[int] = None) -> ConsistencyReport:
        """
        Validate the integrity of two-stage test generation.

        Args:
            business_type (Optional[str]): Filter by business type
            project_id (Optional[int]): Filter by project ID

        Returns:
            ConsistencyReport: Detailed validation report
        """
        issues = []

        try:
            with self.db_manager.get_session() as db:
                db_ops = DatabaseOperations(db)

                # 1. Validate TestPoint-UnifiedTestCase relationships
                relationship_issues = self._validate_test_point_test_case_relationships(db_ops, business_type, project_id)
                issues.extend(relationship_issues)

                # 2. Check for orphaned test points
                orphaned_test_point_issues = self._check_orphaned_test_points(db_ops, business_type, project_id)
                issues.extend(orphaned_test_point_issues)

                # 3. Check for orphaned test cases
                orphaned_test_case_issues = self._check_orphaned_test_cases(db_ops, business_type, project_id)
                issues.extend(orphaned_test_case_issues)

                # 4. Validate name consistency
                name_issues = self._validate_name_consistency(db_ops, business_type, project_id)
                issues.extend(name_issues)

                # 5. Validate status consistency
                status_issues = self._validate_status_consistency(db_ops, business_type, project_id)
                issues.extend(status_issues)

                # 6. Validate business type consistency
                business_type_issues = self._validate_business_type_consistency(db_ops, business_type, project_id)
                issues.extend(business_type_issues)

                # 7. Check for duplicate test point IDs
                duplicate_issues = self._check_duplicate_test_point_ids(db_ops, business_type, project_id)
                issues.extend(duplicate_issues)

                # 8. Validate empty test case groups
                empty_group_issues = self._check_empty_test_case_groups(db_ops, business_type, project_id)
                issues.extend(empty_group_issues)

        except Exception as e:
            logger.error(f"Error during consistency validation: {str(e)}")
            issues.append(ConsistencyIssue(
                type=ConsistencyIssueType.BROKEN_ASSOCOCIATION,
                severity=SeverityLevel.ERROR,
                entity_type="system",
                entity_id=None,
                description="Consistency validation failed",
                details={"error": str(e)},
                suggested_fix="Check database connectivity and retry validation"
            ))

        # Generate report
        error_count = len([issue for issue in issues if issue.severity == SeverityLevel.ERROR])
        warning_count = len([issue for issue in issues if issue.severity == SeverityLevel.WARNING])
        info_count = len([issue for issue in issues if issue.severity == SeverityLevel.INFO])

        from datetime import datetime

        report = ConsistencyReport(
            is_consistent=error_count == 0,
            total_issues=len(issues),
            error_count=error_count,
            warning_count=warning_count,
            info_count=info_count,
            issues=issues,
            validation_timestamp=datetime.now().isoformat(),
            statistics=self._generate_validation_statistics(db_ops, business_type, project_id) if issues else {}
        )

        return report

    def _validate_test_point_test_case_relationships(self, db_ops: DatabaseOperations, business_type: Optional[str], project_id: Optional[int]) -> List[ConsistencyIssue]:
        """Validate relationships between test points and test case items."""
        issues = []

        try:
            # Query test cases that have test_point_id but no corresponding test point
            orphaned_associations = db_ops.db.execute("""
                SELECT tci.id, tci.name, tci.test_point_id, tci.test_case_id
                FROM unified_test_cases tci
                LEFT JOIN test_points tp ON tci.test_point_id = tp.id
                WHERE tci.test_point_id IS NOT NULL AND tp.id IS NULL
            """).fetchall()

            for row in orphaned_associations:
                issues.append(ConsistencyIssue(
                    type=ConsistencyIssueType.BROKEN_ASSOCOCIATION,
                    severity=SeverityLevel.ERROR,
                    entity_type="UnifiedTestCase",
                    entity_id=row.id,
                    description=f"Test case '{row.name}' references non-existent test point",
                    details={
                        "test_case_id": row.test_case_id,
                        "missing_test_point_id": row.test_point_id
                    },
                    suggested_fix="Create corresponding test point or remove test_point_id reference"
                ))

        except Exception as e:
            logger.error(f"Error validating test point-test case relationships: {str(e)}")
            issues.append(ConsistencyIssue(
                type=ConsistencyIssueType.BROKEN_ASSOCOCIATION,
                severity=SeverityLevel.ERROR,
                entity_type="relationship",
                entity_id=None,
                description="Failed to validate test point-test case relationships",
                details={"error": str(e)}
            ))

        return issues

    def _check_orphaned_test_points(self, db_ops: DatabaseOperations, business_type: Optional[str], project_id: Optional[int]) -> List[ConsistencyIssue]:
        """Check for test points that are not properly linked to groups or projects."""
        issues = []

        try:
            # Build query conditions
            where_conditions = []
            params = {}

            if business_type:
                where_conditions.append("tp.business_type = :business_type")
                params["business_type"] = business_type.upper()

            if project_id:
                where_conditions.append("tp.project_id = :project_id")
                params["project_id"] = project_id

            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            orphaned_points = db_ops.db.execute(f"""
                SELECT tp.id, tp.test_point_id, tp.title, tp.project_id, tp.project_id
                FROM test_points tp
                LEFT JOIN projects p ON tp.project_id = p.id
                LEFT JOIN test_case_groups tcg ON tp.project_id = tcg.id
                {where_clause}
                AND (p.id IS NULL OR tcg.id IS NULL)
            """, params).fetchall()

            for row in orphaned_points:
                issues.append(ConsistencyIssue(
                    type=ConsistencyIssueType.ORPHANED_TEST_POINT,
                    severity=SeverityLevel.ERROR,
                    entity_type="TestPoint",
                    entity_id=row.id,
                    description=f"Test point '{row.test_point_id} - {row.title}' has broken project or group references",
                    details={
                        "test_point_id": row.test_point_id,
                        "project_id": row.project_id,
                        "project_id": row.project_id
                    },
                    suggested_fix="Restore missing project/group or update references"
                ))

        except Exception as e:
            logger.error(f"Error checking orphaned test points: {str(e)}")
            issues.append(ConsistencyIssue(
                type=ConsistencyIssueType.ORPHANED_TEST_POINT,
                severity=SeverityLevel.ERROR,
                entity_type="system",
                entity_id=None,
                description="Failed to check orphaned test points",
                details={"error": str(e)}
            ))

        return issues

    def _check_orphaned_test_cases(self, db_ops: DatabaseOperations, business_type: Optional[str], project_id: Optional[int]) -> List[ConsistencyIssue]:
        """Check for test case items that are not properly linked to groups."""
        issues = []

        try:
            # Build query conditions
            where_conditions = []
            params = {}

            if business_type:
                where_conditions.append("tcg.business_type = :business_type")
                params["business_type"] = business_type.upper()

            if project_id:
                where_conditions.append("tcg.project_id = :project_id")
                params["project_id"] = project_id

            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            orphaned_cases = db_ops.db.execute(f"""
                SELECT tci.id, tci.test_case_id, tci.name, tci.project_id
                FROM unified_test_cases tci
                LEFT JOIN test_case_groups tcg ON tci.project_id = tcg.id
                {where_clause}
                AND tcg.id IS NULL
            """, params).fetchall()

            for row in orphaned_cases:
                issues.append(ConsistencyIssue(
                    type=ConsistencyIssueType.ORPHANED_TEST_CASE,
                    severity=SeverityLevel.ERROR,
                    entity_type="UnifiedTestCase",
                    entity_id=row.id,
                    description=f"Test case '{row.test_case_id} - {row.name}' references non-existent test case group",
                    details={
                        "test_case_id": row.test_case_id,
                        "missing_project_id": row.project_id
                    },
                    suggested_fix="Restore missing test case group or update group reference"
                ))

        except Exception as e:
            logger.error(f"Error checking orphaned test cases: {str(e)}")
            issues.append(ConsistencyIssue(
                type=ConsistencyIssueType.ORPHANED_TEST_CASE,
                severity=SeverityLevel.ERROR,
                entity_type="system",
                entity_id=None,
                description="Failed to check orphaned test cases",
                details={"error": str(e)}
            ))

        return issues

    def _validate_name_consistency(self, db_ops: DatabaseOperations, business_type: Optional[str], project_id: Optional[int]) -> List[ConsistencyIssue]:
        """Validate name consistency across test points and test cases."""
        issues = []

        try:
            # Check for duplicate test point titles within the same business type/project
            where_conditions = []
            params = {}

            if business_type:
                where_conditions.append("tp.business_type = :business_type")
                params["business_type"] = business_type.upper()

            if project_id:
                where_conditions.append("tp.project_id = :project_id")
                params["project_id"] = project_id

            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            duplicate_titles = db_ops.db.execute(f"""
                SELECT tp.title, COUNT(*) as count, GROUP_CONCAT(tp.id) as ids
                FROM test_points tp
                {where_clause}
                GROUP BY tp.title
                HAVING COUNT(*) > 1
            """, params).fetchall()

            for row in duplicate_titles:
                issues.append(ConsistencyIssue(
                    type=ConsistencyIssueType.NAME_CONFLICT,
                    severity=SeverityLevel.WARNING,
                    entity_type="TestPoint",
                    entity_id=None,
                    description=f"Duplicate test point title found: '{row.title}'",
                    details={
                        "title": row.title,
                        "count": row.count,
                        "ids": row.ids.split(',')
                    },
                    suggested_fix="Rename test points to have unique titles"
                ))

        except Exception as e:
            logger.error(f"Error validating name consistency: {str(e)}")
            issues.append(ConsistencyIssue(
                type=ConsistencyIssueType.NAME_CONFLICT,
                severity=SeverityLevel.ERROR,
                entity_type="system",
                entity_id=None,
                description="Failed to validate name consistency",
                details={"error": str(e)}
            ))

        return issues

    def _validate_status_consistency(self, db_ops: DatabaseOperations, business_type: Optional[str], project_id: Optional[int]) -> List[ConsistencyIssue]:
        """Validate status consistency across test points and their relationships."""
        issues = []

        try:
            # Check for test points with completed status but no associated test cases
            where_conditions = []
            params = {}

            if business_type:
                where_conditions.append("tp.business_type = :business_type")
                params["business_type"] = business_type.upper()

            if project_id:
                where_conditions.append("tp.project_id = :project_id")
                params["project_id"] = project_id

            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            completed_without_cases = db_ops.db.execute(f"""
                SELECT tp.id, tp.test_point_id, tp.title, tp.status
                FROM test_points tp
                LEFT JOIN unified_test_cases tci ON tp.id = tci.test_point_id
                {where_clause}
                AND tp.status = 'completed'
                AND tci.id IS NULL
            """, params).fetchall()

            for row in completed_without_cases:
                issues.append(ConsistencyIssue(
                    type=ConsistencyIssueType.INVALID_STATUS,
                    severity=SeverityLevel.WARNING,
                    entity_type="TestPoint",
                    entity_id=row.id,
                    description=f"Test point '{row.test_point_id}' marked as completed but has no test cases",
                    details={
                        "test_point_id": row.test_point_id,
                        "title": row.title,
                        "status": row.status
                    },
                    suggested_fix="Change status to 'draft' or 'approved' or generate test cases"
                ))

        except Exception as e:
            logger.error(f"Error validating status consistency: {str(e)}")
            issues.append(ConsistencyIssue(
                type=ConsistencyIssueType.INVALID_STATUS,
                severity=SeverityLevel.ERROR,
                entity_type="system",
                entity_id=None,
                description="Failed to validate status consistency",
                details={"error": str(e)}
            ))

        return issues

    def _validate_business_type_consistency(self, db_ops: DatabaseOperations, business_type: Optional[str], project_id: Optional[int]) -> List[ConsistencyIssue]:
        """Validate business type consistency across related entities."""
        issues = []

        try:
            # Check for test case items with business types that don't match their test points
            where_conditions = []
            params = {}

            if business_type:
                where_conditions.append("tp.business_type = :business_type")
                params["business_type"] = business_type.upper()

            if project_id:
                where_conditions.append("tp.project_id = :project_id")
                params["project_id"] = project_id

            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            mismatched_business_types = db_ops.db.execute(f"""
                SELECT tci.id, tci.test_case_id, tci.name, tp.business_type as tp_business, tcg.business_type as tcg_business
                FROM unified_test_cases tci
                JOIN test_case_groups tcg ON tci.project_id = tcg.id
                LEFT JOIN test_points tp ON tci.test_point_id = tp.id
                {where_clause}
                AND tp.id IS NOT NULL
                AND tp.business_type != tcg.business_type
            """, params).fetchall()

            for row in mismatched_business_types:
                issues.append(ConsistencyIssue(
                    type=ConsistencyIssueType.INVALID_BUSINESS_TYPE,
                    severity=SeverityLevel.ERROR,
                    entity_type="UnifiedTestCase",
                    entity_id=row.id,
                    description=f"Test case '{row.test_case_id}' has business type mismatch with its test point",
                    details={
                        "test_case_id": row.test_case_id,
                        "test_point_business": row.tp_business,
                        "group_business": row.tcg_business
                    },
                    suggested_fix="Update business types to be consistent across test points and test cases"
                ))

        except Exception as e:
            logger.error(f"Error validating business type consistency: {str(e)}")
            issues.append(ConsistencyIssue(
                type=ConsistencyIssueType.INVALID_BUSINESS_TYPE,
                severity=SeverityLevel.ERROR,
                entity_type="system",
                entity_id=None,
                description="Failed to validate business type consistency",
                details={"error": str(e)}
            ))

        return issues

    def _check_duplicate_test_point_ids(self, db_ops: DatabaseOperations, business_type: Optional[str], project_id: Optional[int]) -> List[ConsistencyIssue]:
        """Check for duplicate test point IDs."""
        issues = []

        try:
            where_conditions = []
            params = {}

            if business_type:
                where_conditions.append("business_type = :business_type")
                params["business_type"] = business_type.upper()

            if project_id:
                where_conditions.append("project_id = :project_id")
                params["project_id"] = project_id

            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            duplicates = db_ops.db.execute(f"""
                SELECT test_point_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
                FROM test_points
                {where_clause}
                GROUP BY test_point_id
                HAVING COUNT(*) > 1
            """, params).fetchall()

            for row in duplicates:
                issues.append(ConsistencyIssue(
                    type=ConsistencyIssueType.DUPLICATE_TEST_POINT_ID,
                    severity=SeverityLevel.ERROR,
                    entity_type="TestPoint",
                    entity_id=None,
                    description=f"Duplicate test point ID found: '{row.test_point_id}'",
                    details={
                        "test_point_id": row.test_point_id,
                        "count": row.count,
                        "ids": row.ids.split(',')
                    },
                    suggested_fix="Generate unique test point IDs"
                ))

        except Exception as e:
            logger.error(f"Error checking duplicate test point IDs: {str(e)}")
            issues.append(ConsistencyIssue(
                type=ConsistencyIssueType.DUPLICATE_TEST_POINT_ID,
                severity=SeverityLevel.ERROR,
                entity_type="system",
                entity_id=None,
                description="Failed to check duplicate test point IDs",
                details={"error": str(e)}
            ))

        return issues

    def _check_empty_test_case_groups(self, db_ops: DatabaseOperations, business_type: Optional[str], project_id: Optional[int]) -> List[ConsistencyIssue]:
        """Check for test case groups that have no test cases."""
        issues = []

        try:
            where_conditions = []
            params = {}

            if business_type:
                where_conditions.append("business_type = :business_type")
                params["business_type"] = business_type.upper()

            if project_id:
                where_conditions.append("project_id = :project_id")
                params["project_id"] = project_id

            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            empty_groups = db_ops.db.execute(f"""
                SELECT tcg.id, tcg.business_type, tcg.created_at
                FROM test_case_groups tcg
                LEFT JOIN unified_test_cases tci ON tcg.id = tci.project_id
                {where_clause}
                GROUP BY tcg.id
                HAVING COUNT(tci.id) = 0
            """, params).fetchall()

            for row in empty_groups:
                issues.append(ConsistencyIssue(
                    type=ConsistencyIssueType.EMPTY_TEST_CASES,
                    severity=SeverityLevel.WARNING,
                    entity_type="Project",
                    entity_id=row.id,
                    description=f"Test case group has no test cases",
                    details={
                        "project_id": row.id,
                        "business_type": row.business_type,
                        "created_at": str(row.created_at)
                    },
                    suggested_fix="Generate test cases for this group or delete if not needed"
                ))

        except Exception as e:
            logger.error(f"Error checking empty test case groups: {str(e)}")
            issues.append(ConsistencyIssue(
                type=ConsistencyIssueType.EMPTY_TEST_CASES,
                severity=SeverityLevel.ERROR,
                entity_type="system",
                entity_id=None,
                description="Failed to check empty test case groups",
                details={"error": str(e)}
            ))

        return issues

    def _generate_validation_statistics(self, db_ops: DatabaseOperations, business_type: Optional[str], project_id: Optional[int]) -> Dict[str, Any]:
        """Generate statistics for the validation report."""
        try:
            where_conditions = []
            params = {}

            if business_type:
                where_conditions.append("business_type = :business_type")
                params["business_type"] = business_type.upper()

            if project_id:
                where_conditions.append("project_id = :project_id")
                params["project_id"] = project_id

            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            # Get counts
            test_point_count = db_ops.db.execute(f"SELECT COUNT(*) FROM test_points{where_clause}", params).scalar() or 0
            test_case_count = db_ops.db.execute(f"SELECT COUNT(*) FROM unified_test_cases tci JOIN test_case_groups tcg ON tci.project_id = tcg.id{where_clause}", params).scalar() or 0
            group_count = db_ops.db.execute(f"SELECT COUNT(*) FROM test_case_groups{where_clause}", params).scalar() or 0

            return {
                "test_points_count": test_point_count,
                "test_cases_count": test_case_count,
                "groups_count": group_count,
                "business_type": business_type,
                "project_id": project_id
            }

        except Exception as e:
            logger.error(f"Error generating validation statistics: {str(e)}")
            return {"error": str(e)}

    def fix_consistency_issues(self, issues: List[ConsistencyIssue], auto_fix: bool = False) -> Dict[str, Any]:
        """
        Attempt to fix consistency issues.

        Args:
            issues (List[ConsistencyIssue]): List of issues to fix
            auto_fix (bool): Whether to automatically fix issues or just report

        Returns:
            Dict[str, Any]: Fix results summary
        """
        results = {
            "fixed_count": 0,
            "failed_count": 0,
            "skipped_count": 0,
            "fix_details": []
        }

        if not auto_fix:
            logger.info("Auto-fix disabled, returning issue analysis only")
            return {
                **results,
                "issues_analysis": self._analyze_fixability(issues)
            }

        try:
            with self.db_manager.get_session() as db:
                db_ops = DatabaseOperations(db)

                for issue in issues:
                    try:
                        if issue.severity == SeverityLevel.ERROR and self._can_auto_fix(issue.type):
                            fix_result = self._auto_fix_issue(db_ops, issue)
                            if fix_result["success"]:
                                results["fixed_count"] += 1
                                results["fix_details"].append(f"Fixed: {issue.description}")
                            else:
                                results["failed_count"] += 1
                                results["fix_details"].append(f"Failed to fix: {issue.description} - {fix_result['error']}")
                        else:
                            results["skipped_count"] += 1
                            results["fix_details"].append(f"Skipped: {issue.description} (not auto-fixable)")
                    except Exception as e:
                        logger.error(f"Error fixing issue {issue.entity_id}: {str(e)}")
                        results["failed_count"] += 1
                        results["fix_details"].append(f"Error fixing: {issue.description} - {str(e)}")

                # Commit all fixes
                db.commit()

        except Exception as e:
            logger.error(f"Error during consistency issue fixing: {str(e)}")
            results["error"] = str(e)

        return results

    def _can_auto_fix(self, issue_type: ConsistencyIssueType) -> bool:
        """Check if an issue type can be automatically fixed."""
        auto_fixable_types = {
            ConsistencyIssueType.INVALID_STATUS,
            ConsistencyIssueType.NAME_CONFLICT
        }
        return issue_type in auto_fixable_types

    def _auto_fix_issue(self, db_ops: DatabaseOperations, issue: ConsistencyIssue) -> Dict[str, Any]:
        """Automatically fix a specific consistency issue."""
        try:
            if issue.type == ConsistencyIssueType.INVALID_STATUS and issue.entity_type == "TestPoint":
                # Change completed status without test cases to approved
                if "completed" in issue.details.get("status", ""):
                    test_point = db_ops.db.query(TestPoint).filter(TestPoint.id == issue.entity_id).first()
                    if test_point:
                        test_point.status = TestPointStatus.APPROVED
                        return {"success": True, "message": "Status changed from completed to approved"}

            # Add more auto-fix logic for other issue types as needed

            return {"success": False, "error": "No auto-fix available for this issue type"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _analyze_fixability(self, issues: List[ConsistencyIssue]) -> Dict[str, Any]:
        """Analyze which issues can be automatically fixed."""
        analysis = {
            "auto_fixable": [],
            "manual_fix_required": [],
            "total_issues": len(issues)
        }

        for issue in issues:
            if self._can_auto_fix(issue.type):
                analysis["auto_fixable"].append({
                    "type": issue.type.value,
                    "description": issue.description,
                    "severity": issue.severity.value
                })
            else:
                analysis["manual_fix_required"].append({
                    "type": issue.type.value,
                    "description": issue.description,
                    "severity": issue.severity.value,
                    "suggested_fix": issue.suggested_fix
                })

        return analysis