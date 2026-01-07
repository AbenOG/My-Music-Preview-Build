import asyncio
import json
from typing import Set
from fastapi import WebSocket, WebSocketDisconnect
from ..config import settings

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
    
    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
    
    async def broadcast(self, message: dict):
        async with self._lock:
            connections = list(self.active_connections)
        
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                await self.disconnect(connection)

manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await handle_client_message(websocket, message)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)

async def handle_client_message(websocket: WebSocket, message: dict):
    msg_type = message.get("type")
    
    if msg_type == "ping":
        await websocket.send_json({"type": "pong"})

async def broadcast_message(message: dict):
    await manager.broadcast(message)
