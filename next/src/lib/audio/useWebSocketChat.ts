/**
 * Hook for managing WebSocket-based conversation
 */
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioRecorder } from "../audio/recorder";
import { AudioPlayer } from "../audio/player";
import { Language } from "@/types/types";

interface UseWebSocketChatProps {
  username: string;
  language: Language;
  character: string;
  onMessageReceived?: (message: unknown) => void;
}

export const useWebSocketChat = ({
  username,
  language,
  character,
  onMessageReceived
}: UseWebSocketChatProps) => {
  const t = useTranslations('common');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  
  // Initialize audio components
  useEffect(() => {
    recorderRef.current = new AudioRecorder();
    playerRef.current = new AudioPlayer();
    playerRef.current.init();

    return () => {
      recorderRef.current?.stop();
      playerRef.current?.stop();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    // Use specific endpoint for chat
    const wsUrl = "ws://localhost:8000/ws/chat"; 
    console.log("Connecting to WebSocket:", wsUrl);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError(null);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setIsStreaming(false);
    };

    socket.onerror = (event) => {
      console.error("WebSocket error:", event);
      setError("WebSocket connection failed");
      setIsConnected(false);
      setIsStreaming(false);
    };

    socket.onmessage = async (event) => {
      if (typeof event.data === 'string') {
          console.log("Received text message:", event.data);
          onMessageReceived?.(event.data);
      } else if (event.data instanceof Blob) {
          console.log("Received audio blob:", event.data.size);
          // Convert Blob to ArrayBuffer -> Uint8Array for playback
          const arrayBuffer = await event.data.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          if (playerRef.current) {
             // For now, assuming raw PCM or similar that player handles, 
             // but backend echo serves same format we sent (WAV/PCM depending on recorder)
             // The recorder sends PCM masked as wav? No, recorder sends raw chunks usually?
             // Recorder sends chunks. 
             await playerRef.current.play(uint8Array);
          }
      }
    };

  }, [onMessageReceived]);

  const disconnect = useCallback(() => {
     if (socketRef.current) {
         socketRef.current.close();
         socketRef.current = null;
     }
     setIsConnected(false);
     setIsStreaming(false);
  }, []);

  const sendAudioChunk = useCallback((data: Uint8Array) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(data);
    }
  }, []);

  const startStreaming = useCallback(async () => {
    if (isStreaming) return;
    
    // Ensure connected
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        connect();
        // Wait a bit for connection? Or rely on UI to trigger connect first?
        // simple retry mechanism or immediate failure if not connected
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
             // Try to wait for open? 
             // For now, assume user might need to click twice or we auto-connect
        }
    }

    try {
      setError(null);
      setIsStreaming(true);

      const recorder = recorderRef.current;
      if (!recorder) {
        throw new Error(t('errors.recorderNotInitialized'));
      }

      await recorder.start(
        (chunk) => {
           // Provide real-time streaming
           sendAudioChunk(chunk);
        },
        () => {
           // Silence detected - send EOS signal
           if (socketRef.current?.readyState === WebSocket.OPEN) {
               console.log("Silence detected, sending EOS");
               socketRef.current.send("EOS");
           }
        }
      );
      
      console.log("Started streaming audio via WebSocket");

    } catch (err) {
      console.error("Streaming error:", err);
      setError(err instanceof Error ? err.message : "Failed to start");
      setIsStreaming(false);
    }
  }, [isStreaming, connect, sendAudioChunk, t]);

  const stopStreaming = useCallback(() => {
    recorderRef.current?.stop();
    setIsStreaming(false);
    // don't necessarily close socket, just stop sending audio
  }, []);

  return {
    isConnected,
    isStreaming,
    error, // Expose error state
    connect, // Expose connect method
    disconnect,
    startStreaming,
    stopStreaming,
  };
};
