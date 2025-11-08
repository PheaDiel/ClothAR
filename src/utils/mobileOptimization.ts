import * as tf from '@tensorflow/tfjs';
import { performanceMonitor } from './nativePoseDetection';

// Mobile-specific TensorFlow.js optimizations
export class MobileTensorFlowOptimizer {
  private isInitialized = false;
  private modelCache = new Map<string, tf.LayersModel>();
  private warmupComplete = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure TensorFlow.js for mobile performance
      await tf.setBackend('cpu'); // Use CPU backend for broader compatibility

      // Enable memory optimization
      tf.enableProdMode();

      // Configure memory management
      tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
      tf.env().set('WEBGL_PACK', false);

      this.isInitialized = true;
      console.log('✅ Mobile TensorFlow.js optimizations initialized');
    } catch (error) {
      console.error('❌ Failed to initialize mobile TensorFlow optimizations:', error);
      throw error;
    }
  }

  // Optimize model loading for mobile devices
  async loadOptimizedModel(modelUrl: string, modelId: string): Promise<tf.LayersModel> {
    if (this.modelCache.has(modelId)) {
      return this.modelCache.get(modelId)!;
    }

    try {
      console.log(`📱 Loading optimized model: ${modelId}`);

      // Load model with mobile optimizations
      const model = await tf.loadLayersModel(modelUrl, {
        strict: false, // Allow missing weights for partial loading
        onProgress: (fraction) => {
          console.log(`Model loading progress: ${(fraction * 100).toFixed(1)}%`);
        }
      });

      // Apply mobile-specific optimizations
      await this.optimizeModelForMobile(model);

      // Cache the optimized model
      this.modelCache.set(modelId, model);

      // Limit cache size
      if (this.modelCache.size > 2) {
        const firstKey = this.modelCache.keys().next().value!;
        const firstModel = this.modelCache.get(firstKey)!;
        firstModel.dispose();
        this.modelCache.delete(firstKey);
      }

      console.log(`✅ Optimized model loaded: ${modelId}`);
      return model;
    } catch (error) {
      console.error(`❌ Failed to load optimized model ${modelId}:`, error);
      throw error;
    }
  }

  // Apply mobile-specific model optimizations
  private async optimizeModelForMobile(model: tf.LayersModel): Promise<void> {
    try {
      // Warm up the model with dummy data
      if (!this.warmupComplete) {
        await this.warmupModel(model);
        this.warmupComplete = true;
      }

      // Apply quantization if beneficial (reduce precision for speed)
      // Note: This is a simplified version - full quantization would require model retraining
      console.log('📱 Applying mobile optimizations to model...');

    } catch (error) {
      console.warn('⚠️ Model optimization failed, continuing with original model:', error);
    }
  }

  // Warm up model with representative data
  private async warmupModel(model: tf.LayersModel): Promise<void> {
    try {
      console.log('🔥 Warming up model...');

      // Create dummy input matching expected tensor shape
      // This will vary based on the actual model architecture
      const dummyInput = tf.zeros([1, 192, 192, 3]); // Common input shape for pose detection

      // Run inference to warm up
      const warmupResult = await model.predict(dummyInput);
      if (warmupResult instanceof tf.Tensor) {
        warmupResult.dispose();
      } else if (Array.isArray(warmupResult)) {
        warmupResult.forEach(tensor => tensor.dispose());
      }
      dummyInput.dispose();

      console.log('✅ Model warmup complete');
    } catch (error) {
      console.warn('⚠️ Model warmup failed:', error);
    }
  }

  // Memory-efficient inference with automatic cleanup
  async runInference(model: tf.LayersModel, input: tf.Tensor): Promise<tf.Tensor> {
    const startTime = performance.now();

    try {
      // Run inference
      const result = await model.predict(input) as tf.Tensor;

      // Record performance metrics
      const inferenceTime = performance.now() - startTime;
      performanceMonitor.recordFrame(inferenceTime);

      return result;
    } catch (error) {
      console.error('❌ Inference failed:', error);
      throw error;
    }
  }

  // Batch processing for better performance
  async runBatchInference(model: tf.LayersModel, inputs: tf.Tensor[]): Promise<tf.Tensor[]> {
    if (inputs.length === 0) return [];

    try {
      // Stack inputs for batch processing
      const batchInput = tf.stack(inputs);

      const result = await this.runInference(model, batchInput);

      // Split results back into individual tensors
      const results: tf.Tensor[] = [];
      for (let i = 0; i < inputs.length; i++) {
        results.push(result.slice([i], [1]).squeeze([0]));
      }

      // Clean up
      batchInput.dispose();
      result.dispose();

      return results;
    } catch (error) {
      console.error('❌ Batch inference failed:', error);
      throw error;
    }
  }

  // Adaptive model selection based on device capabilities
  getOptimalModelConfig(deviceInfo: {
    platform: string;
    memory: number;
    cpuCores: number;
    isLowEnd: boolean;
  }): {
    modelType: 'lightning' | 'thunder' | 'full';
    inputSize: [number, number];
    batchSize: number;
    enableQuantization: boolean;
  } {
    // Determine optimal configuration based on device capabilities
    if (deviceInfo.isLowEnd || deviceInfo.memory < 1024) { // Less than 1GB RAM
      return {
        modelType: 'lightning',
        inputSize: [128, 128],
        batchSize: 1,
        enableQuantization: true
      };
    } else if (deviceInfo.memory < 2048) { // Less than 2GB RAM
      return {
        modelType: 'thunder',
        inputSize: [192, 192],
        batchSize: 1,
        enableQuantization: false
      };
    } else {
      return {
        modelType: 'full',
        inputSize: [256, 256],
        batchSize: 2,
        enableQuantization: false
      };
    }
  }

  // Memory management utilities
  async cleanup(): Promise<void> {
    try {
      // Dispose of cached models
      for (const [id, model] of this.modelCache) {
        model.dispose();
      }
      this.modelCache.clear();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      console.log('🧹 Mobile TensorFlow cleanup complete');
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error);
    }
  }

  // Get performance statistics
  getPerformanceStats(): {
    modelsLoaded: number;
    memoryUsage: number;
    averageInferenceTime: number;
    warmupComplete: boolean;
  } {
    return {
      modelsLoaded: this.modelCache.size,
      memoryUsage: this.estimateMemoryUsage(),
      averageInferenceTime: performanceMonitor.getMetrics().averageProcessingTime,
      warmupComplete: this.warmupComplete
    };
  }

  // Estimate current memory usage
  private estimateMemoryUsage(): number {
    // Rough estimation based on cached models
    // In a real implementation, you'd use more sophisticated memory tracking
    let estimatedUsage = 0;

    this.modelCache.forEach((model, id) => {
      // Estimate ~50MB per model (rough approximation)
      estimatedUsage += 50 * 1024 * 1024; // 50MB in bytes
    });

    return estimatedUsage;
  }
}

