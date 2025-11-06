import { Camera, useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
// Note: react-native-vision-camera-face-detector uses different API
// We'll implement basic pose detection for now

// Enhanced pose detection interfaces
export interface NativePoseLandmark {
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface NativePose {
  landmarks: {
    nose: NativePoseLandmark;
    leftEye: NativePoseLandmark;
    rightEye: NativePoseLandmark;
    leftEar: NativePoseLandmark;
    rightEar: NativePoseLandmark;
    leftShoulder: NativePoseLandmark;
    rightShoulder: NativePoseLandmark;
    leftElbow: NativePoseLandmark;
    rightElbow: NativePoseLandmark;
    leftWrist: NativePoseLandmark;
    rightWrist: NativePoseLandmark;
    leftHip: NativePoseLandmark;
    rightHip: NativePoseLandmark;
    leftKnee: NativePoseLandmark;
    rightKnee: NativePoseLandmark;
    leftAnkle: NativePoseLandmark;
    rightAnkle: NativePoseLandmark;
  };
  confidence: number;
  timestamp: number;
}

export interface PoseDetectionConfig {
  minConfidence: number;
  maxPoseCount: number;
  enableTracking: boolean;
  smoothingFactor: number;
  temporalWindowSize: number;
  maxJitterThreshold: number;
}

// Pose history for stability tracking
let poseHistory: NativePose[] = [];
let lastPoseTimestamp = 0;

// Configuration
const defaultConfig: PoseDetectionConfig = {
  minConfidence: 0.5,
  maxPoseCount: 1,
  enableTracking: true,
  smoothingFactor: 0.7,
  temporalWindowSize: 5,
  maxJitterThreshold: 10,
};

// Enhanced pose detection using frame analysis
// For now, we'll use a hybrid approach combining basic heuristics with ML
export function detectPoseFromFrame(frameData: any, frameWidth: number, frameHeight: number): NativePose | null {
  // This is a placeholder for actual pose detection
  // In production, integrate with ML Kit or TensorFlow.js

  // For demo purposes, create a mock pose based on frame center
  const centerX = frameWidth / 2;
  const centerY = frameHeight / 2;

  // Estimate body proportions
  const shoulderWidth = frameWidth * 0.25;
  const bodyHeight = frameHeight * 0.6;

  const landmarks = {
    nose: {
      x: centerX,
      y: centerY - bodyHeight * 0.25,
      confidence: 0.8
    },
    leftEye: {
      x: centerX - 15,
      y: centerY - bodyHeight * 0.3,
      confidence: 0.8
    },
    rightEye: {
      x: centerX + 15,
      y: centerY - bodyHeight * 0.3,
      confidence: 0.8
    },
    leftEar: {
      x: centerX - 30,
      y: centerY - bodyHeight * 0.25,
      confidence: 0.7
    },
    rightEar: {
      x: centerX + 30,
      y: centerY - bodyHeight * 0.25,
      confidence: 0.7
    },
    leftShoulder: {
      x: centerX - shoulderWidth / 2,
      y: centerY - bodyHeight * 0.1,
      confidence: 0.8
    },
    rightShoulder: {
      x: centerX + shoulderWidth / 2,
      y: centerY - bodyHeight * 0.1,
      confidence: 0.8
    },
    leftElbow: {
      x: centerX - shoulderWidth / 2 - 40,
      y: centerY + bodyHeight * 0.1,
      confidence: 0.7
    },
    rightElbow: {
      x: centerX + shoulderWidth / 2 + 40,
      y: centerY + bodyHeight * 0.1,
      confidence: 0.7
    },
    leftWrist: {
      x: centerX - shoulderWidth / 2 - 30,
      y: centerY + bodyHeight * 0.25,
      confidence: 0.6
    },
    rightWrist: {
      x: centerX + shoulderWidth / 2 + 30,
      y: centerY + bodyHeight * 0.25,
      confidence: 0.6
    },
    leftHip: {
      x: centerX - shoulderWidth / 3,
      y: centerY + bodyHeight * 0.2,
      confidence: 0.8
    },
    rightHip: {
      x: centerX + shoulderWidth / 3,
      y: centerY + bodyHeight * 0.2,
      confidence: 0.8
    },
    leftKnee: {
      x: centerX - shoulderWidth / 4,
      y: centerY + bodyHeight * 0.4,
      confidence: 0.7
    },
    rightKnee: {
      x: centerX + shoulderWidth / 4,
      y: centerY + bodyHeight * 0.4,
      confidence: 0.7
    },
    leftAnkle: {
      x: centerX - shoulderWidth / 5,
      y: centerY + bodyHeight * 0.55,
      confidence: 0.6
    },
    rightAnkle: {
      x: centerX + shoulderWidth / 5,
      y: centerY + bodyHeight * 0.55,
      confidence: 0.6
    },
  };

  return {
    landmarks,
    confidence: 0.75,
    timestamp: Date.now()
  };
}

// Enhanced temporal smoothing with velocity-based stabilization
export function applyTemporalSmoothing(currentPose: NativePose, config: PoseDetectionConfig = defaultConfig): NativePose {
  if (poseHistory.length === 0) {
    poseHistory.push(currentPose);
    return currentPose;
  }

  // Keep only recent poses within temporal window
  const now = Date.now();
  poseHistory = poseHistory.filter(pose => now - pose.timestamp < (config.temporalWindowSize || 5) * 200); // Configurable window

  // Apply advanced smoothing with velocity consideration
  let smoothedPose = { ...currentPose };

  // Calculate velocities for stability
  const recentPoses = poseHistory.slice(-3); // Use last 3 poses for velocity calculation
  const velocities: { [key: string]: { x: number; y: number } } = {};

  if (recentPoses.length >= 2) {
    recentPoses.forEach((pose, index) => {
      if (index > 0) {
        const prevPose = recentPoses[index - 1];
        const timeDiff = pose.timestamp - prevPose.timestamp;

        if (timeDiff > 0) {
          Object.keys(pose.landmarks).forEach(key => {
            const currentLandmark = pose.landmarks[key as keyof typeof pose.landmarks];
            const prevLandmark = prevPose.landmarks[key as keyof typeof prevPose.landmarks];

            if (!velocities[key]) velocities[key] = { x: 0, y: 0 };

            velocities[key].x += (currentLandmark.x - prevLandmark.x) / timeDiff;
            velocities[key].y += (currentLandmark.y - prevLandmark.y) / timeDiff;
          });
        }
      }
    });

    // Average velocities
    Object.keys(velocities).forEach(key => {
      velocities[key].x /= Math.max(1, recentPoses.length - 1);
      velocities[key].y /= Math.max(1, recentPoses.length - 1);
    });
  }

  // Apply smoothing with velocity-based stabilization
  poseHistory.forEach((pose, index) => {
    const weight = Math.pow(config.smoothingFactor, poseHistory.length - index);
    const recencyWeight = Math.max(0.1, 1 - (now - pose.timestamp) / 1000); // Favor recent poses

    Object.keys(smoothedPose.landmarks).forEach(key => {
      const currentLandmark = smoothedPose.landmarks[key as keyof typeof smoothedPose.landmarks];
      const historyLandmark = pose.landmarks[key as keyof typeof pose.landmarks];

      // Apply velocity-based damping for jitter reduction
      const velocity = velocities[key];
      let dampingFactor = 1;

      if (velocity) {
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        // Reduce damping for high velocities (allow fast movements)
        dampingFactor = Math.max(0.3, Math.min(1, 1 - speed / 500));
      }

      const combinedWeight = weight * recencyWeight * dampingFactor;

      currentLandmark.x = currentLandmark.x * (1 - combinedWeight) + historyLandmark.x * combinedWeight;
      currentLandmark.y = currentLandmark.y * (1 - combinedWeight) + historyLandmark.y * combinedWeight;

      if (currentLandmark.z !== undefined && historyLandmark.z !== undefined) {
        currentLandmark.z = currentLandmark.z * (1 - combinedWeight) + historyLandmark.z * combinedWeight;
      }

      // Use maximum confidence for stability
      currentLandmark.confidence = Math.max(currentLandmark.confidence, historyLandmark.confidence);
    });
  });

  // Apply jitter threshold filtering
  if (poseHistory.length >= 2) {
    const prevPose = poseHistory[poseHistory.length - 1];
    Object.keys(smoothedPose.landmarks).forEach(key => {
      const currentLandmark = smoothedPose.landmarks[key as keyof typeof smoothedPose.landmarks];
      const prevLandmark = prevPose.landmarks[key as keyof typeof prevPose.landmarks];

      const distance = Math.sqrt(
        Math.pow(currentLandmark.x - prevLandmark.x, 2) +
        Math.pow(currentLandmark.y - prevLandmark.y, 2)
      );

      // If movement is below jitter threshold, use previous position
      if (distance < (config.maxJitterThreshold || 10)) {
        currentLandmark.x = prevLandmark.x;
        currentLandmark.y = prevLandmark.y;
        if (currentLandmark.z !== undefined) {
          currentLandmark.z = prevLandmark.z;
        }
      }
    });
  }

  poseHistory.push(smoothedPose);
  return smoothedPose;
}

// Enhanced pose confidence scoring with multiple quality metrics
export function calculatePoseConfidence(pose: NativePose): number {
  if (!pose || !pose.landmarks) return 0;

  const landmarks = Object.values(pose.landmarks);
  const validLandmarks = landmarks.filter(l => l.confidence > 0.3);

  if (validLandmarks.length < 8) return 0; // Need at least 8 landmarks

  // Base confidence from landmark detection
  const avgConfidence = validLandmarks.reduce((sum, l) => sum + l.confidence, 0) / validLandmarks.length;

  // Anatomical consistency score
  const anatomicalScore = calculateAnatomicalConsistency(pose);

  // Temporal stability score (based on pose history)
  const stabilityScore = calculateTemporalStability(pose);

  // Spatial coherence score
  const coherenceScore = calculateSpatialCoherence(pose);

  // Overall quality score combining all metrics
  const overallScore = (
    avgConfidence * 0.4 +      // Landmark detection confidence
    anatomicalScore * 0.3 +    // Anatomical plausibility
    stabilityScore * 0.2 +     // Temporal stability
    coherenceScore * 0.1       // Spatial coherence
  );

  return Math.min(Math.max(overallScore, 0), 1);
}

// Calculate anatomical consistency (body proportions)
function calculateAnatomicalConsistency(pose: NativePose): number {
  try {
    const { leftShoulder, rightShoulder, leftHip, rightHip, nose, leftKnee, rightKnee } = pose.landmarks;

    // Shoulder width vs hip width ratio
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const hipWidth = Math.abs(rightHip.x - leftHip.x);
    const shoulderToHipRatio = shoulderWidth / Math.max(hipWidth, 1);

    // Torso height
    const torsoHeight = Math.abs(nose.y - (leftHip.y + rightHip.y) / 2);

    // Leg length consistency
    const leftLegLength = Math.abs(leftHip.y - leftKnee.y);
    const rightLegLength = Math.abs(rightHip.y - rightKnee.y);
    const legSymmetry = 1 - Math.abs(leftLegLength - rightLegLength) / Math.max(leftLegLength, rightLegLength);

    // Score based on realistic proportions
    let proportionScore = 0;

    // Shoulder to hip ratio should be reasonable (0.8-1.4 for most people)
    if (shoulderToHipRatio >= 0.7 && shoulderToHipRatio <= 1.6) {
      proportionScore += 0.4;
    } else if (shoulderToHipRatio >= 0.5 && shoulderToHipRatio <= 2.0) {
      proportionScore += 0.2; // Partial credit for extreme but possible ratios
    }

    // Torso height should be reasonable
    if (torsoHeight >= 80 && torsoHeight <= 600) {
      proportionScore += 0.4;
    } else if (torsoHeight >= 50 && torsoHeight <= 800) {
      proportionScore += 0.2;
    }

    // Leg symmetry bonus
    proportionScore += legSymmetry * 0.2;

    return proportionScore;
  } catch (error) {
    console.warn('Error calculating anatomical consistency:', error);
    return 0.3; // Default low confidence
  }
}

// Calculate temporal stability based on pose history
function calculateTemporalStability(currentPose: NativePose): number {
  if (poseHistory.length < 2) return 0.5; // Neutral score with limited history

  try {
    const recentPoses = poseHistory.slice(-3); // Last 3 poses
    let totalMovement = 0;
    let movementCount = 0;

    // Calculate average movement across all landmarks
    recentPoses.forEach((pose, index) => {
      if (index > 0) {
        const prevPose = recentPoses[index - 1];
        Object.keys(pose.landmarks).forEach(key => {
          const current = pose.landmarks[key as keyof typeof pose.landmarks];
          const prev = prevPose.landmarks[key as keyof typeof prevPose.landmarks];

          const movement = Math.sqrt(
            Math.pow(current.x - prev.x, 2) + Math.pow(current.y - prev.y, 2)
          );
          totalMovement += movement;
          movementCount++;
        });
      }
    });

    const avgMovement = totalMovement / Math.max(movementCount, 1);

    // Lower movement = higher stability score
    // Score decreases as movement increases
    const stabilityScore = Math.max(0, 1 - (avgMovement / 50)); // 50px threshold

    return stabilityScore;
  } catch (error) {
    console.warn('Error calculating temporal stability:', error);
    return 0.5;
  }
}

// Calculate spatial coherence (landmarks should form logical body shape)
function calculateSpatialCoherence(pose: NativePose): number {
  try {
    const { nose, leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee } = pose.landmarks;

    // Check if shoulders are horizontally aligned (within tolerance)
    const shoulderYDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const shoulderAlignment = shoulderYDiff < 20 ? 1 : Math.max(0, 1 - shoulderYDiff / 50);

    // Check if hips are horizontally aligned
    const hipYDiff = Math.abs(leftHip.y - rightHip.y);
    const hipAlignment = hipYDiff < 20 ? 1 : Math.max(0, 1 - hipYDiff / 50);

    // Check if shoulders are above hips (basic body orientation)
    const shoulderAvgY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipAvgY = (leftHip.y + rightHip.y) / 2;
    const verticalOrder = shoulderAvgY < hipAvgY ? 1 : 0.3;

    // Check if knees are below hips
    const kneeAvgY = (leftKnee.y + rightKnee.y) / 2;
    const kneePosition = kneeAvgY > hipAvgY ? 1 : 0.5;

    // Overall coherence score
    const coherenceScore = (
      shoulderAlignment * 0.3 +
      hipAlignment * 0.3 +
      verticalOrder * 0.2 +
      kneePosition * 0.2
    );

    return coherenceScore;
  } catch (error) {
    console.warn('Error calculating spatial coherence:', error);
    return 0.5;
  }
}

// Enhanced pose quality validation with comprehensive checks
export function validatePoseQuality(pose: NativePose, frameWidth: number = 400, frameHeight: number = 600): { isValid: boolean; issues: string[]; qualityScore: number } {
  const issues: string[] = [];
  let qualityScore = 1.0;

  if (!pose || !pose.landmarks) {
    issues.push('No pose data');
    return { isValid: false, issues, qualityScore: 0 };
  }

  const landmarks = Object.values(pose.landmarks);
  const validLandmarks = landmarks.filter(l => l.confidence > 0.3);

  // Landmark coverage check
  if (validLandmarks.length < 8) {
    issues.push('Insufficient landmarks detected');
    qualityScore *= 0.3;
  } else if (validLandmarks.length < 12) {
    issues.push('Partial landmark detection');
    qualityScore *= 0.7;
  }

  // Anatomical validation
  const anatomicalIssues = validateAnatomicalQuality(pose);
  issues.push(...anatomicalIssues.issues);
  qualityScore *= anatomicalIssues.score;

  // Frame positioning validation
  const positioningIssues = validateFramePositioning(pose, frameWidth, frameHeight);
  issues.push(...positioningIssues.issues);
  qualityScore *= positioningIssues.score;

  // Confidence distribution check
  const confidenceIssues = validateConfidenceDistribution(pose);
  issues.push(...confidenceIssues.issues);
  qualityScore *= confidenceIssues.score;

  // Temporal consistency (if history available)
  if (poseHistory.length >= 3) {
    const temporalIssues = validateTemporalConsistency(pose);
    issues.push(...temporalIssues.issues);
    qualityScore *= temporalIssues.score;
  }

  return {
    isValid: issues.length === 0,
    issues,
    qualityScore: Math.max(0, Math.min(1, qualityScore))
  };
}

// Validate anatomical plausibility
function validateAnatomicalQuality(pose: NativePose): { issues: string[]; score: number } {
  const issues: string[] = [];
  let score = 1.0;

  try {
    const { leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle } = pose.landmarks;

    // Check shoulder width vs hip width
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const hipWidth = Math.abs(rightHip.x - leftHip.x);

    if (shoulderWidth < 30 || hipWidth < 25) {
      issues.push('Body too small in frame');
      score *= 0.4;
    }

    if (shoulderWidth > hipWidth * 2.5) {
      issues.push('Unrealistic shoulder-to-hip ratio');
      score *= 0.5;
    }

    // Check vertical body alignment
    const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipCenterY = (leftHip.y + rightHip.y) / 2;

    if (shoulderCenterY >= hipCenterY) {
      issues.push('Inverted body orientation');
      score *= 0.3;
    }

    // Check leg proportions
    const leftLegLength = Math.abs(leftHip.y - leftKnee.y) + Math.abs(leftKnee.y - leftAnkle.y);
    const rightLegLength = Math.abs(rightHip.y - rightKnee.y) + Math.abs(rightKnee.y - rightAnkle.y);

    if (leftLegLength < 50 || rightLegLength < 50) {
      issues.push('Legs too short');
      score *= 0.6;
    }

    const legRatio = Math.min(leftLegLength, rightLegLength) / Math.max(leftLegLength, rightLegLength);
    if (legRatio < 0.7) {
      issues.push('Asymmetric leg lengths');
      score *= 0.8;
    }

  } catch (error) {
    issues.push('Anatomical validation error');
    score *= 0.5;
  }

  return { issues, score };
}

// Validate frame positioning
function validateFramePositioning(pose: NativePose, frameWidth: number, frameHeight: number): { issues: string[]; score: number } {
  const issues: string[] = [];
  let score = 1.0;

  try {
    const allLandmarks = Object.values(pose.landmarks);
    const xCoords = allLandmarks.map(l => l.x);
    const yCoords = allLandmarks.map(l => l.y);

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    const bodyWidth = maxX - minX;
    const bodyHeight = maxY - minY;

    // Check if body fits reasonably in frame
    const widthRatio = bodyWidth / frameWidth;
    const heightRatio = bodyHeight / frameHeight;

    if (widthRatio > 0.9) {
      issues.push('Body too wide for frame');
      score *= 0.7;
    }

    if (heightRatio > 0.9) {
      issues.push('Body too tall for frame');
      score *= 0.7;
    }

    // Check centering
    const bodyCenterX = (minX + maxX) / 2;
    const frameCenterX = frameWidth / 2;
    const centerOffset = Math.abs(bodyCenterX - frameCenterX) / frameWidth;

    if (centerOffset > 0.3) {
      issues.push('Body not centered in frame');
      score *= 0.8;
    }

  } catch (error) {
    issues.push('Positioning validation error');
    score *= 0.9;
  }

  return { issues, score };
}

// Validate confidence distribution
function validateConfidenceDistribution(pose: NativePose): { issues: string[]; score: number } {
  const issues: string[] = [];
  let score = 1.0;

  try {
    const confidences = Object.values(pose.landmarks).map(l => l.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const minConfidence = Math.min(...confidences);
    const maxConfidence = Math.max(...confidences);

    // Check for very low confidence landmarks
    if (minConfidence < 0.2) {
      issues.push('Some landmarks have very low confidence');
      score *= 0.8;
    }

    // Check for confidence variance (shouldn't be too spread out)
    const variance = confidences.reduce((acc, conf) => acc + Math.pow(conf - avgConfidence, 2), 0) / confidences.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 0.3) {
      issues.push('Inconsistent landmark confidence');
      score *= 0.9;
    }

  } catch (error) {
    issues.push('Confidence validation error');
    score *= 0.9;
  }

  return { issues, score };
}

// Validate temporal consistency
function validateTemporalConsistency(currentPose: NativePose): { issues: string[]; score: number } {
  const issues: string[] = [];
  let score = 1.0;

  if (poseHistory.length < 2) {
    return { issues: [], score: 1.0 };
  }

  try {
    const recentPose = poseHistory[poseHistory.length - 1];
    let totalMovement = 0;
    let landmarkCount = 0;

    // Calculate movement for each landmark
    Object.keys(currentPose.landmarks).forEach(key => {
      const current = currentPose.landmarks[key as keyof typeof currentPose.landmarks];
      const recent = recentPose.landmarks[key as keyof typeof recentPose.landmarks];

      const movement = Math.sqrt(
        Math.pow(current.x - recent.x, 2) + Math.pow(current.y - recent.y, 2)
      );

      totalMovement += movement;
      landmarkCount++;
    });

    const avgMovement = totalMovement / landmarkCount;

    // Sudden large movements indicate tracking issues
    if (avgMovement > 100) {
      issues.push('Sudden large movement detected');
      score *= 0.6;
    } else if (avgMovement > 50) {
      issues.push('Rapid movement detected');
      score *= 0.8;
    }

  } catch (error) {
    issues.push('Temporal validation error');
    score *= 0.9;
  }

  return { issues, score };
}

// Hook for using native pose detection in React components
export function useNativePoseDetection(
  config: Partial<PoseDetectionConfig> = {},
  onPoseDetected?: (pose: NativePose) => void
) {
  const detectionConfig = { ...defaultConfig, ...config };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    try {
      // Use enhanced frame-based pose detection
      let pose = detectPoseFromFrame(frame, frame.width, frame.height);

      // Attempt pose recovery if detection failed
      if (!pose || pose.confidence < detectionConfig.minConfidence) {
        pose = poseRecoveryManager.recoverPose(frame, frame.width, frame.height);
      }

      if (pose && pose.confidence > detectionConfig.minConfidence) {
        // Apply pose corrections and validation
        const { correctedPose, corrections } = poseCorrectionEngine.validateAndCorrectPose(pose);

        // Interpolate any missing landmarks
        const interpolatedPose = poseCorrectionEngine.interpolateMissingLandmarks(correctedPose);

        const smoothedPose = applyTemporalSmoothing(interpolatedPose, detectionConfig);
        const confidence = calculatePoseConfidence(smoothedPose);

        if (confidence > detectionConfig.minConfidence) {
          const finalPose = {
            ...smoothedPose,
            confidence
          };

          // Update recovery manager with valid pose
          poseRecoveryManager.updateValidPose(finalPose);

          if (onPoseDetected) {
            runOnJS(onPoseDetected)(finalPose);
          }
        }
      }
    } catch (error) {
      console.error('Frame processing error:', error);
    }
  }, []);

  return {
    frameProcessor,
    config: detectionConfig
  };
}

