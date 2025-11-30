# -*- coding: utf-8 -*-
"""
性能优化工具

提供缓存、性能监控和资源管理功能。
"""

import time
import logging
import functools
import asyncio
import threading
from typing import Any, Dict, Optional, Callable, Union
from datetime import datetime, timedelta
import hashlib
import json
from collections import defaultdict

logger = logging.getLogger(__name__)


class PerformanceMetrics:
    """性能指标收集器。"""

    def __init__(self):
        self.metrics = defaultdict(list)
        self.counters = defaultdict(int)
        self.lock = threading.Lock()

    def record_execution_time(self, operation: str, duration: float):
        """记录操作执行时间。"""
        with self.lock:
            self.metrics[operation].append({
                'duration': duration,
                'timestamp': datetime.utcnow(),
                'success': True
            })

    def record_error(self, operation: str, error: Exception):
        """记录错误。"""
        with self.lock:
            self.metrics[operation].append({
                'error': str(error),
                'timestamp': datetime.utcnow(),
                'success': False
            })

    def increment_counter(self, counter_name: str):
        """增加计数器。"""
        with self.lock:
            self.counters[counter_name] += 1

    def get_stats(self, operation: str, minutes: int = 60) -> Dict[str, Any]:
        """获取操作统计信息。"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)

        with self.lock:
            recent_metrics = [
                m for m in self.metrics[operation]
                if m['timestamp'] > cutoff_time
            ]

            if not recent_metrics:
                return {}

            successful = [m for m in recent_metrics if m['success']]
            failed = [m for m in recent_metrics if not m['success']]

            durations = [m['duration'] for m in successful if 'duration' in m]

            return {
                'operation': operation,
                'total_requests': len(recent_metrics),
                'success_count': len(successful),
                'error_count': len(failed),
                'success_rate': len(successful) / len(recent_metrics) if recent_metrics else 0,
                'avg_duration': sum(durations) / len(durations) if durations else 0,
                'min_duration': min(durations) if durations else 0,
                'max_duration': max(durations) if durations else 0,
                'total_count': self.counters.get(operation, 0)
            }

    def get_all_stats(self, minutes: int = 60) -> Dict[str, Any]:
        """获取所有操作的统计信息。"""
        with self.lock:
            return {
                operation: self.get_stats(operation, minutes)
                for operation in self.metrics.keys()
            }


# 全局性能指标实例
performance_metrics = PerformanceMetrics()


def performance_monitor(operation_name: str = None):
    """
    性能监控装饰器。

    Args:
        operation_name: 操作名称，默认使用函数名
    """
    def decorator(func: Callable) -> Callable:
        name = operation_name or f"{func.__module__}.{func.__name__}"

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                performance_metrics.record_execution_time(name, duration)
                performance_metrics.increment_counter(f"{name}_calls")
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_metrics.record_error(name, e)
                performance_metrics.increment_counter(f"{name}_errors")
                raise

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                performance_metrics.record_execution_time(name, duration)
                performance_metrics.increment_counter(f"{name}_calls")
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_metrics.record_error(name, e)
                performance_metrics.increment_counter(f"{name}_errors")
                raise

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


class LRUCache:
    """线程安全的LRU缓存实现。"""

    def __init__(self, max_size: int = 128, ttl: Optional[int] = None):
        """
        初始化LRU缓存。

        Args:
            max_size: 最大缓存项数
            ttl: 生存时间（秒），None表示永不过期
        """
        self.max_size = max_size
        self.ttl = ttl
        self.cache = {}
        self.access_order = []
        self.timestamps = {}
        self.lock = threading.Lock()

    def _generate_key(self, key: Any) -> str:
        """生成缓存键。"""
        if isinstance(key, str):
            return key
        elif isinstance(key, (dict, list, tuple)):
            # 对于复杂对象，使用JSON哈希作为键
            key_str = json.dumps(key, sort_keys=True, ensure_ascii=False)
            return hashlib.md5(key_str.encode('utf-8')).hexdigest()
        else:
            return str(key)

    def _is_expired(self, key: str) -> bool:
        """检查缓存项是否过期。"""
        if self.ttl is None:
            return False

        timestamp = self.timestamps.get(key)
        if timestamp is None:
            return True

        return time.time() - timestamp > self.ttl

    def _cleanup_expired(self):
        """清理过期的缓存项。"""
        if self.ttl is None:
            return

        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self.timestamps.items()
            if current_time - timestamp > self.ttl
        ]

        for key in expired_keys:
            self._remove_key(key)

    def _remove_key(self, key: str):
        """移除缓存项。"""
        if key in self.cache:
            del self.cache[key]
        if key in self.access_order:
            self.access_order.remove(key)
        if key in self.timestamps:
            del self.timestamps[key]

    def _update_access(self, key: str):
        """更新访问顺序。"""
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)

        if self.ttl is not None:
            self.timestamps[key] = time.time()

    def get(self, key: Any) -> Any:
        """获取缓存值。"""
        cache_key = self._generate_key(key)

        with self.lock:
            # 清理过期项
            self._cleanup_expired()

            if cache_key in self.cache and not self._is_expired(cache_key):
                self._update_access(cache_key)
                return self.cache[cache_key]

            return None

    def set(self, key: Any, value: Any):
        """设置缓存值。"""
        cache_key = self._generate_key(key)

        with self.lock:
            # 如果达到最大容量，移除最久未使用的项
            if len(self.cache) >= self.max_size and cache_key not in self.cache:
                if self.access_order:
                    oldest_key = self.access_order.pop(0)
                    self._remove_key(oldest_key)

            self.cache[cache_key] = value
            self._update_access(cache_key)

    def delete(self, key: Any):
        """删除缓存项。"""
        cache_key = self._generate_key(key)

        with self.lock:
            self._remove_key(cache_key)

    def clear(self):
        """清空缓存。"""
        with self.lock:
            self.cache.clear()
            self.access_order.clear()
            self.timestamps.clear()

    def size(self) -> int:
        """获取缓存大小。"""
        with self.lock:
            return len(self.cache)

    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息。"""
        with self.lock:
            self._cleanup_expired()

            return {
                'size': len(self.cache),
                'max_size': self.max_size,
                'ttl': self.ttl,
                'hit_rate': getattr(self, '_hits', 0) / max(getattr(self, '_hits', 0) + getattr(self, '_misses', 1), 0),
                'memory_usage': sum(len(str(v)) for v in self.cache.values())
            }


