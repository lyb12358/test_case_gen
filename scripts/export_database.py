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
                from src.database.models import TestCase
                query = db.query(TestCase)
                data = []
                for case in query.all():
                    data.append({
                        'id': case.id,
                        'business_type': case.business_type.value,
                        'test_data': json.loads(case.test_data) if case.test_data else None,
                        'created_at': case.created_at.isoformat(),
                        'updated_at': case.updated_at.isoformat()
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
        if table_name == "test_cases" and 'test_data' in df.columns:
            # Extract key fields from test_data
            df['test_scenario'] = df['test_data'].apply(lambda x: x.get('test_scenario', '') if x else '')
            df['preconditions'] = df['test_data'].apply(lambda x: x.get('preconditions', '') if x else '')
            df['expected_result'] = df['test_data'].apply(lambda x: x.get('expected_result', '') if x else '')
            # Remove the original nested column
            df = df.drop('test_data', axis=1)

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

### 1. test_cases
Stores generated test case data for different business types.

**Columns:**
- `id` (Integer, Primary Key): Unique identifier
- `business_type` (Enum): Business type (RCC, RFD, ZAB, ZBA)
- `test_data` (Text): JSON data containing test case details
- `created_at` (DateTime): Record creation timestamp
- `updated_at` (DateTime): Last update timestamp

### 2. generation_jobs
Tracks test case generation jobs and their status.

**Columns:**
- `id` (String, Primary Key): Job UUID
- `business_type` (Enum): Business type for the job
- `status` (Enum): Job status (pending, running, completed, failed)
- `error_message` (Text): Error message if job failed
- `created_at` (DateTime): Job creation timestamp
- `completed_at` (DateTime): Job completion timestamp

### 3. knowledge_entities
Stores entities for the knowledge graph (business types, services, interfaces).

**Columns:**
- `id` (Integer, Primary Key): Unique identifier
- `name` (String): Entity name
- `type` (Enum): Entity type (business, service, interface)
- `description` (Text): Entity description
- `business_type` (Enum): Associated business type
- `extra_data` (Text): Additional JSON data
- `created_at` (DateTime): Entity creation timestamp

### 4. knowledge_relations
Stores relationships between knowledge graph entities (triples).

**Columns:**
- `id` (Integer, Primary Key): Unique identifier
- `subject_id` (Integer): ID of subject entity
- `predicate` (String): Relationship type (has, calls, contains, etc.)
- `object_id` (Integer): ID of object entity
- `business_type` (Enum): Associated business type
- `created_at` (DateTime): Relation creation timestamp

**Relationships:**
- `subject_id` → `knowledge_entities.id`
- `object_id` → `knowledge_entities.id`

## Entity Types

### Business Types
- **RCC**: Remote Climate Control (远程净化)
- **RFD**: Remote Fragrance Control (香氛控制)
- **ZAB**: Remote Cabin Temperature Setting (远程恒温座舱设置)
- **ZBA**: Water Flooding Alarm (水淹报警)

### Knowledge Graph Entity Types
- **business**: Business type entities
- **service**: Service entities
- **interface**: Interface entities

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
            tables = ["test_cases", "generation_jobs", "knowledge_entities", "knowledge_relations"]

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