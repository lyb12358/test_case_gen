"""
Database CRUD operations for test case generation service.
"""

import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import delete, and_

from .models import TestCaseGroup, TestCaseItem, GenerationJob, BusinessType, JobStatus, KnowledgeEntity, KnowledgeRelation, EntityType, TestCaseEntity


class DatabaseOperations:
    """Database operations class."""

    def __init__(self, db: Session):
        """
        Initialize database operations.

        Args:
            db (Session): Database session
        """
        self.db = db

    
    # Generation Job Operations
    def create_generation_job(self, job_id: str, business_type: BusinessType) -> GenerationJob:
        """
        Create a new generation job.

        Args:
            job_id (str): Job ID
            business_type (BusinessType): Business type

        Returns:
            GenerationJob: Created generation job
        """
        job = GenerationJob(id=job_id, business_type=business_type)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        error_message: Optional[str] = None
    ) -> Optional[GenerationJob]:
        """
        Update job status.

        Args:
            job_id (str): Job ID
            status (JobStatus): New status
            error_message (Optional[str]): Error message if failed

        Returns:
            Optional[GenerationJob]: Updated job or None
        """
        job = self.db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        if job:
            job.status = status
            if error_message:
                job.error_message = error_message
            if status == JobStatus.COMPLETED:
                job.completed_at = datetime.now()
            self.db.commit()
            self.db.refresh(job)
        return job

    def get_generation_job(self, job_id: str) -> Optional[GenerationJob]:
        """
        Get generation job by ID.

        Args:
            job_id (str): Job ID

        Returns:
            Optional[GenerationJob]: Generation job or None
        """
        return self.db.query(GenerationJob).filter(GenerationJob.id == job_id).first()

    def get_all_generation_jobs(self) -> List[GenerationJob]:
        """
        Get all generation jobs.

        Returns:
            List[GenerationJob]: List of generation jobs
        """
        return self.db.query(GenerationJob).all()

    def get_jobs_by_business_type(self, business_type: BusinessType) -> List[GenerationJob]:
        """
        Get jobs by business type.

        Args:
            business_type (BusinessType): Business type

        Returns:
            List[GenerationJob]: List of jobs
        """
        return self.db.query(GenerationJob).filter(GenerationJob.business_type == business_type).all()

    def delete_generation_job(self, job_id: str) -> bool:
        """
        Delete a generation job.

        Args:
            job_id (str): Job ID

        Returns:
            bool: True if deleted, False if not found
        """
        job = self.db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        if job:
            self.db.delete(job)
            self.db.commit()
            return True
        return False

    def get_business_type_stats(self) -> Dict[str, Dict[str, int]]:
        """
        Get statistics for each business type.

        Returns:
            Dict[str, Dict[str, int]]: Statistics by business type
        """
        stats = {}
        for business_type in BusinessType:
            test_case_count = self.db.query(TestCaseGroup).filter(TestCaseGroup.business_type == business_type).count()
            job_count = self.db.query(GenerationJob).filter(GenerationJob.business_type == business_type).count()
            stats[business_type.value] = {
                "test_cases": test_case_count,
                "jobs": job_count
            }
        return stats

    # Knowledge Graph Operations
    def create_knowledge_entity(
        self,
        name: str,
        entity_type: EntityType,
        description: Optional[str] = None,
        business_type: Optional[BusinessType] = None,
        parent_id: Optional[int] = None,
        entity_order: Optional[float] = None,
        extra_data: Optional[str] = None
    ) -> KnowledgeEntity:
        """
        Create a new knowledge entity.

        Args:
            name (str): Entity name
            entity_type (EntityType): Entity type
            description (Optional[str]): Entity description
            business_type (Optional[BusinessType]): Associated business type
            parent_id (Optional[int]): Parent entity ID for hierarchy
            entity_order (Optional[float]): Order for sorting entities
            extra_data (Optional[str]): Extra data as JSON string

        Returns:
            KnowledgeEntity: Created entity
        """
        entity = KnowledgeEntity(
            name=name,
            type=entity_type,
            description=description,
            business_type=business_type,
            parent_id=parent_id,
            entity_order=entity_order,
            extra_data=extra_data
        )
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def create_knowledge_relation(
        self,
        subject_name: str,
        predicate: str,
        object_name: str,
        business_type: Optional[BusinessType] = None
    ) -> Optional[KnowledgeRelation]:
        """
        Create a new knowledge relation (triple).

        Args:
            subject_name (str): Subject entity name
            predicate (str): Predicate (relationship type)
            object_name (str): Object entity name
            business_type (Optional[BusinessType]): Associated business type

        Returns:
            Optional[KnowledgeRelation]: Created relation or None if entities not found
        """
        # Find subject and object entities
        subject = self.db.query(KnowledgeEntity).filter(KnowledgeEntity.name == subject_name).first()
        object = self.db.query(KnowledgeEntity).filter(KnowledgeEntity.name == object_name).first()

        if not subject or not object:
            return None

        relation = KnowledgeRelation(
            subject_id=subject.id,
            predicate=predicate,
            object_id=object.id,
            business_type=business_type
        )
        self.db.add(relation)
        self.db.commit()
        self.db.refresh(relation)
        return relation

    def get_all_knowledge_entities(self) -> List[KnowledgeEntity]:
        """
        Get all knowledge entities.

        Returns:
            List[KnowledgeEntity]: List of all entities
        """
        return self.db.query(KnowledgeEntity).all()

    def get_knowledge_entities_by_type(self, entity_type: EntityType) -> List[KnowledgeEntity]:
        """
        Get knowledge entities by type.

        Args:
            entity_type (EntityType): Entity type

        Returns:
            List[KnowledgeEntity]: List of entities of the specified type
        """
        return self.db.query(KnowledgeEntity).filter(KnowledgeEntity.type == entity_type).all()

    def get_knowledge_entities_by_business_type(self, business_type: BusinessType) -> List[KnowledgeEntity]:
        """
        Get knowledge entities by business type.

        Args:
            business_type (BusinessType): Business type

        Returns:
            List[KnowledgeEntity]: List of entities for the specified business type
        """
        return self.db.query(KnowledgeEntity).filter(KnowledgeEntity.business_type == business_type).all()

    def get_all_knowledge_relations(self) -> List[KnowledgeRelation]:
        """
        Get all knowledge relations.

        Returns:
            List[KnowledgeRelation]: List of all relations
        """
        return self.db.query(KnowledgeRelation).all()

    def get_knowledge_relations_by_business_type(self, business_type: BusinessType) -> List[KnowledgeRelation]:
        """
        Get knowledge relations by business type.

        Args:
            business_type (BusinessType): Business type

        Returns:
            List[KnowledgeRelation]: List of relations for the specified business type
        """
        return self.db.query(KnowledgeRelation).filter(KnowledgeRelation.business_type == business_type).all()

    def get_knowledge_graph_data(self, business_type: Optional[BusinessType] = None) -> Dict[str, Any]:
        """
        Get knowledge graph data in G6 format.

        Args:
            business_type (Optional[BusinessType]): Filter by business type

        Returns:
            Dict[str, Any]: Graph data in G6 format
        """
        # 添加调试日志
        print(f"DB: get_knowledge_graph_data called with business_type: {business_type}")

        # Get entities
        if business_type:
            entities = self.get_knowledge_entities_by_business_type(business_type)
            relations = self.get_knowledge_relations_by_business_type(business_type)
            print(f"DB: Filtered by business_type {business_type}: {len(entities)} entities, {len(relations)} relations")
        else:
            entities = self.get_all_knowledge_entities()
            relations = self.get_all_knowledge_relations()
            print(f"DB: No filter: {len(entities)} entities, {len(relations)} relations")

        # Convert to G6 format
        nodes = []
        edges = []

        for entity in entities:
            nodes.append({
                "id": str(entity.id),
                "name": entity.name,
                "label": entity.name,
                "type": entity.type.value,
                "description": entity.description,
                "businessType": entity.business_type.value if entity.business_type else None
            })

        # Use a set to track unique edges
        seen_edges = set()

        for relation in relations:
            # Create unique edge identifier
            edge_key = (str(relation.subject_id), str(relation.object_id), relation.predicate)

            # Only add edge if not already seen
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                edges.append({
                    "source": str(relation.subject_id),
                    "target": str(relation.object_id),
                    "label": relation.predicate,
                    "type": relation.predicate,
                    "businessType": relation.business_type.value if relation.business_type else None
                })

        result = {
            "nodes": nodes,
            "edges": edges
        }
        print(f"DB: Returning graph data: {len(result['nodes'])} nodes, {len(result['edges'])} edges")
        return result

    def clear_knowledge_graph(self) -> int:
        """
        Clear all knowledge graph data.

        Returns:
            int: Number of deleted relations
        """
        # Delete all relations first
        relations_count = self.db.query(KnowledgeRelation).count()
        self.db.query(KnowledgeRelation).delete()

        # Delete all entities
        entities_count = self.db.query(KnowledgeEntity).count()
        self.db.query(KnowledgeEntity).delete()

        self.db.commit()
        return relations_count + entities_count

    def get_knowledge_graph_stats(self) -> Dict[str, int]:
        """
        Get knowledge graph statistics.

        Returns:
            Dict[str, int]: Statistics about the knowledge graph
        """
        return {
            "total_entities": self.db.query(KnowledgeEntity).count(),
            "total_relations": self.db.query(KnowledgeRelation).count(),
            "scenario_entities": self.db.query(KnowledgeEntity).filter(KnowledgeEntity.type == EntityType.SCENARIO).count(),
            "business_entities": self.db.query(KnowledgeEntity).filter(KnowledgeEntity.type == EntityType.BUSINESS).count(),
            "interface_entities": self.db.query(KnowledgeEntity).filter(KnowledgeEntity.type == EntityType.INTERFACE).count(),
            "test_case_entities": self.db.query(KnowledgeEntity).filter(KnowledgeEntity.type == EntityType.TEST_CASE).count()
        }

    def get_knowledge_entity_by_name(self, name: str) -> Optional[KnowledgeEntity]:
        """
        Get knowledge entity by name.

        Args:
            name (str): Entity name

        Returns:
            Optional[KnowledgeEntity]: Entity or None if not found
        """
        return self.db.query(KnowledgeEntity).filter(KnowledgeEntity.name == name).first()

    def get_knowledge_entity_by_id(self, entity_id: int) -> Optional[KnowledgeEntity]:
        """
        Get knowledge entity by ID.

        Args:
            entity_id (int): Entity ID

        Returns:
            Optional[KnowledgeEntity]: Entity or None if not found
        """
        return self.db.query(KnowledgeEntity).filter(KnowledgeEntity.id == entity_id).first()

    def get_child_entities(self, parent_id: int) -> List[KnowledgeEntity]:
        """
        Get child entities of a parent entity.

        Args:
            parent_id (int): Parent entity ID

        Returns:
            List[KnowledgeEntity]: List of child entities
        """
        return self.db.query(KnowledgeEntity).filter(KnowledgeEntity.parent_id == parent_id).order_by(KnowledgeEntity.entity_order).all()

    def create_test_case_entity(
        self,
        test_case_item_id: int,
        entity_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        extra_metadata: Optional[Dict[str, Any]] = None
    ) -> TestCaseEntity:
        """
        Create a test case entity.

        Args:
            test_case_item_id (int): Test case item ID
            entity_id (int): Knowledge entity ID
            name (Optional[str]): Test case name
            description (Optional[str]): Test case description
            tags (Optional[List[str]]): List of tags
            extra_metadata (Optional[Dict[str, Any]]): Additional metadata

        Returns:
            TestCaseEntity: Created test case entity
        """
        test_case_entity = TestCaseEntity(
            test_case_item_id=test_case_item_id,
            entity_id=entity_id,
            name=name,
            description=description,
            tags=json.dumps(tags, ensure_ascii=False) if tags else None,
            extra_metadata=json.dumps(extra_metadata, ensure_ascii=False) if extra_metadata else None
        )
        self.db.add(test_case_entity)
        self.db.commit()
        self.db.refresh(test_case_entity)
        return test_case_entity

    def get_test_case_entities_by_entity(self, entity_id: int) -> List[TestCaseEntity]:
        """
        Get test case entities by knowledge entity ID.

        Args:
            entity_id (int): Knowledge entity ID

        Returns:
            List[TestCaseEntity]: List of test case entities
        """
        return self.db.query(TestCaseEntity).filter(TestCaseEntity.entity_id == entity_id).all()

    def get_related_entities(self, entity_id: int) -> List[KnowledgeEntity]:
        """
        Get entities related to a specific entity through relations.

        Args:
            entity_id (int): Entity ID

        Returns:
            List[KnowledgeEntity]: List of related entities
        """
        entity_id_str = str(entity_id)

        # Get relations where this entity is the subject
        subject_relations = self.db.query(KnowledgeRelation).filter(
            KnowledgeRelation.subject_id == entity_id
        ).all()

        # Get relations where this entity is the object
        object_relations = self.db.query(KnowledgeRelation).filter(
            KnowledgeRelation.object_id == entity_id
        ).all()

        related_entity_ids = set()

        # Collect related entity IDs
        for relation in subject_relations:
            related_entity_ids.add(relation.object_id)

        for relation in object_relations:
            related_entity_ids.add(relation.subject_id)

        # Get the related entities
        related_entities = []
        for related_id in related_entity_ids:
            entity = self.get_knowledge_entity_by_id(related_id)
            if entity:
                related_entities.append(entity)

        return related_entities

    def get_entity_relations(self, entity_id: int) -> List[KnowledgeRelation]:
        """
        Get all relations involving a specific entity.

        Args:
            entity_id (int): Entity ID

        Returns:
            List[KnowledgeRelation]: List of relations
        """
        # Get relations where this entity is the subject or object
        relations = self.db.query(KnowledgeRelation).filter(
            (KnowledgeRelation.subject_id == entity_id) |
            (KnowledgeRelation.object_id == entity_id)
        ).all()

        return relations

    # ========== New TestCaseGroup and TestCaseItem Operations ==========

    def create_test_case_group(self, business_type: BusinessType, generation_metadata: Optional[Dict[str, Any]] = None) -> TestCaseGroup:
        """
        Create a new test case group.

        Args:
            business_type (BusinessType): Business type
            generation_metadata (Optional[Dict[str, Any]]): Generation metadata

        Returns:
            TestCaseGroup: Created test case group
        """
        group = TestCaseGroup(
            business_type=business_type,
            generation_metadata=json.dumps(generation_metadata, ensure_ascii=False) if generation_metadata else None
        )
        self.db.add(group)
        self.db.commit()
        self.db.refresh(group)
        return group

    def create_test_case_item(self, group_id: int, test_case_data: Dict[str, Any], entity_order: Optional[float] = None) -> TestCaseItem:
        """
        Create a new test case item.

        Args:
            group_id (int): Test case group ID
            test_case_data (Dict[str, Any]): Test case data
            entity_order (Optional[float]): Order index

        Returns:
            TestCaseItem: Created test case item
        """
        item = TestCaseItem(
            group_id=group_id,
            test_case_id=test_case_data.get('id', ''),
            name=test_case_data.get('name', ''),
            description=test_case_data.get('description', ''),
            module=test_case_data.get('module', ''),
            functional_module=test_case_data.get('functional_module', ''),
            functional_domain=test_case_data.get('functional_domain', ''),
            preconditions=json.dumps(test_case_data.get('preconditions', []), ensure_ascii=False),
            steps=json.dumps(test_case_data.get('steps', []), ensure_ascii=False),
            expected_result=json.dumps(test_case_data.get('expected_result', []), ensure_ascii=False),
            remarks=test_case_data.get('remarks', ''),
            entity_order=entity_order
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def create_test_case_items_batch(self, group_id: int, test_cases_list: List[Dict[str, Any]]) -> List[TestCaseItem]:
        """
        Create multiple test case items in batch.

        Args:
            group_id (int): Test case group ID
            test_cases_list (List[Dict[str, Any]]): List of test case data

        Returns:
            List[TestCaseItem]: Created test case items
        """
        items = []
        for idx, tc_data in enumerate(test_cases_list):
            item = self.create_test_case_item(group_id, tc_data, float(idx + 1))
            items.append(item)
        return items

    def get_test_case_groups_by_business_type(self, business_type: BusinessType) -> List[TestCaseGroup]:
        """
        Get test case groups by business type.

        Args:
            business_type (BusinessType): Business type

        Returns:
            List[TestCaseGroup]: List of test case groups
        """
        return self.db.query(TestCaseGroup).filter(TestCaseGroup.business_type == business_type).all()

    def get_test_case_items_by_group_id(self, group_id: int) -> List[TestCaseItem]:
        """
        Get test case items by group ID.

        Args:
            group_id (int): Group ID

        Returns:
            List[TestCaseItem]: List of test case items
        """
        return self.db.query(TestCaseItem).filter(TestCaseItem.group_id == group_id).order_by(TestCaseItem.entity_order).all()

    def get_test_case_item_by_id(self, item_id: int) -> Optional[TestCaseItem]:
        """
        Get test case item by ID.

        Args:
            item_id (int): Test case item ID

        Returns:
            Optional[TestCaseItem]: Test case item or None
        """
        return self.db.query(TestCaseItem).filter(TestCaseItem.id == item_id).first()

    def delete_test_case_groups_by_business_type(self, business_type: BusinessType) -> int:
        """
        Delete test case groups and their items by business type, including knowledge graph entities.

        Args:
            business_type (BusinessType): Business type

        Returns:
            int: Number of deleted groups
        """
        groups = self.get_test_case_groups_by_business_type(business_type)

        for group in groups:
            items = self.get_test_case_items_by_group_id(group.id)

            # Delete knowledge graph entities and relations for each item
            for item in items:
                self.delete_test_case_knowledge_entities_for_item(item.id, business_type)

                # Delete test case entity mappings
                entities = self.db.query(TestCaseEntity).filter(TestCaseEntity.test_case_item_id == item.id).all()
                for entity in entities:
                    self.db.delete(entity)

        # Delete the groups (cascade will delete items)
        stmt = delete(TestCaseGroup).where(TestCaseGroup.business_type == business_type)
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount

    def delete_test_case_knowledge_entities_for_item(self, test_case_item_id: int, business_type: BusinessType):
        """
        Delete knowledge graph entities and relations for a specific test case item.

        Args:
            test_case_item_id (int): Test case item ID
            business_type (BusinessType): Business type
        """
        # Find TEST_CASE type entities that have this item_id in their extra_data
        knowledge_entities = self.db.query(KnowledgeEntity).filter(
            KnowledgeEntity.type == EntityType.TEST_CASE,
            KnowledgeEntity.business_type == business_type,
            KnowledgeEntity.extra_data.like(f'%"test_case_item_id": {test_case_item_id}%')
        ).all()

        for entity in knowledge_entities:
            # Delete relations involving this entity
            self.delete_entity_and_relations(entity.id)

    def delete_entity_and_relations(self, entity_id: int):
        """
        Delete a knowledge entity and all its relations.

        Args:
            entity_id (int): Entity ID
        """
        # Delete relations where this entity is subject or object
        relations = self.db.query(KnowledgeRelation).filter(
            (KnowledgeRelation.subject_id == entity_id) |
            (KnowledgeRelation.object_id == entity_id)
        ).all()

        for relation in relations:
            self.db.delete(relation)

        # Delete the entity
        entity = self.db.query(KnowledgeEntity).filter(KnowledgeEntity.id == entity_id).first()
        if entity:
            self.db.delete(entity)

    def delete_test_case_knowledge_entities_by_business_type(self, business_type: BusinessType) -> tuple[int, int]:
        """
        Delete all test case knowledge entities and their relations for a business type.

        Args:
            business_type (BusinessType): Business type

        Returns:
            tuple[int, int]: (deleted_entities_count, deleted_relations_count)
        """
        deleted_entities_count = 0
        deleted_relations_count = 0

        # Find all test case entities for this business type
        test_case_entities = self.db.query(KnowledgeEntity).filter(
            KnowledgeEntity.type == EntityType.TEST_CASE,
            KnowledgeEntity.business_type == business_type
        ).all()

        for entity in test_case_entities:
            # Count relations before deletion
            relations_count = self.db.query(KnowledgeRelation).filter(
                (KnowledgeRelation.subject_id == entity.id) |
                (KnowledgeRelation.object_id == entity.id)
            ).count()

            # Delete relations
            self.db.query(KnowledgeRelation).filter(
                (KnowledgeRelation.subject_id == entity.id) |
                (KnowledgeRelation.object_id == entity.id)
            ).delete()

            deleted_relations_count += relations_count

            # Delete entity
            self.db.delete(entity)
            deleted_entities_count += 1

        self.db.commit()
        return deleted_entities_count, deleted_relations_count

    def update_test_case_item(self, item_id: int, test_case_data: Dict[str, Any]) -> Optional[TestCaseItem]:
        """
        Update a test case item.

        Args:
            item_id (int): Test case item ID
            test_case_data (Dict[str, Any]): Updated test case data

        Returns:
            Optional[TestCaseItem]: Updated test case item or None
        """
        item = self.get_test_case_item_by_id(item_id)
        if item:
            item.test_case_id = test_case_data.get('id', item.test_case_id)
            item.name = test_case_data.get('name', item.name)
            item.description = test_case_data.get('description', item.description)
            item.module = test_case_data.get('module', item.module)
            item.functional_module = test_case_data.get('functional_module', item.functional_module)
            item.functional_domain = test_case_data.get('functional_domain', item.functional_domain)
            item.preconditions = json.dumps(test_case_data.get('preconditions', []), ensure_ascii=False)
            item.steps = json.dumps(test_case_data.get('steps', []), ensure_ascii=False)
            item.expected_result = json.dumps(test_case_data.get('expected_result', []), ensure_ascii=False)
            item.remarks = test_case_data.get('remarks', item.remarks)
            self.db.commit()
            self.db.refresh(item)
        return item

    def delete_test_case_item(self, item_id: int) -> bool:
        """
        Delete a test case item and its related entities.

        Args:
            item_id (int): Test case item ID

        Returns:
            bool: True if deleted, False otherwise
        """
        item = self.get_test_case_item_by_id(item_id)
        if item:
            # Delete test case entities first
            entities = self.db.query(TestCaseEntity).filter(TestCaseEntity.test_case_item_id == item_id).all()
            for entity in entities:
                self.db.delete(entity)

            # Delete the item
            self.db.delete(item)
            self.db.commit()
            return True
        return False