"""
Business data extractor for building knowledge graph from business descriptions.
"""

import os
import re
from typing import Dict, List, Optional, Tuple
from ..database.models import BusinessType, EntityType
from ..database.operations import DatabaseOperations
from ..utils.file_handler import load_text_file


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
            print("Cleared existing knowledge graph data")

            # Create TSP root scenario entity
            self._create_tsp_scenario_entity()

            # Create unified interface entity
            self._create_unified_interface_entity()

            # Extract data for each business type
            for business_type in BusinessType:
                success = self.extract_business_data(business_type)
                if not success:
                    print(f"Failed to extract data for {business_type.value}")
                    return False

            print("Successfully extracted all business data")
            return True

        except Exception as e:
            print(f"Error extracting business data: {e}")
            return False

    def extract_business_data(self, business_type: BusinessType) -> bool:
        """
        Extract data for a specific business type.

        Args:
            business_type (BusinessType): Business type to extract

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Load business description file
            file_path = os.path.join(self.business_descriptions_dir, f"{business_type.value.lower()}.md")
            description = load_text_file(file_path)

            if description is None:
                print(f"Could not load business description for {business_type.value}")
                return False

            print(f"Extracting data for {business_type.value}")

            # Create business entity
            business_name = business_type.value
            business_desc = self._extract_business_description(description)

            # Map business codes to names
            business_names = {
                "RCC": "远程净化",
                "RFD": "香氛控制",
                "ZAB": "远程恒温座舱设置",
                "ZBA": "水淹报警"
            }

            business_display_name = business_names.get(business_name, business_name)

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

            # Extract service and interface information
            services = self._extract_services(description, business_type)

            for service_data in services:
                service_name = service_data["name"]
                service_desc = service_data["description"]
                interfaces = service_data["interfaces"]

                # Get business entity as parent
                business_entity = self.db_operations.get_knowledge_entity_by_name(business_display_name)
                parent_id = business_entity.id if business_entity else None

                # Create service entity
                self.db_operations.create_knowledge_entity(
                    name=service_name,
                    entity_type=EntityType.SERVICE,
                    description=service_desc,
                    business_type=business_type,
                    parent_id=parent_id,
                    entity_order=1.0
                )

                # Create relation: business -> has -> service
                self.db_operations.create_knowledge_relation(
                    subject_name=business_display_name,
                    predicate="has",
                    object_name=service_name,
                    business_type=business_type
                )

                # Create relation: service -> uses -> unified interface
                self.db_operations.create_knowledge_relation(
                    subject_name=service_name,
                    predicate="uses",
                    object_name="TSP远程控制接口",
                    business_type=business_type
                )

            print(f"Successfully extracted data for {business_type.value}")
            return True

        except Exception as e:
            print(f"Error extracting data for {business_type.value}: {e}")
            return False

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

    def _extract_services(self, content: str, business_type: BusinessType) -> List[Dict]:
        """
        Extract services from business description.

        Args:
            content (str): File content
            business_type (BusinessType): Business type

        Returns:
            List[Dict]: List of services with their interfaces
        """
        services = []

        # Define service mapping based on business type
        service_mapping = {
            BusinessType.RCC: {
                "name": "远程净化服务",
                "description": "远程控制座舱通风、空调、除霜等功能"
            },
            BusinessType.RFD: {
                "name": "香氛控制服务",
                "description": "远程控制车辆香氛系统"
            },
            BusinessType.ZAB: {
                "name": "远程恒温座舱服务",
                "description": "远程设置和保持座舱温度"
            },
            BusinessType.ZBA: {
                "name": "水淹报警服务",
                "description": "车辆水淹状态监测和报警"
            }
        }

        # Extract interface endpoint from content
        interface_pattern = r'`([^`]+)`'
        interface_matches = re.findall(interface_pattern, content)

        # Find the actual API endpoint (starts with POST and contains /)
        api_endpoint = None
        for match in interface_matches:
            if match.startswith("POST"):
                api_endpoint = match.replace("POST ", "").strip()
                break

        # Default endpoint if not found
        if not api_endpoint:
            api_endpoint = "/v1.0/remoteControl/control"

        # Get service definition for this business type
        service_def = service_mapping.get(business_type)
        if service_def:
            service_data = {
                "name": service_def["name"],
                "description": service_def["description"],
                "interfaces": [
                    {
                        "name": f"{service_def['name']}接口",
                        "description": f"POST {api_endpoint}",
                        "endpoint": api_endpoint
                    }
                ]
            }
            services.append(service_data)

        return services

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
            print("Created TSP远控场景 root entity")
            return True
        except Exception as e:
            print(f"Error creating TSP scenario entity: {e}")
            return False

    def _create_unified_interface_entity(self) -> bool:
        """
        Create unified TSP remote control interface entity.

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Get TSP scenario entity as parent
            tsp_entity = self.db_operations.get_knowledge_entity_by_name("TSP远控场景")
            parent_id = tsp_entity.id if tsp_entity else None

            # Store interface metadata in extra_data
            import json
            interface_metadata = {
                "endpoint": "/v1.0/remoteControl/control",
                "method": "POST",
                "description": "TSP远程控制统一接口，所有业务类型共用此接口"
            }

            # Create unified interface entity
            self.db_operations.create_knowledge_entity(
                name="TSP远程控制接口",
                entity_type=EntityType.INTERFACE,
                description="POST /v1.0/remoteControl/control - TSP远程控制统一接口",
                parent_id=parent_id,
                extra_data=json.dumps(interface_metadata, ensure_ascii=False),
                entity_order=10.0
            )

            # Create relation: TSP scenario -> provides -> unified interface
            self.db_operations.create_knowledge_relation(
                subject_name="TSP远控场景",
                predicate="provides",
                object_name="TSP远程控制接口"
            )

            print("Created TSP远程控制接口 unified entity")
            return True
        except Exception as e:
            print(f"Error creating unified interface entity: {e}")
            return False

    def get_extraction_summary(self) -> Dict[str, int]:
        """
        Get summary of extracted data.

        Returns:
            Dict[str, int]: Extraction summary
        """
        return self.db_operations.get_knowledge_graph_stats()