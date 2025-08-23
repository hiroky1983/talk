#!/usr/bin/env python3
"""
gRPC Server for AI Conversation Service
"""

import asyncio
import logging
import uuid
from concurrent import futures
from datetime import datetime

import grpc
from google.protobuf.timestamp_pb2 import Timestamp
import time

from ai_service import AIConversationService

# Import generated gRPC code
from app import ai_conversation_pb2 as ai_pb2
from app import ai_conversation_service_pb2_grpc as ai_grpc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_timestamp():
    """Create a proper protobuf Timestamp for current time"""
    timestamp = Timestamp()
    timestamp.GetCurrentTime()
    return timestamp

class AIConversationServicer(ai_grpc.AIConversationServiceServicer):
    """gRPC servicer for AI conversation"""
    
    def __init__(self):
        self.ai_service = AIConversationService()
        self.active_sessions = set()
    
    async def StartConversation(self, request, context):
        """Start a new conversation session"""
        try:
            session_id = str(uuid.uuid4())
            success = self.ai_service.start_conversation(session_id)
            
            if success:
                self.active_sessions.add(session_id)
            
            logger.info(f"Started conversation for user {request.user_id}, session: {session_id}")
            
            return ai_pb2.StartConversationResponse(
                session_id=session_id,
                success=success,
                error_message="" if success else "Failed to start conversation"
            )
            
        except Exception as e:
            logger.error(f"StartConversation error: {e}")
            return ai_pb2.StartConversationResponse(
                session_id="",
                success=False,
                error_message=str(e)
            )
    
    async def EndConversation(self, request, context):
        """End a conversation session"""
        try:
            success = self.ai_service.end_conversation(request.session_id)
            
            if success and request.session_id in self.active_sessions:
                self.active_sessions.remove(request.session_id)
            
            logger.info(f"Ended conversation session: {request.session_id}")
            
            return ai_pb2.EndConversationResponse(
                success=success,
                error_message="" if success else "Failed to end conversation"
            )
            
        except Exception as e:
            logger.error(f"EndConversation error: {e}")
            return ai_pb2.EndConversationResponse(
                success=False,
                error_message=str(e)
            )
    
    async def SendMessage(self, request, context):
        """Process a single message and return response"""
        try:
            session_id = str(uuid.uuid4())  # Generate temp session for single messages
            
            # Check content type using oneof
            content_type = request.WhichOneof('content')
            
            if content_type == 'audio_data':
                # Process audio message
                response_text, response_audio = await self.ai_service.process_audio_message(
                    request.audio_data, request.language, session_id
                )
                
                # Create response with audio
                response = ai_pb2.AIConversationResponse(
                    response_id=str(uuid.uuid4()),
                    language=request.language,
                    timestamp=create_timestamp(),
                    is_final=True
                )
                if response_audio:
                    response.audio_data = response_audio
                else:
                    response.text_message = response_text
                return response
                
            elif content_type == 'text_message':
                # Process text message
                response_text, response_audio = await self.ai_service.process_text_message(
                    request.text_message, request.language, session_id
                )
                
                # Create response with text (audio handled by frontend TTS)
                response = ai_pb2.AIConversationResponse(
                    response_id=str(uuid.uuid4()),
                    text_message=response_text,
                    language=request.language,
                    timestamp=create_timestamp(),
                    is_final=True
                )
                return response
            
            else:
                return ai_pb2.AIConversationResponse(
                    response_id=str(uuid.uuid4()),
                    text_message="No message content provided",
                    language=request.language,
                    timestamp=create_timestamp(),
                    is_final=True
                )
                
        except Exception as e:
            logger.error(f"SendMessage error: {e}")
            return ai_pb2.AIConversationResponse(
                response_id=str(uuid.uuid4()),
                text_message=f"Error processing message: {str(e)}",
                language=request.language,
                timestamp=Timestamp(),
                is_final=True
            )
    
    async def StreamConversation(self, request_iterator, context):
        """Handle bidirectional streaming conversation"""
        session_id = str(uuid.uuid4())
        
        try:
            self.ai_service.start_conversation(session_id)
            logger.info(f"Started streaming conversation: {session_id}")
            
            async for request in request_iterator:
                try:
                    content_type = request.WhichOneof('content')
                    
                    if content_type == 'audio_data':
                        response_text, response_audio = await self.ai_service.process_audio_message(
                            request.audio_data, request.language, session_id
                        )
                        
                        # Create proper protobuf response
                        response = ai_pb2.AIConversationResponse(
                            response_id=str(uuid.uuid4()),
                            language=request.language,
                            timestamp=create_timestamp(),
                            is_final=True
                        )
                        if response_audio:
                            response.audio_data = response_audio
                        else:
                            response.text_message = response_text
                        yield response
                        
                    elif content_type == 'text_message':
                        response_text, response_audio = await self.ai_service.process_text_message(
                            request.text_message, request.language, session_id
                        )
                        
                        # Create proper protobuf response
                        response = ai_pb2.AIConversationResponse(
                            response_id=str(uuid.uuid4()),
                            text_message=response_text,
                            language=request.language,
                            timestamp=create_timestamp(),
                            is_final=True
                        )
                        yield response
                        
                except Exception as e:
                    logger.error(f"Stream processing error: {e}")
                    error_response = ai_pb2.AIConversationResponse(
                        response_id=str(uuid.uuid4()),
                        text_message=f"Error: {str(e)}",
                        language=request.language if request else "vi",
                        timestamp=create_timestamp(),
                        is_final=True
                    )
                    yield error_response
            
        finally:
            self.ai_service.end_conversation(session_id)
            logger.info(f"Ended streaming conversation: {session_id}")

async def serve():
    """Start the gRPC server"""
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    
    # Add the servicer
    servicer = AIConversationServicer()
    ai_grpc.add_AIConversationServiceServicer_to_server(servicer, server)
    
    # Configure server
    listen_addr = '[::]:50051'
    server.add_insecure_port(listen_addr)
    
    logger.info(f"Starting AI Conversation gRPC server on {listen_addr}")
    await server.start()
    
    try:
        await server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
        await server.stop(5)

if __name__ == '__main__':
    asyncio.run(serve())