"""
同步事务管理器
负责管理测试点与测试用例名称同步的事务操作，确保并发安全和数据一致性
"""

import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from ..database.models import UnifiedTestCase

# Configure logging
logger = logging.getLogger(__name__)


class SyncTransactionManager:
    """同步事务管理器，处理测试点与测试用例的名称同步"""

    def __init__(self, db: Session):
        self.db = db
        self._sync_session_id = None

    def _get_sync_session_id(self) -> str:
        """获取当前会话的同步标识"""
        if not self._sync_session_id:
            import uuid
            self._sync_session_id = f"sync_{uuid.uuid4().hex[:8]}_{int(datetime.now().timestamp())}"
        return self._sync_session_id

    def _set_sync_marker(self, entity_id: int, entity_type: str) -> bool:
        """设置同步标记，防止循环同步"""
        try:
            sync_key = f"sync_marker_{entity_type}_{entity_id}"
            session_id = self._get_sync_session_id()

            # 使用数据库session变量存储同步标记
            self.db.execute(text(f"SET @sync_marker = :session_id"), {"session_id": session_id})
            return True
        except Exception as e:
            logger.error(f"Failed to set sync marker for {entity_type} {entity_id}: {str(e)}")
            return False

    def _is_sync_in_progress(self, entity_id: int, entity_type: str) -> bool:
        """检查是否正在进行同步"""
        try:
            sync_key = f"sync_marker_{entity_type}_{entity_id}"
            result = self.db.execute(text("SELECT @sync_marker as session_id")).fetchone()
            session_id = result[0] if result else None

            # 如果没有session_id或者不是当前session，说明没有在同步
            return session_id == self._get_sync_session_id()
        except Exception as e:
            logger.error(f"Failed to check sync status for {entity_type} {entity_id}: {str(e)}")
            return False

    def sync_names_within_transaction(self, source_type: str, source_id: int, new_name: str) -> bool:
        """
        在同一事务中执行名称同步

        Args:
            source_type: 'test_point' 或 'test_case'
            source_id: 源实体ID
            new_name: 新的名称

        Returns:
            bool: 同步是否成功
        """
        try:
            # 检查是否已在同步中
            if self._is_sync_in_progress(source_id, source_type):
                logger.debug(f"Sync already in progress for {source_type} {source_id}, skipping")
                return True

            # 设置同步标记
            if not self._set_sync_marker(source_id, source_type):
                logger.error(f"Failed to set sync marker for {source_type} {source_id}")
                return False

            if source_type == 'test_point':
                return self._sync_from_test_point(source_id, new_name)
            elif source_type == 'test_case':
                return self._sync_from_test_case(source_id, new_name)
            else:
                logger.error(f"Unknown source type: {source_type}")
                return False

        except Exception as e:
            error_str = str(e).lower()

            # 区分不同类型的错误
            if "integrity" in error_str or "duplicate" in error_str:
                logger.warning(f"Database integrity error during sync for {source_type} {source_id}: {str(e)}")
            elif "timeout" in error_str or "connection" in error_str:
                logger.warning(f"Database timeout or connection error during sync for {source_type} {source_id}: {str(e)}")
            elif "foreign key" in error_str or "constraint" in error_str:
                logger.warning(f"Database constraint violation during sync for {source_type} {source_id}: {str(e)}")
            else:
                logger.error(f"Unexpected error during sync for {source_type} {source_id}: {str(e)}", exc_info=True)

            # 不回滚，让上层处理事务
            return False

    def _sync_from_test_point(self, test_point_id: int, new_title: str) -> bool:
        """从测试点同步到测试用例"""
        try:
            # 查找测试点 (现在使用UnifiedTestCase表中的stage='test_point')
            test_point = self.db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id == test_point_id,
                UnifiedTestCase.stage == 'test_point'
            ).first()
            if not test_point:
                logger.error(f"Test point not found: {test_point_id}")
                return False

            # 查找关联的测试用例
            test_case = self.db.query(UnifiedTestCase).filter(
                UnifiedTestCase.test_point_id == test_point_id,
                UnifiedTestCase.stage == 'test_case'
            ).first()

            if test_case:
                if test_case.name != new_title:
                    old_name = test_case.name
                    test_case.name = new_title
                    test_case.updated_at = datetime.now()
                    logger.info(f"Synced test case name: '{old_name}' -> '{new_title}' (test_case_id: {test_case.id})")
                    return True
                else:
                    logger.debug(f"Test case name already matches: '{new_title}', no sync needed")
                    return True
            else:
                logger.debug(f"No test case found for test_point_id: {test_point_id}")
                return True

        except Exception as e:
            logger.error(f"Error syncing from test point {test_point_id}: {str(e)}")
            return False

    def _sync_from_test_case(self, test_case_id: int, new_name: str) -> bool:
        """从测试用例同步到测试点"""
        try:
            # 查找测试用例
            test_case = self.db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id == test_case_id,
                UnifiedTestCase.stage == 'test_case'
            ).first()

            if not test_case:
                logger.error(f"Test case not found: {test_case_id}")
                return False

            if not test_case.test_point_id:
                logger.debug(f"Test case {test_case_id} has no associated test point, skipping sync")
                return True

            # 查找关联的测试点 (现在使用UnifiedTestCase表中的stage='test_point')
            test_point = self.db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id == test_case.test_point_id,
                UnifiedTestCase.stage == 'test_point'
            ).first()

            if test_point:
                if test_point.name != new_name:
                    old_name = test_point.name
                    test_point.name = new_name
                    test_point.updated_at = datetime.now()
                    logger.info(f"Synced test point name: '{old_name}' -> '{new_name}' (test_point_id: {test_point.id})")
                    return True
                else:
                    logger.debug(f"Test point name already matches: '{new_name}', no sync needed")
                    return True
            else:
                logger.error(f"Test point not found for test_point_id: {test_case.test_point_id}")
                return False

        except Exception as e:
            logger.error(f"Error syncing from test case {test_case_id}: {str(e)}")
            return False

    def validate_business_uniqueness(self, business_type: str, name: str,
                                    entity_type: str, exclude_id: Optional[int] = None) -> bool:
        """
        验证业务类型下名称的唯一性

        Args:
            business_type: 业务类型
            name: 名称
            entity_type: 'test_point' 或 'test_case'
            exclude_id: 排除的实体ID（用于更新时排除自己）

        Returns:
            bool: 是否唯一
        """
        try:
            if entity_type == 'test_point':
                # 使用UnifiedTestCase表查找测试点 (stage='test_point')
                query = self.db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.business_type == business_type,
                    UnifiedTestCase.name == name,
                    UnifiedTestCase.stage == 'test_point'
                )
                if exclude_id:
                    query = query.filter(UnifiedTestCase.id != exclude_id)

                existing = query.first()
                if existing:
                    logger.warning(f"Test point name '{name}' already exists in business type '{business_type}' (ID: {existing.id})")
                    return False

            elif entity_type == 'test_case':
                query = self.db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.business_type == business_type,
                    UnifiedTestCase.name == name,
                    UnifiedTestCase.stage == 'test_case'
                )
                if exclude_id:
                    query = query.filter(UnifiedTestCase.id != exclude_id)

                existing = query.first()
                if existing:
                    logger.warning(f"Test case name '{name}' already exists in business type '{business_type}' (ID: {existing.id})")
                    return False

            else:
                logger.error(f"Unknown entity type: {entity_type}")
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating business uniqueness for {entity_type}: {str(e)}")
            return False

    def get_sync_status(self, test_point_id: int) -> Dict[str, Any]:
        """
        获取指定测试点的同步状态

        Args:
            test_point_id: 测试点ID

        Returns:
            dict: 同步状态信息
        """
        try:
            # 使用UnifiedTestCase表查找测试点 (stage='test_point')
            test_point = self.db.query(UnifiedTestCase).filter(
                UnifiedTestCase.id == test_point_id,
                UnifiedTestCase.stage == 'test_point'
            ).first()

            if not test_point:
                return {"error": "Test point not found"}

            # 查找关联的测试用例 (stage='test_case')
            test_case = self.db.query(UnifiedTestCase).filter(
                UnifiedTestCase.test_point_id == test_point_id,
                UnifiedTestCase.stage == 'test_case'
            ).first()

            if not test_case:
                return {
                    "test_point_name": test_point.name,
                    "test_case_name": None,
                    "synced": True,  # 没有关联测试用例，视为已同步
                    "message": "No associated test case"
                }

            is_synced = test_point.name == test_case.name
            business_type_match = test_point.business_type == test_case.business_type

            return {
                "test_point_name": test_point.name,
                "test_case_name": test_case.name,
                "business_type": test_point.business_type,
                "synced": is_synced and business_type_match,
                "message": "Names are synced" if is_synced and business_type_match else
                          "Names are out of sync" if not is_synced else "Business types mismatch"
            }

        except Exception as e:
            logger.error(f"Error getting sync status for test_point_id {test_point_id}: {str(e)}")
            return {"error": str(e)}