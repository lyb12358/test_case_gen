"""
Database CRUD operations for test case generation service.
"""

import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import delete, and_

from .models import TestCase, GenerationJob, BusinessType, JobStatus, KnowledgeEntity, KnowledgeRelation, EntityType


class DatabaseOperations:
    """Database operations class."""

    def __init__(self, db: Session):
        """
        Initialize database operations.

        Args:
            db (Session): Database session
        """
        self.db = db

    # Test Case Operations
    def create_test_case(self, business_type: BusinessType, test_data: Dict[str, Any]) -> TestCase:
        """
        Create a new test case.

        Args:
            business_type (BusinessType): Business type
            test_data (Dict[str, Any]): Test case data

        Returns:
            TestCase: Created test case
        """
        test_case = TestCase(
            business_type=business_type,
            test_data=json.dumps(test_data, ensure_ascii=False)
        )
        self.db.add(test_case)
        self.db.commit()
        self.db.refresh(test_case)
        return test_case

    def get_test_cases_by_business_type(self, business_type: BusinessType) -> List[TestCase]:
        """
        Get all test cases for a specific business type.

        Args:
            business_type (BusinessType): Business type

        Returns:
            List[TestCase]: List of test cases
        """
        return self.db.query(TestCase).filter(TestCase.business_type == business_type).all()

    def get_all_test_cases(self) -> List[TestCase]:
        """
        Get all test cases.

        Returns:
            List[TestCase]: List of all test cases
        """
        return self.db.query(TestCase).all()

    def delete_test_cases_by_business_type(self, business_type: BusinessType) -> int:
        """
        Delete all test cases for a specific business type.

        Args:
            business_type (BusinessType): Business type

        Returns:
            int: Number of deleted records
        """
        stmt = delete(TestCase).where(TestCase.business_type == business_type)
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount

    def get_test_case_by_id(self, test_case_id: int) -> Optional[TestCase]:
        """
        Get test case by ID.

        Args:
            test_case_id (int): Test case ID

        Returns:
            Optional[TestCase]: Test case or None
        """
        return self.db.query(TestCase).filter(TestCase.id == test_case_id).first()

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
                job.completed_at = datetime.utcnow()
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
            test_case_count = self.db.query(TestCase).filter(TestCase.business_type == business_type).count()
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
        metadata: Optional[Dict[str, Any]] = None
    ) -> KnowledgeEntity:
        """
        Create a new knowledge entity.

        Args:
            name (str): Entity name
            entity_type (EntityType): Entity type
            description (Optional[str]): Entity description
            business_type (Optional[BusinessType]): Associated business type
            metadata (Optional[Dict[str, Any]]): Additional metadata

        Returns:
            KnowledgeEntity: Created entity
        """
        entity = KnowledgeEntity(
            name=name,
            type=entity_type,
            description=description,
            business_type=business_type,
            extra_data=json.dumps(metadata, ensure_ascii=False) if metadata else None
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
        # Get entities
        if business_type:
            entities = self.get_knowledge_entities_by_business_type(business_type)
            relations = self.get_knowledge_relations_by_business_type(business_type)
        else:
            entities = self.get_all_knowledge_entities()
            relations = self.get_all_knowledge_relations()

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

        for relation in relations:
            edges.append({
                "source": str(relation.subject_id),
                "target": str(relation.object_id),
                "label": relation.predicate,
                "type": relation.predicate,
                "businessType": relation.business_type.value if relation.business_type else None
            })

        return {
            "nodes": nodes,
            "edges": edges
        }

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
            "business_entities": self.db.query(KnowledgeEntity).filter(KnowledgeEntity.type == EntityType.BUSINESS).count(),
            "service_entities": self.db.query(KnowledgeEntity).filter(KnowledgeEntity.type == EntityType.SERVICE).count(),
            "interface_entities": self.db.query(KnowledgeEntity).filter(KnowledgeEntity.type == EntityType.INTERFACE).count()
        }