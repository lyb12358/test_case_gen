#!/usr/bin/env python3
"""
Export all database data to output folder.
This script exports all data from the SQLite database to JSON and Excel files.
"""

import sys
import os
import json
from datetime import datetime
from pathlib import Path

# Add the project root to the Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Change to project root directory to ensure correct relative paths
os.chdir(project_root)

try:
    from src.utils.config import Config
    from src.database.database import DatabaseManager
    from src.database.operations import DatabaseOperations
    import pandas as pd
    print("OK: All modules imported successfully")
except ImportError as e:
    print(f"ERROR: Module import failed: {e}")
    print(f"Project root: {project_root}")
    print(f"Python path: {sys.path[:3]}")
    sys.exit(1)


def export_table_to_json(db_operations, db_manager, table_name, output_dir):
    """Export table data to JSON file."""
    try:
        with db_manager.get_session() as db:
            if table_name == "test_cases":
                from src.database.models import TestCaseGroup, TestCaseItem
                # Query test case groups with their items
                groups = db.query(TestCaseGroup).all()
                data = []
                for group in groups:
                    # Get all items for this group
                    items = db.query(TestCaseItem).filter(TestCaseItem.group_id == group.id).all()

                    # Create a record for each test case item
                    for item in items:
                        data.append({
                            'id': item.id,
                            'group_id': group.id,
                            'business_type': group.business_type.value,
                            'test_case_id': item.test_case_id,
                            'name': item.name,
                            'description': item.description,
                            'module': item.module,
                            'functional_module': item.functional_module,
                            'functional_domain': item.functional_domain,
                            'preconditions': json.loads(item.preconditions) if item.preconditions else [],
                            'steps': json.loads(item.steps) if item.steps else [],
                            'expected_result': json.loads(item.expected_result) if item.expected_result else [],
                            'remarks': item.remarks,
                            'entity_order': item.entity_order,
                            'generation_metadata': json.loads(group.generation_metadata) if group.generation_metadata else None,
                            'created_at': item.created_at.isoformat(),
                            'updated_at': group.updated_at.isoformat() if group.updated_at else None
                        })

            elif table_name == "test_case_groups":
                from src.database.models import TestCaseGroup
                query = db.query(TestCaseGroup)
                data = []
                for group in query.all():
                    data.append({
                        'id': group.id,
                        'business_type': group.business_type.value,
                        'generation_metadata': json.loads(group.generation_metadata) if group.generation_metadata else None,
                        'created_at': group.created_at.isoformat(),
                        'updated_at': group.updated_at.isoformat() if group.updated_at else None
                    })

            elif table_name == "test_case_items":
                from src.database.models import TestCaseItem
                query = db.query(TestCaseItem)
                data = []
                for item in query.all():
                    data.append({
                        'id': item.id,
                        'group_id': item.group_id,
                        'test_case_id': item.test_case_id,
                        'name': item.name,
                        'description': item.description,
                        'module': item.module,
                        'functional_module': item.functional_module,
                        'functional_domain': item.functional_domain,
                        'preconditions': json.loads(item.preconditions) if item.preconditions else [],
                        'steps': json.loads(item.steps) if item.steps else [],
                        'expected_result': json.loads(item.expected_result) if item.expected_result else [],
                        'remarks': item.remarks,
                        'entity_order': item.entity_order,
                        'created_at': item.created_at.isoformat()
                    })

            elif table_name == "test_case_entities":
                from src.database.models import TestCaseEntity
                query = db.query(TestCaseEntity)
                data = []
                for entity in query.all():
                    data.append({
                        'id': entity.id,
                        'test_case_item_id': entity.test_case_item_id,
                        'entity_id': entity.entity_id,
                        'name': entity.name,
                        'description': entity.description,
                        'tags': json.loads(entity.tags) if entity.tags else None,
                        'extra_metadata': json.loads(entity.extra_metadata) if entity.extra_metadata else None,
                        'created_at': entity.created_at.isoformat()
                    })

            elif table_name == "generation_jobs":
                from src.database.models import GenerationJob
                query = db.query(GenerationJob)
                data = []
                for job in query.all():
                    data.append({
                        'id': job.id,
                        'business_type': job.business_type.value,
                        'status': job.status.value,
                        'error_message': job.error_message,
                        'created_at': job.created_at.isoformat(),
                        'completed_at': job.completed_at.isoformat() if job.completed_at else None
                    })

            elif table_name == "knowledge_entities":
                from src.database.models import KnowledgeEntity
                query = db.query(KnowledgeEntity)
                data = []
                for entity in query.all():
                    data.append({
                        'id': entity.id,
                        'name': entity.name,
                        'type': entity.type.value,
                        'description': entity.description,
                        'business_type': entity.business_type.value if entity.business_type else None,
                        'extra_data': json.loads(entity.extra_data) if entity.extra_data else None,
                        'created_at': entity.created_at.isoformat()
                    })

            elif table_name == "knowledge_relations":
                from src.database.models import KnowledgeRelation
                query = db.query(KnowledgeRelation)
                data = []
                for relation in query.all():
                    data.append({
                        'id': relation.id,
                        'subject_id': relation.subject_id,
                        'subject_name': relation.subject.name if relation.subject else None,
                        'predicate': relation.predicate,
                        'object_id': relation.object_id,
                        'object_name': relation.object.name if relation.object else None,
                        'business_type': relation.business_type.value if relation.business_type else None,
                        'created_at': relation.created_at.isoformat()
                    })

            # Write to JSON file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            json_file = output_dir / f"{table_name}_{timestamp}.json"
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            print(f"[OK] Exported {len(data)} records from {table_name} to {json_file}")
            return data, len(data)

    except Exception as e:
        print(f"[ERROR] Error exporting {table_name}: {e}")
        return [], 0


