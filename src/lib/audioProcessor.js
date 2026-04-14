class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(0);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0 && input[0].length > 0) {
      // Directly post message without intermediate buffering for lower latency
      this.port.postMessage(input[0]);
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
