"""
SQLAlchemy database models for test case generation service.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, Float, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()


class BusinessType(enum.Enum):
    """Supported business types."""
    # Original business types
    RCC = "RCC"
    RFD = "RFD"
    ZAB = "ZAB"
    ZBA = "ZBA"

    # New individual business types
    PAB = "PAB"
    PAE = "PAE"
    PAI = "PAI"
    RCE = "RCE"
    RES = "RES"
    RHL = "RHL"
    RPP = "RPP"
    RSM = "RSM"
    RWS = "RWS"
    ZAD = "ZAD"
    ZAE = "ZAE"
    ZAF = "ZAF"
    ZAG = "ZAG"
    ZAH = "ZAH"
    ZAJ = "ZAJ"
    ZAM = "ZAM"
    ZAN = "ZAN"
    ZAS = "ZAS"
    ZAV = "ZAV"
    ZAY = "ZAY"
    ZBB = "ZBB"
    WEIXIU_RSM = "WEIXIU_RSM"
    VIVO_WATCH = "VIVO_WATCH"

    # Combined business types (for UI and generation)
    RDL_RDU = "RDL_RDU"  # 车门锁定解锁
    RDO_RDC = "RDO_RDC"  # 车门开关


class JobStatus(enum.Enum):
    """Generation job status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TestCaseGroup(Base):
    """Test case group model (renamed from TestCase)."""
    __tablename__ = "test_case_groups"

    id = Column(Integer, primary_key=True, index=True)
    business_type = Column(Enum(BusinessType), nullable=False, index=True)
    generation_metadata = Column(Text, nullable=True)  # JSON string for generation metadata
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Relationships
    test_case_items = relationship("TestCaseItem", back_populates="group", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TestCaseGroup(id={self.id}, business_type={self.business_type}, created_at={self.created_at})>"


class TestCaseItem(Base):
    """Individual test case item model."""
    __tablename__ = "test_case_items"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("test_case_groups.id"), nullable=False, index=True)
    test_case_id = Column(String(50), nullable=False, index=True)  # TC001, TC002...
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    module = Column(String(100), nullable=True)
    functional_module = Column(String(100), nullable=True)
    functional_domain = Column(String(100), nullable=True)
    preconditions = Column(Text, nullable=True)  # JSON string
    steps = Column(Text, nullable=True)  # JSON string
    expected_result = Column(Text, nullable=True)  # JSON string
    remarks = Column(Text, nullable=True)
    entity_order = Column(Float, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relationships
    group = relationship("TestCaseGroup", back_populates="test_case_items")
    knowledge_entities = relationship("TestCaseEntity", back_populates="test_case_item", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TestCaseItem(id={self.id}, test_case_id={self.test_case_id}, name={self.name})>"


# Keep TestCase for backward compatibility during migration


class GenerationJob(Base):
    """Generation job model."""
    __tablename__ = "generation_jobs"

    id = Column(String, primary_key=True, index=True)  # UUID string
    business_type = Column(Enum(BusinessType), nullable=False, index=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<GenerationJob(id={self.id}, business_type={self.business_type}, status={self.status})>"


class EntityType(enum.Enum):
    """Knowledge graph entity types."""
    SCENARIO = "scenario"      # 场景 (TSP远控场景)
    BUSINESS = "business"      # 业务类型 (RCC, RFD, etc.)
    INTERFACE = "interface"    # 接口 (/v1.0/remoteControl/control, etc.)
    TEST_CASE = "test_case"    # 测试用例


class KnowledgeEntity(Base):
    """Knowledge graph entity model."""
    __tablename__ = "knowledge_entities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    type = Column(Enum(EntityType), nullable=False, index=True)
    description = Column(Text, nullable=True)
    business_type = Column(Enum(BusinessType), nullable=True, index=True)  # 关联的业务类型
    parent_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=True, index=True)  # 父实体ID
    extra_data = Column(Text, nullable=True)  # JSON string for additional data
    entity_order = Column(Float, nullable=True, index=True)  # 实体排序
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relationships
    parent = relationship("KnowledgeEntity", remote_side=[id], backref="children")
    test_cases = relationship("TestCaseEntity", back_populates="entity", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<KnowledgeEntity(id={self.id}, name={self.name}, type={self.type})>"


class KnowledgeRelation(Base):
    """Knowledge graph relation model (triples)."""
    __tablename__ = "knowledge_relations"
    __table_args__ = (
        UniqueConstraint('subject_id', 'predicate', 'object_id', 'business_type', name='uq_relation'),
    )

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=False, index=True)
    predicate = Column(String(50), nullable=False, index=True)  # has, calls, contains, etc.
    object_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=False, index=True)
    business_type = Column(Enum(BusinessType), nullable=True, index=True)  # 关联的业务类型
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relationships
    subject = relationship("KnowledgeEntity", foreign_keys=[subject_id])
    object = relationship("KnowledgeEntity", foreign_keys=[object_id])

    def __repr__(self):
        return f"<KnowledgeRelation(id={self.id}, {self.subject.name} {self.predicate} {self.object.name})>"


class TestCaseEntity(Base):
    """Test case entity model for knowledge graph."""
    __tablename__ = "test_case_entities"

    id = Column(Integer, primary_key=True, index=True)
    test_case_item_id = Column(Integer, ForeignKey("test_case_items.id"), nullable=False, index=True)
    entity_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON string for tags
    extra_metadata = Column(Text, nullable=True)  # JSON string for additional metadata
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relationships
    test_case_item = relationship("TestCaseItem", back_populates="knowledge_entities")
    entity = relationship("KnowledgeEntity", back_populates="test_cases")

    def __repr__(self):
        return f"<TestCaseEntity(id={self.id}, name={self.name}, test_case_item_id={self.test_case_item_id})>"