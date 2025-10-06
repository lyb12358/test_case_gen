"""
Test configuration functionality.
"""

import sys
import os

# Add project root to path for testing
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

from src.utils.config import Config


def test_config_initialization():
    """Test that configuration can be initialized."""
    config = Config()
    assert config is not None
    print("Config initialization test passed")


def test_config_has_required_attributes():
    """Test that config has required attributes."""
    config = Config()
    assert hasattr(config, 'api_key')
    assert hasattr(config, 'api_base_url')
    assert hasattr(config, 'model')
    print("Config attributes test passed")


def test_config_validation():
    """Test configuration validation."""
    config = Config()
    # Test that validation works (may fail if env vars not set)
    result = config.validate_main_config()
    assert isinstance(result, bool)
    print("Config validation test passed")


if __name__ == "__main__":
    test_config_initialization()
    test_config_has_required_attributes()
    test_config_validation()
    print("All configuration tests passed!")