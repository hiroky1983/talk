/**
 * Audio Player for playing PCM audio streams
 * Handles buffering and playback of audio chunks from Gemini Live API
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private nextStartTime = 0;

  async init(): Promise<void> {
    // Create audio context with 24kHz (Gemini output rate)
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  async play(pcmData: Uint8Array): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }

    if (!this.audioContext) return;

    // Convert Int16 PCM to Float32
    const int16Array = new Int16Array(
      pcmData.buffer,
      pcmData.byteOffset,
      pcmData.byteLength / 2
    );
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
    }

    // Create audio buffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono
      float32Array.length,
      this.audioContext.sampleRate
    );
    audioBuffer.getChannelData(0).set(float32Array);

    this.audioQueue.push(audioBuffer);

    if (!this.isPlaying) {
      this.playQueue();
    }
  }

  private playQueue(): void {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Schedule playback
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    source.start(startTime);

    this.nextStartTime = startTime + audioBuffer.duration;

    // Continue playing queue
    source.onended = () => {
      this.playQueue();
    };
  }

  stop(): void {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  clear(): void {
    this.audioQueue = [];
    this.nextStartTime = this.audioContext?.currentTime || 0;
  }
}
