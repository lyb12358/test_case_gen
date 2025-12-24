"""
Database Migration: Convert business_type from ENUM to VARCHAR(20)

This migration enables dynamic business type support by converting all business_type
columns from ENUM(BusinessType) to VARCHAR(20). This allows the system to support
new business types without code changes.

Tables affected:
- unified_test_cases
- generation_jobs
- knowledge_entities
- knowledge_relations
- prompts
- prompt_combinations

Run this script with: python migrations/alter_business_type_to_varchar.py
"""

import sys
import os
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_database_url(args=None):
    """
    Get database URL from command line args, environment, or default.

    Priority:
    1. Command line arguments (if provided)
    2. Environment variables (.env file)
    3. Docker defaults
    """
    # Priority 1: Use command line arguments if provided
    if args and args.host:
        user = args.user
        password = args.password
        database = args.database
        host = args.host
    else:
        # Priority 2: Check if .env file exists and load it
        env_file = project_root / '.env'
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key.strip()] = value.strip()

        # Build database URL from environment or Docker defaults
        user = os.getenv('USER', 'tsp')
        password = os.getenv('PASSWORD', '2222')
        database = os.getenv('DATABASE', 'testcase_gen')
        host = os.getenv('HOST', '172.17.0.1:8474')  # Docker default gateway

    # Check if host already contains port
    if ':' in host:
        # Host already includes port (e.g., "172.17.0.1:8474")
        return f"mysql+pymysql://{user}:{password}@{host}/{database}"
    else:
        # Add default port
        port = os.getenv('PORT', '3306')
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"


def migrate_table(engine, table_name, column_name='business_type'):
    """Migrate a single table's business_type column from ENUM to VARCHAR(20)."""

    try:
        with engine.connect() as conn:
            # Check current column type
            result = conn.execute(text(f"""
                SELECT COLUMN_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = '{table_name}'
                AND COLUMN_NAME = '{column_name}'
            """))

            row = result.fetchone()
            if not row:
                logger.warning(f"Column {column_name} not found in table {table_name}")
                return False

            current_type, is_nullable = row[0], row[1]

            logger.info(f"Table {table_name}.{column_name}: Current type = {current_type}, Nullable = {is_nullable}")

            # Skip if already VARCHAR
            if 'varchar' in current_type.lower() or 'varchar' in str(current_type).lower():
                logger.info(f"✓ Table {table_name}.{column_name} already uses VARCHAR - skipping")
                return True

            # Get existing data for verification
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            row_count = result.fetchone()[0]
            logger.info(f"  Current row count: {row_count}")

            # Get distinct business_type values before migration
            result = conn.execute(text(f"SELECT DISTINCT {column_name} FROM {table_name}"))
            existing_values = [row[0] for row in result.fetchall()]
            logger.info(f"  Existing business_type values: {existing_values}")

            # Alter the column type from ENUM to VARCHAR(20)
            nullable_sql = "NULL" if is_nullable == 'YES' else "NOT NULL"

            logger.info(f"  Altering {table_name}.{column_name} to VARCHAR(20)...")

            # Use MODIFY COLUMN to change type
            alter_sql = f"""
                ALTER TABLE {table_name}
                MODIFY COLUMN {column_name} VARCHAR(20) {nullable_sql}
            """

            conn.execute(text(alter_sql))
            conn.commit()

            logger.info(f"✓ Successfully migrated {table_name}.{column_name} to VARCHAR(20)")

            # Verify data integrity
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            new_row_count = result.fetchone()[0]

            if row_count != new_row_count:
                logger.error(f"✗ Data integrity issue! Row count changed from {row_count} to {new_row_count}")
                return False

            # Verify existing values are preserved
            result = conn.execute(text(f"SELECT DISTINCT {column_name} FROM {table_name}"))
            new_values = [row[0] for row in result.fetchall()]

            if set(existing_values) != set(new_values):
                logger.error(f"✗ Data values changed! Before: {existing_values}, After: {new_values}")
                return False

            logger.info(f"✓ Data integrity verified: {row_count} rows, all values preserved")

            return True

    except Exception as e:
        logger.error(f"✗ Error migrating table {table_name}: {str(e)}")
        return False


