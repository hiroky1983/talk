import os
import logging
import io
import re
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

    async def process_stream(self, audio_iterator, language: str, user_id: str, character: str):
        """Process continuous audio stream (Bridge to non-streaming for Light model for now)"""
        # Light controller might not support true streaming yet or uses different API
        # So we accumulate and call process_audio
        audio_buffer = bytearray()
        async for chunk in audio_iterator:
             audio_buffer.extend(chunk)
             
        # Once stream ends (e.g. EOS from client stops iterator? No, iterator yields chunks indefinitely?)
        # Ah, we need a way to detect "turn end" inside the stream if we want partial responses.
        # But if we are bridging, we wait for full input.
        
        async for chunk in self.process_audio(bytes(audio_buffer), language, user_id, character):
            yield chunk

    async def process_audio(self, audio_data: bytes, language: str, user_id: str, character: str):
        """Process audio message using Gemini 1.5 Flash (Light) STT -> LLM) + TTS with streaming"""
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

            # Map language codes to full language names for better clarity
            language_map = {
                'en': 'English',
                'ja': 'Japanese',
                'vi': 'Vietnamese'
            }
            language_name = language_map.get(language, language)

            # Enhanced system instruction with language requirement
            enhanced_instruction = f"""{char_config['system_instruction']}

CRITICAL LANGUAGE REQUIREMENT:
- You MUST respond ONLY in {language_name} language (language code: {language})
- The user is speaking to you in {language_name}
- ALL of your responses must be in {language_name}
- Do NOT use any other language in your response
- Match the language that the user is using in the audio"""

            # Use generate_content_stream for streaming response
            response_stream = self.client.models.generate_content_stream(
                model=self.model_id,
                contents=[
                    types.Content(
                        parts=[
                            types.Part(text=enhanced_instruction),
                            types.Part(text=f"Listen to the audio message from the user (speaking in {language_name}) and respond naturally in the SAME language ({language_name})."),
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
            
            text_buffer = ""
            
            for chunk in response_stream:
                text_chunk = chunk.text
                if not text_chunk: continue
                
                text_buffer += text_chunk
                
                # Split by punctuation (., !, ?, \n, and Japanese/Chinese punctuation)
                # Keep delimiters
                parts = re.split(r'([.!?;:\n。！？])', text_buffer)
                
                # Reconstruct sentences
                sentences = []
                current_sentence = ""
                
                for part in parts:
                    current_sentence += part
                    if re.match(r'[.!?;:\n。！？]', part):
                        sentences.append(current_sentence)
                        current_sentence = ""
                
                # If we have complete sentences, process them
                if len(sentences) > 0:
                    for sentence in sentences:
                        if not sentence.strip(): continue
                        
                        logger.info(f"Generating TTS for chunk: {sentence}")
                        audio_chunk = self._generate_tts(sentence, language)
                        if audio_chunk:
                            yield audio_chunk
                    
                    # Keep the incomplete part in buffer
                    text_buffer = current_sentence
            
            # Process remaining buffer
            if text_buffer.strip():
                logger.info(f"Generating TTS for final chunk: {text_buffer}")
                audio_chunk = self._generate_tts(text_buffer, language)
                if audio_chunk:
                    yield audio_chunk

        except Exception as e:
            logger.error(f"Error in LightController: {e}")
            raise

    def _generate_tts(self, text: str, language: str) -> bytes:
        """Generate TTS audio for a text chunk"""
        try:
            tts = gTTS(text=text, lang=language)
            mp3_io = io.BytesIO()
            tts.write_to_fp(mp3_io)
            mp3_io.seek(0)
            
            # Convert MP3 to PCM 24kHz
            audio_response = AudioSegment.from_mp3(mp3_io)
            audio_response = audio_response.set_frame_rate(24000).set_channels(1).set_sample_width(2)
            
            return audio_response.raw_data
        except Exception as e:
            logger.error(f"TTS generation error: {e}")
            return b""

        except Exception as e:
            logger.error(f"Error in LightController: {e}")
            raise
