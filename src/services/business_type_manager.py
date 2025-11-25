# -*- coding: utf-8 -*-
"""
统一业务类型管理器
从数据库动态获取业务类型配置，替代硬编码的业务类型定义
"""

import json
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.database.database import DatabaseManager
from src.database.models import BusinessTypeConfig
from src.utils.config import Config


class BusinessTypeManager:
    """统一业务类型管理器，提供动态业务类型配置功能"""

    def __init__(self):
        self._cache: Optional[Dict[str, Any]] = None
        self._cache_timeout = 300  # 5分钟缓存
        self._last_access = 0

    def _get_db_session(self) -> Session:
        """获取数据库会话"""
        try:
            config = Config()
            db_manager = DatabaseManager(config)
            return db_manager.get_session().__enter__()
        except Exception as e:
            # 如果数据库连接失败，返回None
            print(f"Warning: Cannot connect to database: {e}")
            return None

    def _is_cache_valid(self) -> bool:
        """检查缓存是否有效"""
        import time
        return (self._cache is not None and
                time.time() - self._last_access < self._cache_timeout)

    def _refresh_cache(self) -> Dict[str, Any]:
        """刷新业务类型缓存"""
        session = self._get_db_session()
        if not session:
            # 如果无法连接数据库，返回硬编码的默认配置
            return self._get_fallback_config()

        try:
            # 从数据库获取所有业务类型配置
            business_types = session.query(BusinessTypeConfig).all()

            if not business_types:
                # 如果数据库中没有配置，使用硬编码配置
                print("Warning: No business types found in database, using fallback config")
                return self._get_fallback_config()

            # 构建配置字典
            business_type_names = {}
            business_type_descriptions = {}
            special_file_mappings = {}
            business_interface_mapping = {}
            business_interface_entity_mapping = {}

            for bt in business_types:
                code = bt.code
                business_type_names[code] = bt.name or code
                business_type_descriptions[code] = bt.description or f"业务类型 {code} 的功能描述"

                # 解析additional_config中的特殊映射
                if bt.additional_config:
                    try:
                        config_data = json.loads(bt.additional_config) if isinstance(bt.additional_config, str) else bt.additional_config
                        if config_data.get('file_mapping'):
                            special_file_mappings[code] = config_data['file_mapping']
                        if config_data.get('interface_mapping'):
                            business_interface_mapping[code] = config_data['interface_mapping']
                        if config_data.get('interface_entity'):
                            business_interface_entity_mapping[code] = config_data['interface_entity']
                    except (json.JSONDecodeError, TypeError):
                        pass

            cache_data = {
                'BUSINESS_TYPE_NAMES': business_type_names,
                'BUSINESS_TYPE_DESCRIPTIONS': business_type_descriptions,
                'SPECIAL_FILE_MAPPINGS': special_file_mappings,
                'BUSINESS_INTERFACE_MAPPING': business_interface_mapping,
                'BUSINESS_INTERFACE_ENTITY_MAPPING': business_interface_entity_mapping,
                'DEFAULT_BUSINESS_INTERFACE': 'remote_control_api',
                'DEFAULT_BUSINESS_INTERFACE_ENTITY': 'TSP远程控制接口'
            }

            self._cache = cache_data
            import time
            self._last_access = time.time()

            return cache_data

        except Exception as e:
            print(f"Error refreshing business type cache: {e}")
            return self._get_fallback_config()
        finally:
            session.close()

    def _get_fallback_config(self) -> Dict[str, Any]:
        """获取硬编码的备用配置（当数据库不可用时使用）"""
        return {
            'BUSINESS_TYPE_NAMES': {
                "RCC": "远程净化",
                "RFD": "香氛控制",
                "ZAB": "远程恒温座舱设置",
                "ZBA": "水淹报警",
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
                "RDL_RDU": "车门锁定解锁",
                "RDO_RDC": "车门/后备箱/引擎盖/加油盖/充电盖 开关",
            },
            'BUSINESS_TYPE_DESCRIPTIONS': {
                "RCC": "远程控制空调系统进行空气净化，支持自动和手动净化模式",
                "RFD": "远程控制车载香氛系统，支持多种香型选择和浓度调节",
                "ZAB": "远程调节座椅温度和座舱环境，提供舒适的驾乘体验",
                "ZBA": "车辆安全防护系统，检测水浸风险并及时报警提醒",
            },
            'SPECIAL_FILE_MAPPINGS': {
                "RDL_RDU": "RDL&RDU.md",
                "RDO_RDC": "RDO&RDC.md",
            },
            'BUSINESS_INTERFACE_MAPPING': {
                "ZAV": "ai_climate_inner_api",
                "ZAY": "remote_control_inner_api",
                "WEIXIU_RSM": "remote_control_inner_api",
                "VIVO_WATCH": "remote_control_inner_api"
            },
            'BUSINESS_INTERFACE_ENTITY_MAPPING': {
                "ZAV": "TSP智能空调接口",
                "ZAY": "TSP内部远控接口",
                "WEIXIU_RSM": "TSP内部远控接口",
                "VIVO_WATCH": "TSP内部远控接口"
            },
            'DEFAULT_BUSINESS_INTERFACE': 'remote_control_api',
            'DEFAULT_BUSINESS_INTERFACE_ENTITY': 'TSP远程控制接口'
        }

    def get_config(self) -> Dict[str, Any]:
        """获取业务类型配置"""
        if not self._is_cache_valid():
            self._refresh_cache()
        return self._cache or {}

    def get_business_type_name(self, business_type: str) -> str:
        """获取业务类型的中文名称"""
        config = self.get_config()
        names = config.get('BUSINESS_TYPE_NAMES', {})
        return names.get(business_type, business_type)

    def get_business_type_description(self, business_type: str) -> str:
        """获取业务类型的描述"""
        config = self.get_config()
        descriptions = config.get('BUSINESS_TYPE_DESCRIPTIONS', {})
        return descriptions.get(business_type, f"业务类型 {business_type} 的功能描述")

    def get_business_file_mapping(self, business_type: str) -> str:
        """获取业务类型的文件映射"""
        config = self.get_config()
        mappings = config.get('SPECIAL_FILE_MAPPINGS', {})
        return mappings.get(business_type, f"{business_type.upper()}.md")

    def get_business_interface(self, business_type: str) -> str:
        """获取业务类型的接口类型（用于提示词构建）"""
        config = self.get_config()
        mappings = config.get('BUSINESS_INTERFACE_MAPPING', {})
        return mappings.get(business_type, config.get('DEFAULT_BUSINESS_INTERFACE', 'remote_control_api'))

    def get_business_interface_entity(self, business_type: str) -> str:
        """获取业务类型的接口实体名称（用于知识图谱）"""
        config = self.get_config()
        mappings = config.get('BUSINESS_INTERFACE_ENTITY_MAPPING', {})
        return mappings.get(business_type, config.get('DEFAULT_BUSINESS_INTERFACE_ENTITY', 'TSP远程控制接口'))

    def get_all_business_types(self) -> List[str]:
        """获取所有业务类型代码"""
        config = self.get_config()
        names = config.get('BUSINESS_TYPE_NAMES', {})
        return list(names.keys())

    def get_business_type_mapping(self) -> Dict[str, Dict[str, str]]:
        """获取完整的业务类型映射（包含名称和描述）"""
        config = self.get_config()
        names = config.get('BUSINESS_TYPE_NAMES', {})
        descriptions = config.get('BUSINESS_TYPE_DESCRIPTIONS', {})

        mapping = {}
        for business_type in names.keys():
            mapping[business_type] = {
                "name": self.get_business_type_name(business_type),
                "description": self.get_business_type_description(business_type)
            }

        return mapping

    def clear_cache(self) -> None:
        """清除缓存，强制下次访问时重新从数据库加载"""
        self._cache = None
        self._last_access = 0


# 创建全局单例实例
business_type_manager = BusinessTypeManager()


# 向后兼容的函数接口
def get_business_type_name(business_type: str) -> str:
    """获取业务类型的中文名称（向后兼容）"""
    return business_type_manager.get_business_type_name(business_type)


def get_business_type_description(business_type: str) -> str:
    """获取业务类型的描述（向后兼容）"""
    return business_type_manager.get_business_type_description(business_type)


def get_business_file_mapping(business_type: str) -> str:
    """获取业务类型的文件映射（向后兼容）"""
    return business_type_manager.get_business_file_mapping(business_type)


def get_business_interface(business_type: str) -> str:
    """获取业务类型的接口类型（向后兼容）"""
    return business_type_manager.get_business_interface(business_type)


def get_business_interface_entity(business_type: str) -> str:
    """获取业务类型的接口实体名称（向后兼容）"""
    return business_type_manager.get_business_interface_entity(business_type)


def get_business_type_mapping() -> Dict[str, Dict[str, str]]:
    """获取完整的业务类型映射（向后兼容）"""
    return business_type_manager.get_business_type_mapping()


def get_all_business_types() -> List[str]:
    """获取所有业务类型代码（向后兼容）"""
    return business_type_manager.get_all_business_types()