export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (base64Data: string) => void) {}

  async start() {
    try {
      console.log("Requesting microphone access...");
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log("Microphone access granted.");
      const tracks = this.stream.getTracks();
      console.log("Stream tracks:", tracks);

      const audioContext = new AudioContext({ sampleRate: 16000 });
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      await audioContext.audioWorklet.addModule('/src/lib/audioProcessor.js');

      this.audioContext = audioContext;
      
      console.log("Audio stream tracks:", this.stream?.getTracks());

      if (!this.stream || this.stream.getAudioTracks().length === 0) {
        throw new Error(`Audio stream is not available or has no audio tracks. Tracks found: ${this.stream?.getTracks().length}`);
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.workletNode.port.onmessage = (e) => {
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
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        this.onAudioData(base64);
      };

      this.source.connect(this.workletNode);
    } catch (err) {
      console.error('Error starting audio recorder:', err);
      throw err;
    }
  }

  stop() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime = 0;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  async playBase64Pcm(base64Data: string) {
    if (!this.audioContext) return;

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pcm16 = new Int16Array(bytes.buffer);
    const audioBuffer = this.audioContext.createBuffer(1, pcm16.length, 24000);
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
  }

  stop() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  flush() {
    this.stop();
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.nextPlayTime = 0;
  }
}
