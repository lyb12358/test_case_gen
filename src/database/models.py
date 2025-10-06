"""
SQLAlchemy database models for test case generation service.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()


class BusinessType(enum.Enum):
    """Supported business types."""
    RCC = "RCC"
    RFD = "RFD"
    ZAB = "ZAB"
    ZBA = "ZBA"


class JobStatus(enum.Enum):
    """Generation job status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TestCase(Base):
    """Test case model."""
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    business_type = Column(Enum(BusinessType), nullable=False, index=True)
    test_data = Column(Text, nullable=False)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<TestCase(id={self.id}, business_type={self.business_type}, created_at={self.created_at})>"


class GenerationJob(Base):
    """Generation job model."""
    __tablename__ = "generation_jobs"

    id = Column(String, primary_key=True, index=True)  # UUID string
    business_type = Column(Enum(BusinessType), nullable=False, index=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<GenerationJob(id={self.id}, business_type={self.business_type}, status={self.status})>"


class EntityType(enum.Enum):
    """Knowledge graph entity types."""
    BUSINESS = "business"      # 业务类型 (RCC, RFD, etc.)
    SERVICE = "service"        # 服务 (远程净化, 香氛控制, etc.)
    INTERFACE = "interface"    # 接口 (/v1.0/remoteControl/control, etc.)


class KnowledgeEntity(Base):
    """Knowledge graph entity model."""
    __tablename__ = "knowledge_entities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    type = Column(Enum(EntityType), nullable=False, index=True)
    description = Column(Text, nullable=True)
    business_type = Column(Enum(BusinessType), nullable=True, index=True)  # 关联的业务类型
    extra_data = Column(Text, nullable=True)  # JSON string for additional data
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<KnowledgeEntity(id={self.id}, name={self.name}, type={self.type})>"


class KnowledgeRelation(Base):
    """Knowledge graph relation model (triples)."""
    __tablename__ = "knowledge_relations"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=False, index=True)
    predicate = Column(String(50), nullable=False, index=True)  # has, calls, contains, etc.
    object_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=False, index=True)
    business_type = Column(Enum(BusinessType), nullable=True, index=True)  # 关联的业务类型
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subject = relationship("KnowledgeEntity", foreign_keys=[subject_id])
    object = relationship("KnowledgeEntity", foreign_keys=[object_id])

    def __repr__(self):
        return f"<KnowledgeRelation(id={self.id}, {self.subject.name} {self.predicate} {self.object.name})>"