import os
import logging
import asyncio
from typing import Dict, Optional
from dotenv import load_dotenv
from controllers.premium import PremiumController
from controllers.lite import LiteController

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
        Handle bidirectional streaming chat using controller's streaming interface.
        """
        from ai import ai_conversation_pb2 as ai_pb2
        from google.protobuf.timestamp_pb2 import Timestamp
        import uuid

        # Helper to extract ONLY audio bytes from request_iterator
        async def audio_generator():
            async for request in request_iterator:
                ct = request.WhichOneof('content')
                if ct == 'audio_chunk':
                    yield request.audio_chunk
                elif ct == 'end_of_input':
                    # Optional: Could yield a sentinel if controller needs it, 
                    # but PremiumController logic doesn't explicitly rely on sentinel in stream mode?
                    # It relies on session events.
                    # But for LightController buffer-bridge, it might need to know when to stop?
                    # Actually, for bridging, the generator ending is the signal.
                    # Does request_iterator end? 
                    # If Client keeps stream open, iterator doesn't end.
                    # So we need a way to say "This turn is done".
                    # But current PremiumController logic runs continuously?
                    # No, we implemented `process_stream` to just take iterator.
                    # If we pipe iterator directly, we mix text/control messages.
                    # So this generator yields audio.
                    # If 'end_of_input' comes, we might pause? Or just keep going?
                    # For real bidirectional, audio is continuous.
                    pass
                elif ct == 'text_message':
                    # Handle text?
                    pass

        try:
            # Select controller
            if config.plan_type == ai_pb2.PLAN_TYPE_PREMIUM:
                controller = PremiumController(self.api_key)
                logger.info(f"Streaming chat with PremiumController")
                
                # Pass the audio generator to the controller
                async for chunk in controller.process_stream(
                    audio_generator(), 
                    config.language, 
                    config.user_id, 
                    config.character
                ):
                    timestamp = Timestamp()
                    timestamp.GetCurrentTime()
                    
                    yield ai_pb2.ChatResponse(
                        response_id=str(uuid.uuid4()),
                        language=config.language,
                        timestamp=timestamp,
                        audio_chunk=chunk
                    )
            else:
                # Fallback for Lite (non-streaming)
                controller = LiteController(self.api_key)
                logger.info(f"Buffered chat with LiteController")
                
                audio_buffer = bytearray()
                async for request in request_iterator:
                    ct = request.WhichOneof('content')
                    if ct == 'audio_chunk':
                        audio_buffer.extend(request.audio_chunk)
                    elif ct == 'end_of_input':
                         # Process buffered audio
                         if len(audio_buffer) > 0:
                            async for chunk in controller.process_audio(
                                bytes(audio_buffer), 
                                config.language, 
                                config.user_id, 
                                config.character
                            ):
                                timestamp = Timestamp()
                                timestamp.GetCurrentTime()
                                
                                yield ai_pb2.ChatResponse(
                                    response_id=str(uuid.uuid4()),
                                    language=config.language,
                                    timestamp=timestamp,
                                    audio_chunk=chunk
                                )
                            audio_buffer = bytearray() # Clear buffer
                    elif ct == 'text_message':
                        pass

        except Exception as e:
            logger.error(f"Error in stream_chat: {e}")

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
                controller = LiteController(self.api_key)
            
            logger.info(f"Using {controller.__class__.__name__} for plan_type={plan_type}")
                
            async for chunk in controller.process_audio(audio_data, language, user_id, character):
                yield chunk
            
        except Exception as e:
            logger.error(f"Error processing audio message: {e}")
            yield b""
