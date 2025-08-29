#!/usr/bin/env python3
"""
AI Conversation Service using Google Gemini
"""

import os
import asyncio
import logging
from typing import AsyncIterator, Dict, Any
from dotenv import load_dotenv
import google.genai as genai
from google.genai import types as genai_types
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
    from pydub import AudioSegment
    AUDIO_PROCESSING_AVAILABLE = True
except ImportError:
    AUDIO_PROCESSING_AVAILABLE = False
    logging.warning("pydub not available")

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    logging.warning("gTTS not available")

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
        
        self.client = genai.Client(api_key=api_key)
        # Text and speech models
        self.text_model = 'gemini-2.0-flash-exp'
        self.tts_model = 'text-to-speech'
        
        # Initialize speech recognition if available
        if SPEECH_RECOGNITION_AVAILABLE:
            self.recognizer = sr.Recognizer()
        else:
            self.recognizer = None
        
        # Character and language configurations
        self.character_configs = {
            'friend': {
                'vi': {
                    'name': 'Vietnamese Friend',
                    'speech_lang': 'vi-VN',
                    'voice': {'language_code': 'vi-VN', 'name': 'vi-VN-Neural2-A'},  # Male voice
                    'system_prompt': '''Bạn là một người bạn nam 20 tuổi đang trò chuyện với tôi bằng tiếng Việt. Hãy:

- Phản ứng tự nhiên với những gì tôi nói (dùng "À!", "Ồ!", "Thật không?", "Hay quá!")
- Hỏi thêm để hiểu rõ hơn ("Vậy sao?", "Rồi thế nào?", "Bạn cảm thấy thế nào?")
- Chia sẻ ý kiến hoặc cảm nhận của bạn như một chàng trai trẻ
- Trả lời ngắn và tự nhiên (1-2 câu)
- Tránh dạy học hay giải thích dài dòng

Chúng ta đang trò chuyện bình thường, không phài trong lớp học.'''
                },
                'ja': {
                    'name': 'Japanese Friend',
                    'speech_lang': 'ja-JP',
                    'voice': {'language_code': 'ja-JP', 'name': 'ja-JP-Neural2-C'},  # Male voice
                    'system_prompt': '''あなたは私と日本語で普通に話している20代男性の友達です。以下のように会話してください：

- 私が言ったことに自然に反応する（「えー！」「そうなんだ」「へー」「いいね！」）
- 気になることがあったら質問する（「どうだった？」「それで？」「どう思う？」）
- 20代男性らしい自分の意見や感想を言う
- 短く自然に話す（1-2文程度）
- 教える感じではなく、普通の会話として

私たちは友達同士で話しているだけです。'''
                }
            },
            'parent': {
                'vi': {
                    'name': 'Vietnamese Parent',
                    'speech_lang': 'vi-VN',
                    'voice': {'language_code': 'vi-VN', 'name': 'vi-VN-Neural2-A'},  # Female voice
                    'system_prompt': '''Bạn là một người mẹ 40 tuổi đang nói chuyện với con bằng tiếng Việt. Hãy:

- Thể hiện sự quan tâm và yêu thương như một người mẹ ("Con có khỏe không?", "Mẹ lo lắm đấy")
- Chia sẻ kinh nghiệm và lời khuyên nhẹ nhàng với trí tuệ của người mẹ trung niên
- Hỏi về cuộc sống, học tập, công việc với sự quan tâm của mẹ
- Nói chuyện ấm áp và tự nhiên (1-2 câu)
- Không quá nghiêm khắc, chỉ là nói chuyện bình thường

Chúng ta là gia đình đang trò chuyện.'''
                },
                'ja': {
                    'name': 'Japanese Parent',
                    'speech_lang': 'ja-JP',
                    'voice': {'language_code': 'ja-JP', 'name': 'ja-JP-Neural2-A'},  # Female voice
                    'system_prompt': '''あなたは私の40代の母親として日本語で話しています：

- 優しく心配してくれる母親らしく（「元気？」「大丈夫？」「お疲れさま」）
- 人生経験豊富な40代女性として軽いアドバイスをくれる
- 日常生活について母親らしく聞いてくれる
- 温かく自然に話す（1-2文程度）
- 厳しすぎず、普通の家族の会話として

私たちは家族として話しています。'''
                }
            },
            'sister': {
                'vi': {
                    'name': 'Vietnamese Sister',
                    'speech_lang': 'vi-VN',
                    'voice': {'language_code': 'vi-VN', 'name': 'vi-VN-Neural2-A'},  # Female voice
                    'system_prompt': '''Bạn là em gái 24 tuổi đang nói chuyện bằng tiếng Việt. Hãy:

- Tỏ ra thân thiết và hơi tinh nghịch như cô gái 24 tuổi ("Anh/chị làm gì đấy?", "Hehe")
- Chia sẻ những chuyện hàng ngày của một cô gái trẻ
- Hỏi những câu hỏi tò mò với sự tươi trẻ
- Nói chuyện vui vẻ và tự nhiên (1-2 câu)
- Có thể hơi nghịch ngợm nhưng thương yêu như em gái 24 tuổi

Chúng ta là anh chị em ruột.'''
                },
                'ja': {
                    'name': 'Japanese Sister',
                    'speech_lang': 'ja-JP',
                    'voice': {'language_code': 'ja-JP', 'name': 'ja-JP-Neural2-A'},  # Female voice
                    'system_prompt': '''あなたは私の24歳の妹として日本語で話しています：

- 親しげで少しいたずらっぽい24歳女性らしく（「何してるの？」「へへ」）
- 24歳の女性らしい日常のことを共有する
- 好奇心旺盛な質問をする若い女性らしく
- 楽しく自然に話す（1-2文程度）
- 少しいたずらっ子だけど愛情がある妹らしく

私たちは兄弟姉妹です。'''
                }
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
            
            # Default to friend character for speech recognition
            char_config = self.character_configs.get('friend', {}).get(language, self.character_configs['friend']['vi'])
            text = self.recognizer.recognize_google(audio, language=char_config['speech_lang'])
            logger.info(f"Speech to text ({language}): {text}")
            return text
            
        except Exception as e:
            logger.error(f"Speech to text error: {e}")
            return "Could not process audio input"
    
    def text_to_speech(self, text: str, language: str, character: str = 'friend') -> bytes:
        """Convert text to speech audio data using Gemini API Text-to-Speech"""
        # Get character and language configuration
        char_config = self.character_configs.get(character, {}).get(language)
        if not char_config:
            # Fallback to friend character in the same language or Vietnamese
            char_config = (self.character_configs.get('friend', {}).get(language) or
                          self.character_configs['friend']['vi'])

        # Try Gemini API Text-to-Speech first
        try:
            speech_config = genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name=char_config['voice']['name']
                    )
                ),
                language_code=char_config['speech_lang']
            )

            response = self.client.models.generate_content(
                model=self.tts_model,
                contents=text,
                config=genai_types.GenerateContentConfig(
                    response_mime_type="audio/mp3",
                    speech_config=speech_config
                )
            )

            audio_data = response.candidates[0].content.parts[0].inline_data.data
            logger.info(f"Text to speech ({language}, {character}): Generated audio for '{text[:50]}...'")
            return audio_data

        except Exception as e:
            logger.error(f"Gemini TTS error: {e}")

        # Fallback to gTTS if Gemini TTS is unavailable or fails
        if GTTS_AVAILABLE:
            try:
                gtts_lang = char_config['speech_lang'].split('-')[0]
                tts = gTTS(text=text, lang=gtts_lang)
                with io.BytesIO() as audio_buffer:
                    tts.write_to_fp(audio_buffer)
                    audio_buffer.seek(0)
                    logger.info(f"gTTS fallback ({language}, {character}): Generated audio for '{text[:50]}...'")
                    return audio_buffer.read()
            except Exception as e:
                logger.error(f"gTTS fallback error: {e}")

        logger.warning("Text-to-Speech unavailable, returning empty audio")
        return b""
    
    async def get_ai_response(self, message: str, language: str, session_id: str, character: str = 'friend') -> str:
        """Get AI response using Google Gemini"""
        try:
            # Get character and language configuration
            char_config = self.character_configs.get(character, {}).get(language)
            if not char_config:
                # Fallback to friend character in the same language or Vietnamese
                char_config = (self.character_configs.get('friend', {}).get(language) or 
                              self.character_configs['friend']['vi'])
            
            # Initialize conversation history if not exists
            if session_id not in self.conversations:
                self.conversations[session_id] = [
                    {"role": "system", "content": char_config['system_prompt']}
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
                self.client.models.generate_content,
                model=self.text_model,
                contents=f"{char_config['system_prompt']}\n\nConversation:\n{conversation_context}\n\nAI:"
            )
            
            ai_response = response.text.strip()
            
            # Add AI response to history
            self.conversations[session_id].append({"role": "assistant", "content": ai_response})
            
            logger.info(f"AI response ({language}): {ai_response}")
            return ai_response
            
        except Exception as e:
            logger.error(f"AI response error: {e}")
            return "Sorry, I couldn't process your request. Please try again."
    
    async def process_audio_message(self, audio_data: bytes, language: str, session_id: str, character: str = 'friend') -> tuple[str, bytes]:
        """Process audio message and return text response and audio response"""
        try:
            # Convert speech to text
            user_text = self.speech_to_text(audio_data, language)
            
            # Get AI response
            ai_response_text = await self.get_ai_response(user_text, language, session_id, character)
            
            # Convert AI response to speech
            ai_response_audio = await asyncio.to_thread(
                self.text_to_speech, ai_response_text, language, character
            )
            
            # Check if audio was generated successfully
            if not ai_response_audio:
                raise ValueError("Failed to generate audio response")
            
            return ai_response_text, ai_response_audio
            
        except Exception as e:
            logger.error(f"Process audio message error: {e}")
            raise e
    
    async def process_text_message(self, text: str, language: str, session_id: str, character: str = 'friend') -> tuple[str, bytes]:
        """Process text message and return text response and audio response"""
        try:
            # Get AI response
            ai_response_text = await self.get_ai_response(text, language, session_id, character)
            
            # Convert AI response to speech
            ai_response_audio = await asyncio.to_thread(
                self.text_to_speech, ai_response_text, language, character
            )
            
            # Check if audio was generated successfully
            if not ai_response_audio:
                raise ValueError("Failed to generate audio response")
            
            return ai_response_text, ai_response_audio
            
        except Exception as e:
            logger.error(f"Process text message error: {e}")
            raise e
    
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