class CacheManager:
    """缓存管理器。"""

    def __init__(self):
        self.caches = {}
        self.lock = threading.Lock()

    def get_cache(self, name: str, max_size: int = 128, ttl: Optional[int] = None) -> LRUCache:
        """获取或创建缓存实例。"""
        with self.lock:
            if name not in self.caches:
                self.caches[name] = LRUCache(max_size=max_size, ttl=ttl)
            return self.caches[name]

    def clear_cache(self, name: str):
        """清空指定缓存。"""
        with self.lock:
            if name in self.caches:
                self.caches[name].clear()

    def clear_all_caches(self):
        """清空所有缓存。"""
        with self.lock:
            for cache in self.caches.values():
                cache.clear()

    def get_cache_stats(self) -> Dict[str, Dict[str, Any]]:
        """获取所有缓存统计信息。"""
        with self.lock:
            return {name: cache.get_stats() for name, cache in self.caches.items()}


# 全局缓存管理器
cache_manager = CacheManager()


def cached(cache_name: str, max_size: int = 128, ttl: Optional[int] = None):
    """
    缓存装饰器。

    Args:
        cache_name: 缓存名称
        max_size: 最大缓存项数
        ttl: 生存时间（秒）
    """
    def decorator(func: Callable) -> Callable:
        cache = cache_manager.get_cache(cache_name, max_size, ttl)

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # 生成缓存键（基于函数参数）
            cache_key = {
                'args': args,
                'kwargs': kwargs
            }

            # 尝试从缓存获取
            result = cache.get(cache_key)
            if result is not None:
                return result

            # 执行函数并缓存结果
            result = func(*args, **kwargs)
            cache.set(cache_key, result)
            return result

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = {
                'args': args,
                'kwargs': kwargs
            }

            # 尝试从缓存获取
            result = cache.get(cache_key)
            if result is not None:
                return result

            # 执行异步函数并缓存结果
            result = await func(*args, **kwargs)
            cache.set(cache_key, result)
            return result

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


class ResourceManager:
    """资源管理器，用于监控和管理系统资源使用。"""

    def __init__(self):
        self.start_time = time.time()
        self.peak_memory = 0
        self.active_connections = 0
        self.total_requests = 0

    def update_memory_usage(self, memory_mb: float):
        """更新内存使用情况。"""
        if memory_mb > self.peak_memory:
            self.peak_memory = memory_mb

    def increment_connections(self):
        """增加活跃连接数。"""
        self.active_connections += 1

    def decrement_connections(self):
        """减少活跃连接数。"""
        self.active_connections = max(0, self.active_connections - 1)

    def increment_requests(self):
        """增加总请求数。"""
        self.total_requests += 1

    def get_stats(self) -> Dict[str, Any]:
        """获取资源统计信息。"""
        uptime = time.time() - self.start_time

        return {
            'uptime_seconds': uptime,
            'uptime_formatted': str(timedelta(seconds=int(uptime))),
            'peak_memory_mb': self.peak_memory,
            'active_connections': self.active_connections,
            'total_requests': self.total_requests,
            'requests_per_second': self.total_requests / uptime if uptime > 0 else 0
        }


# 全局资源管理器
resource_manager = ResourceManager()


def get_performance_report() -> Dict[str, Any]:
    """获取性能报告。"""
    return {
        'performance_metrics': performance_metrics.get_all_stats(),
        'cache_stats': cache_manager.get_cache_stats(),
        'resource_stats': resource_manager.get_stats(),
        'timestamp': datetime.utcnow().isoformat()
    }