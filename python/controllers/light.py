import os
import logging
import io
import base64
from google import genai
from google.genai import types
from gtts import gTTS
from pydub import AudioSegment
from .base import AIController

logger = logging.getLogger(__name__)

# Character definitions (Should be shared)
CHARACTERS = {
    'friend': {
        'system_instruction': """You are Juan, a friendly and casual AI companion. 
You are helpful, witty, and engaging. You speak naturally with a friendly tone.
Keep your responses concise and conversational."""
    },
    'parent': {
        'system_instruction': """You are a caring parent figure. 
You are supportive, wise, and patient. You give good advice and care about the user's well-being.
Speak with a warm and nurturing tone."""
    },
    'sister': {
        'system_instruction': """You are a playful younger sister. 
You are energetic, sometimes teasing, but affectionate. You like to share stories and ask questions.
Speak with a lively and youthful tone."""
    }
}

class LightController(AIController):
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model_id = "gemini-2.0-flash"

    async def process_audio(self, audio_data: bytes, language: str, user_id: str, character: str) -> bytes:
        """Process audio using Standard API (STT -> LLM) + TTS"""
        try:
            # 1. Audio to Text (using Gemini Multimodal)
            # Convert raw PCM 16kHz to WAV for Gemini
            audio_segment = AudioSegment(
                data=audio_data,
                sample_width=2,
                frame_rate=16000,
                channels=1
            )
            wav_io = io.BytesIO()
            audio_segment.export(wav_io, format="wav")
            wav_bytes = wav_io.getvalue()

            # Generate content with audio
            char_config = CHARACTERS.get(character, CHARACTERS['friend'])
            
            prompt = "Listen to the audio and respond naturally."
            
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[
                    types.Content(
                        parts=[
                            types.Part(text=char_config['system_instruction']),
                            types.Part(text=prompt),
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type="audio/wav",
                                    data=wav_bytes
                                )
                            )
                        ]
                    )
                ]
            )
            
            text_response = response.text
            logger.info(f"Gemini response: {text_response}")

            if not text_response:
                return b""

            # 2. Text to Speech (using gTTS)
            # Note: gTTS is simple but robotic. Google Cloud TTS would be better if credentials allowed.
            tts = gTTS(text=text_response, lang=language)
            mp3_io = io.BytesIO()
            tts.write_to_fp(mp3_io)
            mp3_io.seek(0)
            
            # Convert MP3 to PCM 24kHz (to match Live API format for frontend compatibility)
            # Frontend expects PCM 24kHz Float32 or Int16? 
            # Player.ts handles Int16 24kHz.
            
            audio_response = AudioSegment.from_mp3(mp3_io)
            audio_response = audio_response.set_frame_rate(24000).set_channels(1).set_sample_width(2)
            
            return audio_response.raw_data

        except Exception as e:
            logger.error(f"Error in LightController: {e}")
            raise
