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
        } catch (e) {
          // Ignore errors when stopping
        }
        this.recording = null
      }

      const { Audio } = await import('expo-av')

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted')
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

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
      // Stop recording
      await this.recording.stopAndUnloadAsync()
      this.isRecording = false

      if (this.recordingUri && this.onDataCallback) {
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(this.recordingUri, {
          encoding: 'base64',
        })

        // Convert base64 to Uint8Array
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        let pcmData = bytes

        // Strip WAV header (44 bytes) if present and matches 'RIFF'
        if (bytes.length > 44) {
          // Check for 'RIFF' at start and 'WAVE' at 8
          if (
            bytes[0] === 0x52 && // R
            bytes[1] === 0x49 && // I
            bytes[2] === 0x46 && // F
            bytes[3] === 0x46 && // F
            bytes[8] === 0x57 && // W
            bytes[9] === 0x41 && // A
            bytes[10] === 0x56 && // V
            bytes[11] === 0x45 // E
          ) {
            pcmData = bytes.slice(44)
          }
        }

        // Ensure length is even (16-bit PCM = 2 bytes per sample)
        if (pcmData.length % 2 !== 0) {
          pcmData = pcmData.slice(0, pcmData.length - 1)
        }

        // Send PCM data
        this.onDataCallback(pcmData)

        // Call onComplete after data is sent
        if (this.onCompleteCallback) {
          this.onCompleteCallback()
        }
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
