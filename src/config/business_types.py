"""
Centralized business types configuration module.

此模块现在使用统一的业务类型管理器，从数据库动态获取业务类型配置，
同时保持向后兼容的API接口。
"""

from typing import Dict, List
from ..services.business_type_manager import (
    business_type_manager,
    get_business_type_name,
    get_business_type_description,
    get_business_file_mapping,
    get_business_interface,
    get_business_interface_entity,
    get_business_type_mapping,
    get_all_business_types
)

# 为了向后兼容，从管理器获取配置
_config = business_type_manager.get_config()

# 向后兼容的常量
BUSINESS_TYPE_NAMES = _config.get('BUSINESS_TYPE_NAMES', {})
BUSINESS_TYPE_DESCRIPTIONS = _config.get('BUSINESS_TYPE_DESCRIPTIONS', {})
SPECIAL_FILE_MAPPINGS = _config.get('SPECIAL_FILE_MAPPINGS', {})
BUSINESS_INTERFACE_MAPPING = _config.get('BUSINESS_INTERFACE_MAPPING', {})
BUSINESS_INTERFACE_ENTITY_MAPPING = _config.get('BUSINESS_INTERFACE_ENTITY_MAPPING', {})
DEFAULT_BUSINESS_INTERFACE = _config.get('DEFAULT_BUSINESS_INTERFACE', 'remote_control_api')
DEFAULT_BUSINESS_INTERFACE_ENTITY = _config.get('DEFAULT_BUSINESS_INTERFACE_ENTITY', 'TSP远程控制接口')


# 所有函数现在从business_type_manager导入，保持向后兼容性