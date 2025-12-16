/**
 * Hook for managing WebSocket-based conversation in React Native
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioRecorder } from './recorder'
import { AudioPlayer } from './player'

type Language = 'en' | 'ja' | 'vi'

interface UseWebSocketChatProps {
  username: string
  language: Language
  character: string
  onMessageReceived?: (message: unknown) => void
}

export const useWebSocketChat = ({
  username,
  language,
  character,
  onMessageReceived,
}: UseWebSocketChatProps) => {
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<
    'idle' | 'listening' | 'processing' | 'speaking'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef<AudioRecorder | null>(null)
  const playerRef = useRef<AudioPlayer | null>(null)

  // Initialize audio components
  useEffect(() => {
    recorderRef.current = new AudioRecorder()
    playerRef.current = new AudioPlayer((isPlaying) => {
      // Only update status if we are not recording (listening)
      // This prevents conflict if user interrupts AI
      setStatus((prev) => {
        if (prev === 'listening') return prev
        return isPlaying ? 'speaking' : 'idle'
      })
    })
    playerRef.current.init()

    return () => {
      recorderRef.current?.stop()
      playerRef.current?.stop()
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return

    // Use API URL from environment
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
    const wsUrl = apiUrl.replace('http', 'ws') + '/ws/chat'
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    socket.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      setStatus('idle')
    }

    socket.onerror = (event) => {
      console.error('WebSocket error:', event)
      setError('WebSocket connection failed')
      setIsConnected(false)
      setStatus('idle')
    }

    socket.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        onMessageReceived?.(event.data)
      } else if (event.data instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(event.data)
        if (playerRef.current) {
          await playerRef.current.play(uint8Array)
        }
      } else if (event.data instanceof Blob) {
        // Convert Blob to ArrayBuffer -> Uint8Array for playback
        const arrayBuffer = await event.data.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        if (playerRef.current) {
          await playerRef.current.play(uint8Array)
        }
      }
    }
  }, [onMessageReceived])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    setIsConnected(false)
    setStatus('idle')
  }, [])

  const sendAudioChunk = useCallback((data: Uint8Array) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(data)
    }
  }, [])

  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [])

  // Clear processing timeout when status changes from processing
  useEffect(() => {
    if (status !== 'processing' && processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
      processingTimeoutRef.current = null
    }
  }, [status])

  const startStreaming = useCallback(async () => {
    // If already listening, do nothing (or could be stop?)
    if (status === 'listening') return

    // Stop playback if speaking
    if (status === 'speaking') {
      await playerRef.current?.stop()
    }

    // Ensure connected
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      connect()
    }

    try {
      setError(null)
      setStatus('listening')

      const recorder = recorderRef.current
      if (!recorder) {
        throw new Error('Recorder not initialized')
      }

      await recorder.start(
        (chunk) => {
          sendAudioChunk(chunk)
        },
        () => {
          // Silence detected - send EOS signal
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send('EOS')
            setStatus('processing')

            // Set safety timeout
            if (processingTimeoutRef.current)
              clearTimeout(processingTimeoutRef.current)
            processingTimeoutRef.current = setTimeout(() => {
              if (status === 'processing') {
                console.warn('Processing timeout - resetting state')
                setStatus('idle')
                setError('Response timeout')
              }
            }, 15000) // 15 seconds timeout
          }
        },
        () => {
          // Recording complete - send EOS signal
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send('EOS')
            // Only transition to processing if we were listening
            setStatus('processing')

            // Set safety timeout
            if (processingTimeoutRef.current)
              clearTimeout(processingTimeoutRef.current)
            processingTimeoutRef.current = setTimeout(() => {
              console.warn('Processing timeout - resetting state')
              setStatus('idle')
              setError('Response timeout')
            }, 15000) // 15 seconds timeout
          }
        }
      )

      console.log('Started streaming audio via WebSocket')
    } catch (err) {
      console.error('Streaming error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start')
      setStatus('idle')
    }
  }, [status, connect, sendAudioChunk])

  const stopStreaming = useCallback(() => {
    recorderRef.current?.stop()
    // Explicitly set processing state as we wait for response
    setStatus('processing')

    // Set safety timeout
    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
    processingTimeoutRef.current = setTimeout(() => {
      console.warn('Processing timeout - resetting state')
      setStatus('idle')
      setError('Response timeout')
    }, 15000) // 15 seconds timeout
  }, [])

  return {
    isConnected,
    status,
    error,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
  }
}
