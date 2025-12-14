#!/usr/bin/env python3
"""
gRPC Server for AI Conversation Service
"""

import os
import asyncio
import logging
import uuid
import time
from concurrent import futures

import grpc
from google.protobuf.timestamp_pb2 import Timestamp

# Import generated gRPC code
from ai import ai_conversation_pb2 as ai_pb2
from ai import ai_conversation_service_pb2_grpc as ai_grpc

from ai_service import AIConversationService

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(name)s] - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_timestamp():
    """Create a proper protobuf Timestamp for current time"""
    timestamp = Timestamp()
    timestamp.GetCurrentTime()
    return timestamp

class LoggingInterceptor(grpc.aio.ServerInterceptor):
    """Interceptor to log request ID and timing"""
    
    async def intercept_service(self, continuation, handler_call_details):
        # Generate request ID
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        
        # Log incoming request
        method = handler_call_details.method
        logger.info(f"[{request_id}] → Incoming RPC: {method}")
        
        # Store request_id in context metadata
        metadata = dict(handler_call_details.invocation_metadata or [])
        metadata['request-id'] = request_id
        
        try:
            # Continue with the RPC
            response = await continuation(handler_call_details)
            
            # Log completion
            duration = time.time() - start_time
            logger.info(f"[{request_id}] ✓ Completed in {duration:.2f}s")
            
            return response
        except Exception as e:
            # Log error
            duration = time.time() - start_time
            logger.error(f"[{request_id}] ✗ Failed after {duration:.2f}s: {e}")
            raise

class AIConversationServicer(ai_grpc.AIConversationServiceServicer):
    """gRPC servicer for AI conversation"""

    def __init__(self):
        self.ai_service = AIConversationService()

    async def StreamChat(self, request_iterator, context):
        """Bidirectional streaming chat"""
        # Extract request ID from metadata
        metadata = dict(context.invocation_metadata())
        request_id = metadata.get('request-id', 'unknown')
        
        try:
            # First message should be setup
            first_msg = await request_iterator.__anext__()
            if first_msg.WhichOneof('content') != 'setup':
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("First message must be setup configuration")
                return

            config = first_msg.setup
            logger.info(f"[{request_id}] Starting chat for user {config.username} ({config.user_id})")

            async for response in self.ai_service.stream_chat(
                request_iterator,
                config
            ):
                yield response

        except Exception as e:
            logger.error(f"[{request_id}] StreamChat error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"StreamChat error: {str(e)}")

async def serve():
    """Start the gRPC server"""
    # Create interceptors
    interceptors = [LoggingInterceptor()]
    
    server = grpc.aio.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=interceptors
    )

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
    finally:
        await server.stop(5)

if __name__ == '__main__':
    asyncio.run(serve())
