"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

export default function TalkPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string>("friend");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("vi");
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(
    null
  );
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const router = useRouter();
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Create Connect client
  const transport = createConnectTransport({
    baseUrl: "http://localhost:8000/connect",
  });
  const client = createClient(AIConversationService, transport);

  const languageNames = {
    vi: "Vietnamese (Tiếng Việt)",
    ja: "Japanese (日本語)",
  };

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

  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    // Check if user is authenticated
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(userData));
    initializeAudioPermissions();
  }, [router]);

  // Update speech recognition language when selectedLanguage changes
  useEffect(() => {
    if (recognition) {
      recognition.lang = selectedLanguage === "ja" ? "ja-JP" : "vi-VN";
    }
  }, [selectedLanguage, recognition]);

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

      // Initialize speech recognition if available
      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        const SpeechRecognition =
          (window as any).webkitSpeechRecognition ||
          (window as any).SpeechRecognition;
        const recognitionInstance = new SpeechRecognition();

        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = selectedLanguage === "ja" ? "ja-JP" : "vi-VN";

        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setTranscribedText(finalTranscript);
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };

        setRecognition(recognitionInstance);
      }
    } catch {
      setError(
        "Microphone access denied. Please enable microphone permissions to use voice chat."
      );
      setIsConnected(false);
    }
  };

  const handleCharacterChange = async (newCharacter: string) => {
    if (newCharacter === selectedCharacter) return;

    // If connected, end current session and start new one with new character
    if (isConnected && sessionId) {
      await endAIConversation();
      setSelectedCharacter(newCharacter);
      // Clear conversation history when switching characters
      setConversation([]);
      // Wait a bit then start new conversation
      setTimeout(() => {
        startAIConversation();
      }, 500);
    } else {
      setSelectedCharacter(newCharacter);
      // Clear conversation history when switching characters
      setConversation([]);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === selectedLanguage) return;

    // If connected, end current session and start new one with new language
    if (isConnected && sessionId) {
      await endAIConversation();
      setSelectedLanguage(newLanguage);
      // Clear conversation history when switching languages
      setConversation([]);
      // Wait a bit then start new conversation
      setTimeout(() => {
        startAIConversation();
      }, 500);
    } else {
      setSelectedLanguage(newLanguage);
      // Clear conversation history when switching languages
      setConversation([]);
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

      // Reset transcribed text
      setTranscribedText("");

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });

        // Stop speech recognition
        if (recognition) {
          recognition.stop();
        }

        // Send to AI service with transcribed text
        await sendToAI(audioBlob, transcribedText);
      };

      recorder.start();

      // Start speech recognition
      if (recognition) {
        recognition.start();
      }

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
      const response = await client.startConversation(
        create(StartConversationRequestSchema, {
          userId: `user_${user.username}`,
          username: user.username,
          language: selectedLanguage,
          character: selectedCharacter,
        })
      );

      if (response.success) {
        setSessionId(response.sessionId);
        setIsConnected(true);
        setError(null);
      } else {
        setError(response.errorMessage || "Failed to start conversation");
      }
    } catch (err) {
      setError(
        `Failed to connect to AI service: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const endAIConversation = async () => {
    if (!sessionId) return;

    try {
      await client.endConversation(
        create(EndConversationRequestSchema, {
          sessionId,
          userId: `user_${user?.username}`,
        })
      );
      setSessionId(null);
      setIsConnected(false);
    } catch (err) {
      console.error("Failed to end conversation:", err);
    }
  };
  const sendToAI = async (audioBlob: Blob, transcribedUserText: string) => {
    if (!user) return;

    try {
      // Add user message immediately
      const userMessage: ConversationMessage = {
        id: `user_${Date.now()}`,
        sender: "user",
        content: transcribedUserText || "[音声入力] 音声を認識できませんでした",
        timestamp: new Date(),
      };

      // Add placeholder AI message for streaming
      const aiMessageId = `ai_${Date.now()}`;
      const aiMessage: ConversationMessage = {
        id: aiMessageId,
        sender: "ai",
        content: "Thinking...",
        timestamp: new Date(),
      };

      setConversation((prev) => [...prev, userMessage, aiMessage]);
      setStreamingMessageId(aiMessageId);

      // For now, use the simple SendMessage instead of streaming
      // Convert audio blob to bytes
      const audioBytes = new Uint8Array(await audioBlob.arrayBuffer());

      // Send the audio message using unary call
      const response = await client.sendMessage(
        create(AIConversationRequestSchema, {
          userId: `user_${user.username}`,
          username: user.username,
          language: selectedLanguage,
          character: selectedCharacter,
          content: {
            case: "audioData",
            value: audioBytes,
          },
          timestamp: {
            seconds: BigInt(Math.floor(Date.now() / 1000)),
            nanos: 0,
          },
        })
      );

      // Process the response
      const responseText =
        response.content?.case === "textMessage"
          ? response.content.value
          : "AI response received";
      const responseAudio =
        response.content?.case === "audioData"
          ? response.content.value
          : undefined;

      // Update the AI message with the response
      setConversation((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: responseText,
                audioUrl: responseAudio
                  ? URL.createObjectURL(
                      new Blob([responseAudio], { type: "audio/mp3" })
                    )
                  : undefined,
              }
            : msg
        )
      );

      // Auto-play AI response
      if (responseAudio) {
        const audio = new Audio(
          URL.createObjectURL(new Blob([responseAudio], { type: "audio/mp3" }))
        );
        audio.play().catch(console.error);
      } else {
        // Use TTS for the response
        setTimeout(() => {
          generateAndPlayTTS(responseText);
        }, 500);
      }
    } catch (err) {
      setError(
        `Failed to send message to AI service: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setStreamingMessageId(null);
    }
  };

  const generateAndPlayTTS = async (text: string) => {
    if (!text.trim()) return;

    try {
      setIsGeneratingAudio(text);

      // Use Web Speech API for text-to-speech
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);

        // Use selected language
        utterance.lang = selectedLanguage === "ja" ? "ja-JP" : "vi-VN";

        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          setIsGeneratingAudio(null);
        };

        utterance.onerror = () => {
          setIsGeneratingAudio(null);
          setError("Failed to generate speech");
        };

        // Cancel any ongoing speech
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
    await endAIConversation();
    localStorage.removeItem("user");
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                AI Language Practice
              </h1>
              <p className="text-gray-600">
                Practice with: {languageNames[selectedLanguage as keyof typeof languageNames]}
              </p>
            </div>
            {user ? (
              <div className="flex items-center gap-4">
                {/* Language Selection */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Language:
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:outline-none"
                  >
                    {Object.entries(languageNames).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Character Selection */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Character:
                  </label>
                  <select
                    value={selectedCharacter}
                    onChange={(e) => handleCharacterChange(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:outline-none"
                  >
                    {characters.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.emoji} {character.name}
                      </option>
                    ))}
                  </select>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    isConnected
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {isConnected
                    ? `Connected to ${
                        characters.find((c) => c.id === selectedCharacter)?.name
                      }`
                    : "Disconnected"}
                </span>
                {!isConnected && (
                  <button
                    type="button"
                    onClick={startAIConversation}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Connect to AI
                  </button>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
              </div>
            )}
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
            {!user ? (
              <div className="text-center text-gray-500 py-12">
                <div className="text-4xl mb-4">🎤</div>
                <h3 className="text-lg font-medium mb-2">
                  Loading your profile...
                </h3>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              </div>
            ) : conversation.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="text-4xl mb-4">
                  {characters.find((c) => c.id === selectedCharacter)?.emoji ||
                    "🎤"}
                </div>
                <h3 className="text-lg font-medium mb-2">
                  Start your conversation with{" "}
                  {characters.find((c) => c.id === selectedCharacter)?.name}!
                </h3>
                <p className="mb-2">
                  {
                    characters.find((c) => c.id === selectedCharacter)
                      ?.description
                  }
                </p>
                <p>
                  Click the microphone button below to begin practicing your{" "}
                  {languageNames[selectedLanguage as keyof typeof languageNames]}.
                </p>
              </div>
            ) : (
              conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex mb-4 ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex ${
                      message.sender === "user"
                        ? "flex-row-reverse"
                        : "flex-row"
                    } items-start gap-3 max-w-2xl`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        message.sender === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      }`}
                    >
                      {message.sender === "user" ? "👤" : "🤖"}
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm ${
                        message.sender === "user"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.sender === "user"
                            ? "You"
                            : characters.find((c) => c.id === selectedCharacter)
                                ?.name || "AI Assistant"}
                        </span>
                        <span
                          className={`text-xs ${
                            message.sender === "user"
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-sm leading-relaxed">
                        {message.content}
                        {streamingMessageId === message.id &&
                          message.content === "Thinking..." && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex gap-1">
                                <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]"></div>
                                <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]"></div>
                                <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]"></div>
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Audio controls for AI messages */}
                      {message.sender === "ai" && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (message.audioUrl) {
                                const audio = new Audio(message.audioUrl);
                                audio.play().catch(console.error);
                              } else {
                                // Generate TTS for the message
                                generateAndPlayTTS(message.content);
                              }
                            }}
                            disabled={isGeneratingAudio === message.content}
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-colors ${
                              isGeneratingAudio === message.content
                                ? "bg-blue-100 text-blue-600 cursor-not-allowed"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
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

          {/* Recording controls */}
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
                    {isRecording
                      ? "Recording & Transcribing..."
                      : "Tap to speak"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isRecording
                      ? "Click again to stop"
                      : "Hold conversation with AI"}
                  </div>
                  {isRecording && transcribedText && (
                    <div className="text-sm text-blue-600 mt-2 p-2 bg-blue-50 rounded">
                      "{transcribedText}"
                    </div>
                  )}
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
    </div>
  );
}
