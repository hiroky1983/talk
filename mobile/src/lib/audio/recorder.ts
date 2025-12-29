/**
 * Audio Recorder for React Native using expo-av
 * Records audio and sends complete file after recording stops
 */
import * as FileSystem from 'expo-file-system/legacy'

export class AudioRecorder {
  private recording: any = null
  private recordingUri: string | null = null
  private onDataCallback: ((data: Uint8Array) => void) | null = null
  private onSilenceCallback: (() => void) | null = null
  private onCompleteCallback: (() => void) | null = null
  private isRecording = false

  // Audio recording options for PCM 16-bit 16kHz mono (optimised for STT)
  private options: any = {
    android: {
      extension: '.m4a',
      outputFormat: 2, // MPEG_4
      audioEncoder: 3, // AAC
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: '.wav',
      audioQuality: 128, // MAX
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 256000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/wav',
      bitsPerSecond: 128000,
    },
  }

  async start(
    onData: (data: Uint8Array) => void,
    onSilence?: () => void,
    onComplete?: () => void
  ): Promise<void> {
    this.onDataCallback = onData
    this.onSilenceCallback = onSilence || null
    this.onCompleteCallback = onComplete || null

    try {
      // Stop any existing recording first
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync()
        } catch (e) {}
        this.recording = null
      }

      const { Audio } = await import('expo-av')

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted')
      }

      // Audio mode is now managed by player.init() to avoid conflicts

      // Create recording with PCM options
      const { recording } = await Audio.Recording.createAsync(this.options)

      this.recording = recording
      this.recordingUri = recording.getURI() || null
      this.isRecording = true
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRecording || !this.recording) {
      return
    }

    try {
      // Minor delay to let the hardware stabilize before cutting off
      this.isRecording = false
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Stop recording
      await this.recording.stopAndUnloadAsync()

      const uri = this.recordingUri
      const callback = this.onDataCallback
      const complete = this.onCompleteCallback

      // Process data in background to avoid blocking the main/audio thread
      if (uri && callback) {
        setTimeout(async () => {
          try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            })

            const binaryString = atob(base64)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }

            let pcmData = bytes
            if (bytes.length > 44 && bytes[0] === 0x52 && bytes[8] === 0x57) {
              pcmData = bytes.slice(44)
            }

            if (pcmData.length % 2 !== 0) {
              pcmData = pcmData.slice(0, pcmData.length - 1)
            }

            callback(pcmData)
            complete?.()
          } catch (e) {
            console.error('Error processing recorded audio data:', e)
          }
        }, 0)
      }

      this.recording = null
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }

    this.onDataCallback = null
    this.onSilenceCallback = null
    this.onCompleteCallback = null
  }

  isRecordingActive(): boolean {
    return this.isRecording
  }
}
