# -*- coding: utf-8 -*-
"""
WebSocket端点。

提供实时任务状态更新的WebSocket API。
"""

import logging
import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from pydantic import BaseModel

from .manager import manager
from ..services.generation_service import UnifiedGenerationService
from ..exceptions.generation import GenerationError

logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/ws", tags=["websocket"])


class WebSocketMessage(BaseModel):
    """WebSocket消息模型。"""
    type: str
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None


@router.websocket("/tasks/{task_id}")
async def websocket_task_updates(
    websocket: WebSocket,
    task_id: str,
    user_id: Optional[str] = Query(None)
):
    """
    任务状态更新WebSocket端点。

    Args:
        websocket (WebSocket): WebSocket连接实例
        task_id (str): 任务ID
        user_id (str, optional): 用户ID
    """
    await manager.connect(websocket, user_id)
    await manager.subscribe_to_task(websocket, task_id)

    try:
        # 发送初始任务状态
        try:
            service = UnifiedGenerationService()
            task_status = service.get_task_status(task_id)

            await manager.send_personal_message({
                "type": "initial_status",
                "task_id": task_id,
                "status": task_status.dict()
            }, websocket)

        except GenerationError as e:
            logger.warning(f"获取初始任务状态失败: {e}")
            await manager.send_personal_message({
                "type": "error",
                "task_id": task_id,
                "error": {
                    "code": e.error_code,
                    "message": str(e)
                }
            }, websocket)

        # 保持连接并处理客户端消息
        while True:
            try:
                # 接收客户端消息
                data = await websocket.receive_text()
                message_data = json.loads(data)

                # 处理不同类型的消息
                await handle_client_message(websocket, task_id, message_data)

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError as e:
                logger.warning(f"无效的JSON消息: {e}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "无效的JSON格式"
                }, websocket)
            except Exception as e:
                logger.error(f"处理WebSocket消息时发生错误: {e}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "服务器内部错误"
                }, websocket)

    except WebSocketDisconnect:
        logger.info(f"WebSocket客户端断开连接 - 任务: {task_id}")
    except Exception as e:
        logger.error(f"WebSocket连接发生错误: {e}")
    finally:
        manager.disconnect(websocket)


@router.websocket("/global")
async def websocket_global_updates(
    websocket: WebSocket,
    user_id: Optional[str] = Query(None)
):
    """
    全局更新WebSocket端点。

    Args:
        websocket (WebSocket): WebSocket连接实例
        user_id (str, optional): 用户ID
    """
    await manager.connect(websocket, user_id)

    try:
        # 发送连接统计信息
        await manager.send_personal_message({
            "type": "connection_stats",
            "stats": manager.get_connection_stats()
        }, websocket)

        # 保持连接并处理客户端消息
        while True:
            try:
                # 接收客户端消息
                data = await websocket.receive_text()
                message_data = json.loads(data)

                # 处理全局消息
                await handle_global_message(websocket, message_data)

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError as e:
                logger.warning(f"无效的JSON消息: {e}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "无效的JSON格式"
                }, websocket)
            except Exception as e:
                logger.error(f"处理WebSocket消息时发生错误: {e}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "服务器内部错误"
                }, websocket)

    except WebSocketDisconnect:
        logger.info(f"全局WebSocket客户端断开连接")
    except Exception as e:
        logger.error(f"全局WebSocket连接发生错误: {e}")
    finally:
        manager.disconnect(websocket)


async def handle_client_message(websocket: WebSocket, task_id: str, message_data: dict):
    """
    处理客户端消息。

    Args:
        websocket (WebSocket): WebSocket连接实例
        task_id (str): 任务ID
        message_data (dict): 消息数据
    """
    message_type = message_data.get("type")

    if message_type == "ping":
        # 响应心跳包
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": message_data.get("timestamp")
        }, websocket)

    elif message_type == "subscribe":
        # 订阅其他任务
        new_task_id = message_data.get("task_id")
        if new_task_id and new_task_id != task_id:
            await manager.subscribe_to_task(websocket, new_task_id)

    elif message_type == "unsubscribe":
        # 取消订阅任务
        unsubscribe_task_id = message_data.get("task_id")
        if unsubscribe_task_id:
            await manager.unsubscribe_from_task(websocket, unsubscribe_task_id)

    elif message_type == "cancel_task":
        # 取消任务
        try:
            service = UnifiedGenerationService()
            success = service.cancel_task(task_id)

            await manager.send_personal_message({
                "type": "task_cancel_response",
                "task_id": task_id,
                "success": success
            }, websocket)

        except Exception as e:
            logger.error(f"取消任务失败: {e}")
            await manager.send_personal_message({
                "type": "error",
                "message": "取消任务失败"
            }, websocket)

    else:
        logger.warning(f"未知消息类型: {message_type}")


async def handle_global_message(websocket: WebSocket, message_data: dict):
    """
    处理全局消息。

    Args:
        websocket (WebSocket): WebSocket连接实例
        message_data (dict): 消息数据
    """
    message_type = message_data.get("type")

    if message_type == "ping":
        # 响应心跳包
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": message_data.get("timestamp")
        }, websocket)

    elif message_type == "get_stats":
        # 获取统计信息
        await manager.send_personal_message({
            "type": "stats_update",
            "stats": manager.get_connection_stats()
        }, websocket)

    elif message_type == "subscribe_task":
        # 订阅特定任务
        task_id = message_data.get("task_id")
        if task_id:
            await manager.subscribe_to_task(websocket, task_id)

    elif message_type == "unsubscribe_task":
        # 取消订阅特定任务
        task_id = message_data.get("task_id")
        if task_id:
            await manager.unsubscribe_from_task(websocket, task_id)

    else:
        logger.warning(f"未知全局消息类型: {message_type}")


# 任务状态更新通知函数
async def notify_task_status_update(task_id: str, status_data: dict):
    """
    通知任务状态更新。

    Args:
        task_id (str): 任务ID
        status_data (dict): 状态数据
    """
    await manager.send_task_update(task_id, {
        "status": status_data.get("status"),
        "progress": status_data.get("progress"),
        "message": status_data.get("message"),
        "current_step": status_data.get("current_step"),
        "total_steps": status_data.get("total_steps")
    })


# 任务完成通知函数
async def notify_task_completion(task_id: str, result_data: dict):
    """
    通知任务完成。

    Args:
        task_id (str): 任务ID
        result_data (dict): 结果数据
    """
    await manager.send_task_update(task_id, {
        "status": "completed",
        "result": result_data,
        "completed_at": result_data.get("completed_at")
    })


# 任务失败通知函数
async def notify_task_failure(task_id: str, error_data: dict):
    """
    通知任务失败。

    Args:
        task_id (str): 任务ID
        error_data (dict): 错误数据
    """
    await manager.send_task_update(task_id, {
        "status": "failed",
        "error": error_data,
        "failed_at": error_data.get("failed_at")
    })