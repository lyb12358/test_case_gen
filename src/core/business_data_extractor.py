"""
Business data extractor for building knowledge graph from business descriptions.
"""

import os
import re
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)
from ..database.models import BusinessType, EntityType
from ..database.operations import DatabaseOperations
from ..utils.file_handler import load_text_file
from ..config.business_types import (
    get_business_type_name,
    get_business_type_description,
    get_business_file_mapping,
    get_business_interface_entity
)


class BusinessDataExtractor:
    """Extract business entities and relations from business description files."""

    def __init__(self, db_operations: DatabaseOperations):
        """
        Initialize the business data extractor.

        Args:
            db_operations (DatabaseOperations): Database operations instance
        """
        self.db_operations = db_operations
        self.business_descriptions_dir = "prompts/business_descriptions"

    def extract_all_business_data(self) -> bool:
        """
        Extract all business data from description files.

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Clear existing knowledge graph data
            self.db_operations.clear_knowledge_graph()
            logger.info("Cleared existing knowledge graph data")

            # Create TSP root scenario entity
            self._create_tsp_scenario_entity()

            # Create three interface entities
            self._create_interface_entities()

            # Extract data for each business type
            for business_type in BusinessType:
                success = self.extract_business_data(business_type)
                if not success:
                    print(f"Failed to extract data for {business_type.value}")
                    return False
            logger.info("Successfully extracted all business data")
            return True

        except Exception as e:
            return False

    def get_business_file_path(self, business_type: str) -> str:
        """
        Get business description file path, handling special cases.

        Args:
            business_type (str): Business type

        Returns:
            str: File path for the business description
        """
        filename = get_business_file_mapping(business_type)
        return os.path.join(self.business_descriptions_dir, filename)

    def extract_business_data(self, business_type: BusinessType) -> bool:
        """
        Extract data for a specific business type.

        Args:
            business_type (BusinessType): Business type to extract

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Get business description file path
            file_path = self.get_business_file_path(business_type.value)
            description = load_text_file(file_path)

            if description is None:
                print(f"Could not load business description for {business_type.value}")
                return False

            print(f"Extracting data for {business_type.value}")

            # Create business entity
            business_name = business_type.value
            business_desc = self._extract_business_description(description)

            # Get business display name from centralized configuration
            business_display_name = get_business_type_name(business_name)

            # Get TSP scenario entity as parent
            tsp_entity = self.db_operations.get_knowledge_entity_by_name("TSP远控场景")
            parent_id = tsp_entity.id if tsp_entity else None

            # Store full business description in extra_data
            import json
            extra_data = json.dumps({
                "full_description": description,
                "business_code": business_name
            }, ensure_ascii=False)

            # Create business entity
            self.db_operations.create_knowledge_entity(
                name=business_display_name,
                entity_type=EntityType.BUSINESS,
                description=business_desc,
                business_type=business_type,
                parent_id=parent_id,
                extra_data=extra_data,
                entity_order=float(list(BusinessType).index(business_type) + 1)
            )

            # Create relation: TSP scenario -> contains -> business
            self.db_operations.create_knowledge_relation(
                subject_name="TSP远控场景",
                predicate="contains",
                object_name=business_display_name,
                business_type=business_type
            )

            # Determine which interface this business uses
            interface_name = self._get_interface_for_business(business_name)

            # Create relation: business -> uses -> specific interface
            self.db_operations.create_knowledge_relation(
                subject_name=business_display_name,
                predicate="uses",
                object_name=interface_name,
                business_type=business_type
            )

            print(f"Successfully extracted data for {business_type.value}")
            return True

        except Exception as e:
            return False

    def _get_interface_for_business(self, business_type: str) -> str:
        """
        Get the interface entity name for a specific business type.

        Args:
            business_type (str): Business type code

        Returns:
            str: Interface entity name
        """
        # Get interface entity name from centralized configuration
        return get_business_interface_entity(business_type)

    def _extract_business_description(self, content: str) -> str:
        """
        Extract business description from content.

        Args:
            content (str): File content

        Returns:
            str: Business description
        """
        # Look for interface function description
        pattern = r'##### \d+\.\d+\.\d+\.\d+\. 接口功能说明\s*\n(.+?)(?=\n#####|\n#|$)'
        match = re.search(pattern, content, re.DOTALL)

        if match:
            return match.group(1).strip()

        return "业务功能描述"

  
    def _create_tsp_scenario_entity(self) -> bool:
        """
        Create TSP remote control scenario entity.

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Create TSP scenario entity
            self.db_operations.create_knowledge_entity(
                name="TSP远控场景",
                entity_type=EntityType.SCENARIO,
                description="TSP远程控制业务场景，包含所有远程控制相关的业务类型、服务和接口",
                parent_id=None,
                entity_order=0.0
            )
            logger.info("Created TSP remote control scenario root entity")
            return True
        except Exception as e:
            return False

    def _create_interface_entities(self) -> bool:
        """
        Create three TSP interface entities.

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Get TSP scenario entity as parent
            tsp_entity = self.db_operations.get_knowledge_entity_by_name("TSP远控场景")
            parent_id = tsp_entity.id if tsp_entity else None

            import json

            # Get all active business types from database
            all_business_types = []
            try:
                from ..database.database import DatabaseManager
                from ..database.models import BusinessTypeConfig
                from ..utils.config import Config

                config = Config()
                with DatabaseManager(config).get_session() as db:
                    business_configs = db.query(BusinessTypeConfig).filter(
                        BusinessTypeConfig.is_active == True
                    ).all()
                    all_business_types = [bc.code for bc in business_configs]
            except Exception as e:
                logger.warning(f"Failed to get business types from database: {e}")
                # Fallback to empty list if database query fails
                all_business_types = []

            # Interface definitions with dynamic business types
            interfaces = [
                {
                    "name": "TSP远程控制接口",
                    "endpoint": "/v1.0/remoteControl/control",
                    "method": "POST",
                    "description": "TSP远程控制统一接口，用于大多数业务类型",
                    "related_business_types": [bt for bt in all_business_types if bt not in ["ZAV", "ZAY", "WEIXIU_RSM", "VIVO_WATCH"]],
                    "entity_order": 10.0
                },
                {
                    "name": "TSP智能空调接口",
                    "endpoint": "/inner/v1.0/remoteControl/aiClimate",
                    "method": "POST",
                    "description": "智能空调远控接口，用于AI智能通风功能",
                    "related_business_types": [bt for bt in all_business_types if bt == "ZAV"],
                    "entity_order": 11.0
                },
                {
                    "name": "TSP内部远控接口",
                    "endpoint": "/inner/v1.0/remoteControl/control",
                    "method": "POST",
                    "description": "内部远控接口，用于智驾唤醒、维修模式、vivo手表控制等功能",
                    "related_business_types": [bt for bt in all_business_types if bt in ["ZAY", "WEIXIU_RSM", "VIVO_WATCH"]],
                    "entity_order": 12.0
                }
            ]

            # Create each interface entity
            for interface in interfaces:
                # Store interface metadata in extra_data
                interface_metadata = {
                    "endpoint": interface["endpoint"],
                    "method": interface["method"],
                    "description": interface["description"],
                    "related_business_types": interface["related_business_types"]
                }

                # Create interface entity
                self.db_operations.create_knowledge_entity(
                    name=interface["name"],
                    entity_type=EntityType.INTERFACE,
                    description=f"POST {interface['endpoint']} - {interface['description']}",
                    parent_id=parent_id,
                    extra_data=json.dumps(interface_metadata, ensure_ascii=False),
                    entity_order=interface["entity_order"]
                )

                # Create relation: TSP scenario -> provides -> interface
                self.db_operations.create_knowledge_relation(
                    subject_name="TSP远控场景",
                    predicate="provides",
                    object_name=interface["name"]
                )

                print(f"Created {interface['name']} entity")

            return True
        except Exception as e:
            return False

    def get_extraction_summary(self) -> Dict[str, int]:
        """
        Get summary of extracted data.

        Returns:
            Dict[str, int]: Extraction summary
        """
        return self.db_operations.get_knowledge_graph_stats()