// Performance monitoring
export class PoseDetectionPerformanceMonitor {
  private frameCount = 0;
  private startTime = Date.now();
  private processingTimes: number[] = [];
  private fpsHistory: number[] = [];

  recordFrame(processingTime: number) {
    this.frameCount++;
    this.processingTimes.push(processingTime);

    // Keep only last 60 samples
    if (this.processingTimes.length > 60) {
      this.processingTimes.shift();
    }

    // Calculate FPS every second
    const now = Date.now();
    if (now - this.startTime >= 1000) {
      const fps = this.frameCount / ((now - this.startTime) / 1000);
      this.fpsHistory.push(fps);

      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }

      this.frameCount = 0;
      this.startTime = now;
    }
  }

  getMetrics() {
    const avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    return {
      averageProcessingTime: avgProcessingTime || 0,
      averageFps: avgFps || 0,
      currentFps: this.fpsHistory[this.fpsHistory.length - 1] || 0,
      totalFrames: this.frameCount
    };
  }

  reset() {
    this.frameCount = 0;
    this.startTime = Date.now();
    this.processingTimes = [];
    this.fpsHistory = [];
  }
}

// Pose recovery mechanisms for lost tracking
export class PoseRecoveryManager {
  private lastValidPose: NativePose | null = null;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 5;
  private recoveryTimeout = 2000; // 2 seconds
  private lastRecoveryTime = 0;

