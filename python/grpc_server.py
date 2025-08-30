#!/usr/bin/env python3
"""
gRPC Server for AI Conversation Service
"""

import os
import asyncio
import logging
import uuid
from concurrent import futures

import grpc
from google.protobuf.timestamp_pb2 import Timestamp
import time

# Hot reload imports
try:
    import importlib
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    HOT_RELOAD_AVAILABLE = True
except ImportError:
    HOT_RELOAD_AVAILABLE = False

from ai_service import AIConversationService

# Import generated gRPC code
from app import ai_conversation_pb2 as ai_pb2
from app import ai_conversation_service_pb2_grpc as ai_grpc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Hot reload handler
if HOT_RELOAD_AVAILABLE:
    class HotReloadHandler(FileSystemEventHandler):
        def __init__(self, servicer):
            self.servicer = servicer
            self.debounce_time = 1.0
            self.last_reload = 0
        
        def on_modified(self, event):
            if event.is_directory or not event.src_path.endswith('.py'):
                return
            if '__pycache__' in event.src_path:
                return
            
            current_time = time.time()
            if current_time - self.last_reload < self.debounce_time:
                return
            
            self.last_reload = current_time
            logger.info(f"File changed: {event.src_path}")
            self.reload_ai_service()
        
        def reload_ai_service(self):
            try:
                # Reload ai_service module
                import ai_service
                importlib.reload(ai_service)
                
                # Create new AI service instance
                self.servicer.ai_service = ai_service.AIConversationService()
                logger.info("AI service reloaded successfully")
            except Exception as e:
                logger.error(f"Failed to reload AI service: {e}")
else:
    class HotReloadHandler:
        def __init__(self, servicer):
            pass

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
            
            character = request.character if request.character else 'friend'
            logger.info(f"Started conversation for user {request.user_id}, session: {session_id}, language: {request.language}, character: {character}")
            
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
            character = request.character if request.character else 'friend'
            
            # Check content type using oneof
            content_type = request.WhichOneof('content')
            
            if content_type == 'audio_data':
                # Process audio message
                response_text, response_audio = await self.ai_service.process_audio_message(
                    request.audio_data, request.language, session_id, character
                )
                
                # Create response with audio only
                response = ai_pb2.AIConversationResponse(
                    response_id=str(uuid.uuid4()),
                    language=request.language,
                    timestamp=create_timestamp(),
                    is_final=True,
                    audio_data=response_audio
                )
                return response
                
            elif content_type == 'text_message':
                # Process text message
                response_text, response_audio = await self.ai_service.process_text_message(
                    request.text_message, request.language, session_id, character
                )
                
                # Create response with audio data only
                response = ai_pb2.AIConversationResponse(
                    response_id=str(uuid.uuid4()),
                    language=request.language,
                    timestamp=create_timestamp(),
                    is_final=True,
                    audio_data=response_audio
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
    

async def serve():
    """Start the gRPC server"""
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    
    # Add the servicer
    servicer = AIConversationServicer()
    ai_grpc.add_AIConversationServiceServicer_to_server(servicer, server)
    
    # Setup hot reload if in dev mode
    observer = None
    if os.getenv('DEV_MODE', 'false').lower() == 'true' and HOT_RELOAD_AVAILABLE:
        try:
            handler = HotReloadHandler(servicer)
            observer = Observer()
            observer.schedule(handler, ".", recursive=True)
            observer.start()
            logger.info("Hot reload enabled - watching for file changes")
        except Exception as e:
            logger.warning(f"Could not enable hot reload: {e}")
    elif os.getenv('DEV_MODE', 'false').lower() == 'true' and not HOT_RELOAD_AVAILABLE:
        logger.warning("DEV_MODE=true but watchdog not available. Install watchdog for hot reload.")
    
    # Configure server
    listen_addr = '[::]:50051'
    server.add_insecure_port(listen_addr)
    
    dev_mode = os.getenv('DEV_MODE', 'false').lower() == 'true'
    logger.info(f"Starting AI Conversation gRPC server on {listen_addr}")
    logger.info(f"DEV_MODE: {dev_mode}")
    
    if dev_mode:
        if HOT_RELOAD_AVAILABLE:
            logger.info("Hot reload: ENABLED")
        else:
            logger.info("Hot reload: DISABLED (watchdog not available)")
    else:
        logger.info("Hot reload: DISABLED (production mode)")
    
    await server.start()
    
    try:
        await server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
    finally:
        if observer:
            observer.stop()
            observer.join()
        await server.stop(5)

if __name__ == '__main__':
    asyncio.run(serve())