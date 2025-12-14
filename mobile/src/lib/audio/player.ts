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

  /**
   * Create WAV file from PCM data
   * PCM format: 16-bit, 24kHz, mono (from Python TTS)
   */
  private createWavFile(pcmData: Uint8Array): Uint8Array {
    const sampleRate = 24000
    const numChannels = 1
    const bitsPerSample = 16
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
    const blockAlign = numChannels * (bitsPerSample / 8)
    const dataSize = pcmData.length

    // WAV header is 44 bytes
    const header = new ArrayBuffer(44)
    const view = new DataView(header)

    // "RIFF" chunk descriptor
    view.setUint32(0, 0x52494646, false) // "RIFF"
    view.setUint32(4, 36 + dataSize, true) // File size - 8
    view.setUint32(8, 0x57415645, false) // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false) // "fmt "
    view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true) // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true) // NumChannels
    view.setUint32(24, sampleRate, true) // SampleRate
    view.setUint32(28, byteRate, true) // ByteRate
    view.setUint16(32, blockAlign, true) // BlockAlign
    view.setUint16(34, bitsPerSample, true) // BitsPerSample

    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false) // "data"
    view.setUint32(40, dataSize, true) // Subchunk2Size

    // Combine header and PCM data
    const wavFile = new Uint8Array(44 + dataSize)
    wavFile.set(new Uint8Array(header), 0)
    wavFile.set(pcmData, 44)

    return wavFile
  }

  async play(pcmData: Uint8Array): Promise<void> {
    try {
      // Convert PCM to WAV
      const wavData = this.createWavFile(pcmData)

      // Convert to base64
      let binary = ''
      for (let i = 0; i < wavData.length; i++) {
        binary += String.fromCharCode(wavData[i])
      }
      const base64 = btoa(binary)

      // Save to temporary file
      const tempUri = FileSystem.cacheDirectory + 'temp_audio.wav'
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: 'base64',
      })

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
