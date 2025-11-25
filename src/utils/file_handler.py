# -*- coding: utf-8 -*-
"""
File handling utilities.
"""

import os
import json
from typing import Dict, Any, Optional


def load_text_file(file_path: str, encoding: str = 'utf-8') -> Optional[str]:
    """
    Load text content from a file.

    Args:
        file_path (str): Path to the file
        encoding (str): File encoding, defaults to 'utf-8'

    Returns:
        Optional[str]: File content or None if failed
    """
    try:
        with open(file_path, 'r', encoding=encoding) as f:
            return f.read()
    except FileNotFoundError:
        return None
    except Exception as e:
        return None


def load_json_file(file_path: str, encoding: str = 'utf-8') -> Optional[Dict[str, Any]]:
    """
    Load JSON data from a file.

    Args:
        file_path (str): Path to the JSON file
        encoding (str): File encoding, defaults to 'utf-8'

    Returns:
        Optional[Dict[str, Any]]: JSON data or None if failed
    """
    try:
        with open(file_path, 'r', encoding=encoding) as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        return None
    except Exception as e:
        return None


def save_json_file(data: Dict[str, Any], file_path: str, encoding: str = 'utf-8') -> bool:
    """
    Save JSON data to a file.

    Args:
        data (Dict[str, Any]): Data to save
        file_path (str): Path to save the file
        encoding (str): File encoding, defaults to 'utf-8'

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, 'w', encoding=encoding) as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        return False


def ensure_directory_exists(directory_path: str) -> None:
    """
    Ensure that a directory exists, create it if necessary.

    Args:
        directory_path (str): Path to the directory
    """
    os.makedirs(directory_path, exist_ok=True)


def get_file_extension(file_path: str) -> str:
    """
    Get the file extension from a file path.

    Args:
        file_path (str): Path to the file

    Returns:
        str: File extension (without the dot)
    """
    return os.path.splitext(file_path)[1][1:].lower()


def generate_timestamped_filename(base_name: str, extension: str, timestamp: str = None) -> str:
    """
    Generate a filename with timestamp.

    Args:
        base_name (str): Base name for the file
        extension (str): File extension (without the dot)
        timestamp (str): Optional timestamp, defaults to current time

    Returns:
        str: Generated filename with timestamp
    """
    if timestamp is None:
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    return f"{base_name}_{timestamp}.{extension}"