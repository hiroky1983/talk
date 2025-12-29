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
                    pass
                elif ct == 'text_message':
                    # Handle text?
                    pass

        try:
            # Import enum from generated proto
            from ai import user_pb2
            
            # Select controller based on plan
            # PLAN_LITE = 2, PLAN_PREMIUM = 3
            if config.plan == user_pb2.PLAN_PREMIUM:
                controller = PremiumController(self.api_key)
                logger.info(f"Streaming chat with PremiumController (plan={config.plan})")
                
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
            elif config.plan == user_pb2.PLAN_TEST:
                logger.info("Test mode: Waiting for end_of_input to send sample_response.wav")
                async for request in request_iterator:
                    ct = request.WhichOneof('content')
                    if ct == 'end_of_input':
                        logger.info("Test mode: Received end_of_input, sending sample audio")
                        # Send sample file
                        try:
                            file_path = os.path.join(os.path.dirname(__file__), 'sample_response.wav')
                            with open(file_path, 'rb') as f:
                                audio_data = f.read()
                            
                            chunk_size = 4096
                            for i in range(0, len(audio_data), chunk_size):
                                chunk = audio_data[i:i+chunk_size]
                                timestamp = Timestamp()
                                timestamp.GetCurrentTime()
                                yield ai_pb2.ChatResponse(
                                    response_id=str(uuid.uuid4()),
                                    language=config.language,
                                    timestamp=timestamp,
                                    audio_chunk=chunk
                                )
                                # Small delay to simulate streaming
                                await asyncio.sleep(0.01)
                        except Exception as e:
                            logger.error(f"Error sending sample audio: {e}")
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
            plan_type: Plan enum value (0=UNSPECIFIED, 1=FREE, 2=LITE, 3=PREMIUM)
        Yields:
            bytes: Audio chunks
        """
        try:
            # Import here to avoid circular dependency
            from ai import user_pb2
            
            # Select controller based on plan_type
            # PLAN_LITE = 2, PLAN_PREMIUM = 3
            if plan_type == user_pb2.PLAN_PREMIUM:
                controller = PremiumController(self.api_key)
            else:  # LITE, FREE, or UNSPECIFIED
                controller = LiteController(self.api_key)
            
            logger.info(f"Using {controller.__class__.__name__} for plan_type={plan_type}")
                
            async for chunk in controller.process_audio(audio_data, language, user_id, character):
                yield chunk
            
        except Exception as e:
            logger.error(f"Error processing audio message: {e}")
            yield b""
