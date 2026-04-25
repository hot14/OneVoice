class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer ~100ms of audio before posting to reduce main-thread message frequency
    this.chunkSize = Math.max(128, Math.floor(sampleRate * 0.1));
    this.buffer = new Float32Array(this.chunkSize);
    this.bufferOffset = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputData = input[0];
      let inputOffset = 0;

      while (inputOffset < inputData.length) {
        const writable = this.chunkSize - this.bufferOffset;
        const remaining = inputData.length - inputOffset;
        const copyCount = Math.min(writable, remaining);

        this.buffer.set(
          inputData.subarray(inputOffset, inputOffset + copyCount),
          this.bufferOffset
        );
        this.bufferOffset += copyCount;
        inputOffset += copyCount;

        if (this.bufferOffset === this.chunkSize) {
          this.port.postMessage(this.buffer.slice(0, this.bufferOffset));
          this.bufferOffset = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