  // Attempt to recover pose tracking when detection fails
  recoverPose(currentFrame: any, frameWidth: number, frameHeight: number): NativePose | null {
    const now = Date.now();

    // Don't attempt recovery too frequently
    if (now - this.lastRecoveryTime < 500) {
      return null;
    }

    this.lastRecoveryTime = now;

    if (!this.lastValidPose) {
      // No previous pose to recover from, create fallback
      return this.createFallbackPose(frameWidth, frameHeight);
    }

    // Try different recovery strategies
    const strategies = [
      () => this.predictiveRecovery(),
      () => this.neighborBasedRecovery(),
      () => this.createFallbackPose(frameWidth, frameHeight)
    ];

    for (const strategy of strategies) {
      const recoveredPose = strategy();
      if (recoveredPose && this.validateRecoveredPose(recoveredPose)) {
        this.lastValidPose = recoveredPose;
        this.recoveryAttempts = 0;
        return recoveredPose;
      }
    }

    this.recoveryAttempts++;
    return null;
  }

  // Store a valid pose for recovery reference
  updateValidPose(pose: NativePose) {
    this.lastValidPose = pose;
    this.recoveryAttempts = 0;
  }

  // Predictive recovery using motion prediction
  private predictiveRecovery(): NativePose | null {
    if (!this.lastValidPose || poseHistory.length < 2) return null;

    try {
      // Calculate velocity from recent poses
      const recentPoses = poseHistory.slice(-3);
      const velocities: { [key: string]: { x: number; y: number } } = {};

      recentPoses.forEach((pose, index) => {
        if (index > 0) {
          const prevPose = recentPoses[index - 1];
          const timeDiff = pose.timestamp - prevPose.timestamp;

          if (timeDiff > 0) {
            Object.keys(pose.landmarks).forEach(key => {
              const current = pose.landmarks[key as keyof typeof pose.landmarks];
              const prev = prevPose.landmarks[key as keyof typeof prevPose.landmarks];

              if (!velocities[key]) velocities[key] = { x: 0, y: 0 };

              velocities[key].x += (current.x - prev.x) / timeDiff;
              velocities[key].y += (current.y - prev.y) / timeDiff;
            });
          }
        }
      });

      // Average velocities
      Object.keys(velocities).forEach(key => {
        velocities[key].x /= Math.max(1, recentPoses.length - 1);
        velocities[key].y /= Math.max(1, recentPoses.length - 1);
      });

      // Predict next pose position
      const timeSinceLastPose = Date.now() - this.lastValidPose.timestamp;
      const predictionFactor = Math.min(timeSinceLastPose / 100, 1); // Limit prediction

      const predictedPose: NativePose = {
        ...this.lastValidPose,
        timestamp: Date.now(),
        confidence: Math.max(0.3, this.lastValidPose.confidence * 0.7) // Reduced confidence for prediction
      };

      // Apply velocity-based prediction
      Object.keys(predictedPose.landmarks).forEach(key => {
        const landmark = predictedPose.landmarks[key as keyof typeof predictedPose.landmarks];
        const velocity = velocities[key];

        if (velocity) {
          landmark.x += velocity.x * timeSinceLastPose * predictionFactor;
          landmark.y += velocity.y * timeSinceLastPose * predictionFactor;
          landmark.confidence *= 0.8; // Reduce confidence for predicted positions
        }
      });

      return predictedPose;
    } catch (error) {
      console.warn('Predictive recovery failed:', error);
      return null;
    }
  }

