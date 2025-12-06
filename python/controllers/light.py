import os
import logging
import io
import re
import base64
from google import genai
from google.genai import types
from google.cloud import texttospeech
from gtts import gTTS
from pydub import AudioSegment
from .base import AIController

logger = logging.getLogger(__name__)

# Character definitions (Should be shared)
CHARACTERS = {
    'friend': {
        'system_instruction': """You are Juan, a friendly and casual AI companion.
You are helpful, witty, and engaging. You speak naturally with a friendly tone.
Keep your responses concise and conversational.""",
        'voice': {
            'vi': {'name': 'vi-VN-Standard-B', 'gender': 'MALE'},
            'ja': {'name': 'ja-JP-Standard-C', 'gender': 'MALE'},
            'en': {'name': 'en-US-Standard-D', 'gender': 'MALE'}
        }
    },
    'parent': {
        'system_instruction': """You are a caring parent figure.
You are supportive, wise, and patient. You give good advice and care about the user's well-being.
Speak with a warm and nurturing tone.""",
        'voice': {
            'vi': {'name': 'vi-VN-Standard-A', 'gender': 'FEMALE'},
            'ja': {'name': 'ja-JP-Standard-A', 'gender': 'FEMALE'},
            'en': {'name': 'en-US-Standard-C', 'gender': 'FEMALE'}
        }
    },
    'sister': {
        'system_instruction': """You are a playful younger sister.
You are energetic, sometimes teasing, but affectionate. You like to share stories and ask questions.
Speak with a lively and youthful tone.""",
        'voice': {
            'vi': {'name': 'vi-VN-Standard-A', 'gender': 'FEMALE'},
            'ja': {'name': 'ja-JP-Standard-A', 'gender': 'FEMALE'},
            'en': {'name': 'en-US-Standard-C', 'gender': 'FEMALE'}
        }
    }
}

class LightController(AIController):
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model_id = "gemini-2.0-flash"
        # Initialize Google Cloud TTS client
        try:
            self.tts_client = texttospeech.TextToSpeechClient()
            self.use_cloud_tts = True
            logger.info("Google Cloud TTS client initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize Google Cloud TTS, falling back to gTTS: {e}")
            self.tts_client = None
            self.use_cloud_tts = False

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
            
            # Use generate_content_stream for streaming response
            response_stream = self.client.models.generate_content_stream(
                model=self.model_id,
                contents=[
                    types.Content(
                        parts=[
                            types.Part(text=char_config['system_instruction']),
                            types.Part(text=f"Listen to the audio and respond naturally in {language} language."),
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
                        audio_chunk = self._generate_tts(sentence, language, character)
                        if audio_chunk:
                            yield audio_chunk

                    # Keep the incomplete part in buffer
                    text_buffer = current_sentence

            # Process remaining buffer
            if text_buffer.strip():
                logger.info(f"Generating TTS for final chunk: {text_buffer}")
                audio_chunk = self._generate_tts(text_buffer, language, character)
                if audio_chunk:
                    yield audio_chunk

        except Exception as e:
            logger.error(f"Error in LightController: {e}")
            raise

    def _generate_tts(self, text: str, language: str, character: str) -> bytes:
        """Generate TTS audio for a text chunk with character-specific voice"""
        # Use Google Cloud TTS if available, otherwise fallback to gTTS
        if self.use_cloud_tts and self.tts_client:
            return self._generate_cloud_tts(text, language, character)
        else:
            return self._generate_gtts(text, language)

    def _generate_cloud_tts(self, text: str, language: str, character: str) -> bytes:
        """Generate TTS using Google Cloud Text-to-Speech with character-specific voice"""
        try:
            char_config = CHARACTERS.get(character, CHARACTERS['friend'])
            voice_config = char_config['voice'].get(language, char_config['voice'].get('en'))

            # Set up synthesis input
            synthesis_input = texttospeech.SynthesisInput(text=text)

            # Configure voice parameters
            voice = texttospeech.VoiceSelectionParams(
                language_code=voice_config['name'].split('-')[0] + '-' + voice_config['name'].split('-')[1],  # e.g., "vi-VN"
                name=voice_config['name'],
                ssml_gender=getattr(texttospeech.SsmlVoiceGender, voice_config['gender'])
            )

            # Configure audio output
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                sample_rate_hertz=24000
            )

            # Perform TTS request
            response = self.tts_client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )

            return response.audio_content

        except Exception as e:
            logger.error(f"Cloud TTS generation error: {e}, falling back to gTTS")
            return self._generate_gtts(text, language)

    def _generate_gtts(self, text: str, language: str) -> bytes:
        """Generate TTS using gTTS (fallback method)"""
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
            logger.error(f"gTTS generation error: {e}")
            return b""
