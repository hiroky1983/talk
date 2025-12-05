import os
import logging
import asyncio
from typing import Dict, Optional
from dotenv import load_dotenv
from controllers.premium import PremiumController
from controllers.light import LightController

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIConversationService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        if not self.api_key:
            logger.error("GOOGLE_GEMINI_API_KEY not found in environment variables")

    async def stream_chat(self, request_iterator, config):
        """
        Handle bidirectional streaming chat.
        For now, we act as a bridge:
        1. Accumulate audio chunks from request_iterator (simulating VAD end or stream end)
        2. Pass to process_audio_message
        3. Yield results
        
        In the future, this should pass the iterator down to a True bidirectional controller.
        """
        from ai import ai_conversation_pb2 as ai_pb2
        from google.protobuf.timestamp_pb2 import Timestamp
        import uuid

        audio_buffer = bytearray()
        
        try:
            async for request in request_iterator:
                content_type = request.WhichOneof('content')
                
                if content_type == 'audio_chunk':
                    audio_buffer.extend(request.audio_chunk)
                    
                elif content_type == 'end_of_input':
                    logger.info("End of input received, processing audio...")
                    if len(audio_buffer) > 0:
                        async for chunk in self.process_audio_message(
                            bytes(audio_buffer), 
                            config.language, 
                            config.user_id, 
                            config.character, 
                            config.plan_type
                        ):
                            timestamp = Timestamp()
                            timestamp.GetCurrentTime()
                            
                            yield ai_pb2.ChatResponse(
                                response_id=str(uuid.uuid4()),
                                language=config.language,
                                timestamp=timestamp,
                                audio_chunk=chunk
                            )
                        # Clear buffer for next turn
                        audio_buffer = bytearray()
                        
                elif content_type == 'text_message':
                    pass
        except Exception as e:
            logger.error(f"Error receiving stream: {e}")

    async def process_audio_message(self, audio_data: bytes, language: str, user_id: str, character: str = 'friend', plan_type: int = 2):
        """Process audio message using the selected controller
        
        Args:
            plan_type: PlanType enum value (0=FREE, 1=LITE, 2=PREMIUM)
        Yields:
            bytes: Audio chunks
        """
        try:
            # Import here to avoid circular dependency
            from ai import ai_conversation_pb2 as ai_pb2
            
            # Select controller based on plan_type
            if plan_type == ai_pb2.PLAN_TYPE_PREMIUM:
                controller = PremiumController(self.api_key)
            else:  # LITE or FREE
                controller = LightController(self.api_key)
            
            logger.info(f"Using {controller.__class__.__name__} for plan_type={plan_type}")
                
            async for chunk in controller.process_audio(audio_data, language, user_id, character):
                yield chunk
            
        except Exception as e:
            logger.error(f"Error processing audio message: {e}")
            yield b""