def export_table_to_excel(db_operations, table_name, output_dir, data):
    """Export table data to Excel file."""
    try:
        if not data:
            return

        # Convert to DataFrame
        df = pd.DataFrame(data)

        # Flatten nested objects for better Excel display
        if table_name in ["test_cases", "test_case_items", "test_case_groups", "test_case_entities"]:
            # Convert list fields to strings for better Excel display
            if 'preconditions' in df.columns:
                df['preconditions'] = df['preconditions'].apply(lambda x: '; '.join(x) if isinstance(x, list) else str(x))
            if 'steps' in df.columns:
                df['steps'] = df['steps'].apply(lambda x: '; '.join(x) if isinstance(x, list) else str(x))
            if 'expected_result' in df.columns:
                df['expected_result'] = df['expected_result'].apply(lambda x: '; '.join(x) if isinstance(x, list) else str(x))
            # Convert JSON fields to strings if they exist
            for json_field in ['generation_metadata', 'tags', 'extra_metadata']:
                if json_field in df.columns:
                    df[json_field] = df[json_field].apply(lambda x: json.dumps(x, ensure_ascii=False) if x else '')

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        excel_file = output_dir / f"{table_name}_{timestamp}.xlsx"

        # Write to Excel
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=table_name[:31], index=False)  # Sheet name max 31 chars

        print(f"[OK] Exported {len(data)} records from {table_name} to {excel_file}")

    except Exception as e:
        print(f"[ERROR] Error exporting {table_name} to Excel: {e}")