  // Neighbor-based recovery using anatomical constraints
  private neighborBasedRecovery(): NativePose | null {
    if (!this.lastValidPose) return null;

    try {
      const recoveredPose: NativePose = {
        ...this.lastValidPose,
        timestamp: Date.now(),
        confidence: Math.max(0.2, this.lastValidPose.confidence * 0.5)
      };

      // Use anatomical relationships to reconstruct missing landmarks
      const { leftShoulder, rightShoulder, leftHip, rightHip, nose } = recoveredPose.landmarks;

      // Reconstruct missing facial landmarks based on nose and shoulders
      if (nose.confidence > 0.5) {
        const faceWidth = Math.abs(rightShoulder.x - leftShoulder.x) * 0.3;
        recoveredPose.landmarks.leftEye = {
          x: nose.x - faceWidth * 0.2,
          y: nose.y - 15,
          confidence: 0.4
        };
        recoveredPose.landmarks.rightEye = {
          x: nose.x + faceWidth * 0.2,
          y: nose.y - 15,
          confidence: 0.4
        };
        recoveredPose.landmarks.leftEar = {
          x: nose.x - faceWidth * 0.4,
          y: nose.y,
          confidence: 0.3
        };
        recoveredPose.landmarks.rightEar = {
          x: nose.x + faceWidth * 0.4,
          y: nose.y,
          confidence: 0.3
        };
      }

      // Reconstruct arm positions based on shoulder positions
      if (leftShoulder.confidence > 0.5) {
        recoveredPose.landmarks.leftElbow = {
          x: leftShoulder.x - 40,
          y: leftShoulder.y + 80,
          confidence: 0.4
        };
        recoveredPose.landmarks.leftWrist = {
          x: leftShoulder.x - 30,
          y: leftShoulder.y + 150,
          confidence: 0.3
        };
      }

      if (rightShoulder.confidence > 0.5) {
        recoveredPose.landmarks.rightElbow = {
          x: rightShoulder.x + 40,
          y: rightShoulder.y + 80,
          confidence: 0.4
        };
        recoveredPose.landmarks.rightWrist = {
          x: rightShoulder.x + 30,
          y: rightShoulder.y + 150,
          confidence: 0.3
        };
      }

      // Reconstruct leg positions based on hip positions
      if (leftHip.confidence > 0.5) {
        recoveredPose.landmarks.leftKnee = {
          x: leftHip.x - 10,
          y: leftHip.y + 100,
          confidence: 0.4
        };
        recoveredPose.landmarks.leftAnkle = {
          x: leftHip.x - 15,
          y: leftHip.y + 200,
          confidence: 0.3
        };
      }

      if (rightHip.confidence > 0.5) {
        recoveredPose.landmarks.rightKnee = {
          x: rightHip.x + 10,
          y: rightHip.y + 100,
          confidence: 0.4
        };
        recoveredPose.landmarks.rightAnkle = {
          x: rightHip.x + 15,
          y: rightHip.y + 200,
          confidence: 0.3
        };
      }

      return recoveredPose;
    } catch (error) {
      console.warn('Neighbor-based recovery failed:', error);
      return null;
    }
  }

