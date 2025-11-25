# -*- coding: utf-8 -*-
"""
编码配置工具模块
为项目提供统一的编码处理支持，特别是Windows环境下的中文显示
"""

import os
import sys
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def setup_encoding_environment():
    """
    设置编码环境变量以支持中文显示
    特别针对Windows环境优化
    """
    try:
        # 设置Python编码环境变量
        os.environ['PYTHONIOENCODING'] = 'utf-8'
        os.environ['PYTHONUTF8'] = '1'

        # Windows特定的编码设置
        if sys.platform == 'win32':
            os.environ['LANG'] = 'zh_CN.UTF-8'
            # 尝试设置控制台代码页为UTF-8
            try:
                import ctypes
                ctypes.windll.kernel32.SetConsoleOutputCP(65001)  # UTF-8
                ctypes.windll.kernel32.SetConsoleCP(65001)  # UTF-8
            except (ImportError, AttributeError, OSError):
                # 如果设置失败，记录日志但不中断程序
                logger.debug("无法设置控制台编码，但这不影响程序功能")

        logger.info("编码环境设置完成: UTF-8")
        return True

    except Exception as e:
        logger.warning(f"编码环境设置失败: {e}")
        return False


def get_default_encoding() -> str:
    """
    获取默认文件编码

    Returns:
        str: 默认编码名称
    """
    return 'utf-8'


def ensure_utf8_encoding(encoding: Optional[str] = None) -> str:
    """
    确保使用UTF-8编码

    Args:
        encoding: 输入的编码名称

    Returns:
        str: UTF-8编码名称
    """
    if encoding is None:
        return 'utf-8'

    # 标准化编码名称
    encoding = encoding.lower().replace('-', '')

    utf8_variants = ['utf8', 'utf_8', 'u8']
    if encoding in utf8_variants:
        return 'utf-8'

    # 对于其他编码，也尝试标准化
    encoding_map = {
        'gbk': 'gbk',
        'gb2312': 'gb2312',
        'gb18030': 'gb18030',
        'ascii': 'ascii',
        'latin1': 'latin1',
        'cp1252': 'cp1252'
    }

    return encoding_map.get(encoding, 'utf-8')


def safe_open(file_path: str, mode: str = 'r', encoding: str = 'utf-8',
              errors: str = 'replace', **kwargs):
    """
    安全的文件打开函数，确保编码处理正确

    Args:
        file_path: 文件路径
        mode: 打开模式
        encoding: 文件编码
        errors: 编码错误处理方式
        **kwargs: 其他参数

    Returns:
        文件对象
    """
    # 确保编码正确
    encoding = ensure_utf8_encoding(encoding)

    # 确保二进制模式不设置编码
    if 'b' in mode:
        return open(file_path, mode, **kwargs)

    return open(file_path, mode, encoding=encoding, errors=errors, **kwargs)


def configure_logging_encoding():
    """
    配置日志记录器的编码处理
    """
    # Windows下配置日志流编码
    if sys.platform == 'win32':
        try:
            # 为标准输出流设置编码
            if hasattr(sys.stdout, 'reconfigure'):
                sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, OSError):
            logger.debug("无法配置标准流编码")


# 模块初始化时自动设置编码环境
setup_encoding_environment()
configure_logging_encoding()