#!/usr/bin/env python3
"""
AI Conversation Service using Google Gemini
"""

import os
import asyncio
import logging
from typing import AsyncIterator, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai
import io
import tempfile

# Optional imports for audio processing
try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False
    logging.warning("SpeechRecognition not available")

try:
    from gtts import gTTS
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    logging.warning("gTTS not available")

try:
    from pydub import AudioSegment
    AUDIO_PROCESSING_AVAILABLE = True
except ImportError:
    AUDIO_PROCESSING_AVAILABLE = False
    logging.warning("pydub not available")

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIConversationService:
    def __init__(self):
        # Initialize Google Gemini
        api_key = os.getenv('GOOGLE_GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_GEMINI_API_KEY not found in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        
        # Initialize speech recognition if available
        if SPEECH_RECOGNITION_AVAILABLE:
            self.recognizer = sr.Recognizer()
        else:
            self.recognizer = None
        
        # Language configurations
        self.language_configs = {
            'vi': {
                'name': 'Vietnamese',
                'speech_lang': 'vi-VN',
                'tts_lang': 'vi',
                'system_prompt': 'Bạn là một trợ lý AI giúp người dùng luyện tập tiếng Việt. Hãy trả lời bằng tiếng Việt một cách tự nhiên và thân thiện.'
            },
            'en': {
                'name': 'English',
                'speech_lang': 'en-US',
                'tts_lang': 'en',
                'system_prompt': 'You are an AI assistant helping users practice English. Respond naturally and be encouraging in their language learning journey.'
            },
            'ja': {
                'name': 'Japanese',
                'speech_lang': 'ja-JP',
                'tts_lang': 'ja',
                'system_prompt': '日本語の練習を手伝うAIアシスタントです。自然で親しみやすい日本語で応答してください。'
            }
        }
        
        # Conversation history per session
        self.conversations: Dict[str, list] = {}
    
    def speech_to_text(self, audio_data: bytes, language: str) -> str:
        """Convert audio data to text using speech recognition"""
        if not SPEECH_RECOGNITION_AVAILABLE or not AUDIO_PROCESSING_AVAILABLE or not self.recognizer:
            return "Audio recognition not available - using text placeholder"
        
        try:
            # Convert bytes to audio segment
            audio_segment = AudioSegment.from_file(io.BytesIO(audio_data))
            
            # Convert to wav format if necessary
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
                audio_segment.export(temp_wav.name, format='wav')
                
                # Use speech recognition
                with sr.AudioFile(temp_wav.name) as source:
                    audio = self.recognizer.record(source)
                
                # Clean up temp file
                os.unlink(temp_wav.name)
            
            lang_config = self.language_configs.get(language, self.language_configs['en'])
            text = self.recognizer.recognize_google(audio, language=lang_config['speech_lang'])
            logger.info(f"Speech to text ({language}): {text}")
            return text
            
        except Exception as e:
            logger.error(f"Speech to text error: {e}")
            return "Could not process audio input"
    
    def text_to_speech(self, text: str, language: str) -> bytes:
        """Convert text to speech audio data"""
        if not TTS_AVAILABLE:
            # Return empty bytes if TTS not available
            return b""
        
        try:
            lang_config = self.language_configs.get(language, self.language_configs['en'])
            tts = gTTS(text=text, lang=lang_config['tts_lang'], slow=False)
            
            # Save to bytes
            with io.BytesIO() as audio_buffer:
                tts.write_to_fp(audio_buffer)
                audio_buffer.seek(0)
                return audio_buffer.getvalue()
                
        except Exception as e:
            logger.error(f"Text to speech error: {e}")
            return b""
    
    async def get_ai_response(self, message: str, language: str, session_id: str) -> str:
        """Get AI response using Google Gemini"""
        try:
            # Get language configuration
            lang_config = self.language_configs.get(language, self.language_configs['en'])
            
            # Initialize conversation history if not exists
            if session_id not in self.conversations:
                self.conversations[session_id] = [
                    {"role": "system", "content": lang_config['system_prompt']}
                ]
            
            # Add user message to history
            self.conversations[session_id].append({"role": "user", "content": message})
            
            # Create conversation context
            conversation_context = "\n".join([
                f"{msg['role']}: {msg['content']}" 
                for msg in self.conversations[session_id][-10:]  # Last 10 messages for context
            ])
            
            # Generate response
            response = await asyncio.to_thread(
                self.model.generate_content,
                f"{lang_config['system_prompt']}\n\nConversation:\n{conversation_context}\n\nAI:"
            )
            
            ai_response = response.text.strip()
            
            # Add AI response to history
            self.conversations[session_id].append({"role": "assistant", "content": ai_response})
            
            logger.info(f"AI response ({language}): {ai_response}")
            return ai_response
            
        except Exception as e:
            logger.error(f"AI response error: {e}")
            return "Sorry, I couldn't process your request. Please try again."
    
    async def process_audio_message(self, audio_data: bytes, language: str, session_id: str) -> tuple[str, bytes]:
        """Process audio message and return text response and audio response"""
        try:
            # Convert speech to text
            user_text = self.speech_to_text(audio_data, language)
            
            # Get AI response
            ai_response_text = await self.get_ai_response(user_text, language, session_id)
            
            # Convert AI response to speech
            ai_response_audio = await asyncio.to_thread(
                self.text_to_speech, ai_response_text, language
            )
            
            return ai_response_text, ai_response_audio
            
        except Exception as e:
            logger.error(f"Process audio message error: {e}")
            error_msg = "Sorry, I couldn't process your audio message."
            error_audio = await asyncio.to_thread(
                self.text_to_speech, error_msg, language
            )
            return error_msg, error_audio
    
    async def process_text_message(self, text: str, language: str, session_id: str) -> tuple[str, bytes]:
        """Process text message and return text response and audio response"""
        try:
            # Get AI response
            ai_response_text = await self.get_ai_response(text, language, session_id)
            
            # Convert AI response to speech
            ai_response_audio = await asyncio.to_thread(
                self.text_to_speech, ai_response_text, language
            )
            
            return ai_response_text, ai_response_audio
            
        except Exception as e:
            logger.error(f"Process text message error: {e}")
            error_msg = "Sorry, I couldn't process your message."
            error_audio = await asyncio.to_thread(
                self.text_to_speech, error_msg, language
            )
            return error_msg, error_audio
    
    def start_conversation(self, session_id: str) -> bool:
        """Start a new conversation session"""
        try:
            self.conversations[session_id] = []
            logger.info(f"Started conversation session: {session_id}")
            return True
        except Exception as e:
            logger.error(f"Start conversation error: {e}")
            return False
    
    def end_conversation(self, session_id: str) -> bool:
        """End a conversation session"""
        try:
            if session_id in self.conversations:
                del self.conversations[session_id]
                logger.info(f"Ended conversation session: {session_id}")
            return True
        except Exception as e:
            logger.error(f"End conversation error: {e}")
            return False

if __name__ == "__main__":
    # Test the service
    async def test_service():
        service = AIConversationService()
        session_id = "test_session"
        
        service.start_conversation(session_id)
        
        # Test text message
        response_text, response_audio = await service.process_text_message(
            "Hello, how are you?", "en", session_id
        )
        print(f"Response: {response_text}")
        
        service.end_conversation(session_id)
    
    asyncio.run(test_service())