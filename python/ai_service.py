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
            
        # Initialize controllers
        self.controllers = {
            'premium': PremiumController(self.api_key),
            'light': LightController(self.api_key)
        }
        
        # Default mode - can be changed via environment variable or runtime config
        self.current_mode = os.getenv("AI_SERVICE_MODE", "premium")
        logger.info(f"AI Service initialized in {self.current_mode} mode")

    async def process_audio_message(self, audio_data: bytes, language: str, user_id: str, character: str = 'friend') -> bytes:
        """Process audio message using the selected controller"""
        try:
            controller = self.controllers.get(self.current_mode)
            if not controller:
                logger.error(f"Invalid mode: {self.current_mode}")
                return b""
                
            return await controller.process_audio(audio_data, language, user_id, character)
            
        except Exception as e:
            logger.error(f"Error processing audio message: {e}")
            return b""
