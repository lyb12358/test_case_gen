"""
SQLAlchemy database models for test case generation service.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, Float, UniqueConstraint, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()


class Project(Base):
    """Project table for hierarchical management of business scenarios."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Relationships
    test_case_groups = relationship("TestCaseGroup", back_populates="project")
    generation_jobs = relationship("GenerationJob", back_populates="project")
    knowledge_entities = relationship("KnowledgeEntity", back_populates="project")
    knowledge_relations = relationship("KnowledgeRelation", back_populates="project")
    prompts = relationship("Prompt", back_populates="project")
    prompt_versions = relationship("PromptVersion", back_populates="project")
    prompt_templates = relationship("PromptTemplate", back_populates="project")
    business_types = relationship("BusinessTypeConfig", back_populates="project")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}')>"


class BusinessTypeConfig(Base):
    """Business type configuration table for dynamic business type management."""
    __tablename__ = "business_type_configs"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Required project association
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=False, nullable=False)  # Default to False, need explicit activation
    prompt_combination_id = Column(Integer, ForeignKey("prompt_combinations.id"), nullable=True, index=True)

    # Metadata fields
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="business_types")
    prompt_combination = relationship("PromptCombination", back_populates="business_types")

    def __repr__(self):
        return f"<BusinessTypeConfig(code='{self.code}', name='{self.name}', active={self.is_active})>"


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
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    business_type = Column(Enum(BusinessType), nullable=False, index=True)
    generation_metadata = Column(Text, nullable=True)  # JSON string for generation metadata
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="test_case_groups")
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

    id = Column(String(36), primary_key=True, index=True)  # UUID string
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    business_type = Column(Enum(BusinessType), nullable=False, index=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="generation_jobs")

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
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    type = Column(Enum(EntityType), nullable=False, index=True)
    description = Column(Text, nullable=True)
    business_type = Column(Enum(BusinessType), nullable=True, index=True)  # 关联的业务类型
    parent_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=True, index=True)  # 父实体ID
    extra_data = Column(Text, nullable=True)  # JSON string for additional data
    entity_order = Column(Float, nullable=True, index=True)  # 实体排序
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="knowledge_entities")
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
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=False, index=True)
    predicate = Column(String(50), nullable=False, index=True)  # has, calls, contains, etc.
    object_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=False, index=True)
    business_type = Column(Enum(BusinessType), nullable=True, index=True)  # 关联的业务类型
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="knowledge_relations")
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


class PromptType(enum.Enum):
    """Prompt types for categorization."""
    SYSTEM = "system"                    # System-level prompts
    TEMPLATE = "template"                # Template prompts with variables
    BUSINESS_DESCRIPTION = "business_description"  # Business-specific descriptions
    SHARED_CONTENT = "shared_content"    # Shared/reusable content
    REQUIREMENTS = "requirements"        # Requirements generation prompts


class PromptStatus(enum.Enum):
    """Prompt status for workflow management."""
    DRAFT = "draft"                      # Work in progress
    ACTIVE = "active"                    # Currently in use
    ARCHIVED = "archived"                # No longer used but kept
    DEPRECATED = "deprecated"            # Outdated, should not be used


class PromptCategory(Base):
    """Prompt category model for organization."""
    __tablename__ = "prompt_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("prompt_categories.id"), nullable=True, index=True)
    order = Column(Float, default=0.0, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relationships
    parent = relationship("PromptCategory", remote_side=[id], backref="children")
    prompts = relationship("Prompt", back_populates="category")

    def __repr__(self):
        return f"<PromptCategory(id={self.id}, name={self.name})>"


class Prompt(Base):
    """Main prompt model for database storage."""
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    content = Column(Text, nullable=False)
    type = Column(Enum(PromptType), nullable=False, index=True)
    business_type = Column(Enum(BusinessType), nullable=True, index=True)  # Associated business type if applicable
    status = Column(Enum(PromptStatus), default=PromptStatus.DRAFT, nullable=False, index=True)

    # Metadata
    author = Column(String(100), nullable=True)
    version = Column(String(20), default="1.0.0", nullable=False)
    tags = Column(Text, nullable=True)  # JSON string for tags array
    variables = Column(Text, nullable=True)  # JSON string for template variables
    extra_metadata = Column(Text, nullable=True)  # JSON string for additional metadata

    # Organization
    category_id = Column(Integer, ForeignKey("prompt_categories.id"), nullable=True, index=True)
    file_path = Column(String(500), nullable=True)  # Original file path for migration tracking


    # Timestamps
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="prompts")
    category = relationship("PromptCategory", back_populates="prompts")
    versions = relationship("PromptVersion", back_populates="prompt", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Prompt(id={self.id}, name={self.name}, type={self.type}, status={self.status})>"


class PromptVersion(Base):
    """Prompt version history model."""
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False, index=True)
    version_number = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    changelog = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="prompt_versions")
    prompt = relationship("Prompt", back_populates="versions")

    def __repr__(self):
        return f"<PromptVersion(id={self.id}, prompt_id={self.prompt_id}, version={self.version_number})>"


class PromptTemplate(Base):
    """Prompt template model for reusable templates."""
    __tablename__ = "prompt_templates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    template_content = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    variables = Column(Text, nullable=True)  # JSON string for template variables
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="prompt_templates")

    def __repr__(self):
        return f"<PromptTemplate(id={self.id}, name={self.name})>"


class PromptCombination(Base):
    """Prompt combination model for storing business prompt configurations."""
    __tablename__ = "prompt_combinations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    business_type = Column(Enum(BusinessType), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_valid = Column(Boolean, default=False, nullable=False)  # Whether the combination is valid/complete
    validation_errors = Column(Text, nullable=True)  # JSON string for validation errors

    # Metadata
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Relationships
    project = relationship("Project")
    business_types = relationship("BusinessTypeConfig", back_populates="prompt_combination")
    items = relationship("PromptCombinationItem", back_populates="combination", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PromptCombination(id={self.id}, name='{self.name}', valid={self.is_valid})>"


class PromptCombinationItem(Base):
    """Individual items within a prompt combination."""
    __tablename__ = "prompt_combination_items"

    id = Column(Integer, primary_key=True, index=True)
    combination_id = Column(Integer, ForeignKey("prompt_combinations.id"), nullable=False, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False, index=True)
    order = Column(Integer, nullable=False, default=0)
    variable_name = Column(String(100), nullable=True)  # Variable name for template substitution
    is_required = Column(Boolean, default=True, nullable=False)

    # Metadata
    created_at = Column(DateTime, default=datetime.now, nullable=True)

    # Relationships
    combination = relationship("PromptCombination", back_populates="items")
    prompt = relationship("Prompt")

    def __repr__(self):
        return f"<PromptCombinationItem(id={self.id}, combination_id={self.combination_id}, order={self.order})>"