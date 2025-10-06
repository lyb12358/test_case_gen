"""
SQLAlchemy database models for test case generation service.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
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