// Adaptive frame rate manager with enhanced stability
export class AdaptiveFrameRateManager {
  private targetFps = 25; // Reduced default for stability
  private currentFps = 25;
  private processingTimes: number[] = [];
  private maxSamples = 15; // Increased for better averaging
  private stabilityCounter = 0;
  private lastAdjustment = 0;

  reset() {
    this.processingTimes = [];
    this.currentFps = this.targetFps;
    this.stabilityCounter = 0;
    this.lastAdjustment = Date.now();
  }

  updateFrameRate(processingTime: number): number {
    this.processingTimes.push(processingTime);

    if (this.processingTimes.length > this.maxSamples) {
      this.processingTimes.shift();
    }

    // Only adjust frame rate every few samples for stability
    if (this.processingTimes.length >= 10 && this.stabilityCounter++ % 3 === 0) {
      const avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      const targetProcessingTime = 1000 / this.targetFps;

      const now = Date.now();
      // Don't adjust too frequently (minimum 2 seconds between adjustments)
      if (now - this.lastAdjustment > 2000) {
        if (avgProcessingTime > targetProcessingTime * 1.5) {
          // Significantly too slow, reduce frame rate more aggressively
          this.currentFps = Math.max(8, this.currentFps - 8);
          this.lastAdjustment = now;
        } else if (avgProcessingTime > targetProcessingTime * 1.2) {
          // Moderately too slow, reduce frame rate
          this.currentFps = Math.max(10, this.currentFps - 5);
          this.lastAdjustment = now;
        } else if (avgProcessingTime < targetProcessingTime * 0.7 && this.currentFps < this.targetFps) {
          // Fast enough, can gradually increase frame rate
          this.currentFps = Math.min(this.targetFps, this.currentFps + 2);
          this.lastAdjustment = now;
        }
      }
    }

    return this.currentFps;
  }