  // Create fallback pose when no recovery is possible
  private createFallbackPose(frameWidth: number, frameHeight: number): NativePose {
    return detectPoseFromFrame(null, frameWidth, frameHeight) || {
      landmarks: {
        nose: { x: frameWidth / 2, y: frameHeight * 0.25, confidence: 0.2 },
        leftEye: { x: frameWidth / 2 - 10, y: frameHeight * 0.23, confidence: 0.2 },
        rightEye: { x: frameWidth / 2 + 10, y: frameHeight * 0.23, confidence: 0.2 },
        leftEar: { x: frameWidth / 2 - 20, y: frameHeight * 0.25, confidence: 0.2 },
        rightEar: { x: frameWidth / 2 + 20, y: frameHeight * 0.25, confidence: 0.2 },
        leftShoulder: { x: frameWidth / 2 - 60, y: frameHeight * 0.35, confidence: 0.2 },
        rightShoulder: { x: frameWidth / 2 + 60, y: frameHeight * 0.35, confidence: 0.2 },
        leftElbow: { x: frameWidth / 2 - 80, y: frameHeight * 0.45, confidence: 0.2 },
        rightElbow: { x: frameWidth / 2 + 80, y: frameHeight * 0.45, confidence: 0.2 },
        leftWrist: { x: frameWidth / 2 - 70, y: frameHeight * 0.55, confidence: 0.2 },
        rightWrist: { x: frameWidth / 2 + 70, y: frameHeight * 0.55, confidence: 0.2 },
        leftHip: { x: frameWidth / 2 - 50, y: frameHeight * 0.5, confidence: 0.2 },
        rightHip: { x: frameWidth / 2 + 50, y: frameHeight * 0.5, confidence: 0.2 },
        leftKnee: { x: frameWidth / 2 - 45, y: frameHeight * 0.65, confidence: 0.2 },
        rightKnee: { x: frameWidth / 2 + 45, y: frameHeight * 0.65, confidence: 0.2 },
        leftAnkle: { x: frameWidth / 2 - 40, y: frameHeight * 0.8, confidence: 0.2 },
        rightAnkle: { x: frameWidth / 2 + 40, y: frameHeight * 0.8, confidence: 0.2 },
      },
      confidence: 0.1,
      timestamp: Date.now()
    };
  }

