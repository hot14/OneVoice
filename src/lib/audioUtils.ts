export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isStopped = false;

  constructor(private onAudioData: (base64Data: string) => void) {}

  async start() {
    if (this.isStopped) {
      throw new Error('AudioRecorder has been stopped. Create a new instance.');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      await audioContext.audioWorklet.addModule('/src/lib/audioProcessor.js');

      this.audioContext = audioContext;

      if (!this.stream || this.stream.getAudioTracks().length === 0) {
        throw new Error('Audio stream is not available or has no audio tracks.');
      }

      this.source = audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      // Clear previous port message handler
      this.workletNode.port.onmessage = null;

      this.workletNode.port.onmessage = (e) => {
        if (this.isStopped) return;

        const inputData = e.data;
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true);
        }

        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        this.onAudioData(base64);
      };

      this.source.connect(this.workletNode);
    } catch (err) {
      // Cleanup on error
      this.cleanup();
      throw err;
    }
  }

  /**
   * Properly cleanup all audio resources
   */
  private cleanup() {
    this.isStopped = true;

    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
        this.workletNode.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      this.workletNode = null;
    }

    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      this.source = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore cleanup errors
        }
      });
      this.stream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Ignore cleanup errors
      }
      this.audioContext = null;
    }
  }

  stop() {
    this.cleanup();
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime = 0;
  private isStopped = false;

  // Use 16kHz to match recorder - avoids expensive resampling
  private readonly SAMPLE_RATE = 16000;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
  }

  async playBase64Pcm(base64Data: string) {
    if (!this.audioContext || this.isStopped) return;

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const audioBuffer = this.audioContext.createBuffer(1, pcm16.length, this.SAMPLE_RATE);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
    } catch {
      // Ignore playback errors
    }
  }

  /**
   * Properly cleanup audio resources
   */
  stop() {
    this.isStopped = true;

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Ignore cleanup errors
      }
      this.audioContext = null;
    }
  }

  flush() {
    this.stop();
    this.isStopped = false;
    this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
    this.nextPlayTime = 0;
  }
}
