# -*- coding: utf-8 -*-
"""
SQLAlchemy database models for test case generation service.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, Float, UniqueConstraint, Boolean, Index, JSON
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import relationship
import enum

# Define UnifiedTestCaseStatus locally for database models
class UnifiedTestCaseStatus(enum.Enum):
    """Unified test case status for workflow management."""
    DRAFT = "draft"                    # Initial draft, needs review
    APPROVED = "approved"              # Approved and ready for test case generation
    COMPLETED = "completed"            # Test case fully completed with steps


class UnifiedTestCaseStage(enum.Enum):
    """Test case stage to distinguish between test point and test case."""
    test_point = "test_point"          # Test point stage (basic info only) - 匹配数据库中的小写值
    test_case = "test_case"            # Test case stage (with execution details) - 匹配数据库中的小写值

    # 提供大写常量以便代码中使用
    TEST_POINT = "test_point"
    TEST_CASE = "test_case"

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
    test_cases = relationship("UnifiedTestCase", back_populates="project")
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

    # Two-stage generation (unified)
    test_point_combination_id = Column(Integer, ForeignKey("prompt_combinations.id"), nullable=True, index=True)
    test_case_combination_id = Column(Integer, ForeignKey("prompt_combinations.id"), nullable=True, index=True)

    # Template variable configuration
    template_config = Column(JSON, default={}, nullable=True)

    # Additional configuration for business type specific settings
    additional_config = Column(JSON, default={}, nullable=True)

    # Metadata fields
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="business_types")

    # Two-stage generation combinations - accessed via business_service methods
    # These avoid complex relationship mapping while maintaining functionality

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




# UnifiedTestCaseStatus moved to models.unified_test_case to avoid conflicts


class UnifiedTestCase(Base):
    """Unified test case model that represents both test points and test cases as the same entity.

    Test points and test cases are the same record at different stages:
    - test_point: Initial stage with basic information (test_case_id + name + description)
    - test_case: Complete stage with execution steps and details

    They share the same id and test_case_id, differentiated only by the 'stage' field and
    the presence of execution-related fields like steps, preconditions, and expected_result.
    """
    __tablename__ = "unified_test_cases"
    __table_args__ = (
        Index('idx_test_case_id', 'test_case_id'),
        # New composite indexes for project + business_type queries
        Index('idx_test_case_project_business', 'project_id', 'business_type'),
        Index('idx_test_case_business_status', 'business_type', 'status'),
        Index('idx_test_case_stage_status', 'stage', 'status'),
        Index('idx_test_case_project_stage', 'project_id', 'stage'),
        # Business-scoped uniqueness constraint for names
        UniqueConstraint('business_type', 'name', name='uq_test_case_business_name'),
        # Stage-based uniqueness constraint for item IDs
        UniqueConstraint('business_type', 'test_case_id', name='uq_test_case_business_item_id'),
    )

    # === Core identification fields (simplified) ===
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    business_type = Column(Enum(BusinessType), nullable=False, index=True)
    test_case_id = Column(String(50), nullable=False, index=True)  # Use existing field name
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # === Stage, status and priority (for unified system) ===
    stage = Column(Enum(UnifiedTestCaseStage), default=UnifiedTestCaseStage.test_point, nullable=False, index=True)
    status = Column(Enum(UnifiedTestCaseStatus), default=UnifiedTestCaseStatus.DRAFT, nullable=False, index=True)
    priority = Column(String(20), default='medium', nullable=False)

    # === Test case specific fields (null for test point stage) ===
    module = Column(String(100), nullable=True)  # Test case module classification
    functional_module = Column(String(100), nullable=True)  # Functional module
    functional_domain = Column(String(100), nullable=True)  # Functional domain

    # === Test execution details (JSON format, null for test point stage) ===
    preconditions = Column(Text, nullable=True)  # JSON string: ["condition1", "condition2"]
    steps = Column(Text, nullable=True)  # JSON string: [{"step": 1, "action": "...", "expected": "..."}]
    expected_result = Column(Text, nullable=True)  # JSON string: ["result1", "result2"]
    remarks = Column(Text, nullable=True)  # Additional remarks

    # === Ordering and timestamps ===
    entity_order = Column(Float, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    generation_job_id = Column(String(36), ForeignKey("generation_jobs.id"), nullable=True, index=True)

    # === Relationships ===
    project = relationship("Project", back_populates="test_cases")
    # test_point relationship removed as TestPoint table is being deprecated
    knowledge_entities = relationship("TestCaseEntity", back_populates="test_case_item", foreign_keys="TestCaseEntity.test_case_item_id", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<UnifiedTestCase(id={self.id}, test_case_id={self.test_case_id}, name='{self.name}')>"

    def is_test_point_stage(self) -> bool:
        """Check if this record is in test point stage (no execution details)."""
        return self.steps is None and self.preconditions is None and self.expected_result is None

    def is_test_case_stage(self) -> bool:
        """Check if this record is in test case stage (has execution details)."""
        return not self.is_test_point_stage()


# TestCaseItem model removed - replaced by UnifiedTestCase
# Keep this comment for backward compatibility reference during migration


class GenerationJob(Base):
    """Generation job model."""
    __tablename__ = "generation_jobs"

    id = Column(String(36), primary_key=True, index=True)  # UUID string
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    business_type = Column(Enum(BusinessType), nullable=False, index=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False, index=True)
    # 添加generation_mode字段来区分生成模式
    generation_mode = Column(String(20), nullable=True, index=True, comment="生成模式: test_points_only/test_cases_only")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)

    # Progress tracking fields for background tasks
    current_step = Column(Integer, nullable=True, index=True)  # Current step in multi-step processes
    total_steps = Column(Integer, nullable=True, index=True)    # Total number of steps
    step_description = Column(Text, nullable=True)              # Description of current step
    progress = Column(Integer, default=0, nullable=True)         # Progress percentage (0-100)

    # Result storage fields
    result_data = Column(Text, nullable=True)  # JSON string containing detailed results
    generation_metadata = Column(Text, nullable=True)     # Additional metadata (JSON string)

    # Performance tracking
    duration_seconds = Column(Integer, nullable=True)  # Total duration in seconds
    test_points_generated = Column(Integer, default=0, nullable=True)  # Number of test points generated
    test_cases_generated = Column(Integer, default=0, nullable=True)   # Number of test cases generated

    # Relationships
    project = relationship("Project", back_populates="generation_jobs")

    def __repr__(self):
        return f"<GenerationJob(id={self.id}, business_type={self.business_type}, status={self.status})>"


class EntityType(enum.Enum):
    """Knowledge graph entity types."""
    # Legacy entity types removed: SCENARIO, BUSINESS, INTERFACE
    TEST_CASE = "TEST_CASE"    # 测试用例

    # New entity types for knowledge graph
    TSP = "tsp"                # TSP根节点 (TSP测试用例生成平台)
    PROJECT = "project"        # 项目节点 (测试项目管理)
    BUSINESS_TYPE = "business_type"  # 业务类型节点 (TSP业务类型)
    TEST_POINT = "test_point"  # 测试点节点 (测试点场景)


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
        # Add composite indexes for common queries
        Index('idx_relation_business_type', 'business_type', 'created_at'),
        Index('idx_relation_predicate_object', 'predicate', 'object_id'),
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
    """Test case entity model for knowledge graph - supports both legacy and unified test cases."""
    __tablename__ = "test_case_entities"

    id = Column(Integer, primary_key=True, index=True)
    # Legacy support for unified_test_cases
    test_case_item_id = Column(Integer, ForeignKey("unified_test_cases.id"), nullable=True, index=True)
    # New support for unified test_cases (also references unified_test_cases table)
    # TODO: Add migration to create test_case_id field in database
    # test_case_id = Column(Integer, ForeignKey("unified_test_cases.id"), nullable=True, index=True)

    entity_id = Column(Integer, ForeignKey("knowledge_entities.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON string for tags
    extra_metadata = Column(Text, nullable=True)  # JSON string for additional metadata
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relationships
    test_case_item = relationship("UnifiedTestCase", back_populates="knowledge_entities", foreign_keys=[test_case_item_id])
    # TODO: Re-enable test_case relationship when test_case_id field is added to database
    # test_case = relationship("UnifiedTestCase", back_populates="knowledge_entities", foreign_keys=[test_case_id], overlaps="test_case_item")
    entity = relationship("KnowledgeEntity", back_populates="test_cases")

    def __repr__(self):
        # TODO: Update when test_case_id field is available
        return f"<TestCaseEntity(id={self.id}, test_case_item_id={self.test_case_item_id}, entity_id={self.entity_id})>"


class PromptType(enum.Enum):
    """Prompt types for categorization."""
    SYSTEM = "system"                    # System-level prompts
    TEMPLATE = "template"                # Template prompts with variables
    BUSINESS_DESCRIPTION = "business_description"  # Business-specific descriptions
    SHARED_CONTENT = "shared_content"    # Shared/reusable content


class PromptStatus(enum.Enum):
    """Prompt status for workflow management."""
    DRAFT = "draft"                      # Work in progress
    ACTIVE = "active"                    # Currently in use
    ARCHIVED = "archived"                # No longer used but kept
    DEPRECATED = "deprecated"            # Outdated, should not be used


class GenerationStage(str, enum.Enum):
    """Generation stage type for prompts."""
    test_point = "test_point"                         # Test point generation prompts
    test_case = "test_case"                           # Test case generation prompts
    general = "general"                               # General purpose prompts

    # 为了向后兼容和代码使用方便，提供大写属性（只读）
    @property
    def TEST_POINT(self):
        return self.test_point

    @property
    def TEST_CASE(self):
        return self.test_case

    @property
    def GENERAL(self):
        return self.general


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
    __table_args__ = (
        # Composite indexes for prompt management queries
        Index('idx_prompt_type_status', 'type', 'status'),
        Index('idx_prompt_business_type', 'business_type', 'status'),
        Index('idx_prompt_project_type', 'project_id', 'type'),
        Index('idx_prompt_generation_stage', 'generation_stage', 'status'),
        Index('idx_prompt_business_stage', 'business_type', 'generation_stage'),
    )

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    content = Column(Text, nullable=False)
    type = Column(Enum(PromptType), nullable=False, index=True)
    business_type = Column(Enum(BusinessType), nullable=True, index=True)  # Associated business type if applicable
    status = Column(Enum(PromptStatus), default=PromptStatus.DRAFT, nullable=False, index=True)
    generation_stage = Column(Enum(GenerationStage), nullable=True, index=True, default=GenerationStage.general)  # Generation stage type: test_point, test_case, general

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
    # Note: BusinessTypeConfig relationships accessed via business_service methods
    # to avoid complex relationship mapping issues
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

    # Two-stage generation support
    item_type = Column(String(20), default='user_prompt', nullable=False)  # 'system_prompt' | 'user_prompt'
    section_title = Column(String(200), nullable=True)  # For organizing prompts in sections

    # Metadata
    created_at = Column(DateTime, default=datetime.now, nullable=True)

    # Relationships
    combination = relationship("PromptCombination", back_populates="items")
    prompt = relationship("Prompt")

    def __repr__(self):
        return f"<PromptCombinationItem(id={self.id}, combination_id={self.combination_id}, order={self.order})>"


# TestPoint class removed - migrated to unified architecture using UnifiedTestCase with stage='test_point'


class TemplateVariableType(enum.Enum):
    """Template variable types."""
    PROJECT = "project"          # Project dimension variables
    BUSINESS = "business"        # Business dimension variables
    HISTORY_TEST_POINTS = "history_test_points"    # Historical test points
    HISTORY_TEST_CASES = "history_test_cases"      # Historical test cases
    CONTEXT = "context"          # Runtime context variables
    CUSTOM = "custom"            # User-defined variables


class TemplateVariable(Base):
    """Template variable configuration table."""
    __tablename__ = "template_variables"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    variable_type = Column(Enum(TemplateVariableType), nullable=False, index=True)
    business_type = Column(String(20), nullable=True, index=True)  # Optional business type filter
    source_query = Column(Text, nullable=True)  # SQL query or configuration to get value
    default_value = Column(Text, nullable=True)  # Default value if source fails
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    def __repr__(self):
        return f"<TemplateVariable(id={self.id}, name='{self.name}', type='{self.variable_type}', active={self.is_active})>"