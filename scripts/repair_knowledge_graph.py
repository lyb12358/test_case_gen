#!/usr/bin/env python3
"""
Database repair script to fix missing knowledge graph entities.
This script will:
1. Create missing RFD business entity and service entity
2. Create test case entities for all existing test case items
3. Establish proper relationships between entities
"""

import os
import sys
import json
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set the working directory
os.chdir(project_root)

# Import using relative imports
import sys
if __name__ == '__main__':
    from src.database.database import DatabaseManager
    from src.database.operations import DatabaseOperations
    from src.database.models import BusinessType, EntityType, KnowledgeEntity, KnowledgeRelation, TestCaseItem
    from src.core.business_data_extractor import BusinessDataExtractor
    from src.utils.config import Config


def repair_knowledge_graph():
    """
    Repair the knowledge graph by creating missing entities and relationships.
    """
    print("=== Knowledge Graph Repair Script ===")

    try:
        # Initialize database
        config = Config()
        db_manager = DatabaseManager(config)

        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)

            print("\n1. Creating TSP scenario and interface entities...")
            # Create TSP root entities
            extractor = BusinessDataExtractor(db_operations)

            # Check if TSP scenario exists
            tsp_entity = db_operations.get_knowledge_entity_by_name("TSP远控场景")
            if not tsp_entity:
                extractor._create_tsp_scenario_entity()
                print("Created TSP scenario entity")
            else:
                print("TSP scenario entity already exists")

            # Check if unified interface exists
            interface_entity = db_operations.get_knowledge_entity_by_name("TSP远程控制接口")
            if not interface_entity:
                extractor._create_unified_interface_entity()
                print("Created unified interface entity")
            else:
                print("Unified interface entity already exists")

            print("\n2. Creating missing business entities...")
            # Create missing business entities for each business type
            business_names = {
                "RCC": "远程净化",
                "RFD": "香氛控制",
                "ZAB": "远程恒温座舱设置",
                "ZBA": "水淹报警"
            }

            for business_type in BusinessType:
                business_entity = db_operations.db.query(KnowledgeEntity).filter(
                    KnowledgeEntity.business_type == business_type,
                    KnowledgeEntity.type == EntityType.BUSINESS
                ).first()

                if not business_entity:
                    print(f"Creating business entity for {business_type.value}")
                    extractor.extract_business_data(business_type)
                else:
                    print(f"Business entity for {business_type.value} already exists: {business_entity.name}")

            print("\n3. Creating test case entities for existing test case items...")
            # Get all test case items that don't have corresponding knowledge entities
            test_case_items = db_operations.db.query(TestCaseItem).all()
            print(f"Found {len(test_case_items)} test case items")

            created_count = 0
            for item in test_case_items:
                # Check if test case entity already exists
                existing_entity = db_operations.db.query(KnowledgeEntity).filter(
                    KnowledgeEntity.name == item.name,
                    KnowledgeEntity.type == EntityType.TEST_CASE
                ).first()

                if not existing_entity:
                    # Find the business entity for this item
                    group = item.group
                    business_entity = db_operations.db.query(KnowledgeEntity).filter(
                        KnowledgeEntity.business_type == group.business_type,
                        KnowledgeEntity.type == EntityType.BUSINESS
                    ).first()

                    if business_entity:
                        # Create test case knowledge entity
                        tc_entity = db_operations.create_knowledge_entity(
                            name=item.name,
                            entity_type=EntityType.TEST_CASE,
                            description=item.description or f"测试用例: {item.name}",
                            business_type=group.business_type,
                            parent_id=business_entity.id,
                            entity_order=item.entity_order or float(len(test_case_items) + 1),
                            extra_data=json.dumps({
                                'test_case_id': item.test_case_id,
                                'module': item.module,
                                'preconditions': json.loads(item.preconditions) if item.preconditions else [],
                                'steps': json.loads(item.steps) if item.steps else [],
                                'expected_result': json.loads(item.expected_result) if item.expected_result else [],
                                'functional_module': item.functional_module,
                                'functional_domain': item.functional_domain,
                                'remarks': item.remarks,
                                'test_case_item_id': item.id
                            }, ensure_ascii=False)
                        )

                        # Create test case entity mapping
                        db_operations.create_test_case_entity(
                            test_case_id=None,  # Legacy field not used
                            test_case_item_id=item.id,
                            entity_id=tc_entity.id,
                            name=item.name,
                            description=item.description,
                            extra_metadata={'test_case_item_id': item.id}
                        )

                        # Create relation: business has_test_case test_case_entity
                        db_operations.create_knowledge_relation(
                            subject_name=business_entity.name,
                            predicate="has_test_case",
                            object_name=tc_entity.name,
                            business_type=group.business_type
                        )

                        created_count += 1
                        print(f"Created test case entity: {item.name}")
                    else:
                        print(f"Warning: No business entity found for {group.business_type.value}, skipping test case: {item.name}")
                else:
                    print(f"Test case entity already exists: {item.name}")

            print(f"\nCreated {created_count} new test case entities")

            print("\n4. Displaying final statistics...")
            stats = db_operations.get_knowledge_graph_stats()
            print(f"Total entities: {stats['total_entities']}")
            print(f"Total relations: {stats['total_relations']}")
            print(f"Scenario entities: {stats['scenario_entities']}")
            print(f"Business entities: {stats['business_entities']}")
            print(f"Service entities: {stats['service_entities']}")
            print(f"Interface entities: {stats['interface_entities']}")
            print(f"Test case entities: {stats['test_case_entities']}")

            print("\n=== Knowledge Graph Repair Completed Successfully ===")
            return True

    except Exception as e:
        print(f"Error during knowledge graph repair: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = repair_knowledge_graph()
    sys.exit(0 if success else 1)