def export_database_schema(db_operations, db_manager, output_dir):
    """Export database schema to markdown file."""
    try:
        schema_content = """# Database Schema Export

## Tables Overview

### 1. test_case_groups
Stores test case groups for different business types (generation batches).

**Columns:**
- `id` (Integer, Primary Key): Unique identifier
- `business_type` (Enum): Business type (RCC, RFD, ZAB, ZBA, etc.)
- `generation_metadata` (Text): JSON metadata about the generation process
- `created_at` (DateTime): Record creation timestamp
- `updated_at` (DateTime): Last update timestamp

### 2. test_case_items
Stores individual test case items within groups.

**Columns:**
- `id` (Integer, Primary Key): Unique identifier
- `group_id` (Integer, Foreign Key): Reference to test_case_groups.id
- `test_case_id` (String): Test case identifier (TC001, TC002, etc.)
- `name` (String): Test case name
- `description` (Text): Test case description
- `module` (String): Test module
- `functional_module` (String): Functional module
- `functional_domain` (String): Functional domain
- `preconditions` (Text): JSON array of preconditions
- `steps` (Text): JSON array of test steps
- `expected_result` (Text): JSON array of expected results
- `remarks` (Text): Additional remarks
- `entity_order` (Float): Entity order for sorting
- `created_at` (DateTime): Record creation timestamp

**Relationships:**
- `group_id` → `test_case_groups.id`

### 3. generation_jobs
Tracks test case generation jobs and their status.

**Columns:**
- `id` (String, Primary Key): Job UUID
- `business_type` (Enum): Business type for the job
- `status` (Enum): Job status (pending, running, completed, failed)
- `error_message` (Text): Error message if job failed
- `created_at` (DateTime): Job creation timestamp
- `completed_at` (DateTime): Job completion timestamp

### 4. knowledge_entities
Stores entities for the knowledge graph (business types, services, interfaces, test cases).

**Columns:**
- `id` (Integer, Primary Key): Unique identifier
- `name` (String): Entity name
- `type` (Enum): Entity type (scenario, business, interface, test_case)
- `description` (Text): Entity description
- `business_type` (Enum): Associated business type
- `parent_id` (Integer): Parent entity ID for hierarchical structure
- `extra_data` (Text): Additional JSON data
- `entity_order` (Float): Entity order for sorting
- `created_at` (DateTime): Entity creation timestamp

**Relationships:**
- `parent_id` → `knowledge_entities.id` (self-referential)

### 5. knowledge_relations
Stores relationships between knowledge graph entities (triples).

**Columns:**
- `id` (Integer, Primary Key): Unique identifier
- `subject_id` (Integer): ID of subject entity
- `predicate` (String): Relationship type (has, calls, contains, etc.)
- `object_id` (Integer): ID of object entity
- `business_type` (Enum): Associated business type
- `created_at` (DateTime): Relation creation timestamp

### 6. test_case_entities
Maps test case items to knowledge graph entities.

**Columns:**
- `id` (Integer, Primary Key): Unique identifier
- `test_case_item_id` (Integer): Reference to test_case_items.id
- `entity_id` (Integer): Reference to knowledge_entities.id
- `name` (String): Entity name
- `description` (Text): Entity description
- `tags` (Text): JSON string for tags
- `extra_metadata` (Text): JSON string for additional metadata
- `created_at` (DateTime): Record creation timestamp

**Relationships:**
- `test_case_item_id` → `test_case_items.id`
- `entity_id` → `knowledge_entities.id`

## Entity Types

### Business Types
- **RCC**: Remote Climate Control (远程净化)
- **RFD**: Remote Fragrance Control (香氛控制)
- **ZAB**: Remote Cabin Temperature Setting (远程恒温座舱设置)
- **ZBA**: Water Flooding Alarm (水淹报警)
- **PAB**: 百灵鸟远程灯光秀控制
- **PAE**: 远程车载冰箱设置（领克PAE）
- **PAI**: 远程车辆位置查看
- **RCE**: 环境调节
- **RES**: 远程发动机启动/停止
- **RHL**: 闪灯/鸣笛
- **RPP**: 查询PM2.5、温度、氧气浓度
- **RSM**: 开关管理
- **RWS**: 打开关闭窗户、天窗、遮阳帘
- **ZAD**: 远程储物箱私密锁设置
- **ZAE**: 远程车载冰箱设置
- **ZAF**: 新空调/环境调节
- **ZAG**: 开启/关闭 访客模式
- **ZAH**: 远程授权启动、允许驾驶
- **ZAJ**: 远程冷暖箱控制
- **ZAM**: 远程空气净化
- **ZAN**: 远程电池预热开关
- **ZAS**: 新访客模式(3.0)
- **ZAV**: AI智能通风(3.0)
- **ZAY**: 智驾唤醒acdu(3.0)
- **ZBB**: 制氧机远控
- **WEIXIU_RSM**: 维修模式RSM
- **VIVO_WATCH**: vivo手表远控
- **RDL_RDU**: 车门锁定解锁
- **RDO_RDC**: 车门/后备箱/引擎盖/加油盖/充电盖 开关

### Knowledge Graph Entity Types
- **scenario**: 场景 (TSP远控场景)
- **business**: 业务类型 (RCC, RFD, etc.)
- **interface**: 接口 (/v1.0/remoteControl/control, etc.)
- **test_case**: 测试用例

### Job Status Types
- **pending**: Job waiting to be processed
- **running**: Job currently being processed
- **completed**: Job finished successfully
- **failed**: Job finished with errors

---
*Generated on: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """
"""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        schema_file = output_dir / f"database_schema_{timestamp}.md"

        with open(schema_file, 'w', encoding='utf-8') as f:
            f.write(schema_content)

        print(f"[OK] Exported database schema to {schema_file}")

    except Exception as e:
        print(f"[ERROR] Error exporting database schema: {e}")


def main():
    """Main function to export all database data."""
    print("=== Exporting All Database Data ===")

    try:
        # Initialize configuration and database
        config = Config()

        # Ensure data directory exists
        db_path = Path(config.database_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)

        db_manager = DatabaseManager(config)

        # Create output directory if it doesn't exist
        output_dir = Path(project_root) / "output"
        output_dir.mkdir(exist_ok=True)

        # Initialize database operations
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)

            # Tables to export
            tables = ["test_cases", "generation_jobs", "knowledge_entities", "knowledge_relations", "test_case_groups", "test_case_items", "test_case_entities"]

            total_records = 0
            all_data = {}

            print(f"\nExporting data to: {output_dir}")
            print("=" * 50)

            # Export each table
            for table_name in tables:
                print(f"\n[INFO] Exporting {table_name}...")
                data, count = export_table_to_json(db_operations, db_manager, table_name, output_dir)
                if data:
                    export_table_to_excel(db_operations, table_name, output_dir, data)
                    all_data[table_name] = data
                    total_records += count

            # Export database schema
            print(f"\n[INFO] Exporting database schema...")
            export_database_schema(db_operations, db_manager, output_dir)

            # Create summary report
            print(f"\n[INFO] Creating summary report...")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            summary_file = output_dir / f"export_summary_{timestamp}.md"

            summary_content = f"""# Database Export Summary

**Export Time:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Total Records:** {total_records}

## Export Statistics

"""

            for table_name, data in all_data.items():
                summary_content += f"- **{table_name}:** {len(data)} records\n"

            summary_content += f"""
## Files Generated

### JSON Files
"""
            for table_name in tables:
                summary_content += f"- `{table_name}_{timestamp}.json`\n"

            summary_content += """
### Excel Files
"""
            for table_name in tables:
                summary_content += f"- `{table_name}_{timestamp}.xlsx`\n"

            summary_content += f"""
### Documentation
- `database_schema_{timestamp}.md`
- `export_summary_{timestamp}.md`

---
*Export completed successfully!*
"""

            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write(summary_content)

            print(f"[OK] Summary report saved to {summary_file}")

            print("\n" + "=" * 50)
            print("[SUCCESS] Database export completed successfully!")
            print(f"[INFO] All files saved to: {output_dir}")
            print(f"[INFO] Total records exported: {total_records}")
            print("=" * 50)

    except Exception as e:
        print(f"[ERROR] Error during export: {e}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())