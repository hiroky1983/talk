/**
 * Hook for managing Gemini Live API conversation with VAD
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AIConversationService } from "@/gen/app/ai_conversation_service_pb";
import { create } from "@bufbuild/protobuf";
import { AIConversationRequestSchema } from "@/gen/app/ai_conversation_pb";
import { AudioRecorder } from "../audio/recorder";
import { AudioPlayer } from "../audio/player";
import { Language } from "@/types/types";

interface UseGeminiLiveProps {
  username: string;
  language: Language;
  character: string;
}

export const useGeminiLive = ({
  username,
  language,
  character,
}: UseGeminiLiveProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const transport = createConnectTransport({
    baseUrl: "http://localhost:8000",
  });
  const client = createClient(AIConversationService, transport);

  // Initialize audio components
  useEffect(() => {
    recorderRef.current = new AudioRecorder();
    playerRef.current = new AudioPlayer();
    playerRef.current.init();

    return () => {
      recorderRef.current?.stop();
      playerRef.current?.stop();
    };
  }, []);

  const sendAudioToBackend = useCallback(async (audioData: Uint8Array) => {
    try {
      console.log("Sending audio to backend:", audioData.length, "bytes");

      const request = create(AIConversationRequestSchema, {
        userId: `user_${username}`,
        username,
        language,
        character,
        content: { case: "audioData", value: audioData },
        timestamp: {
          seconds: BigInt(Math.floor(Date.now() / 1000)),
          nanos: 0,
        },
      });

      const response = await client.sendMessage(request);

      // Play audio response
      if (response.content?.case === "audioData" && playerRef.current) {
        await playerRef.current.play(response.content.value);
      }

      console.log("Received response from backend");
    } catch (err) {
      console.error("Failed to send audio:", err);
      setError(err instanceof Error ? err.message : "Failed to send audio");
    }
  }, [username, language, character, client]);

  const startStreaming = useCallback(async () => {
    if (isStreaming) return;

    try {
      setError(null);
      setIsStreaming(true);
      setIsConnected(true);

      const recorder = recorderRef.current;

      if (!recorder) {
        throw new Error("Audio recorder not initialized");
      }

      // Start recording with VAD
      await recorder.start(
        (chunk) => {
          // Optional: log each chunk
          console.log("Audio chunk captured:", chunk.length, "bytes");
        },
        async () => {
          // On silence detected - send audio to backend
          console.log("Silence detected, sending audio...");
          const audioData = recorder.getRecordedAudio();
          
          if (audioData.length > 0) {
            await sendAudioToBackend(audioData);
          }
          
          // Restart recording for next utterance
          recorder.stop();
          setTimeout(async () => {
            if (isStreaming) {
              await startStreaming();
            }
          }, 100);
        }
      );

      console.log("Started recording with VAD");
    } catch (err) {
      console.error("Streaming error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start streaming"
      );
      setIsStreaming(false);
      setIsConnected(false);
    }
  }, [isStreaming, sendAudioToBackend]);

  const stopStreaming = useCallback(() => {
    recorderRef.current?.stop();
    playerRef.current?.clear();
    setIsStreaming(false);
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    isStreaming,
    error,
    startStreaming,
    stopStreaming,
  };
};