def run_migration(args=None):
    """Run the complete migration process."""

    logger.info("=" * 70)
    logger.info("Business Type Migration: ENUM → VARCHAR(20)")
    logger.info("=" * 70)

    # Create database engine
    database_url = get_database_url(args)

    # Parse host for logging
    if args and args.host:
        log_host = args.host
    else:
        log_host = os.getenv('HOST', '172.17.0.1:8474')

    logger.info(f"Database URL: mysql+pymysql://***:***@{log_host}/{os.getenv('DATABASE', 'testcase_gen')}")

    engine = create_engine(database_url, echo=False)

    # Tables to migrate
    tables_to_migrate = [
        'unified_test_cases',
        'generation_jobs',
        'knowledge_entities',
        'knowledge_relations',
        'prompts',
        'prompt_combinations'
    ]

    logger.info(f"\nTables to migrate: {len(tables_to_migrate)}")
    for table in tables_to_migrate:
        logger.info(f"  - {table}")

    logger.info("\n" + "=" * 70)
    logger.info("Starting migration...")
    logger.info("=" * 70 + "\n")

    # Track results
    success_count = 0
    failed_tables = []

    # Migrate each table
    for i, table_name in enumerate(tables_to_migrate, 1):
        logger.info(f"\n[{i}/{len(tables_to_migrate)}] Processing: {table_name}")
        logger.info("-" * 70)

        if migrate_table(engine, table_name):
            success_count += 1
        else:
            failed_tables.append(table_name)

    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("Migration Summary")
    logger.info("=" * 70)
    logger.info(f"Total tables: {len(tables_to_migrate)}")
    logger.info(f"Successfully migrated: {success_count}")
    logger.info(f"Failed: {len(failed_tables)}")

    if failed_tables:
        logger.warning(f"Failed tables: {', '.join(failed_tables)}")
        return False
    else:
        logger.info("\n✓ All migrations completed successfully!")
        logger.info("\nNext steps:")
        logger.info("1. Update application code to use String(20) instead of Enum(BusinessType)")
        logger.info("2. Remove enum validation from API endpoints")
        logger.info("3. Test dynamic business type creation")
        return True


def rollback_migration(args=None):
    """
    Rollback function to convert VARCHAR back to ENUM (NOT RECOMMENDED).

    This function is provided for emergency rollback only. Rolling back to ENUM
    will cause data loss if any new business types were added after migration.
    """

    logger.warning("=" * 70)
    logger.warning("ROLLBACK: VARCHAR(20) → ENUM(BusinessType)")
    logger.warning("This may cause data loss! Use with extreme caution.")
    logger.warning("=" * 70)

    response = input("\nAre you sure you want to rollback? Type 'YES' to confirm: ")
    if response != 'YES':
        logger.info("Rollback cancelled.")
        return

    # Create database engine
    database_url = get_database_url(args)
    engine = create_engine(database_url, echo=False)

    # Import BusinessType enum
    from src.database.models import BusinessType

    # Build enum values list
    enum_values = ','.join([f"'{bt.value}'" for bt in BusinessType])
    enum_definition = f"ENUM({enum_values})"

    logger.info(f"Enum definition: {enum_definition}")

    tables_to_rollback = [
        ('unified_test_cases', 'NOT NULL'),
        ('generation_jobs', 'NOT NULL'),
        ('knowledge_entities', 'NULL'),
        ('knowledge_relations', 'NULL'),
        ('prompts', 'NULL'),
        ('prompt_combinations', 'NULL')
    ]

    with engine.connect() as conn:
        for table_name, nullable in tables_to_rollback:
            logger.info(f"Rolling back {table_name}...")

            try:
                alter_sql = f"""
                    ALTER TABLE {table_name}
                    MODIFY COLUMN business_type {enum_definition} {nullable}
                """

                conn.execute(text(alter_sql))
                conn.commit()

                logger.info(f"✓ Rolled back {table_name}")

            except Exception as e:
                logger.error(f"✗ Error rolling back {table_name}: {str(e)}")

    logger.info("\nRollback completed. Note: Data may have been lost!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description='Migrate business_type columns from ENUM to VARCHAR(20)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Use Docker defaults (recommended for remote execution)
  python migrations/alter_business_type_to_varchar.py

  # Custom database connection
  python migrations/alter_business_type_to_varchar.py --host 192.168.1.100:8474 --user tsp --password 2222

  # Rollback (NOT RECOMMENDED)
  python migrations/alter_business_type_to_varchar.py --rollback
        '''
    )

    # Database connection arguments
    parser.add_argument(
        '--host',
        default=None,
        help='Database host and port (default: 172.17.0.1:8474 for Docker, or from .env file)'
    )
    parser.add_argument(
        '--user',
        default='tsp',
        help='Database user (default: tsp)'
    )
    parser.add_argument(
        '--password',
        default='2222',
        help='Database password (default: 2222)'
    )
    parser.add_argument(
        '--database',
        default='testcase_gen',
        help='Database name (default: testcase_gen)'
    )

    parser.add_argument(
        '--rollback',
        action='store_true',
        help='Rollback migration (convert VARCHAR back to ENUM) - NOT RECOMMENDED'
    )

    args = parser.parse_args()

    if args.rollback:
        rollback_migration(args)
    else:
        success = run_migration(args)
        sys.exit(0 if success else 1)
