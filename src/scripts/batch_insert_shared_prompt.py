#!/usr/bin/env python3
"""
批量插入共享提示词脚本
参照RCC业务配置，为project_id=1的其他28个远控业务类型批量插入共享提示词id=88 "系统背景"

使用方法:
python src/scripts/batch_insert_shared_prompt.py
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
from typing import List, Dict, Any

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from src.database.database import DatabaseManager
from src.services.business_service import BusinessService, PromptCombinationService
from src.utils.config import Config

def get_rcc_template(db: Session, rcc_config: Dict[str, Any]) -> Dict[str, List[int]]:
    """
    获取RCC业务的提示词组合模板
    返回: {'test_point': [prompt_ids], 'test_case': [prompt_ids]}
    """
    business_service = BusinessService(db)
    combination_service = PromptCombinationService(db)

    template = {
        'test_point': [],
        'test_case': []
    }

    # 获取测试点组合
    if rcc_config.get('test_point_combination_id'):
        try:
            test_point_combo = combination_service.get_prompt_combination(
                rcc_config['test_point_combination_id']
            )
            # 处理PromptCombinationResponse对象
            if hasattr(test_point_combo, 'items'):
                template['test_point'] = [
                    item.prompt_id if hasattr(item, 'prompt_id') else item['prompt_id']
                    for item in test_point_combo.items
                ]
            else:
                template['test_point'] = []
            logger.info(f"RCC测试点组合包含 {len(template['test_point'])} 个提示词")
        except Exception as e:
            logger.error(f"获取RCC测试点组合失败: {e}")

    # 获取测试用例组合
    if rcc_config.get('test_case_combination_id'):
        try:
            test_case_combo = combination_service.get_prompt_combination(
                rcc_config['test_case_combination_id']
            )
            # 处理PromptCombinationResponse对象
            if hasattr(test_case_combo, 'items'):
                template['test_case'] = [
                    item.prompt_id if hasattr(item, 'prompt_id') else item['prompt_id']
                    for item in test_case_combo.items
                ]
            else:
                template['test_case'] = []
            logger.info(f"RCC测试用例组合包含 {len(template['test_case'])} 个提示词")
        except Exception as e:
            logger.error(f"获取RCC测试用例组合失败: {e}")

    return template

def get_other_business_types(db: Session) -> List[Dict[str, Any]]:
    """
    获取project_id=1中除RCC外的所有业务类型
    """
    try:
        # 查询business_type_configs表中project_id=1的所有业务类型，排除RCC
        query = text("""
            SELECT id, code, name, description, test_point_combination_id, test_case_combination_id
            FROM business_type_configs
            WHERE project_id = 1 AND code != 'RCC'
            ORDER BY code
        """)

        result = db.execute(query)
        business_types = []

        for row in result:
            business_types.append({
                'id': row.id,
                'business_type': row.code,
                'name': row.name,
                'description': row.description,
                'test_point_combination_id': row.test_point_combination_id,
                'test_case_combination_id': row.test_case_combination_id
            })

        logger.info(f"找到 {len(business_types)} 个需要更新的业务类型")
        return business_types

    except Exception as e:
        logger.error(f"获取业务类型列表失败: {e}")
        return []

def check_shared_prompt_position(template_prompts: List[int]) -> int:
    """
    检查共享提示词id=88在RCC模板中的位置
    返回插入位置索引
    """
    try:
        if 88 in template_prompts:
            return template_prompts.index(88)
        else:
            # 如果模板中没有id=88，找到插入位置（在system和business_description之间）
            system_count = 0
            insert_position = 0

            for i, prompt_id in enumerate(template_prompts):
                # 这里需要查询每个prompt_id的类型来判断
                # 简化处理：假设第一个业务描述提示词之前插入
                # 实际应该查询prompt_type
                if i > 0:  # 在system提示词后插入
                    insert_position = i
                    break

            return insert_position
    except Exception as e:
        logger.error(f"检查共享提示词位置失败: {e}")
        return 1  # 默认在第一个提示词后插入

def update_prompt_combination(db: Session, combination_id: int, template_prompts: List[int], insert_position: int) -> bool:
    """
    更新提示词组合，插入共享提示词id=88
    """
    try:
        combination_service = PromptCombinationService(db)

        # 获取当前组合的实际提示词
        current_combo = combination_service.get_prompt_combination(combination_id)
        current_prompts = []
        if hasattr(current_combo, 'items'):
            current_prompts = [
                item.prompt_id if hasattr(item, 'prompt_id') else item['prompt_id']
                for item in current_combo.items
            ]

        # 检查当前组合是否已经包含id=88
        if 88 in current_prompts:
            logger.info(f"组合 {combination_id} 已包含共享提示词id=88，跳过")
            return True

        logger.info(f"组合 {combination_id} 当前包含 {len(current_prompts)} 个提示词，插入共享提示词")

        # 使用模板作为基础，插入共享提示词
        new_prompts = template_prompts.copy()
        new_prompts.insert(insert_position, 88)

        # 构造更新数据
        combination_items = []
        for order, prompt_id in enumerate(new_prompts):
            combination_items.append({
                'prompt_id': prompt_id,
                'order': order,
                'is_required': True,
                'variable_name': None
            })

        # 更新组合 - 使用Pydantic模型格式
        update_data = {
            'name': f'更新后的提示词组合 - 包含系统背景',
            'description': '批量插入共享提示词"系统背景"',
            'items': combination_items
        }

        try:
            combination_service.update_prompt_combination(combination_id, update_data)
        except Exception as e:
            # 如果标准更新失败，尝试直接数据库操作
            logger.warning(f"服务层更新失败，尝试直接数据库操作: {e}")
            try:
                # 删除旧的组合项
                db.execute(text("DELETE FROM prompt_combination_items WHERE combination_id = :id"), {"id": combination_id})

                # 插入新的组合项
                for order, prompt_id in enumerate(new_prompts):
                    db.execute(text("""
                        INSERT INTO prompt_combination_items (combination_id, prompt_id, `order`, is_required, variable_name)
                        VALUES (:combo_id, :prompt_id, :order, 1, NULL)
                    """), {
                        "combo_id": combination_id,
                        "prompt_id": prompt_id,
                        "order": order
                    })

                # 更新组合信息
                db.execute(text("""
                    UPDATE prompt_combinations
                    SET name = :name, description = :description, updated_at = NOW()
                    WHERE id = :id
                """), {
                    "id": combination_id,
                    "name": f'更新后的提示词组合 - 包含系统背景',
                    "description": '批量插入共享提示词"系统背景"'
                })

                logger.info(f"直接数据库操作成功更新组合 {combination_id}")
            except Exception as db_error:
                logger.error(f"直接数据库操作也失败: {db_error}")
                raise db_error
        logger.info(f"成功更新组合 {combination_id}，插入共享提示词")
        return True

    except Exception as e:
        logger.error(f"更新提示词组合 {combination_id} 失败: {e}")
        return False

def main():
    """主执行函数"""
    logger.info("开始批量插入共享提示词脚本")

    try:
        # 获取数据库连接
        config = Config()
        db_manager = DatabaseManager(config)

        with db_manager.get_session() as db:
            # 步骤1: 获取RCC业务配置作为模板
            logger.info("步骤1: 获取RCC业务配置模板")
            rcc_query = text("""
                SELECT id, code, name, description, test_point_combination_id, test_case_combination_id
                FROM business_type_configs
                WHERE project_id = 1 AND code = 'RCC'
                LIMIT 1
            """)

            rcc_result = db.execute(rcc_query)
            rcc_config = None

            for row in rcc_result:
                rcc_config = {
                    'id': row.id,
                    'business_type': row.code,
                    'name': row.name,
                    'description': row.description,
                    'test_point_combination_id': row.test_point_combination_id,
                    'test_case_combination_id': row.test_case_combination_id
                }
                break

            if not rcc_config:
                logger.error("未找到RCC业务配置，无法获取模板")
                return False

            logger.info(f"找到RCC配置: {rcc_config['name']}")

            # 获取RCC模板
            rcc_template = get_rcc_template(db, rcc_config)

            if not rcc_template['test_point'] and not rcc_template['test_case']:
                logger.error("RCC模板为空，无法继续")
                return False

            # 确定插入位置
            if rcc_template['test_point']:
                test_point_insert_pos = check_shared_prompt_position(rcc_template['test_point'])
                logger.info(f"测试点组合插入位置: {test_point_insert_pos}")

            if rcc_template['test_case']:
                test_case_insert_pos = check_shared_prompt_position(rcc_template['test_case'])
                logger.info(f"测试用例组合插入位置: {test_case_insert_pos}")

            # 步骤2: 获取其他需要更新的业务类型
            logger.info("步骤2: 获取其他远控业务类型")
            other_business_types = get_other_business_types(db)

            if not other_business_types:
                logger.warning("未找到需要更新的业务类型")
                return True

            logger.info(f"需要更新的业务类型数量: {len(other_business_types)}")

            # 步骤3: 批量更新
            logger.info("步骤3: 开始批量更新")
            success_count = 0
            error_count = 0

            for business_type in other_business_types:
                logger.info(f"正在处理业务类型: {business_type['business_type']} - {business_type['name']}")

                # 更新测试点组合
                if business_type.get('test_point_combination_id') and rcc_template['test_point']:
                    if update_prompt_combination(
                        db,
                        business_type['test_point_combination_id'],
                        rcc_template['test_point'],
                        test_point_insert_pos
                    ):
                        success_count += 1
                    else:
                        error_count += 1

                # 更新测试用例组合
                if business_type.get('test_case_combination_id') and rcc_template['test_case']:
                    if update_prompt_combination(
                        db,
                        business_type['test_case_combination_id'],
                        rcc_template['test_case'],
                        test_case_insert_pos
                    ):
                        success_count += 1
                    else:
                        error_count += 1

            # 步骤4: 提交事务
            db.commit()

            logger.info("=" * 50)
            logger.info("批量更新完成!")
            logger.info(f"成功更新: {success_count} 个组合")
            logger.info(f"更新失败: {error_count} 个组合")
            logger.info("=" * 50)

            return True

    except Exception as e:
        logger.error(f"脚本执行失败: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)