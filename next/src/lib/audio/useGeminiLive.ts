/**
 * Hook for managing Gemini Live API conversation with VAD
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioRecorder } from "../audio/recorder";
import { AudioPlayer } from "../audio/player";
import { Language } from "@/types/types";
import { useConversationMutation } from "../hooks/useConversationMutation";

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

  const conversationMutation = useConversationMutation();

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

      const response = await conversationMutation.mutateAsync({
        username,
        language,
        character,
        audioData,
      });

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
      // Extract meaningful error message
      let errorMessage = "Failed to send audio";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);

      // Stop streaming on error
      recorderRef.current?.stop();
      setIsStreaming(false);
      setIsConnected(false);
    } finally {
      isProcessingRef.current = false;
    }
  }, [username, language, character, conversationMutation]);

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