  // Validate recovered pose
  private validateRecoveredPose(pose: NativePose): boolean {
    const validation = validatePoseQuality(pose);
    return validation.qualityScore > 0.2; // Accept poses with minimum quality
  }

  // Check if recovery should be attempted
  shouldAttemptRecovery(): boolean {
    return this.recoveryAttempts < this.maxRecoveryAttempts;
  }

  // Reset recovery state
  reset() {
    this.lastValidPose = null;
    this.recoveryAttempts = 0;
    this.lastRecoveryTime = 0;
  }
}

// Export singleton performance monitor
export const performanceMonitor = new PoseDetectionPerformanceMonitor();

// Pose validation and correction algorithms
export class PoseCorrectionEngine {
  private anatomicalConstraints = {
    // Expected ratios and relationships
    shoulderToHipRatio: { min: 0.8, max: 1.6, ideal: 1.2 },
    torsoToLegRatio: { min: 0.6, max: 1.2, ideal: 0.9 },
    armSpanRatio: { min: 0.9, max: 1.3, ideal: 1.1 },
    headToTorsoRatio: { min: 0.15, max: 0.25, ideal: 0.2 }
  };

  // Validate and correct pose based on anatomical constraints
  validateAndCorrectPose(pose: NativePose): { correctedPose: NativePose; corrections: string[] } {
    const corrections: string[] = [];
    let correctedPose = { ...pose };

    // Apply anatomical corrections
    correctedPose = this.applyAnatomicalCorrections(correctedPose, corrections);

    // Apply symmetry corrections
    correctedPose = this.applySymmetryCorrections(correctedPose, corrections);

    // Apply temporal consistency corrections
    correctedPose = this.applyTemporalConsistencyCorrections(correctedPose, corrections);

    // Recalculate confidence based on corrections
    const finalConfidence = this.recalculateConfidence(correctedPose, corrections);

    return {
      correctedPose: {
        ...correctedPose,
        confidence: finalConfidence
      },
      corrections
    };
  }

