/**
 * Audio Recorder for React Native using expo-av
 * Captures microphone input with Voice Activity Detection (VAD)
 */
import { Audio } from 'expo-av'

export class AudioRecorder {
  private recording: Audio.Recording | null = null
  private onDataCallback: ((data: Uint8Array) => void) | null = null
  private onSilenceCallback: (() => void) | null = null
  private isRecording = false

  private silenceThreshold = 0.01
  private silenceDuration = 1000 // 1 second
  private lastSoundTime = 0
  private silenceCheckInterval: NodeJS.Timeout | null = null

  async start(
    onData: (data: Uint8Array) => void,
    onSilence?: () => void
  ): Promise<void> {
    this.onDataCallback = onData
    this.onSilenceCallback = onSilence || null
    this.lastSoundTime = Date.now()

    // Request permissions
    const { status } = await Audio.requestPermissionsAsync()
    if (status !== 'granted') {
      throw new Error('Microphone permission not granted')
    }

    // Configure audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    })

    // Create recording
    this.recording = new Audio.Recording()

    try {
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      })

      // Set recording status update callback
      this.recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          // Check volume for VAD
          const volume = Math.pow(10, status.metering / 20)

          if (volume > this.silenceThreshold) {
            this.lastSoundTime = Date.now()
          }
        }
      })

      await this.recording.startAsync()
      this.isRecording = true

      // Start silence detection
      this.startSilenceDetection()

      // Start periodic data sending (every 100ms)
      this.startDataStreaming()
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }

  private startSilenceDetection(): void {
    this.silenceCheckInterval = setInterval(() => {
      const silenceDuration = Date.now() - this.lastSoundTime

      if (silenceDuration >= this.silenceDuration && this.isRecording) {
        console.log(`Silence detected for ${silenceDuration}ms`)

        if (this.onSilenceCallback) {
          this.onSilenceCallback()
        }

        // Reset timer
        this.lastSoundTime = Date.now()
      }
    }, 100)
  }

  private async startDataStreaming(): Promise<void> {
    // Note: expo-av doesn't support real-time streaming like Web Audio API
    // This is a limitation of React Native
    // For real-time streaming, you would need to use a native module
    // For now, we'll send the complete audio when recording stops
  }

  async stop(): Promise<void> {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval)
      this.silenceCheckInterval = null
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync()

        // Get the recorded URI
        const uri = this.recording.getURI()

        if (uri && this.onDataCallback) {
          // Read the file and convert to Uint8Array
          // Note: This requires expo-file-system
          // For now, we'll just log the URI
          console.log('Recorded audio URI:', uri)
        }

        this.recording = null
      } catch (error) {
        console.error('Failed to stop recording:', error)
      }
    }

    this.isRecording = false
    this.onDataCallback = null
    this.onSilenceCallback = null
  }

  isRecordingActive(): boolean {
    return this.isRecording
  }
}
