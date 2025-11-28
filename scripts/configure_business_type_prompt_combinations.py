#!/usr/bin/env python3
"""
为28个业务类型配置提示词组合脚本
复制RCC的配置模式：1个系统提示词 + 1个业务描述提示词
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.database.database import DatabaseManager
from src.database.operations import DatabaseOperations
from src.database.models import BusinessType, Prompt, PromptCombination, PromptCombinationItem
from src.utils.config import Config
from sqlalchemy import text


class BusinessTypePromptConfigurator:
    def __init__(self):
        config = Config()
        self.db_manager = DatabaseManager(config)
        self.system_prompt_test_point = None
        self.system_prompt_test_case = None
        self.rcc_business_prompt = None

    def get_reference_prompts(self):
        """获取RCC配置中的参考提示词"""
        with self.db_manager.get_session() as db:
            db_ops = DatabaseOperations(db)

            # 获取RCC的测试点组合，找出系统提示词
            rcc_test_point_items = db.execute(text("""
                SELECT p.* FROM prompts p
                JOIN prompt_combination_items pci ON p.id = pci.prompt_id
                JOIN prompt_combinations pc ON pci.combination_id = pc.id
                JOIN business_type_configs btc ON pc.id = btc.test_point_combination_id
                WHERE btc.code = 'RCC'
            """)).fetchall()

            # 获取RCC的测试用例组合，找出系统提示词
            rcc_test_case_items = db.execute(text("""
                SELECT p.* FROM prompts p
                JOIN prompt_combination_items pci ON p.id = pci.prompt_id
                JOIN prompt_combinations pc ON pci.combination_id = pc.id
                JOIN business_type_configs btc ON pc.id = btc.test_case_combination_id
                WHERE btc.code = 'RCC'
            """)).fetchall()

            print("=== RCC测试点组合中的提示词 ===")
            for item in rcc_test_point_items:
                print(f"ID: {item.id}, 名称: {item.name}, 类型: {item.type}")
                if item.type in ['system', 'SYSTEM']:
                    self.system_prompt_test_point = item.id
                elif item.type in ['business_description', 'BUSINESS_DESCRIPTION']:
                    self.rcc_business_prompt = item.id

            print("\n=== RCC测试用例组合中的提示词 ===")
            for item in rcc_test_case_items:
                print(f"ID: {item.id}, 名称: {item.name}, 类型: {item.type}")
                if item.type in ['system', 'SYSTEM']:
                    self.system_prompt_test_case = item.id

            print(f"\n识别结果:")
            print(f"测试点系统提示词ID: {self.system_prompt_test_point}")
            print(f"测试用例系统提示词ID: {self.system_prompt_test_case}")
            print(f"RCC业务描述提示词ID: {self.rcc_business_prompt}")

    def get_all_business_types(self):
        """获取所有业务类型及其对应的业务描述提示词"""
        with self.db_manager.get_session() as db:
            business_types = db.execute(text("""
                SELECT btc.code, btc.name, p.id as prompt_id, p.name as prompt_name
                FROM business_type_configs btc
                LEFT JOIN prompts p ON btc.code = p.business_type AND p.type = 'business_description' AND p.status = 'active'
                ORDER BY btc.code
            """)).fetchall()

            print(f"\n=== 所有业务类型及其业务描述提示词 ===")
            for bt in business_types:
                print(f"业务类型: {bt.code} ({bt.name}), 提示词ID: {bt.prompt_id}, 提示词名称: {bt.prompt_name}")

            return business_types

    def create_prompt_combination(self, db, business_type, stage, system_prompt_id, business_prompt_id):
        """为指定业务类型和阶段创建提示词组合"""
        # 创建组合
        combination_name = f"{business_type}_{stage}_combination"
        combination = PromptCombination(
            name=combination_name,
            description=f"{business_type} {stage} 提示词组合",
            business_type=business_type,
            project_id=1,  # 默认项目ID
            is_active=True
        )
        db.add(combination)
        db.flush()  # 获取ID

        # 添加系统提示词
        system_item = PromptCombinationItem(
            combination_id=combination.id,
            prompt_id=system_prompt_id,
            item_type="system_prompt",
            order=1
        )
        db.add(system_item)

        # 添加业务描述提示词
        business_item = PromptCombinationItem(
            combination_id=combination.id,
            prompt_id=business_prompt_id,
            item_type="user_prompt",
            order=2
        )
        db.add(business_item)

        print(f"创建组合: {combination_name} (ID: {combination.id})")
        return combination.id

    def configure_business_types(self):
        """配置所有业务类型的提示词组合"""
        self.get_reference_prompts()
        business_types = self.get_all_business_types()

        if not self.system_prompt_test_point or not self.system_prompt_test_case:
            print("错误: 无法识别RCC配置中的系统提示词")
            return False

        with self.db_manager.get_session() as db:
            configured_count = 0

            for bt in business_types:
                if bt.code == 'RCC':
                    print(f"\n跳过 RCC (已配置)")
                    continue

                if not bt.prompt_id:
                    print(f"\n警告: {bt.code} 没有对应的业务描述提示词，跳过")
                    continue

                print(f"\n=== 配置 {bt.code} ({bt.name}) ===")

                try:
                    # 创建测试点组合
                    test_point_combo_id = self.create_prompt_combination(
                        db, bt.code, 'test_point',
                        self.system_prompt_test_point, bt.prompt_id
                    )

                    # 创建测试用例组合
                    test_case_combo_id = self.create_prompt_combination(
                        db, bt.code, 'test_case',
                        self.system_prompt_test_case, bt.prompt_id
                    )

                    # 更新business_type_configs表
                    db.execute(text("""
                        UPDATE business_type_configs
                        SET test_point_combination_id = :test_point_id,
                            test_case_combination_id = :test_case_id,
                            is_active = 1
                        WHERE code = :business_type
                    """), {
                        'test_point_id': test_point_combo_id,
                        'test_case_id': test_case_combo_id,
                        'business_type': bt.code
                    })

                    print(f"[OK] {bt.code} 配置完成")
                    configured_count += 1

                except Exception as e:
                    print(f"[ERROR] {bt.code} 配置失败: {e}")
                    db.rollback()
                    return False

            db.commit()
            print(f"\n=== 配置完成 ===")
            print(f"成功配置 {configured_count} 个业务类型")
            return True

    def verify_configuration(self):
        """验证配置结果"""
        with self.db_manager.get_session() as db:
            results = db.execute(text("""
                SELECT
                    btc.code,
                    btc.name,
                    btc.test_point_combination_id IS NOT NULL as has_test_point,
                    btc.test_case_combination_id IS NOT NULL as has_test_case,
                    btc.is_active
                FROM business_type_configs btc
                ORDER BY btc.code
            """)).fetchall()

            print("\n=== 配置验证结果 ===")
            all_configured = True
            for result in results:
                status = "[OK]" if result.has_test_point and result.has_test_case and result.is_active else "[FAIL]"
                print(f"{status} {result.code} ({result.name}): "
                      f"测试点={'有' if result.has_test_point else '无'}, "
                      f"测试用例={'有' if result.has_test_case else '无'}, "
                      f"激活={'是' if result.is_active else '否'}")

                if not (result.has_test_point and result.has_test_case and result.is_active):
                    all_configured = False

            print(f"\n总体状态: {'[OK] 所有业务类型已配置' if all_configured else '[FAIL] 存在未配置的业务类型'}")
            return all_configured


def main():
    """主函数"""
    configurator = BusinessTypePromptConfigurator()

    print("开始为28个业务类型配置提示词组合...")
    print("基于RCC的配置模式：1个系统提示词 + 1个业务描述提示词")

    # 配置业务类型
    if configurator.configure_business_types():
        print("\n配置成功！")

        # 验证配置
        if configurator.verify_configuration():
            print("验证通过！所有业务类型已正确配置。")
        else:
            print("验证失败！存在配置问题。")
    else:
        print("配置失败！")


if __name__ == "__main__":
    main()