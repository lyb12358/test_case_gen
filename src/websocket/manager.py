# -*- coding: utf-8 -*-
"""
WebSocket连接管理器。

用于管理实时任务状态更新的WebSocket连接。
"""

import logging
import json
import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket连接管理器。"""

    def __init__(self):
        """初始化连接管理器。"""
        # 活跃连接字典 {websocket: connection_info}
        self.active_connections: Dict[WebSocket, Dict[str, any]] = {}
        # 任务订阅字典 {task_id: set_of_websockets}
        self.task_subscriptions: Dict[str, Set[WebSocket]] = {}
        # 用户连接字典 {user_id: set_of_websockets}
        self.user_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str = None):
        """
        接受WebSocket连接。

        Args:
            websocket (WebSocket): WebSocket连接实例
            user_id (str, optional): 用户ID
        """
        await websocket.accept()

        connection_info = {
            "connected_at": datetime.now().isoformat(),
            "user_id": user_id,
            "subscriptions": set()
        }

        self.active_connections[websocket] = connection_info

        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)

        logger.info(f"WebSocket连接已建立 - 用户: {user_id} - 总连接数: {len(self.active_connections)}")

        # 发送连接确认
        await self.send_personal_message({
            "type": "connection_established",
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id
        }, websocket)

    def disconnect(self, websocket: WebSocket):
        """
        断开WebSocket连接。

        Args:
            websocket (WebSocket): WebSocket连接实例
        """
        if websocket in self.active_connections:
            connection_info = self.active_connections[websocket]
            user_id = connection_info.get("user_id")

            # 从任务订阅中移除
            for task_id in connection_info.get("subscriptions", set()):
                if task_id in self.task_subscriptions:
                    self.task_subscriptions[task_id].discard(websocket)
                    if not self.task_subscriptions[task_id]:
                        del self.task_subscriptions[task_id]

            # 从用户连接中移除
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(websocket)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]

            del self.active_connections[websocket]

            logger.info(f"WebSocket连接已断开 - 用户: {user_id} - 剩余连接数: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        发送个人消息。

        Args:
            message (dict): 消息内容
            websocket (WebSocket): 目标WebSocket连接
        """
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            logger.error(f"发送个人消息失败: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        """
        向所有连接广播消息。

        Args:
            message (dict): 广播消息内容
        """
        disconnected_connections = []

        for websocket in self.active_connections:
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                logger.error(f"广播消息失败: {e}")
                disconnected_connections.append(websocket)

        # 清理断开的连接
        for websocket in disconnected_connections:
            self.disconnect(websocket)

    async def send_to_user(self, message: dict, user_id: str):
        """
        向特定用户发送消息。

        Args:
            message (dict): 消息内容
            user_id (str): 目标用户ID
        """
        if user_id not in self.user_connections:
            logger.warning(f"用户 {user_id} 没有活跃连接")
            return

        disconnected_connections = []

        for websocket in self.user_connections[user_id]:
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                logger.error(f"向用户 {user_id} 发送消息失败: {e}")
                disconnected_connections.append(websocket)

        # 清理断开的连接
        for websocket in disconnected_connections:
            self.disconnect(websocket)

    async def subscribe_to_task(self, websocket: WebSocket, task_id: str):
        """
        订阅任务状态更新。

        Args:
            websocket (WebSocket): WebSocket连接
            task_id (str): 任务ID
        """
        if websocket not in self.active_connections:
            return

        # 添加到任务订阅
        if task_id not in self.task_subscriptions:
            self.task_subscriptions[task_id] = set()
        self.task_subscriptions[task_id].add(websocket)

        # 更新连接信息
        self.active_connections[websocket]["subscriptions"].add(task_id)

        logger.info(f"WebSocket已订阅任务 {task_id} - 订阅者数量: {len(self.task_subscriptions[task_id])}")

        # 发送订阅确认
        await self.send_personal_message({
            "type": "task_subscribed",
            "task_id": task_id,
            "timestamp": datetime.now().isoformat()
        }, websocket)

    async def unsubscribe_from_task(self, websocket: WebSocket, task_id: str):
        """
        取消订阅任务状态更新。

        Args:
            websocket (WebSocket): WebSocket连接
            task_id (str): 任务ID
        """
        if websocket not in self.active_connections:
            return

        # 从任务订阅中移除
        if task_id in self.task_subscriptions:
            self.task_subscriptions[task_id].discard(websocket)
            if not self.task_subscriptions[task_id]:
                del self.task_subscriptions[task_id]

        # 更新连接信息
        self.active_connections[websocket]["subscriptions"].discard(task_id)

        logger.info(f"WebSocket已取消订阅任务 {task_id}")

    async def send_task_update(self, task_id: str, update_data: dict):
        """
        向任务订阅者发送更新。

        Args:
            task_id (str): 任务ID
            update_data (dict): 更新数据
        """
        if task_id not in self.task_subscriptions:
            logger.debug(f"任务 {task_id} 没有订阅者")
            return

        message = {
            "type": "task_update",
            "task_id": task_id,
            "timestamp": datetime.now().isoformat(),
            "data": update_data
        }

        disconnected_connections = []

        for websocket in self.task_subscriptions[task_id]:
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                logger.error(f"发送任务更新失败: {e}")
                disconnected_connections.append(websocket)

        # 清理断开的连接
        for websocket in disconnected_connections:
            self.disconnect(websocket)

    def get_connection_stats(self) -> dict:
        """
        获取连接统计信息。

        Returns:
            dict: 连接统计信息
        """
        return {
            "total_connections": len(self.active_connections),
            "unique_users": len(self.user_connections),
            "active_subscriptions": len(self.task_subscriptions),
            "subscription_details": {
                task_id: len(connections)
                for task_id, connections in self.task_subscriptions.items()
            }
        }

    async def ping_all_connections(self):
        """向所有连接发送心跳包。"""
        ping_message = {
            "type": "ping",
            "timestamp": datetime.now().isoformat()
        }

        await self.broadcast(ping_message)

    async def cleanup_inactive_connections(self):
        """清理不活跃的连接。"""
        # 这里可以实现连接活性检查逻辑
        # 例如：定期发送ping包，检查响应等
        pass


# 全局连接管理器实例
manager = ConnectionManager()