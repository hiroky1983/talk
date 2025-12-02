/**
 * Audio Recorder for capturing microphone input as PCM 16kHz
 * with Voice Activity Detection (VAD)
 */

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private onDataCallback: ((data: Uint8Array) => void) | null = null;
  private onSilenceCallback: (() => void) | null = null;
  
  private silenceThreshold = 0.01; // Volume threshold for silence detection
  private silenceDuration = 2000; // 2 seconds of silence
  private lastSoundTime = 0;
  private silenceCheckInterval: NodeJS.Timeout | null = null;
  private audioChunks: Uint8Array[] = [];

  async start(
    onData: (data: Uint8Array) => void,
    onSilence?: () => void
  ): Promise<void> {
    this.onDataCallback = onData;
    this.onSilenceCallback = onSilence || null;
    this.audioChunks = [];
    this.lastSoundTime = Date.now();

    // Request microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // Create audio context with 16kHz sample rate
    this.audioContext = new AudioContext({ sampleRate: 16000 });

    // Create source from microphone
    this.sourceNode = this.audioContext.createMediaStreamSource(
      this.mediaStream
    );

    // Create analyser for volume detection
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.sourceNode.connect(this.analyserNode);

    // Load and create AudioWorklet for processing
    await this.audioContext.audioWorklet.addModule("/audio-processor.js");
    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      "audio-processor"
    );

    // Listen for processed audio data
    this.workletNode.port.onmessage = (event) => {
      if (event.data.audio) {
        // Convert Float32Array to Int16 PCM
        const float32 = event.data.audio;
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        const chunk = new Uint8Array(int16.buffer);
        this.audioChunks.push(chunk);
        
        if (this.onDataCallback) {
          this.onDataCallback(chunk);
        }
      }
    };

    // Connect nodes
    this.analyserNode.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);

    // Start silence detection
    this.startSilenceDetection();
  }

  private startSilenceDetection(): void {
    this.silenceCheckInterval = setInterval(() => {
      if (!this.analyserNode) return;

      const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteTimeDomainData(dataArray);

      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Check if sound is detected
      if (rms > this.silenceThreshold) {
        this.lastSoundTime = Date.now();
      } else {
        // Check if silence duration exceeded
        const silenceDuration = Date.now() - this.lastSoundTime;
        if (silenceDuration >= this.silenceDuration && this.audioChunks.length > 0) {
          console.log(`Silence detected for ${silenceDuration}ms, stopping recording`);
          if (this.onSilenceCallback) {
            this.onSilenceCallback();
          }
        }
      }
    }, 100); // Check every 100ms
  }

  getRecordedAudio(): Uint8Array {
    // Combine all chunks into single array
    const totalLength = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }

  stop(): void {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onDataCallback = null;
    this.onSilenceCallback = null;
  }

  isRecording(): boolean {
    return this.audioContext !== null && this.audioContext.state === "running";
  }
}
