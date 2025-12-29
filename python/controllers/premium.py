import os
import asyncio
import logging
from typing import Dict, Optional
from google import genai
from google.genai import types
from .base import AIController

logger = logging.getLogger(__name__)

# Character definitions (Shared configuration could be moved to a config file)
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
    },
    'teacher': {
        'name': 'Aki',
        'voice_name': 'Aoede',
        'system_instruction': """You are Aki, a bilingual English tutor for Japanese learners.
Your primary goal is to keep the learner speaking English while giving quick support in Japanese when needed.

Language guidance:
- Default to English for most of the conversation and practice prompts.
- If the user sounds confused or speaks Japanese, prepend a very short Japanese scaffolding line in romaji (prefixed with "JP:") and then continue in English.
- Keep all responses concise and focused on speaking practice.
- Do not use emojis, markdown, or stage directions."""
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
            logger.info("Starting receive loop")
            async for response in self.session.receive():
                if response.server_content:
                    if response.server_content.model_turn:
                        for part in response.server_content.model_turn.parts:
                            if part.inline_data:
                                # logger.info(f"Received audio chunk: {len(part.inline_data.data)} bytes")
                                await self.response_queue.put(part.inline_data.data)
                    
                    if response.server_content.turn_complete:
                        logger.info("Turn complete signal received")
                        await self.response_queue.put(None)
                else:
                    # logger.info("Received response without server_content")
                    pass
                    
        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
            await self.response_queue.put(None)

    async def process_audio(self, audio_data: bytes):
        """Send audio and yield response chunks"""
        if not self.session:
            await self.connect()

        # Send audio chunk
        await self.session.send(input=audio_data, end_of_turn=True)
        
        # Yield response audio chunks as they arrive
        while True:
            try:
                chunk = await asyncio.wait_for(self.response_queue.get(), timeout=10.0)
                if chunk is None:
                    break
                yield chunk
            except asyncio.TimeoutError:
                logger.warning("Timeout waiting for audio response")
                break
            except Exception as e:
                logger.error(f"Error receiving audio: {e}")
                break

    async def close(self):
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
            self._receive_task = None

        if self._session_ctx:
            await self._session_ctx.__aexit__(None, None, None)
            self._session_ctx = None
            self.session = None

class PremiumController(AIController):
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key, http_options={'api_version': 'v1beta'})
        self.sessions: Dict[str, GeminiLiveSession] = {}
        self.model_id = "gemini-2.0-flash-exp"
        # self.model_id = "gemini-2.0-flash-live-001" # Experimental model for Live API

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

    async def process_stream(self, audio_iterator, language: str, user_id: str, character: str):
        """Process continuous audio stream using Gemini Live API"""
        try:
            session = await self.get_session(user_id, character)
            
            # Start a background task to send incoming audio to Gemini
            send_task = asyncio.create_task(self._send_stream_to_gemini(session, audio_iterator))
            
            # Yield responses as they come back from Gemini
            while True:
                try:
                    # Check if send task failed
                    if send_task.done() and send_task.exception():
                        raise send_task.exception()
                    
                    # Wait for next response chunk from Gemini session queue
                    # We use a short timeout to periodically check send_task status and stream status
                    try:
                        chunk = await asyncio.wait_for(session.response_queue.get(), timeout=0.1)
                        if chunk is None: # Turn complete or stream end?
                             # In bidirectional stream, we might get multiple turns.
                             # If we treat specific token as turn complete, we can notify or just continue.
                             # For now, let's continue yielding if it's just end of a turn, 
                             # but session might put None on close.
                             # Let's adjust session logic later.
                             pass
                        else:
                            yield chunk
                    except asyncio.TimeoutError:
                        continue
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error receiving from session: {e}")
                    break
            
            send_task.cancel()
            
        except Exception as e:
            logger.error(f"Error processing stream in PremiumController: {e}")
            session_key = f"{user_id}_{character}"
            if session_key in self.sessions:
                await self.sessions[session_key].close()
                del self.sessions[session_key]
            raise

    async def _send_stream_to_gemini(self, session: GeminiLiveSession, audio_iterator):
        """Consume audio_iterator and send to Gemini session"""
        try:
             async for chunk in audio_iterator:
                 await session.session.send(input={"data": chunk, "mime_type": "audio/pcm"}, end_of_turn=False)
        except Exception as e:
            logger.error(f"Error sending stream to Gemini: {e}")

    async def process_audio(self, audio_data: bytes, language: str, user_id: str, character: str):
        """Process audio message using Gemini Live API (Legacy full buffer mode)"""
        try:
            session = await self.get_session(user_id, character)
            async for chunk in session.process_audio(audio_data):
                yield chunk
        except Exception as e:
            logger.error(f"Error processing audio message in PremiumController: {e}")
            # Clean up session on error
            session_key = f"{user_id}_{character}"
            if session_key in self.sessions:
                await self.sessions[session_key].close()
                del self.sessions[session_key]
            # raise # Re-raise to let the service handle fallback if needed
