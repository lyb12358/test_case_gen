# -*- coding: utf-8 -*-
"""
Smart name synchronization service for test points and test cases.
"""

from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy import text
from ..database.database import DatabaseManager
from ..database.models import BusinessType, TestPointStatus
import logging

logger = logging.getLogger(__name__)


class NameSyncService:
    """
    Service for synchronizing names between test points and test cases.
    Handles smart name updates with conflict resolution.
    """

    def __init__(self, db_manager: DatabaseManager):
        """
        Initialize the name sync service.

        Args:
            db_manager (DatabaseManager): Database manager instance
        """
        self.db_manager = db_manager

    def sync_test_point_name_to_test_cases(
        self,
        test_point_id: int,
        new_test_point_name: str,
        sync_options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Synchronize test point name changes to associated test cases.

        Args:
            test_point_id (int): Test point ID that was updated
            new_test_point_name (str): New test point name
            sync_options (Optional[Dict[str, Any]]): Synchronization options
                - auto_sync: bool = True (automatically update test case names)
                - resolve_conflicts: str = "prompt" (how to handle conflicts: "prompt", "skip", "overwrite")
                - include_original: bool = True (keep original name in parentheses)

        Returns:
            Dict[str, Any]: Synchronization result with details
        """
        if sync_options is None:
            sync_options = {
                'auto_sync': True,
                'resolve_conflicts': 'prompt',
                'include_original': True
            }

        result = {
            'success': True,
            'updated_test_cases': [],
            'conflicts': [],
            'skipped': [],
            'errors': []
        }

        try:
            with self.db_manager.get_session() as db:
                # Get test point information
                tp_query = text("""
                    SELECT tp.title as old_title, tcg.business_type
                    FROM test_points tp
                    JOIN projects tcg ON tp.project_id = tcg.id
                    WHERE tp.id = :test_point_id
                """)

                tp_result = db.execute(tp_query, {'test_point_id': test_point_id}).fetchone()
                if not tp_result:
                    return {
                        'success': False,
                        'error': f"Test point with ID {test_point_id} not found"
                    }

                old_test_point_name = tp_result.old_title
                business_type = tp_result.business_type

                # Get associated test cases
                tc_query = text("""
                    SELECT id, name, test_case_id
                    FROM test_case_items
                    WHERE test_point_id = :test_point_id
                    ORDER BY id
                """)

                test_cases = db.execute(tc_query, {'test_point_id': test_point_id}).fetchall()

                if not test_cases:
                    result['message'] = "No associated test cases found"
                    return result

                # Check for potential conflicts
                conflicts = self._check_name_conflicts(db, business_type, new_test_point_name, test_cases)
                if conflicts and sync_options['resolve_conflicts'] == 'skip':
                    result['conflicts'] = conflicts
                    result['message'] = "Name conflicts detected, sync skipped"
                    return result

                # Process each test case
                for tc in test_cases:
                    try:
                        new_tc_name = self._generate_new_test_case_name(
                            old_test_point_name,
                            new_test_point_name,
                            tc.name,
                            sync_options
                        )

                        # Check if the new name would conflict
                        conflict_check = self._check_single_name_conflict(
                            db, business_type, new_tc_name, tc.id
                        )

                        if conflict_check:
                            if sync_options['resolve_conflicts'] == 'skip':
                                result['conflicts'].append({
                                    'test_case_id': tc.test_case_id,
                                    'current_name': tc.name,
                                    'proposed_name': new_tc_name,
                                    'conflict_with': conflict_check
                                })
                                result['skipped'].append(tc.test_case_id)
                                continue
                            elif sync_options['resolve_conflicts'] == 'prompt':
                                # Generate a unique name by adding suffix
                                new_tc_name = self._resolve_conflict_with_suffix(
                                    db, business_type, new_tc_name
                                )

                        # Update test case name
                        if sync_options['auto_sync']:
                            update_query = text("""
                                UPDATE test_case_items
                                SET name = :new_name, updated_at = NOW()
                                WHERE id = :test_case_id
                            """)

                            db.execute(update_query, {
                                'new_name': new_tc_name,
                                'test_case_id': tc.id
                            })

                            result['updated_test_cases'].append({
                                'test_case_id': tc.test_case_id,
                                'old_name': tc.name,
                                'new_name': new_tc_name
                            })
                        else:
                            result['updated_test_cases'].append({
                                'test_case_id': tc.test_case_id,
                                'old_name': tc.name,
                                'proposed_name': new_tc_name,
                                'requires_manual_update': True
                            })

                    except Exception as e:
                        logger.error(f"Error processing test case {tc.test_case_id}: {str(e)}")
                        result['errors'].append({
                            'test_case_id': tc.test_case_id,
                            'error': str(e)
                        })

                db.commit()

        except Exception as e:
            logger.error(f"Error in name synchronization: {str(e)}")
            result = {
                'success': False,
                'error': str(e)
            }

        return result

    def _generate_new_test_case_name(
        self,
        old_test_point_name: str,
        new_test_point_name: str,
        current_test_case_name: str,
        sync_options: Dict[str, Any]
    ) -> str:
        """
        Generate new test case name based on test point name change.

        Args:
            old_test_point_name (str): Old test point name
            new_test_point_name (str): New test point name
            current_test_case_name (str): Current test case name
            sync_options (Dict[str, Any]): Synchronization options

        Returns:
            str: New test case name
        """
        # If test case name starts with old test point name, replace it
        if current_test_case_name.startswith(old_test_point_name):
            new_name = current_test_case_name.replace(old_test_point_name, new_test_point_name, 1)
        # If test case name contains old test point name, replace first occurrence
        elif old_test_point_name in current_test_case_name:
            new_name = current_test_case_name.replace(old_test_point_name, new_test_point_name, 1)
        else:
            # If no direct match, use new test point name as prefix
            if sync_options.get('include_original', True):
                new_name = f"{new_test_point_name} - {current_test_case_name}"
            else:
                new_name = new_test_point_name

        return new_name

    def _check_name_conflicts(
        self,
        db,
        business_type: str,
        new_test_point_name: str,
        test_cases: List
    ) -> List[Dict[str, Any]]:
        """
        Check for potential name conflicts when updating test case names.

        Args:
            db: Database session
            business_type (str): Business type
            new_test_point_name (str): New test point name
            test_cases (List): List of test cases to check

        Returns:
            List[Dict[str, Any]]: List of potential conflicts
        """
        conflicts = []

        for tc in test_cases:
            # Generate potential new name
            if tc.name.startswith(tc.name.split(' - ')[0] if ' - ' in tc.name else tc.name):
                proposed_name = tc.name.replace(tc.name.split(' - ')[0], new_test_point_name, 1)
            else:
                proposed_name = f"{new_test_point_name} - {tc.name}"

            # Check if this name already exists
            conflict_query = text("""
                SELECT id, name, test_case_id
                FROM test_case_items tci
                JOIN projects tcg ON tci.project_id = tcg.id
                WHERE tcg.business_type = :business_type
                AND tci.name = :proposed_name
                AND tci.id != :exclude_id
            """)

            conflict_result = db.execute(conflict_query, {
                'business_type': business_type,
                'proposed_name': proposed_name,
                'exclude_id': tc.id
            }).fetchone()

            if conflict_result:
                conflicts.append({
                    'test_case_id': tc.test_case_id,
                    'current_name': tc.name,
                    'proposed_name': proposed_name,
                    'conflicts_with': {
                        'test_case_id': conflict_result.test_case_id,
                        'name': conflict_result.name
                    }
                })

        return conflicts

    def _check_single_name_conflict(
        self,
        db,
        business_type: str,
        new_name: str,
        exclude_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Check if a single name conflicts with existing test cases.

        Args:
            db: Database session
            business_type (str): Business type
            new_name (str): New name to check
            exclude_id (int): ID to exclude from check

        Returns:
            Optional[Dict[str, Any]]: Conflict information or None
        """
        conflict_query = text("""
            SELECT id, name, test_case_id
            FROM test_case_items tci
            JOIN projects tcg ON tci.project_id = tcg.id
            WHERE tcg.business_type = :business_type
            AND tci.name = :new_name
            AND tci.id != :exclude_id
        """)

        result = db.execute(conflict_query, {
            'business_type': business_type,
            'new_name': new_name,
            'exclude_id': exclude_id
        }).fetchone()

        if result:
            return {
                'test_case_id': result.test_case_id,
                'name': result.name,
                'id': result.id
            }

        return None

    def _resolve_conflict_with_suffix(
        self,
        db,
        business_type: str,
        base_name: str
    ) -> str:
        """
        Resolve naming conflict by adding numeric suffix.

        Args:
            db: Database session
            business_type (str): Business type
            base_name (str): Base name that conflicts

        Returns:
            str: Unique name with suffix
        """
        suffix = 1
        while True:
            candidate_name = f"{base_name} ({suffix})"

            conflict_query = text("""
                SELECT COUNT(*) as count
                FROM test_case_items tci
                JOIN projects tcg ON tci.project_id = tcg.id
                WHERE tcg.business_type = :business_type
                AND tci.name = :candidate_name
            """)

            result = db.execute(conflict_query, {
                'business_type': business_type,
                'candidate_name': candidate_name
            }).fetchone()

            if result.count == 0:
                return candidate_name

            suffix += 1

    def sync_batch_test_point_names(
        self,
        updates: List[Dict[str, Any]],
        sync_options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Synchronize multiple test point name changes in batch.

        Args:
            updates (List[Dict[str, Any]]): List of test point updates
                Each item should contain: test_point_id, new_name, old_name
            sync_options (Optional[Dict[str, Any]]): Synchronization options

        Returns:
            Dict[str, Any]: Batch synchronization result
        """
        batch_result = {
            'success': True,
            'processed': 0,
            'failed': 0,
            'results': [],
            'total_test_cases_updated': 0,
            'errors': []
        }

        for update in updates:
            try:
                result = self.sync_test_point_name_to_test_cases(
                    update['test_point_id'],
                    update['new_name'],
                    sync_options
                )

                batch_result['results'].append({
                    'test_point_id': update['test_point_id'],
                    'old_name': update.get('old_name'),
                    'new_name': update['new_name'],
                    'result': result
                })

                if result['success']:
                    batch_result['processed'] += 1
                    batch_result['total_test_cases_updated'] += len(result.get('updated_test_cases', []))
                else:
                    batch_result['failed'] += 1
                    batch_result['errors'].append({
                        'test_point_id': update['test_point_id'],
                        'error': result.get('error', 'Unknown error')
                    })

            except Exception as e:
                logger.error(f"Error processing batch update for test point {update.get('test_point_id')}: {str(e)}")
                batch_result['failed'] += 1
                batch_result['errors'].append({
                    'test_point_id': update.get('test_point_id'),
                    'error': str(e)
                })

        return batch_result