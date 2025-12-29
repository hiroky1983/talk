import { createAudioPlayer } from 'expo-audio'
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'

export class AudioPlayer {
  private player: any = null
  private audioQueue: Uint8Array[] = []
  private isPlaying = false
  private onPlayingStateChange: ((isPlaying: boolean) => void) | null = null

  constructor(onPlayingStateChange?: (isPlaying: boolean) => void) {
    this.onPlayingStateChange = onPlayingStateChange || null
  }

  async init(): Promise<void> {
    // Configure audio mode for high quality speaker output using expo-av
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // Maintain session
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      })
    } catch (error) {
      console.error('Failed to set audio mode:', error)
    }
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

    const header = new ArrayBuffer(44)
    const view = new DataView(header)

    // "RIFF"
    view.setUint32(0, 0x52494646, false)
    view.setUint32(4, 36 + dataSize, true)
    view.setUint32(8, 0x57415645, false)

    // "fmt "
    view.setUint32(12, 0x666d7420, false)
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)

    // "data"
    view.setUint32(36, 0x64617461, false)
    view.setUint32(40, dataSize, true)

    const wavFile = new Uint8Array(44 + dataSize)
    wavFile.set(new Uint8Array(header), 0)
    wavFile.set(pcmData, 44)

    return wavFile
  }

  async play(pcmData: Uint8Array): Promise<void> {
    this.audioQueue.push(pcmData)

    if (!this.isPlaying) {
      // Small delay (jitter buffer) to collect initial chunks
      this.isPlaying = true
      setTimeout(() => this.playQueue(), 150) // 150ms buffer
    }
  }

  private async playQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false
      this.onPlayingStateChange?.(false)
      return
    }

    // Merge all currently available chunks to reduce playback overhead and gaps
    const totalLength = this.audioQueue.reduce(
      (acc, chunk) => acc + chunk.length,
      0
    )
    const mergedPcm = new Uint8Array(totalLength)
    let offset = 0
    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift()!
      mergedPcm.set(chunk, offset)
      offset += chunk.length
    }

    try {
      const wavData = this.createWavFile(mergedPcm)
      const base64 = this.uint8ToBase64(wavData)

      const tempUri = FileSystem.cacheDirectory + `temp_audio_${Date.now()}.wav`
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: 'base64',
      })

      const player = createAudioPlayer(tempUri)
      this.player = player

      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {})
          // Check if new chunks arrived during playback
          if (this.audioQueue.length > 0) {
            this.playQueue()
          } else {
            this.isPlaying = false
            this.onPlayingStateChange?.(false)
          }
        }
      })

      player.play()
    } catch (error) {
      console.error('Failed to play merged audio:', error)
      this.isPlaying = false
      this.onPlayingStateChange?.(false)
    }
  }

  private uint8ToBase64(uint8: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i])
    }
    return btoa(binary)
  }

  async stop(): Promise<void> {
    this.audioQueue = []
    this.isPlaying = false
    this.onPlayingStateChange?.(false)

    if (this.player) {
      try {
        this.player.pause()
        this.player = null
      } catch (error) {
        console.error('Failed to stop player:', error)
      }
    }
  }

  clear(): void {
    this.audioQueue = []
  }
}
