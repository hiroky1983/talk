"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AIConversationRequestSchema } from "../gen/app/ai_conversation_pb";
import { AIConversationService } from "../gen/app/ai_conversation_service_pb";
import { create } from "@bufbuild/protobuf";
import TalkHeader from "./TalkHeader";
import { Language } from "@/types/types";

interface User {
  username: string;
  language: Language;
}

interface Character {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

interface ConversationMessage {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

const characters: Character[] = [
  {
    id: "friend",
    name: "ホアン",
    description: "A friendly companion for casual conversation",
    emoji: "👨",
  },
  {
    id: "parent",
    name: "お母さん",
    description: "A caring parent figure who gives advice and support",
    emoji: "👩",
  },
  {
    id: "sister",
    name: "妹",
    description: "A playful sister who shares daily life stories",
    emoji: "👧",
  },
];

const languageNames = {
  vi: "Vietnamese (Tiếng Việt)",
  ja: "Japanese (日本語)",
} as const;

const TalkScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string>("friend");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.VI);
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(
    null
  );
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  const router = useRouter();
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const transport = createConnectTransport({
    baseUrl: "http://localhost:8000/connect",
  });
  const client = createClient(AIConversationService, transport);

  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleStreamResponse = (response: any) => {
    const responseText =
      response.content?.case === "textMessage" ? response.content.value : "";
    const responseAudio =
      response.content?.case === "audioData"
        ? response.content.value
        : undefined;

    // 新しいAI応答の開始
    if (response.isNewMessage && !streamingMessageId) {
      const aiMessageId = `ai_${Date.now()}`;
      const aiMessage: ConversationMessage = {
        id: aiMessageId,
        sender: "ai",
        content: responseText || "...",
        timestamp: new Date(),
      };
      setConversation((prev) => [...prev, aiMessage]);
      setStreamingMessageId(aiMessageId);
    }
    // 既存のメッセージを更新
    else if (streamingMessageId) {
      setConversation((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId
            ? {
                ...msg,
                content: responseText || msg.content,
                audioUrl: responseAudio
                  ? URL.createObjectURL(
                      new Blob([responseAudio], { type: "audio/mp3" })
                    )
                  : msg.audioUrl,
              }
            : msg
        )
      );

      // 音声があれば即座に再生
      if (responseAudio) {
        const audio = new Audio(
          URL.createObjectURL(new Blob([responseAudio], { type: "audio/mp3" }))
        );
        audio.play().catch(console.error);
      }
    }

    // 応答完了
    if (response.isFinal) {
      setStreamingMessageId(null);
      // 最終的にTTSで読み上げ（音声がない場合）
      if (responseText && !responseAudio) {
        setTimeout(() => {
          generateAndPlayTTS(responseText);
        }, 100);
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(userData));
    initializeAudioPermissions();
  }, [router]);

