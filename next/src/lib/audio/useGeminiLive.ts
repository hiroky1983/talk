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
  const isProcessingRef = useRef(false);

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
    // Prevent duplicate requests
    if (isProcessingRef.current) {
      console.log("Already processing audio, skipping...");
      return;
    }

    isProcessingRef.current = true;

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

      // Only play audio response if audio data exists and has content
      if (response.content?.case === "audioData" &&
          response.content.value &&
          response.content.value.length > 0 &&
          playerRef.current) {
        await playerRef.current.play(response.content.value);
        console.log("Received and playing audio response");
      } else {
        console.log("Received response but no audio data");
      }
    } catch (err) {
      console.error("Failed to send audio:", err);
      // Extract meaningful error message from ConnectError
      let errorMessage = "Failed to send audio";
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check for quota errors
        if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
          errorMessage = "API quota exceeded. Please wait a moment and try again.";
        }
      }
      setError(errorMessage);

      // Stop streaming on error
      recorderRef.current?.stop();
      setIsStreaming(false);
      setIsConnected(false);
    } finally {
      isProcessingRef.current = false;
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
          console.log("Silence detected, processing audio...");

          const audioData = recorder.getRecordedAudio();

          // Stop recording immediately
          recorder.stop();

          if (audioData.length > 0) {
            console.log("Sending audio to backend:", audioData.length, "bytes");
            await sendAudioToBackend(audioData);

            // Only restart recording if still streaming and no errors
            if (isStreaming) {
              console.log("Restarting recording for next utterance...");
              await startStreaming();
            }
          } else {
            console.log("No audio data to send, restarting recording...");
            // No data, just restart
            if (isStreaming) {
              await startStreaming();
            }
          }
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
    isProcessingRef.current = false;
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
