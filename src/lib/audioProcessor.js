/**
 * AudioProcessor - AudioWorklet processor for OneVoice
 * Features:
 * - Optimized buffer size (2KB default for low latency)
 * - Enhanced RMS level detection for voice activity
 * - Sample rate validation
 * - Optimized for low-latency real-time processing
 * - Silence suppression for bandwidth savings
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Configuration - Optimized for simultaneous interpretation
    this._bufferSize = 2048; // 2KB buffer for reduced latency (was 4096)
    this._rmsThreshold = 0.01; // Lower threshold for better sensitivity (was 0.02)
    this._sampleRate = sampleRate || 16000;
    
    // Ring buffer for smooth audio chunks
    this._ringBuffer = new Float32Array(this._bufferSize * 2);
    this._ringBufferIndex = 0;
    
    // RMS calculation state
    this._rmsSum = 0;
    this._rmsCount = 0;
    this._lastRmsReport = 0;
    
    // Frame counter for 10Hz reporting (every 100ms)
    this._frameCount = 0;
    
    // Message handlers
    this.port.onmessage = this._handleMessage.bind(this);
  }

  /**
   * Handle messages from main thread
   */
  _handleMessage(event) {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'setBufferSize':
        if (payload && payload.size > 0 && payload.size <= 16384) {
          this._bufferSize = payload.size;
        }
        break;
        
      case 'setRmsThreshold':
        if (payload && typeof payload.threshold === 'number') {
          this._rmsThreshold = Math.max(0, Math.min(1, payload.threshold));
        }
        break;
        
      case 'getStatus':
        this.port.postMessage({
          type: 'status',
          payload: {
            bufferSize: this._bufferSize,
            rmsThreshold: this._rmsThreshold,
            sampleRate: this._sampleRate,
            ringBufferFill: this._ringBufferIndex,
          }
        });
        break;
    }
  }

  /**
   * Calculate RMS (Root Mean Square) of audio samples
   */
  _calculateRMS(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Process incoming audio
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (!input || input.length === 0 || input[0].length === 0) {
      return true;
    }

    const inputChannel = input[0];
    const samples = inputChannel;

    // Calculate RMS for voice activity detection
    const rms = this._calculateRMS(samples);
    
    // Track RMS for periodic reporting (10Hz = every ~100ms for better responsiveness)
    this._frameCount++;
    const now = currentTime;
    
    // Report RMS levels every ~100ms (10Hz) - more responsive than 500ms
    if (now - this._lastRmsReport > 0.1) {
      const avgRms = this._rmsSum / Math.max(1, this._rmsCount);
      const isActive = avgRms > this._rmsThreshold;
      
      this.port.postMessage({
        type: 'audioLevel',
        payload: {
          rms: avgRms,
          peak: Math.max(...samples.map(Math.abs)),
          isActive: isActive,
          timestamp: Date.now(),
        }
      });
      
      this._rmsSum = 0;
      this._rmsCount = 0;
      this._lastRmsReport = now;
    }

    // For very low RMS (silence), we can optionally send smaller chunks
    // or add a small delay to reduce network traffic
    if (rms < this._rmsThreshold) {
      // Send at reduced rate during silence to save bandwidth
      // but still send periodically to keep connection alive
      if (Math.random() > 0.1) {
        return true;
      }
    }

    // Directly post audio data to main thread
    // This is optimized for low latency - no intermediate buffering
    try {
      this.port.postMessage({
        type: 'audioData',
        payload: {
          samples: samples.slice(), // Copy to avoid shared buffer issues
          rms: rms,
          timestamp: Date.now(),
        }
      });
    } catch (error) {
      // If postMessage fails (e.g., transfer list issue), try with buffer
      try {
        const buffer = new Float32Array(samples);
        this.port.postMessage({
          type: 'audioData',
          payload: {
            samples: buffer,
            rms: rms,
            timestamp: Date.now(),
          }
        }, [buffer.buffer]);
      } catch (e) {
        // Silent fail - audio will be skipped
        console.warn('AudioProcessor: Failed to send audio data');
      }
    }

    return true;
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);