"""
Business Type Validator

Provides database-driven business type validation to support dynamic business types.
This replaces the hardcoded BusinessType enum validation with flexible database lookup.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session

from src.database.models import BusinessTypeConfig

logger = logging.getLogger(__name__)


def validate_business_type(
    db: Session,
    business_type: str,
    project_id: Optional[int] = None,
    check_active: bool = True
) -> bool:
    """
    Validate if a business type exists in the database configuration.

    Args:
        db: Database session
        business_type: Business type code to validate (e.g., 'RCC', 'ACCOUNT_LOGOUT')
        project_id: Optional project ID for project-specific business type validation
        check_active: Whether to check if business type is active (default: True)

    Returns:
        bool: True if business type is valid, False otherwise

    Examples:
        >>> # Validate business type exists globally
        >>> is_valid = validate_business_type(db, 'RCC')

        >>> # Validate business type for specific project
        >>> is_valid = validate_business_type(db, 'ACCOUNT_LOGOUT', project_id=1)

        >>> # Validate including inactive business types
        >>> is_valid = validate_business_type(db, 'RCC', check_active=False)
    """
    if not business_type or not isinstance(business_type, str):
        logger.warning(f"Invalid business_type value: {business_type}")
        return False

    # Build query
    query = db.query(BusinessTypeConfig).filter(
        BusinessTypeConfig.code == business_type.upper()
    )

    # Filter by project if specified
    if project_id is not None:
        query = query.filter(BusinessTypeConfig.project_id == project_id)

    # Filter by active status if required
    if check_active:
        query = query.filter(BusinessTypeConfig.is_active == True)

    # Check if exists
    exists = query.first() is not None

    if not exists:
        logger.info(
            f"Business type '{business_type}' not found. "
            f"Project: {project_id}, Check active: {check_active}"
        )

    return exists


def validate_business_type_or_400(
    db: Session,
    business_type: str,
    project_id: Optional[int] = None,
    check_active: bool = True,
    error_message: Optional[str] = None
):
    """
    Validate business type and raise HTTPException if invalid.

    This is a convenience function for API endpoints that need to validate
    business types and return 400 errors for invalid values.

    Args:
        db: Database session
        business_type: Business type code to validate
        project_id: Optional project ID for project-specific validation
        check_active: Whether to check if business type is active
        error_message: Custom error message (optional)

    Raises:
        HTTPException: If business type is invalid (status_code=400)

    Examples:
        >>> # In API endpoint
        >>> validate_business_type_or_400(db, 'RCC', project_id=1)

        >>> # With custom error message
        >>> validate_business_type_or_400(
        ...     db, 'NEW_TYPE',
        ...     error_message="Business type 'NEW_TYPE' is not configured"
        ... )
    """
    from fastapi import HTTPException

    is_valid = validate_business_type(
        db=db,
        business_type=business_type,
        project_id=project_id,
        check_active=check_active
    )

    if not is_valid:
        # Build informative error message
        if error_message is None:
            # Get available business types for better error message
            query = db.query(BusinessTypeConfig.code)
            if project_id is not None:
                query = query.filter(BusinessTypeConfig.project_id == project_id)
            if check_active:
                query = query.filter(BusinessTypeConfig.is_active == True)

            available_types = [bt[0] for bt in query.all()]

            error_message = (
                f"Business type '{business_type}' is not configured"
                f"{' for project ' + str(project_id) if project_id else ''}. "
                f"Available types: {available_types}"
            )

        logger.warning(f"Business type validation failed: {error_message}")
        raise HTTPException(
            status_code=400,
            detail=error_message
        )


def get_available_business_types(
    db: Session,
    project_id: Optional[int] = None,
    active_only: bool = True
) -> list[str]:
    """
    Get list of available business type codes.

    Args:
        db: Database session
        project_id: Optional project ID to filter by
        active_only: Whether to return only active business types

    Returns:
        List of business type codes (e.g., ['RCC', 'RFD', 'ACCOUNT_LOGOUT'])

    Examples:
        >>> # Get all active business types
        >>> types = get_available_business_types(db)

        >>> # Get business types for specific project
        >>> types = get_available_business_types(db, project_id=1)
    """
    query = db.query(BusinessTypeConfig.code)

    if project_id is not None:
        query = query.filter(BusinessTypeConfig.project_id == project_id)

    if active_only:
        query = query.filter(BusinessTypeConfig.is_active == True)

    return [code[0] for code in query.all()]


def normalize_business_type(business_type: str) -> str:
    """
    Normalize business type code to uppercase.

    Args:
        business_type: Business type code in any case

    Returns:
        Uppercase business type code

    Examples:
        >>> normalize_business_type('rcc')
        'RCC'
        >>> normalize_business_type('Account_Logout')
        'ACCOUNT_LOGOUT'
    """
    if not business_type or not isinstance(business_type, str):
        return business_type

    return business_type.upper().strip()


def sanitize_business_type(business_type: str) -> str:
    """
    Sanitize business type code for safe database use.

    This removes any potentially dangerous characters and ensures
    the business type code is in a safe format.

    Args:
        business_type: Raw business type input

    Returns:
        Sanitized business type code

    Examples:
        >>> sanitize_business_type(' RCC ')
        'RCC'
        >>> sanitize_business_type('account-logout')
        'ACCOUNT_LOGOUT'
    """
    if not business_type or not isinstance(business_type, str):
        return business_type

    # Normalize: uppercase, strip whitespace, replace hyphens with underscores
    normalized = business_type.upper().strip()
    normalized = normalized.replace('-', '_')

    # Remove any characters that aren't alphanumeric or underscore
    sanitized = ''.join(c if c.isalnum() or c == '_' else '' for c in normalized)

    return sanitized
