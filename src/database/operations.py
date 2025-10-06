"""
Database CRUD operations for test case generation service.
"""

import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import delete, and_

from .models import TestCase, GenerationJob, BusinessType, JobStatus


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