  getFrameInterval(): number {
    // Add some jitter to prevent synchronized processing
    const baseInterval = Math.round(1000 / this.currentFps);
    const jitter = Math.random() * 20 - 10; // ±10ms jitter
    return Math.max(100, baseInterval + jitter); // Minimum 100ms interval
  }

  // Force a specific frame rate for critical situations
  setFrameRate(fps: number) {
    this.currentFps = Math.max(5, Math.min(60, fps));
    this.lastAdjustment = Date.now();
  }

  // Get current performance metrics
  getMetrics() {
    const avgProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;

    return {
      currentFps: this.currentFps,
      targetFps: this.targetFps,
      averageProcessingTime: avgProcessingTime,
      sampleCount: this.processingTimes.length
    };
  }

  // Legacy method for compatibility
  getStatus() {
    return this.getMetrics();
  }
}

// Device capability detector
export class DeviceCapabilityDetector {
  async detectCapabilities(): Promise<{
    platform: string;
    memory: number;
    cpuCores: number;
    isLowEnd: boolean;
    supportsSIMD: boolean;
    recommendedConfig: any;
  }> {
    try {
      // Detect platform
      const platform = this.detectPlatform();

      // Estimate memory (rough approximation)
      const memory = this.estimateMemory();

      // Detect CPU cores
      const cpuCores = this.detectCpuCores();

      // Determine if device is low-end
      const isLowEnd = this.isLowEndDevice(memory, cpuCores);

      // Check SIMD support
      const supportsSIMD = this.checkSimdSupport();

      // Get recommended configuration
      const optimizer = new MobileTensorFlowOptimizer();
      const recommendedConfig = optimizer.getOptimalModelConfig({
        platform,
        memory,
        cpuCores,
        isLowEnd
      });

      return {
        platform,
        memory,
        cpuCores,
        isLowEnd,
        supportsSIMD,
        recommendedConfig
      };
    } catch (error) {
      console.error('❌ Device capability detection failed:', error);
      // Return conservative defaults
      return {
        platform: 'unknown',
        memory: 1024,
        cpuCores: 2,
        isLowEnd: true,
        supportsSIMD: false,
        recommendedConfig: {
          modelType: 'lightning',
          inputSize: [128, 128],
          batchSize: 1,
          enableQuantization: true
        }
      };
    }
  }

  private detectPlatform(): string {
    // React Native platform detection
    return 'mobile'; // Could be more specific with Platform.OS
  }

  private estimateMemory(): number {
    // Rough memory estimation based on device characteristics
    // In a real implementation, you'd use more sophisticated detection
    try {
      // Try to allocate memory to estimate available RAM
      const testAllocations: any[] = [];
      let allocated = 0;

      try {
        while (allocated < 100) { // Limit to prevent crashes
          testAllocations.push(new Array(1024 * 1024)); // 1MB chunks
          allocated += 1;
        }
      } catch (error) {
        // Memory allocation failed
      }

      // Clean up
      testAllocations.length = 0;

      // Estimate based on successful allocations
      return Math.max(512, allocated * 10); // Rough MB estimate
    } catch (error) {
      return 1024; // Conservative default
    }
  }

  private detectCpuCores(): number {
    // Estimate CPU cores (limited info available in RN)
    return 4; // Conservative estimate for modern mobile devices
  }

  private isLowEndDevice(memory: number, cpuCores: number): boolean {
    return memory < 2048 || cpuCores < 4;
  }

  private checkSimdSupport(): boolean {
    // Check if SIMD instructions are available
    // This is a simplified check - actual SIMD detection is more complex
    try {
      // Check for basic WebAssembly support as proxy
      return typeof WebAssembly !== 'undefined';
    } catch {
      return false;
    }
  }
}

// Export singleton instances
export const mobileOptimizer = new MobileTensorFlowOptimizer();
export const adaptiveFrameRateManager = new AdaptiveFrameRateManager();
export const deviceCapabilityDetector = new DeviceCapabilityDetector();