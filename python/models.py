#!/usr/bin/env python3
"""
Pydantic models for AI Conversation API
"""

from typing import Optional, Union
from pydantic import BaseModel
from datetime import datetime

class StartConversationRequest(BaseModel):
    user_id: str
    username: str
    language: str

class StartConversationResponse(BaseModel):
    session_id: str
    success: bool
    error_message: Optional[str] = ""

class EndConversationRequest(BaseModel):
    session_id: str
    user_id: str

class EndConversationResponse(BaseModel):
    success: bool
    error_message: Optional[str] = ""

class SendMessageRequest(BaseModel):
    user_id: str
    username: str
    language: str
    text_message: Optional[str] = None
    audio_data: Optional[bytes] = None
    session_id: Optional[str] = None

class SendMessageResponse(BaseModel):
    response_id: str
    text_message: Optional[str] = None
    audio_data: Optional[str] = None  # base64 encoded string
    language: str
    timestamp: str  # ISO format string
    is_final: bool = True