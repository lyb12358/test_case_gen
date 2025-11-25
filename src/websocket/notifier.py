# -*- coding: utf-8 -*-
"""
WebSocket通知器。

提供向客户端发送实时通知的功能。
"""

import logging
import asyncio
from typing import Dict, Any, Optional
from .manager import manager
from ..models.generation import GenerationProgress, GenerationStatus

logger = logging.getLogger(__name__)


class WebSocketNotifier:
    """WebSocket通知器类。"""

    def __init__(self):
        """初始化通知器。"""
        self.manager = manager

    async def notify_task_started(self, task_id: str, stage: str, business_type: str):
        """
        通知任务开始。

        Args:
            task_id (str): 任务ID
            stage (str): 生成阶段
            business_type (str): 业务类型
        """
        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.RUNNING,
            "stage": stage,
            "message": f"开始生成{stage} - {business_type}",
            "progress": 0,
            "current_step": "初始化",
            "total_steps": 6,
            "current_step_index": 0
        })

    async def notify_progress_update(
        self,
        task_id: str,
        progress: float,
        current_step: str,
        current_step_index: int,
        total_steps: int,
        message: str = None
    ):
        """
        通知进度更新。

        Args:
            task_id (str): 任务ID
            progress (float): 进度百分比
            current_step (str): 当前步骤描述
            current_step_index (int): 当前步骤索引
            total_steps (int): 总步骤数
            message (str, optional): 附加消息
        """
        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.RUNNING,
            "progress": progress,
            "current_step": current_step,
            "current_step_index": current_step_index,
            "total_steps": total_steps,
            "message": message or f"正在执行: {current_step}"
        })

    async def notify_llm_call_start(self, task_id: str, model: str, tokens: int):
        """
        通知LLM调用开始。

        Args:
            task_id (str): 任务ID
            model (str): 模型名称
            tokens (int): 预估token数量
        """
        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.RUNNING,
            "message": f"调用LLM模型: {model}",
            "llm_info": {
                "model": model,
                "estimated_tokens": tokens,
                "status": "calling"
            }
        })

    async def notify_llm_call_success(
        self,
        task_id: str,
        model: str,
        tokens_used: int,
        response_time: float,
        response_length: int
    ):
        """
        通知LLM调用成功。

        Args:
            task_id (str): 任务ID
            model (str): 模型名称
            tokens_used (int): 使用的token数量
            response_time (float): 响应时间（秒）
            response_length (int): 响应长度
        """
        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.RUNNING,
            "message": f"LLM调用成功 - 耗时: {response_time:.2f}s",
            "llm_info": {
                "model": model,
                "tokens_used": tokens_used,
                "response_time": response_time,
                "response_length": response_length,
                "status": "success"
            }
        })

    async def notify_llm_call_retry(self, task_id: str, attempt: int, max_attempts: int, error: str):
        """
        通知LLM调用重试。

        Args:
            task_id (str): 任务ID
            attempt (int): 当前尝试次数
            max_attempts (int): 最大尝试次数
            error (str): 错误信息
        """
        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.RUNNING,
            "message": f"LLM调用重试 ({attempt}/{max_attempts})",
            "llm_info": {
                "attempt": attempt,
                "max_attempts": max_attempts,
                "error": error,
                "status": "retrying"
            }
        })

    async def notify_generation_success(
        self,
        task_id: str,
        stage: str,
        generated_count: int,
        result_data: Dict[str, Any]
    ):
        """
        通知生成成功。

        Args:
            task_id (str): 任务ID
            stage (str): 生成阶段
            generated_count (int): 生成数量
            result_data (Dict[str, Any]): 结果数据
        """
        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.COMPLETED,
            "stage": stage,
            "message": f"{stage}生成完成 - 共生成{generated_count}项",
            "progress": 100,
            "generated_count": generated_count,
            "result": result_data
        })

    async def notify_generation_error(
        self,
        task_id: str,
        stage: str,
        error_code: str,
        error_message: str,
        can_retry: bool = True,
        retry_count: int = 0
    ):
        """
        通知生成错误。

        Args:
            task_id (str): 任务ID
            stage (str): 生成阶段
            error_code (str): 错误代码
            error_message (str): 错误信息
            can_retry (bool): 是否可以重试
            retry_count (int): 当前重试次数
        """
        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.FAILED,
            "stage": stage,
            "message": f"{stage}生成失败: {error_message}",
            "error": {
                "code": error_code,
                "message": error_message,
                "can_retry": can_retry,
                "retry_count": retry_count
            }
        })

    async def notify_validation_error(self, task_id: str, validation_errors: list):
        """
        通知验证错误。

        Args:
            task_id (str): 任务ID
            validation_errors (list): 验证错误列表
        """
        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.FAILED,
            "message": "数据验证失败",
            "validation_errors": validation_errors
        })

    async def notify_database_operation(self, task_id: str, operation: str, count: int = None):
        """
        通知数据库操作。

        Args:
            task_id (str): 任务ID
            operation (str): 操作类型
            count (int, optional): 操作数量
        """
        message = f"数据库操作: {operation}"
        if count is not None:
            message += f" ({count}项)"

        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.RUNNING,
            "message": message
        })

    async def notify_task_cancelled(self, task_id: str):
        """
        通知任务取消。

        Args:
            task_id (str): 任务ID
        """
        await self.manager.send_task_update(task_id, {
            "status": GenerationStatus.CANCELLED,
            "message": "任务已被取消"
        })

    async def send_custom_notification(self, task_id: str, notification_data: Dict[str, Any]):
        """
        发送自定义通知。

        Args:
            task_id (str): 任务ID
            notification_data (Dict[str, Any]): 通知数据
        """
        await self.manager.send_task_update(task_id, notification_data)

    async def broadcast_system_message(self, message: str, level: str = "info"):
        """
        广播系统消息。

        Args:
            message (str): 消息内容
            level (str): 消息级别 (info, warning, error)
        """
        await self.manager.broadcast({
            "type": "system_message",
            "level": level,
            "message": message,
            "timestamp": "2024-01-01T00:00:00Z"  # 实际应该使用真实时间戳
        })

    async def send_user_message(self, user_id: str, message: str, level: str = "info"):
        """
        向特定用户发送消息。

        Args:
            user_id (str): 用户ID
            message (str): 消息内容
            level (str): 消息级别
        """
        await self.manager.send_to_user({
            "type": "user_message",
            "level": level,
            "message": message,
            "timestamp": "2024-01-01T00:00:00Z"  # 实际应该使用真实时间戳
        }, user_id)


# 全局通知器实例
notifier = WebSocketNotifier()