  // Apply anatomical constraint-based corrections
  private applyAnatomicalCorrections(pose: NativePose, corrections: string[]): NativePose {
    const corrected = { ...pose };
    const landmarks = corrected.landmarks;

    // Correct shoulder-to-hip ratio
    const shoulderWidth = Math.abs(landmarks.rightShoulder.x - landmarks.leftShoulder.x);
    const hipWidth = Math.abs(landmarks.rightHip.x - landmarks.leftHip.x);

    if (shoulderWidth > 0 && hipWidth > 0) {
      const ratio = shoulderWidth / hipWidth;

      if (ratio < this.anatomicalConstraints.shoulderToHipRatio.min ||
          ratio > this.anatomicalConstraints.shoulderToHipRatio.max) {

        corrections.push(`Corrected shoulder-to-hip ratio from ${ratio.toFixed(2)} to ${this.anatomicalConstraints.shoulderToHipRatio.ideal.toFixed(2)}`);

        // Adjust hip positions to match ideal ratio
        const targetHipWidth = shoulderWidth / this.anatomicalConstraints.shoulderToHipRatio.ideal;
        const hipCenterX = (landmarks.leftHip.x + landmarks.rightHip.x) / 2;

        landmarks.leftHip.x = hipCenterX - targetHipWidth / 2;
        landmarks.rightHip.x = hipCenterX + targetHipWidth / 2;

        // Reduce confidence for corrected landmarks
        landmarks.leftHip.confidence *= 0.9;
        landmarks.rightHip.confidence *= 0.9;
      }
    }

    // Correct torso-to-leg proportions
    const torsoHeight = Math.abs((landmarks.leftShoulder.y + landmarks.rightShoulder.y) / 2 -
                                 (landmarks.leftHip.y + landmarks.rightHip.y) / 2);
    const legHeight = Math.abs((landmarks.leftHip.y + landmarks.rightHip.y) / 2 -
                               (landmarks.leftAnkle.y + landmarks.rightAnkle.y) / 2);

    if (torsoHeight > 0 && legHeight > 0) {
      const ratio = torsoHeight / legHeight;

      if (ratio < this.anatomicalConstraints.torsoToLegRatio.min ||
          ratio > this.anatomicalConstraints.torsoToLegRatio.max) {

        corrections.push(`Corrected torso-to-leg ratio from ${ratio.toFixed(2)} to ${this.anatomicalConstraints.torsoToLegRatio.ideal.toFixed(2)}`);

        // Adjust ankle positions
        const targetLegHeight = torsoHeight / this.anatomicalConstraints.torsoToLegRatio.ideal;
        const hipCenterY = (landmarks.leftHip.y + landmarks.rightHip.y) / 2;

        landmarks.leftAnkle.y = hipCenterY + targetLegHeight;
        landmarks.rightAnkle.y = hipCenterY + targetLegHeight;
        landmarks.leftKnee.y = hipCenterY + targetLegHeight * 0.5;
        landmarks.rightKnee.y = hipCenterY + targetLegHeight * 0.5;

        // Reduce confidence for corrected landmarks
        landmarks.leftAnkle.confidence *= 0.8;
        landmarks.rightAnkle.confidence *= 0.8;
        landmarks.leftKnee.confidence *= 0.8;
        landmarks.rightKnee.confidence *= 0.8;
      }
    }

    return corrected;
  }

