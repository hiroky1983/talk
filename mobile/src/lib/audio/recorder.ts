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
  private isRecording = false

  async start(
    onData: (data: Uint8Array) => void,
    onSilence?: () => void
  ): Promise<void> {
    this.onDataCallback = onData
    this.onSilenceCallback = onSilence || null

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

      // Create recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      this.recording = recording
      this.recordingUri = recording.getURI() || null
      this.isRecording = true

      console.log('🎤 Recording started')
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

      console.log('🎤 Recording stopped')

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

        console.log('📤 Sending audio data:', bytes.length, 'bytes')

        // Send complete audio file
        this.onDataCallback(bytes)
      }

      this.recording = null
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }

    this.onDataCallback = null
    this.onSilenceCallback = null
  }

  isRecordingActive(): boolean {
    return this.isRecording
  }
}
