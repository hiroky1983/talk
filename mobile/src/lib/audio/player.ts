/**
 * Audio Player for React Native using expo-av
 * Plays audio from URI or data
 */
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'

export class AudioPlayer {
  private sound: Audio.Sound | null = null

  async init(): Promise<void> {
    // Configure audio mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    })
  }

  async play(pcmData: Uint8Array): Promise<void> {
    try {
      // Convert Uint8Array to base64
      let binary = ''
      for (let i = 0; i < pcmData.length; i++) {
        binary += String.fromCharCode(pcmData[i])
      }
      const base64 = btoa(binary)

      // Save to temporary file
      const tempUri = FileSystem.cacheDirectory + 'temp_audio.wav'
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: 'base64',
      })

      console.log('🔊 Playing audio from:', tempUri)

      // Create sound and play
      const { sound } = await Audio.Sound.createAsync({ uri: tempUri })
      this.sound = sound
      await sound.playAsync()
    } catch (error) {
      console.error('Failed to play audio:', error)
    }
  }

  async playFromUri(uri: string): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri })
      this.sound = sound
      await sound.playAsync()
    } catch (error) {
      console.error('Failed to play audio from URI:', error)
    }
  }

  async stop(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.unloadAsync()
        this.sound = null
      } catch (error) {
        console.error('Failed to stop audio:', error)
      }
    }
  }

  clear(): void {
    // No queue to clear
  }
}
