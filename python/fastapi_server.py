#!/usr/bin/env python3
"""
FastAPI Server for AI Conversation Service
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Any
import base64

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from ai_service import AIConversationService
from models import (
    StartConversationRequest,
    StartConversationResponse,
    EndConversationRequest, 
    EndConversationResponse,
    SendMessageRequest,
    SendMessageResponse
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="AI Language Learning API",
    description="AI conversation service for language learning",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3003", "http://localhost:3004", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI service instance
ai_service = AIConversationService()
active_sessions: Dict[str, bool] = {}

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AI Language Learning API Server",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "ai_service": "available",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/conversation/start", response_model=StartConversationResponse)
async def start_conversation(request: StartConversationRequest):
    """Start a new conversation session"""
    try:
        session_id = str(uuid.uuid4())
        success = ai_service.start_conversation(session_id)
        
        if success:
            active_sessions[session_id] = True
            logger.info(f"Started conversation for user {request.user_id}, session: {session_id}")
        
        return StartConversationResponse(
            session_id=session_id,
            success=success,
            error_message="" if success else "Failed to start conversation"
        )
        
    except Exception as e:
        logger.error(f"StartConversation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start conversation: {str(e)}"
        )

@app.post("/api/v1/conversation/end", response_model=EndConversationResponse)
async def end_conversation(request: EndConversationRequest):
    """End a conversation session"""
    try:
        success = ai_service.end_conversation(request.session_id)
        
        if success and request.session_id in active_sessions:
            del active_sessions[request.session_id]
        
        logger.info(f"Ended conversation session: {request.session_id}")
        
        return EndConversationResponse(
            success=success,
            error_message="" if success else "Failed to end conversation"
        )
        
    except Exception as e:
        logger.error(f"EndConversation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to end conversation: {str(e)}"
        )

@app.post("/api/v1/conversation/message", response_model=SendMessageResponse)
async def send_message(request: SendMessageRequest):
    """Process a message and return AI response"""
    try:
        session_id = request.session_id or str(uuid.uuid4())
        
        # Process text message
        if request.text_message:
            response_text, response_audio = await ai_service.process_text_message(
                request.text_message, request.language, session_id
            )
        # Process audio message (if audio_data is provided)
        elif request.audio_data:
            response_text, response_audio = await ai_service.process_audio_message(
                request.audio_data, request.language, session_id
            )
        else:
            response_text = "No message content provided"
            response_audio = b""
        
        # Encode audio data to base64 if available
        audio_b64 = None
        if response_audio:
            audio_b64 = base64.b64encode(response_audio).decode('utf-8')
        
        return SendMessageResponse(
            response_id=str(uuid.uuid4()),
            text_message=response_text,
            audio_data=audio_b64,
            language=request.language,
            timestamp=datetime.now().isoformat() + "Z",
            is_final=True
        )
        
    except Exception as e:
        logger.error(f"SendMessage error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process message: {str(e)}"
        )


@app.get("/api/v1/sessions")
async def get_active_sessions():
    """Get list of active conversation sessions (for debugging)"""
    return {
        "active_sessions": list(active_sessions.keys()),
        "count": len(active_sessions)
    }

if __name__ == "__main__":
    logger.info("Starting AI Language Learning FastAPI server...")
    uvicorn.run(
        "fastapi_server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )