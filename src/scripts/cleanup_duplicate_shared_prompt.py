#!/usr/bin/env python3
"""
清理重复的共享提示词脚本
移除重复插入的id=88提示词，确保每个组合只有一个共享提示词
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from src.database.database import DatabaseManager
from src.utils.config import Config

def cleanup_duplicate_prompts():
    """清理重复的共享提示词"""
    logger.info("开始清理重复的共享提示词")

    try:
        # 获取数据库连接
        config = Config()
        db_manager = DatabaseManager(config)

        with db_manager.get_session() as db:
            # 查询所有包含id=88的组合
            query = text("""
                SELECT combination_id, COUNT(*) as duplicate_count
                FROM prompt_combination_items
                WHERE prompt_id = 88
                GROUP BY combination_id
                HAVING COUNT(*) > 1
            """)

            result = db.execute(query)
            duplicates = result.fetchall()

            if not duplicates:
                logger.info("未发现重复的共享提示词")
                return True

            logger.info(f"发现 {len(duplicates)} 个组合包含重复的共享提示词")

            total_cleaned = 0
            for row in duplicates:
                combination_id = row.combination_id
                duplicate_count = row.duplicate_count

                logger.info(f"清理组合 {combination_id} 的 {duplicate_count} 个重复项")

                # 保留第一个id=88，删除其他的 - 使用子查询避免MySQL限制
                delete_query = text("""
                    DELETE FROM prompt_combination_items
                    WHERE combination_id = :combo_id AND prompt_id = 88
                    AND id > (
                        SELECT MIN(id)
                        FROM (SELECT id FROM prompt_combination_items WHERE combination_id = :combo_id AND prompt_id = 88) AS temp
                    )
                """)

                delete_result = db.execute(delete_query, {"combo_id": combination_id})
                cleaned_count = delete_result.rowcount
                total_cleaned += cleaned_count

                logger.info(f"组合 {combination_id} 清理了 {cleaned_count} 个重复项")

                # 重新排序该组合的所有提示词
                reorder_query = text("""
                    SELECT id FROM prompt_combination_items
                    WHERE combination_id = :combo_id
                    ORDER BY `order`
                """)

                reorder_result = db.execute(reorder_query, {"combo_id": combination_id})
                items = reorder_result.fetchall()

                for new_order, item in enumerate(items):
                    update_order_query = text("""
                        UPDATE prompt_combination_items
                        SET `order` = :new_order
                        WHERE id = :item_id
                    """)
                    db.execute(update_order_query, {
                        "new_order": new_order,
                        "item_id": item.id
                    })

                logger.info(f"组合 {combination_id} 已重新排序")

            db.commit()

            logger.info("=" * 50)
            logger.info("清理完成!")
            logger.info(f"总共清理了 {total_cleaned} 个重复的共享提示词")
            logger.info("=" * 50)

            return True

    except Exception as e:
        logger.error(f"清理失败: {e}")
        return False

if __name__ == "__main__":
    success = cleanup_duplicate_prompts()
    sys.exit(0 if success else 1)