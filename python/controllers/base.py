from abc import ABC, abstractmethod

class AIController(ABC):
    @abstractmethod
    async def process_audio(self, audio_data: bytes, language: str, user_id: str, character: str) -> bytes:
        """Process audio input and return audio output"""
        pass