  // Apply symmetry corrections
  private applySymmetryCorrections(pose: NativePose, corrections: string[]): NativePose {
    const corrected = { ...pose };
    const landmarks = corrected.landmarks;

    // Check and correct left-right symmetry
    const symmetryPairs = [
      ['leftShoulder', 'rightShoulder'],
      ['leftHip', 'rightHip'],
      ['leftKnee', 'rightKnee'],
      ['leftAnkle', 'rightAnkle'],
      ['leftElbow', 'rightElbow'],
      ['leftWrist', 'rightWrist'],
      ['leftEar', 'rightEar'],
      ['leftEye', 'rightEye']
    ];

    symmetryPairs.forEach(([left, right]) => {
      const leftLandmark = landmarks[left as keyof typeof landmarks];
      const rightLandmark = landmarks[right as keyof typeof landmarks];

      // Check vertical alignment (should be similar Y positions)
      const yDiff = Math.abs(leftLandmark.y - rightLandmark.y);

      if (yDiff > 30) { // Significant asymmetry
        corrections.push(`Corrected ${left}/${right} vertical alignment (diff: ${yDiff.toFixed(1)}px)`);

        // Average the Y positions
        const avgY = (leftLandmark.y + rightLandmark.y) / 2;
        leftLandmark.y = avgY;
        rightLandmark.y = avgY;

        // Reduce confidence
        leftLandmark.confidence *= 0.9;
        rightLandmark.confidence *= 0.9;
      }
    });

    return corrected;
  }

  // Apply temporal consistency corrections
  private applyTemporalConsistencyCorrections(pose: NativePose, corrections: string[]): NativePose {
    if (poseHistory.length < 2) return pose;

    const corrected = { ...pose };
    const recentPose = poseHistory[poseHistory.length - 1];

    // Check for sudden jumps in landmark positions
    Object.keys(corrected.landmarks).forEach(key => {
      const current = corrected.landmarks[key as keyof typeof corrected.landmarks];
      const recent = recentPose.landmarks[key as keyof typeof recentPose.landmarks];

      const distance = Math.sqrt(
        Math.pow(current.x - recent.x, 2) + Math.pow(current.y - recent.y, 2)
      );

      // If movement is too sudden (> 100px), dampen it
      if (distance > 100) {
        corrections.push(`Dampened sudden movement for ${key} (${distance.toFixed(1)}px)`);

        // Apply damping
        const dampingFactor = 100 / distance;
        current.x = recent.x + (current.x - recent.x) * dampingFactor;
        current.y = recent.y + (current.y - recent.y) * dampingFactor;

        current.confidence *= 0.8;
      }
    });

    return corrected;
  }

  // Recalculate confidence based on applied corrections
  private recalculateConfidence(pose: NativePose, corrections: string[]): number {
    let baseConfidence = pose.confidence;

    // Reduce confidence based on number and severity of corrections
    const correctionPenalty = corrections.length * 0.05; // 5% per correction
    baseConfidence *= Math.max(0.3, 1 - correctionPenalty);

    // Boost confidence if pose passes all anatomical checks
    const validation = validatePoseQuality(pose);
    if (validation.isValid) {
      baseConfidence = Math.min(1, baseConfidence * 1.1);
    }

    return Math.max(0, Math.min(1, baseConfidence));
  }

  // Advanced pose interpolation for missing landmarks
  interpolateMissingLandmarks(pose: NativePose): NativePose {
    const interpolated = { ...pose };

    // Define landmark relationships for interpolation
    const interpolationRules = [
      {
        target: 'nose',
        sources: ['leftEye', 'rightEye'],
        calculate: (sources: any[]) => ({
          x: (sources[0].x + sources[1].x) / 2,
          y: (sources[0].y + sources[1].y) / 2 - 20
        })
      },
      {
        target: 'leftShoulder',
        sources: ['leftHip', 'nose'],
        calculate: (sources: any[]) => ({
          x: sources[0].x - 10,
          y: sources[1].y + 80
        })
      },
      {
        target: 'rightShoulder',
        sources: ['rightHip', 'nose'],
        calculate: (sources: any[]) => ({
          x: sources[0].x + 10,
          y: sources[1].y + 80
        })
      }
    ];

    interpolationRules.forEach(rule => {
      const targetLandmark = interpolated.landmarks[rule.target as keyof typeof interpolated.landmarks];

      if (targetLandmark.confidence < 0.5) {
        const sources = rule.sources.map(source =>
          interpolated.landmarks[source as keyof typeof interpolated.landmarks]
        ).filter(source => source.confidence > 0.7);

        if (sources.length === rule.sources.length) {
          const interpolatedPos = rule.calculate(sources);
          targetLandmark.x = interpolatedPos.x;
          targetLandmark.y = interpolatedPos.y;
          targetLandmark.confidence = Math.min(...sources.map(s => s.confidence)) * 0.8;
        }
      }
    });

    return interpolated;
  }
}

// Export singleton recovery manager
export const poseRecoveryManager = new PoseRecoveryManager();

// Export singleton correction engine
export const poseCorrectionEngine = new PoseCorrectionEngine();