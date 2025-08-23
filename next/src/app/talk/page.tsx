'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  AIConversationRequestSchema,
  StartConversationRequestSchema,
  EndConversationRequestSchema,
} from "../../gen/app/ai_conversation_pb";
import { AIConversationService } from "../../gen/app/ai_conversation_service_pb";
import { create } from "@bufbuild/protobuf";

interface User {
  username: string;
  language: string;
}

interface ConversationMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export default function TalkPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Create Connect client
  const transport = createConnectTransport({
    baseUrl: "http://localhost:8000/connect",
  });
  const client = createClient(AIConversationService, transport);

  const languageNames = {
    vi: 'Vietnamese (Tiếng Việt)',
    en: 'English',
    ja: 'Japanese (日本語)'
  };

  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    // Check if user is authenticated
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    initializeAudioPermissions();
  }, [router]);

  useEffect(() => {
    // Start AI conversation when user is available and audio is ready
    if (user && audioStream && !isConnected && !sessionId) {
      startAIConversation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, audioStream, isConnected, sessionId]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (sessionId) {
        endAIConversation();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const initializeAudioPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsConnected(true);
      setError(null);
    } catch {
      setError('Microphone access denied. Please enable microphone permissions to use voice chat.');
      setIsConnected(false);
    }
  };

  const startRecording = async () => {
    if (!audioStream) {
      await initializeAudioPermissions();
      return;
    }

    try {
      const recorder = new MediaRecorder(audioStream);
      const audioChunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Add user message to conversation
        const userMessage: ConversationMessage = {
          id: `user_${Date.now()}`,
          sender: 'user',
          content: 'Voice message recorded', // This would be replaced with speech-to-text
          timestamp: new Date(),
          audioUrl
        };
        
        setConversation(prev => [...prev, userMessage]);
        
        // Send to AI service (to be implemented)
        await sendToAI(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setError(null);
    } catch {
      setError('Failed to start recording. Please check your microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const startAIConversation = async () => {
    if (!user) return;

    try {
      const response = await client.startConversation(create(StartConversationRequestSchema, {
        userId: `user_${user.username}`,
        username: user.username,
        language: user.language,
      }));

      if (response.success) {
        setSessionId(response.sessionId);
        setIsConnected(true);
        setError(null);
      } else {
        setError(response.errorMessage || 'Failed to start conversation');
      }
    } catch (err) {
      setError(`Failed to connect to AI service: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const endAIConversation = async () => {
    if (!sessionId) return;

    try {
      await client.endConversation(create(EndConversationRequestSchema, {
        sessionId,
        userId: `user_${user?.username}`,
      }));
      setSessionId(null);
      setIsConnected(false);
    } catch (err) {
      console.error('Failed to end conversation:', err);
    }
  };

  const sendToAI = async (audioBlob: Blob) => {
    if (!user) return;

    try {
      // Convert audio blob to bytes
      const audioBytes = new Uint8Array(await audioBlob.arrayBuffer());
      
      const response = await client.sendMessage(create(AIConversationRequestSchema, {
        userId: `user_${user.username}`,
        username: user.username,
        language: user.language,
        content: {
          case: "audioData",
          value: audioBytes,
        },
        timestamp: { seconds: BigInt(Math.floor(Date.now() / 1000)), nanos: 0 },
      }));

      // Add AI response to conversation
      const responseText = response.content?.case === 'textMessage' ? response.content.value : 'AI response received';
      const responseAudio = response.content?.case === 'audioData' ? response.content.value : undefined;
      
      const aiMessage: ConversationMessage = {
        id: response.responseId,
        sender: 'ai',
        content: responseText,
        timestamp: new Date(),
        audioUrl: responseAudio ? URL.createObjectURL(new Blob([responseAudio], { type: 'audio/mp3' })) : undefined
      };
      
      setConversation(prev => [...prev, aiMessage]);

      // Play AI response audio if available
      if (responseAudio && aiMessage.audioUrl) {
        const audio = new Audio(aiMessage.audioUrl);
        audio.play().catch(console.error);
      }

    } catch (err) {
      setError(`Failed to send message to AI service: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const logout = async () => {
    await endAIConversation();
    localStorage.removeItem('user');
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    router.push('/');
  };

  const changeLanguage = (newLanguage: string) => {
    if (user) {
      const updatedUser = { ...user, language: newLanguage };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">AI Language Practice</h1>
              <p className="text-gray-600">Practice with: {languageNames[user.language as keyof typeof languageNames]}</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={user.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="vi">Vietnamese</option>
                <option value="en">English</option>
                <option value="ja">Japanese</option>
              </select>
              <span className={`px-3 py-1 rounded-full text-sm ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {!isConnected && (
                <button
                  onClick={startAIConversation}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Connect to AI
                </button>
              )}
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="max-w-4xl mx-auto w-full px-4 py-2">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Conversation area */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {conversation.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="text-4xl mb-4">🎤</div>
                <h3 className="text-lg font-medium mb-2">Start your conversation!</h3>
                <p>Click the microphone button below to begin practicing your {languageNames[user.language as keyof typeof languageNames]}.</p>
              </div>
            ) : (
              conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.sender === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div>{message.content}</div>
                    {message.audioUrl && (
                      <audio controls className="mt-2 w-full">
                        <source src={message.audioUrl} type="audio/wav" />
                      </audio>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={conversationEndRef} />
          </div>

          {/* Recording controls */}
          <div className="border-t p-6">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected}
                className={`p-4 rounded-full transition-colors ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600'
                } disabled:bg-gray-300 text-white`}
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  {isRecording ? (
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a2 2 0 114 0v4a2 2 0 11-4 0V7z"
                      clipRule="evenodd"
                    />
                  ) : (
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  )}
                </svg>
              </button>
              <div className="text-center">
                <div className="font-medium">
                  {isRecording ? 'Recording...' : 'Tap to speak'}
                </div>
                <div className="text-sm text-gray-600">
                  {isRecording ? 'Click again to stop' : 'Hold conversation with AI'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}