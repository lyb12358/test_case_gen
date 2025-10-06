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

            # Create business entity
            self.db_operations.create_knowledge_entity(
                name=business_display_name,
                entity_type=EntityType.BUSINESS,
                description=business_desc,
                business_type=business_type
            )

            # Extract service and interface information
            services = self._extract_services(description, business_type)

            for service_data in services:
                service_name = service_data["name"]
                service_desc = service_data["description"]
                interfaces = service_data["interfaces"]

                # Create service entity
                self.db_operations.create_knowledge_entity(
                    name=service_name,
                    entity_type=EntityType.SERVICE,
                    description=service_desc,
                    business_type=business_type
                )

                # Create relation: business -> has -> service
                self.db_operations.create_knowledge_relation(
                    subject_name=business_display_name,
                    predicate="has",
                    object_name=service_name,
                    business_type=business_type
                )

                # Create interface entities and relations
                for interface in interfaces:
                    interface_name = interface["name"]
                    interface_desc = interface["description"]

                    # Create interface entity
                    self.db_operations.create_knowledge_entity(
                        name=interface_name,
                        entity_type=EntityType.INTERFACE,
                        description=interface_desc,
                        business_type=business_type,
                        metadata={"endpoint": interface.get("endpoint", "")}
                    )

                    # Create relation: service -> calls -> interface
                    self.db_operations.create_knowledge_relation(
                        subject_name=service_name,
                        predicate="calls",
                        object_name=interface_name,
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

    def get_extraction_summary(self) -> Dict[str, int]:
        """
        Get summary of extracted data.

        Returns:
            Dict[str, int]: Extraction summary
        """
        return self.db_operations.get_knowledge_graph_stats()