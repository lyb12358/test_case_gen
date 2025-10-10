#!/usr/bin/env python3
"""
Clean up orphaned knowledge graph relations.
This script removes relations that reference non-existent entities.
"""

import os
import sys
import sqlite3
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set the working directory
os.chdir(project_root)


def clean_orphaned_relations():
    """
    Clean up orphaned relations in the knowledge graph.

    This function identifies and removes relations that reference entities
    which no longer exist in the knowledge_entities table.
    """
    print("=== Cleaning Orphaned Knowledge Graph Relations ===")

    try:
        # Connect to database
        db_path = "data/test_cases.db"
        if not os.path.exists(db_path):
            print(f"Database not found: {db_path}")
            return False

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # First, identify orphaned relations
        print("\n1. Identifying orphaned relations...")

        cursor.execute('''
            SELECT kr.id, kr.subject_id, kr.object_id, kr.predicate,
                   ke1.name as subject_name, ke2.name as object_name
            FROM knowledge_relations kr
            LEFT JOIN knowledge_entities ke1 ON kr.subject_id = ke1.id
            LEFT JOIN knowledge_entities ke2 ON kr.object_id = ke2.id
            WHERE ke1.id IS NULL OR ke2.id IS NULL
        ''')

        orphaned_relations = cursor.fetchall()
        print(f"Found {len(orphaned_relations)} orphaned relations:")

        if not orphaned_relations:
            print("No orphaned relations found. Database is already clean.")
            conn.close()
            return True

        # Display orphaned relations
        for rel in orphaned_relations:
            rel_id, subject_id, object_id, predicate, subject_name, object_name = rel
            missing_side = []
            if subject_name is None:
                missing_side.append(f"subject {subject_id}")
            if object_name is None:
                missing_side.append(f"object {object_id}")
            print(f"  ID {rel_id}: {subject_id} -> {object_id} ({predicate}) [Missing: {', '.join(missing_side)}]")

        # Confirm before deletion
        print(f"\n2. Preparing to delete {len(orphaned_relations)} orphaned relations...")

        # Get the IDs of relations to delete
        relation_ids_to_delete = [str(rel[0]) for rel in orphaned_relations]

        # Delete orphaned relations
        if relation_ids_to_delete:
            placeholders = ','.join(['?' for _ in relation_ids_to_delete])
            cursor.execute(f'''
                DELETE FROM knowledge_relations
                WHERE id IN ({placeholders})
            ''', relation_ids_to_delete)

            deleted_count = cursor.rowcount
            print(f"Deleted {deleted_count} orphaned relations")

        # Commit changes
        conn.commit()
        print("\n3. Database changes committed successfully.")

        # Verify cleanup
        print("\n4. Verifying cleanup...")

        cursor.execute('''
            SELECT COUNT(*) FROM knowledge_relations kr
            LEFT JOIN knowledge_entities ke1 ON kr.subject_id = ke1.id
            LEFT JOIN knowledge_entities ke2 ON kr.object_id = ke2.id
            WHERE ke1.id IS NULL OR ke2.id IS NULL
        ''')

        remaining_orphaned = cursor.fetchone()[0]
        if remaining_orphaned == 0:
            print("✓ All orphaned relations have been successfully removed.")
        else:
            print(f"✗ Warning: {remaining_orphaned} orphaned relations still remain.")

        # Show final statistics
        cursor.execute("SELECT COUNT(*) FROM knowledge_entities")
        entity_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM knowledge_relations")
        relation_count = cursor.fetchone()[0]

        print(f"\n=== Final Statistics ===")
        print(f"Knowledge entities: {entity_count}")
        print(f"Knowledge relations: {relation_count}")

        conn.close()
        print("\n=== Orphaned Relations Cleanup Completed ===")
        return True

    except Exception as e:
        print(f"Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main function."""
    success = clean_orphaned_relations()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()