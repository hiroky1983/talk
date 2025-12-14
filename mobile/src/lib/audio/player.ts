/**
 * Audio Player for React Native using expo-av
 * Handles playback of PCM audio streams
 */
import { Audio } from 'expo-av'

export class AudioPlayer {
  private sound: Audio.Sound | null = null
  private audioQueue: string[] = [] // URIs of audio files
  private isPlaying = false

  async init(): Promise<void> {
    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    })
  }

  async play(pcmData: Uint8Array): Promise<void> {
    // Note: expo-av doesn't support direct PCM playback
    // You would need to:
    // 1. Convert PCM to a supported format (WAV, MP3, etc.)
    // 2. Save to a temporary file
    // 3. Play the file

    // For now, we'll log that we received audio data
    console.log('Received audio data:', pcmData.length, 'bytes')

    // TODO: Implement PCM to WAV conversion and file playback
    // This requires expo-file-system and a PCM-to-WAV converter
  }

  async playFromUri(uri: string): Promise<void> {
    try {
      // Create new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      )

      this.sound = sound

      // Set up playback status update
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.playNext()
        }
      })

      await sound.playAsync()
      this.isPlaying = true
    } catch (error) {
      console.error('Failed to play audio:', error)
    }
  }

  private async playNext(): Promise<void> {
    if (this.audioQueue.length > 0) {
      const nextUri = this.audioQueue.shift()!
      await this.playFromUri(nextUri)
    } else {
      this.isPlaying = false
    }
  }

  async stop(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync()
        await this.sound.unloadAsync()
        this.sound = null
      } catch (error) {
        console.error('Failed to stop audio:', error)
      }
    }

    this.audioQueue = []
    this.isPlaying = false
  }

  clear(): void {
    this.audioQueue = []
  }
}
