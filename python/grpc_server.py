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

    async def SendMessage(self, request, context):
        """Process a single message and return response"""
        try:
            # Check content type using oneof
            content_type = request.WhichOneof('content')

            if content_type != 'audio_data':
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Only audio_data is supported")
                return ai_pb2.SendMessageResponse()

            logger.info(f"Received audio data: {len(request.audio_data)} bytes")
            
            # Process audio using AI service
            response_audio = await self.ai_service.process_audio_message(
                request.audio_data,
                request.language,
                request.user_id,
                request.character,
                request.plan_type
            )
            
            logger.info(f"Generated audio response: {len(response_audio)} bytes")

            # Create response with audio only
            response = ai_pb2.SendMessageResponse(
                response_id=str(uuid.uuid4()),
                language=request.language,
                timestamp=create_timestamp(),
                is_final=True,
                audio_data=response_audio
            )
            return response

        except Exception as e:
            error_msg = str(e)
            logger.error(f"SendMessage error: {error_msg}")

            # Return proper gRPC error
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"AI service error: {error_msg}")
            return ai_pb2.SendMessageResponse()

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
