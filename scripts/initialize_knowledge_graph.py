#!/usr/bin/env python3
"""
Initialize knowledge graph data from business descriptions.
This script extracts business entities and relations from business description files
and populates the knowledge graph database.
"""

import sys
import os

# Add the project root to the Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

try:
    from src.utils.config import Config
    from src.database.database import DatabaseManager
    from src.database.operations import DatabaseOperations
    from src.core.business_data_extractor import BusinessDataExtractor
    print("OK: All modules imported successfully")
except ImportError as e:
    print(f"ERROR: Module import failed: {e}")
    print(f"Project root: {project_root}")
    print(f"Python path: {sys.path[:3]}")
    sys.exit(1)


def main():
    """Main function to initialize the knowledge graph."""
    print("=== Initializing TSP Business Knowledge Graph ===")

    try:
        # Initialize configuration and database
        config = Config()
        db_manager = DatabaseManager(config)

        # Create database tables if they don't exist
        print("Creating database tables...")
        db_manager.create_tables()

        # Initialize business data extractor
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)
            extractor = BusinessDataExtractor(db_operations)

            # Clear existing knowledge graph data
            print("Clearing existing knowledge graph data...")
            deleted_count = db_operations.clear_knowledge_graph()
            print(f"Deleted {deleted_count} existing records")

            # Extract business data for all business types
            print("Starting business data extraction...")
            success = extractor.extract_all_business_data()

            if success:
                print("OK: Business data extraction successful!")

                # Display statistics
                stats = extractor.get_extraction_summary()
                print("\n=== Knowledge Graph Statistics ===")
                print(f"Total entities: {stats['total_entities']}")
                print(f"Total relations: {stats['total_relations']}")
                print(f"Business entities: {stats['business_entities']}")
                print(f"Interface entities: {stats['interface_entities']}")

                print("\n=== Knowledge Graph Initialization Complete ===")
                print("You can access the knowledge graph through these APIs:")
                print("- GET /knowledge-graph/data - Get graph visualization data")
                print("- GET /knowledge-graph/stats - Get graph statistics")
                print("- GET /knowledge-graph/entities - Get entity list")
                print("- GET /knowledge-graph/relations - Get relation list")

            else:
                print("ERROR: Business data extraction failed!")
                return 1

    except Exception as e:
        print(f"ERROR: Error during initialization: {e}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())