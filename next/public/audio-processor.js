/**
 * AudioWorklet Processor for capturing audio data
 * This runs in a separate thread for real-time audio processing
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0]) {
      // Send audio data to main thread
      this.port.postMessage({
        audio: input[0], // Float32Array
      });
    }
    return true; // Keep processor alive
  }
}

registerProcessor("audio-processor", AudioProcessor);