  useEffect(() => {
    if (user && audioStream && !isConnected && !sessionId) {
      startAIConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, audioStream, isConnected, sessionId]);

  const initializeAudioPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsConnected(true);
      setError(null);
    } catch {
      setError(
        "Microphone access denied. Please enable microphone permissions to use voice chat."
      );
      setIsConnected(false);
    }
  };

  const handleCharacterChange = async (newCharacter: string) => {
    if (newCharacter === selectedCharacter) return;
    if (isConnected && sessionId) {
      setSelectedCharacter(newCharacter);
      setConversation([]);
      setTimeout(() => {
        startAIConversation();
      }, 500);
    } else {
      setSelectedCharacter(newCharacter);
      setConversation([]);
    }
  };

  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === selectedLanguage) return;
    if (isConnected && sessionId) {
      setSelectedLanguage(newLanguage);
      setConversation([]);
      setTimeout(() => {
        startAIConversation();
      }, 500);
    } else {
      setSelectedLanguage(newLanguage);
      setConversation([]);
    }
  };

  const startRecording = async () => {
    if (!audioStream) {
      await initializeAudioPermissions();
      return;
    }
    try {
      const recorder = new MediaRecorder(audioStream, {
        mimeType: "audio/webm;codecs=opus",
      });

      // リアルタイムで音声チャンクを送信
      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log(event.data);

          await sendAudioChunkToAI(event.data);
        }
      };

      // 小さなチャンク（100ms）でリアルタイム送信
      recorder.start(100);

      setMediaRecorder(recorder);
      setIsRecording(true);
      setError(null);
    } catch {
      setError("Failed to start recording. Please check your microphone.");
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
      const systemMessage: ConversationMessage = {
        id: `sys_${Date.now()}`,
        sender: "ai",
        content: "Connected to AI. Ready for real-time conversation!",
        timestamp: new Date(),
      };
      setConversation([systemMessage]);
      setError(null);
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError(
        `Failed to connect to AI service: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setIsConnected(false);
    }
  };

  const sendAudioChunkToAI = async (audioChunk: Blob) => {
    if (!user) return;

    try {
      const arrayBuffer = await audioChunk.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);

      const request = create(AIConversationRequestSchema, {
        userId: `user_${user.username}`,
        username: user.username,
        language: selectedLanguage,
        character: selectedCharacter,
        content: { case: "audioData" as const, value: audioData },
        timestamp: { seconds: BigInt(Math.floor(Date.now() / 1000)), nanos: 0 },
      });

      console.log(
        "Sending audio chunk to AI...",
        audioData.length,
        "bytes",
        "format:",
        audioChunk.type
      );

      const response = await client.sendMessage(request);
      handleStreamResponse(response);
    } catch (err) {
      console.error("Failed to send audio chunk:", err);
      setError(
        `Failed to send audio chunk: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const generateAndPlayTTS = async (text: string) => {
    if (!text.trim()) return;
    try {
      setIsGeneratingAudio(text);
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectedLanguage === Language.JA ? "ja-JP" : "vi-VN";
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.onend = () => setIsGeneratingAudio(null);
        utterance.onerror = () => {
          setIsGeneratingAudio(null);
          setError("Failed to generate speech");
        };
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      } else {
        setError("Text-to-speech is not supported in this browser");
        setIsGeneratingAudio(null);
      }
    } catch (err) {
      console.error("TTS error:", err);
      setError("Failed to generate speech");
      setIsGeneratingAudio(null);
    }
  };

  const logout = async () => {
    localStorage.removeItem("user");
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    router.push("/");
  };

  return (
    <>
      <TalkHeader
        user={user}
        selectedLanguage={selectedLanguage}
        selectedCharacter={selectedCharacter}
        isConnected={isConnected}
        languageNames={languageNames}
        characters={characters}
        onLanguageChange={handleLanguageChange}
        onCharacterChange={handleCharacterChange}
        onStartConversation={startAIConversation}
        onLogout={logout}
      />

      {error && (
        <div className="max-w-4xl mx-auto w-full px-4 py-2">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded">
            {error}
          </div>
        </div>
      )}

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!user ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : conversation.length === 0 ? (
              <div className="text-center text-gray-500">
                Start a conversation by speaking!
              </div>
            ) : (
              conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                      message.sender === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            message.sender === "user"
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      {message.sender === "ai" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => generateAndPlayTTS(message.content)}
                            disabled={isGeneratingAudio === message.content}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isGeneratingAudio === message.content
                                ? "bg-blue-100 text-blue-800"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            {isGeneratingAudio === message.content ? (
                              <>
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                Playing...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L6.966 15.5H2a1 1 0 01-1-1v-4a1 1 0 011-1h4.966l1.417-1.32a1 1 0 01.617-.084z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                🔊 Play
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {message.audioUrl && message.sender === "user" && (
                        <audio controls className="mt-2 w-full">
                          <source src={message.audioUrl} type="audio/wav" />
                        </audio>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={conversationEndRef} />
          </div>

          <div className="border-t p-6">
            {user ? (
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isConnected}
                  aria-label={
                    isRecording ? "Stop recording" : "Start recording"
                  }
                  className={`p-4 rounded-full transition-colors ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-blue-500 hover:bg-blue-600"
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
                    {isRecording ? "Recording..." : "Tap to speak"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isRecording
                      ? "Click again to stop"
                      : "Hold conversation with AI"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <div className="p-4 rounded-full bg-gray-200">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-400">
                    Please wait...
                  </div>
                  <div className="text-sm text-gray-400">
                    Loading audio controls
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TalkScreen;
