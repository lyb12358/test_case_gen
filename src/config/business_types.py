"""
Centralized business types configuration module.

This module contains all business type mappings, descriptions, and interface configurations
to eliminate code duplication and ensure consistency across the application.
"""

from typing import Dict

# Business type Chinese names mapping
BUSINESS_TYPE_NAMES = {
    # Original business types
    "RCC": "远程净化",
    "RFD": "香氛控制",
    "ZAB": "远程恒温座舱设置",
    "ZBA": "水淹报警",

    # New individual business types
    "PAB": "百灵鸟远程灯光秀控制",
    "PAE": "远程车载冰箱设置（领克PAE）",
    "PAI": "远程车辆位置查看",
    "RCE": "环境调节",
    "RES": "远程发动机启动/停止",
    "RHL": "闪灯/鸣笛",
    "RPP": "查询PM2.5、温度、氧气浓度",
    "RSM": "开关管理",
    "RWS": "打开关闭窗户、天窗、遮阳帘",
    "ZAD": "远程储物箱私密锁设置",
    "ZAE": "远程车载冰箱设置",
    "ZAF": "新空调/环境调节",
    "ZAG": "开启/关闭 访客模式",
    "ZAH": "远程授权启动、允许驾驶",
    "ZAJ": "远程冷暖箱控制",
    "ZAM": "远程空气净化",
    "ZAN": "远程电池预热开关",
    "ZAS": "新访客模式(3.0)",
    "ZAV": "AI智能通风(3.0)",
    "ZAY": "智驾唤醒acdu(3.0)",
    "ZBB": "制氧机远控",
    "WEIXIU_RSM": "维修模式RSM",
    "VIVO_WATCH": "vivo手表远控",

    # Combined business types
    "RDL_RDU": "车门锁定解锁",
    "RDO_RDC": "车门/后备箱/引擎盖/加油盖/充电盖 开关",
}

# Business type descriptions mapping
BUSINESS_TYPE_DESCRIPTIONS = {
    # Original business types
    "RCC": "远程控制空调系统进行空气净化，支持自动和手动净化模式",
    "RFD": "远程控制车载香氛系统，支持多种香型选择和浓度调节",
    "ZAB": "远程调节座椅温度和座舱环境，提供舒适的驾乘体验",
    "ZBA": "车辆安全防护系统，检测水浸风险并及时报警提醒",

    # New individual business types
    "PAB": "远程音乐灯光秀可以为用户提供下载灯光秀、删除灯光秀、开启灯光秀、关闭灯光秀等功能",
    "PAE": "车载冰箱能对饮品或食品进行冷却或制热，用户可以通过APP设置单次、周期或立即三种模式的车载冰箱设置功能",
    "PAI": "远程查看车辆位置，支持触发式上传车辆位置信息，符合合规要求",
    "RCE": "远程控制空调、方向盘、座椅等环境调节功能，支持温度控制和多模式调节",
    "RES": "远程启动和停止汽车引擎，支持立即启动和停止模式",
    "RHL": "快速定位车辆位置，支持闪灯、鸣笛、闪灯鸣笛功能",
    "RPP": "从传感器获取PM2.5值、温度和氧气浓度数据，支持单项或组合查询",
    "RSM": "远程控制车辆各种开关，包括恒温座舱、代客模式、哨兵模式、露营模式等多种开关功能",
    "RWS": "远程控制车窗、天窗、遮阳帘的开启和关闭，支持多种目标选择",
    "ZAD": "储物箱密码激活和解除，保护用户隐私，支持密码和验证码两种方式",
    "ZAE": "远程控制车载冰箱开启关闭和温度设置，支持保温和冷藏两种模式",
    "ZAF": "增强版远程控制空调、方向盘、座椅，支持高温杀菌、急速制冷制热等多种功能",
    "ZAG": "访客模式开启和关闭功能，支持密码和验证码两种认证方式",
    "ZAH": "车主远程授权给当前用车人用车，支持远程启动和远程解锁功能",
    "ZAJ": "远程控制冷暖箱开启关闭，支持温度设置和运行时间控制",
    "ZAM": "远程控制车载空气净化系统，支持负离子发生器和净化功能",
    "ZAN": "远程开启或关闭电池预热功能，提升低温环境下的电池性能",
    "ZAS": "新一代访客模式系统，提供增强的车辆访问控制和安全验证功能",
    "ZAV": "基于AI算法的智能通风系统，自动调节车内空气环境和质量",
    "ZAY": "远程唤醒智能驾驶ADU单元，激活自动驾驶系统和相关功能",
    "ZBB": "远程控制车载制氧机系统，支持开关控制和时长设置功能",
    "WEIXIU_RSM": "繁星维修模式下的远程座椅控制功能",
    "VIVO_WATCH": "用于vivo手表远控，成功后需要调用特殊接口推送app消息",

    # Combined business types
    "RDL_RDU": "远程控制车门锁定和解锁，支持全车门和单门操作",
    "RDO_RDC": "远程控制车门、后备箱、引擎盖、加油盖、充电盖的开启和关闭",
}

