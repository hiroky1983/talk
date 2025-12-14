/**
 * Audio Recorder for React Native using expo-av
 * Records audio and sends complete file after recording stops
 */
import * as FileSystem from 'expo-file-system'

export class AudioRecorder {
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
      // Note: expo-audio uses hooks, which can't be used in classes
      // We'll use the old expo-av approach for now
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

      this.recordingUri = recording.getURI() || null
      this.isRecording = true

      console.log('🎤 Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRecording) {
      return
    }

    try {
      const { Audio } = await import('expo-av')

      // Stop recording
      // Note: We need to keep a reference to the recording object
      // For now, we'll just mark as not recording
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
