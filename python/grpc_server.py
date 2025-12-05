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

# Import generated gRPC code
from ai import ai_conversation_pb2 as ai_pb2
from ai import ai_conversation_service_pb2_grpc as ai_grpc

from ai_service import AIConversationService

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

    async def StreamChat(self, request_iterator, context):
        """Bidirectional streaming chat"""
        try:
            # First message should be setup
            first_msg = await request_iterator.__anext__()
            if first_msg.WhichOneof('content') != 'setup':
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("First message must be setup configuration")
                return

            config = first_msg.setup
            logger.info(f"Starting chat for user {config.username} ({config.user_id})")

            # Accumulate audio chunks for now (Echo logic mainly, since we are mimicking previous behavior)
            # In a real Gemini Live implementation, we'd pass the iterator directly to the AI service
            # For now, let's just read chunks and process them when we get enough or satisfy previous logic
            # OR pass the iterator to a new streaming method in ai_service
            
            # Since AIConversationService.process_audio_message expects a full blob (previous logic),
            # we might need to change ai_service or accumulate here.
            # To unblock the "connection", let's accumulate here simplistically or call a new method.
            
            # Let's try to assume we just want to bridge for now.
            # But wait, previous logic was: One Request -> Stream Response.
            # New logic is: Stream Request -> Stream Response.
            
            # Temporary: Accumulate all audio until stream ends (?) or some silence?
            # Go side sends chunks as they come.
            # Let's just process chunks as a stream in the service.
            
            async for response in self.ai_service.stream_chat(
                request_iterator,
                config
            ):
                yield response

        except Exception as e:
            logger.error(f"StreamChat error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"StreamChat error: {str(e)}")

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
    finally:
        await server.stop(5)

if __name__ == '__main__':
    asyncio.run(serve())