# Special file mappings for business types that share files
SPECIAL_FILE_MAPPINGS = {
    # Combined business types
    "RDL_RDU": "RDL&RDU.md",
    "RDO_RDC": "RDO&RDC.md",
}

# Business type to interface mapping (for prompt builder)
BUSINESS_INTERFACE_MAPPING = {
    "ZAV": "ai_climate_inner_api",
    "ZAY": "remote_control_inner_api",
    "WEIXIU_RSM": "remote_control_inner_api",
    "VIVO_WATCH": "remote_control_inner_api"
}

# Default interface for business types not in the mapping
DEFAULT_BUSINESS_INTERFACE = "remote_control_api"

# Business type to knowledge graph interface mapping
BUSINESS_INTERFACE_ENTITY_MAPPING = {
    "ZAV": "TSP智能空调接口",
    "ZAY": "TSP内部远控接口",
    "WEIXIU_RSM": "TSP内部远控接口",
    "VIVO_WATCH": "TSP内部远控接口"
}

# Default interface entity for knowledge graph
DEFAULT_BUSINESS_INTERFACE_ENTITY = "TSP远程控制接口"


def get_business_type_name(business_type: str) -> str:
    """
    Get the Chinese name for a business type.

    Args:
        business_type (str): Business type code

    Returns:
        str: Chinese name for the business type
    """
    return BUSINESS_TYPE_NAMES.get(business_type, business_type)


def get_business_type_description(business_type: str) -> str:
    """
    Get the description for a business type.

    Args:
        business_type (str): Business type code

    Returns:
        str: Description for the business type
    """
    return BUSINESS_TYPE_DESCRIPTIONS.get(business_type, f"业务类型 {business_type} 的功能描述")


def get_business_file_mapping(business_type: str) -> str:
    """
    Get the file mapping for a business type.

    Args:
        business_type (str): Business type code

    Returns:
        str: Filename for the business description file
    """
    return SPECIAL_FILE_MAPPINGS.get(business_type, f"{business_type.upper()}.md")


def get_business_interface(business_type: str) -> str:
    """
    Get the interface type for a business type (for prompt builder).

    Args:
        business_type (str): Business type code

    Returns:
        str: Interface type for the business
    """
    return BUSINESS_INTERFACE_MAPPING.get(business_type, DEFAULT_BUSINESS_INTERFACE)


def get_business_interface_entity(business_type: str) -> str:
    """
    Get the interface entity name for a business type (for knowledge graph).

    Args:
        business_type (str): Business type code

    Returns:
        str: Interface entity name for the business
    """
    return BUSINESS_INTERFACE_ENTITY_MAPPING.get(business_type, DEFAULT_BUSINESS_INTERFACE_ENTITY)


def get_business_type_mapping() -> Dict[str, Dict[str, str]]:
    """
    Get complete business type mapping with names and descriptions.

    Returns:
        Dict[str, Dict[str, str]]: Complete mapping for all business types
    """
    mapping = {}
    all_business_types = set(BUSINESS_TYPE_NAMES.keys())

    for business_type in all_business_types:
        mapping[business_type] = {
            "name": get_business_type_name(business_type),
            "description": get_business_type_description(business_type)
        }

    return mapping