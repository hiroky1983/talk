import os
import asyncio
import logging
import json
from typing import Dict, Optional, List
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Character definitions
CHARACTERS = {
    'friend': {
        'name': 'Juan',
        'voice_name': 'Puck',
        'system_instruction': """You are Juan, a friendly and casual AI companion. 
You are helpful, witty, and engaging. You speak naturally with a friendly tone.
Keep your responses concise and conversational."""
    },
    'parent': {
        'name': 'Mother',
        'voice_name': 'Aoede',
        'system_instruction': """You are a caring parent figure. 
You are supportive, wise, and patient. You give good advice and care about the user's well-being.
Speak with a warm and nurturing tone."""
    },
    'sister': {
        'name': 'Sister',
        'voice_name': 'Fenrir',
        'system_instruction': """You are a playful younger sister. 
You are energetic, sometimes teasing, but affectionate. You like to share stories and ask questions.
Speak with a lively and youthful tone."""
    }
}

class GeminiLiveSession:
    def __init__(self, client: genai.Client, model_id: str, config: types.LiveConnectConfig):
        self.client = client
        self.model_id = model_id
        self.config = config
        self.session = None
        self._session_ctx = None
        self.lock = asyncio.Lock()
        self.response_queue = asyncio.Queue()
        self._receive_task = None

    async def connect(self):
        """Establish connection to Gemini Live API"""
        async with self.lock:
            if self.session:
                return

            try:
                # connect() returns an async context manager
                self._session_ctx = self.client.aio.live.connect(
                    model=self.model_id,
                    config=self.config
                )
                # Manually enter the context
                self.session = await self._session_ctx.__aenter__()
                logger.info("Connected to Gemini Live API")
                
                # Start receiving loop
                self._receive_task = asyncio.create_task(self._receive_loop())
                
            except Exception as e:
                logger.error(f"Failed to connect to Gemini Live API: {e}")
                self.session = None
                self._session_ctx = None
                raise

    async def _receive_loop(self):
        """Background loop to receive responses from Gemini"""
        try:
            async for response in self.session.receive():
                if response.server_content and response.server_content.model_turn:
                    for part in response.server_content.model_turn.parts:
                        if part.inline_data:
                            # Audio data
                            await self.response_queue.put(part.inline_data.data)
                
                if response.server_content and response.server_content.turn_complete:
                    # Signal end of turn
                    await self.response_queue.put(None)
                    
        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
            await self.response_queue.put(None) # Ensure we unblock consumers

    async def process_audio(self, audio_data: bytes) -> bytes:
        """Send audio and wait for response"""
        if not self.session:
            await self.connect()

        # Send audio chunk
        await self.session.send(input=audio_data, end_of_turn=True)
        
        # Collect response audio
        audio_chunks = []
        while True:
            try:
                chunk = await asyncio.wait_for(self.response_queue.get(), timeout=10.0)
                if chunk is None:
                    break
                audio_chunks.append(chunk)
            except asyncio.TimeoutError:
                logger.warning("Timeout waiting for audio response")
                break
            except Exception as e:
                logger.error(f"Error receiving audio: {e}")
                break
        
        return b"".join(audio_chunks)

    async def close(self):
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
            self._receive_task = None

        if self._session_ctx:
            # Manually exit the context
            await self._session_ctx.__aexit__(None, None, None)
            self._session_ctx = None
            self.session = None

class AIConversationService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        if not self.api_key:
            logger.error("GOOGLE_GEMINI_API_KEY not found in environment variables")
            
        self.client = genai.Client(api_key=self.api_key, http_options={'api_version': 'v1alpha'})
        self.sessions: Dict[str, GeminiLiveSession] = {}
        self.model_id = "gemini-2.0-flash-live-001"

    async def get_session(self, user_id: str, character: str = 'friend') -> GeminiLiveSession:
        """Get or create a session for the user"""
        session_key = f"{user_id}_{character}"
        
        if session_key not in self.sessions:
            char_config = CHARACTERS.get(character, CHARACTERS['friend'])
            
            config = types.LiveConnectConfig(
                response_modalities=["AUDIO"],
                system_instruction=types.Content(parts=[types.Part(text=char_config['system_instruction'])]),
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=char_config['voice_name']
                        )
                    )
                )
            )
            
            session = GeminiLiveSession(self.client, self.model_id, config)
            await session.connect()
            self.sessions[session_key] = session
            
        return self.sessions[session_key]

    async def process_audio_message(self, audio_data: bytes, language: str, user_id: str, character: str = 'friend') -> bytes:
        """Process audio message using Gemini Live API"""
        try:
            session = await self.get_session(user_id, character)
            response_audio = await session.process_audio(audio_data)
            return response_audio
        except Exception as e:
            logger.error(f"Error processing audio message: {e}")
            # Clean up session on error
            session_key = f"{user_id}_{character}"
            if session_key in self.sessions:
                await self.sessions[session_key].close()
                del self.sessions[session_key]
            return b""
