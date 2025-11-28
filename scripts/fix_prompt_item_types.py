#!/usr/bin/env python3
"""
修复提示词组合项类型映射脚本
将系统提示词类型的提示词在组合项中正确标记为'system_prompt'
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from src.database.models import PromptCombinationItem, Prompt, PromptType, PromptCombination
def fix_prompt_item_types():
    """修复提示词组合项的item_type字段"""

    print("开始修复提示词组合项类型映射...")

    # 构建数据库URL
    DATABASE_URL = "mysql+pymysql://tsp:2222@127.0.0.1:3306/testcase_gen"

    # 创建数据库连接
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 查询所有需要修复的组合项
        # 关联查询提示词，找出系统提示词但被错误标记为user_prompt的项
        query = text("""
            SELECT pci.id, pci.prompt_id, p.type as prompt_type, p.name as prompt_name
            FROM prompt_combination_items pci
            JOIN prompts p ON pci.prompt_id = p.id
            WHERE p.type = 'system' AND pci.item_type = 'user_prompt'
        """)

        items_to_fix = session.execute(query).fetchall()

        print(f"找到 {len(items_to_fix)} 个需要修复的提示词组合项")

        if not items_to_fix:
            print("没有需要修复的项目，所有提示词类型映射都是正确的。")
            return

        # 显示将要修复的项目
        print("\n将要修复的提示词组合项:")
        for item in items_to_fix:
            print(f"  - ID: {item.id}, Prompt ID: {item.prompt_id}, "
                  f"Prompt Name: {item.prompt_name}, Type: {item.prompt_type}")

        # 执行修复 - 使用临时表避免MySQL限制
        create_temp_query = text("""
            CREATE TEMPORARY TABLE temp_items_to_fix AS
            SELECT pci.id
            FROM prompt_combination_items pci
            JOIN prompts p ON pci.prompt_id = p.id
            WHERE p.type = 'system' AND pci.item_type = 'user_prompt'
        """)

        session.execute(create_temp_query)

        update_query = text("""
            UPDATE prompt_combination_items
            SET item_type = 'system_prompt'
            WHERE id IN (SELECT id FROM temp_items_to_fix)
        """)

        drop_temp_query = text("DROP TEMPORARY TABLE temp_items_to_fix")

        result = session.execute(update_query)
        session.execute(drop_temp_query)  # 清理临时表
        session.commit()

        print(f"\n已修复 {result.rowcount} 个提示词组合项")

        # 重新验证所有提示词组合
        print("\n开始重新验证提示词组合...")

        # 查询所有组合及其项，验证是否包含系统提示词
        validation_query = text("""
            SELECT
                pc.id,
                pc.name,
                COUNT(CASE WHEN pci.item_type = 'system_prompt' THEN 1 END) as system_prompt_count,
                COUNT(CASE WHEN pci.item_type = 'user_prompt' THEN 1 END) as user_prompt_count,
                COUNT(*) as total_items
            FROM prompt_combinations pc
            LEFT JOIN prompt_combination_items pci ON pc.id = pci.combination_id
            GROUP BY pc.id, pc.name
        """)

        combinations = session.execute(validation_query).fetchall()

        updated_combinations = 0

        for combo in combinations:
            # 简单验证逻辑：如果包含系统提示词，则标记为有效
            is_valid = combo.system_prompt_count > 0 and combo.total_items > 0

            if is_valid:
                # 更新组合状态为有效
                update_validation = text("""
                    UPDATE prompt_combinations
                    SET is_valid = 1, validation_errors = NULL
                    WHERE id = :combo_id
                """)
                session.execute(update_validation, {"combo_id": combo.id})
                updated_combinations += 1
                print(f"  - 组合 '{combo.name}' (ID: {combo.id}) 已标记为有效")

        session.commit()
        print(f"\n已重新验证并更新 {updated_combinations} 个提示词组合的状态")

        print("\n修复完成！")

    except Exception as e:
        print(f"修复过程中发生错误: {e}")
        session.rollback()
        raise

    finally:
        session.close()

if __name__ == "__main__":
    fix_prompt_item_types()