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

    async def process_audio_message(self, audio_data: bytes, language: str, user_id: str, character: str = 'friend', plan_type: int = 2) -> bytes:
        """Process audio message using the selected controller
        
        Args:
            plan_type: PlanType enum value (0=FREE, 1=LITE, 2=PREMIUM)
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
                
            return await controller.process_audio(audio_data, language, user_id, character)
            
        except Exception as e:
            logger.error(f"Error processing audio message: {e}")
            return b""
