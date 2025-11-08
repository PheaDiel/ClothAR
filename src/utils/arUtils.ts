import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform, Dimensions } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ML-based pose detection variables
let detector: poseDetection.PoseDetector | null = null;
let isTfReady = false;

// Body landmark positions for 2D overlay (ML-enhanced pose estimation)
export interface BodyLandmarks {
  nose: { x: number; y: number };
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
  leftElbow: { x: number; y: number };
  rightElbow: { x: number; y: number };
  leftWrist: { x: number; y: number };
  rightWrist: { x: number; y: number };
  leftHip: { x: number; y: number };
  rightHip: { x: number; y: number };
  leftKnee: { x: number; y: number };
  rightKnee: { x: number; y: number };
  leftAnkle: { x: number; y: number };
  rightAnkle: { x: number; y: number };
}

// Enhanced pose tracking stability interfaces
export interface PoseStabilityConfig {
  smoothingFactor: number;
  confidenceThreshold: number;
  maxJitterThreshold: number;
  temporalWindowSize: number;
}

export interface PerspectiveCorrectionConfig {
  enableAngleCompensation: boolean;
  enableOrientationNormalization: boolean;
  enableDistanceScaling: boolean;
  referenceDistance: number;
  maxCorrectionAngle: number;
}

export interface MeasurementIntegrationConfig {
  enableMeasurementScaling: boolean;
  enableMeasurementPositioning: boolean;
  measurementConfidence: number;
  fallbackToStandardSizing: boolean;
}

// Pose history for stability tracking
interface PoseHistoryEntry {
  landmarks: BodyLandmarks;
  timestamp: number;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

let poseHistory: PoseHistoryEntry[] = [];
let stabilityConfig: PoseStabilityConfig = {
  smoothingFactor: 0.7,
  confidenceThreshold: 0.5,
  maxJitterThreshold: 10,
  temporalWindowSize: 5,
};

let perspectiveConfig: PerspectiveCorrectionConfig = {
  enableAngleCompensation: true,
  enableOrientationNormalization: true,
  enableDistanceScaling: true,
  referenceDistance: 2.0, // meters
  maxCorrectionAngle: 45, // degrees
};

let measurementConfig: MeasurementIntegrationConfig = {
  enableMeasurementScaling: true,
  enableMeasurementPositioning: true,
  measurementConfidence: 0.8,
  fallbackToStandardSizing: true,
};

// Clothing overlay configuration
export interface ClothingOverlay {
  id: string;
  imageUri: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
  category: 'tops' | 'bottoms' | 'dresses' | 'outerwear';
  layer: number; // Z-index for layering
  physics?: ClothPhysics; // Physics properties for cloth simulation
  anchorPoints?: Array<{ name: string; x: number; y: number; type: string }>; // Anchor points for precise positioning
  aspectRatio?: number; // Aspect ratio for proper scaling to prevent stretching
}

// Multi-layer clothing support
export interface ClothingLayer {
  id: string;
  clothing: ClothingOverlay;
  zIndex: number;
  visible: boolean;
  physicsEnabled: boolean;
}

// Physics simulation interfaces
export interface ClothPhysics {
  stiffness: number; // How rigid the cloth is (0-1)
  damping: number; // How much movement is damped (0-1)
  gravity: number; // Gravity effect (0-1)
  windForce: { x: number; y: number }; // Wind simulation
  deformationPoints: Array<{ x: number; y: number; weight: number }>; // Points where cloth can deform
  anchorPoints: Array<{ landmark: keyof BodyLandmarks; offset: { x: number; y: number } }>; // Points anchored to body
}

export interface PhysicsConfig {
  enablePhysics: boolean;
  gravityStrength: number;
  windEnabled: boolean;
  clothStiffness: number;
  simulationSteps: number;
  maxLayers: number;
}

// Physics simulation state
export let physicsConfig: PhysicsConfig = {
  enablePhysics: true,
  gravityStrength: 0.3,
  windEnabled: false,
  clothStiffness: 0.7,
  simulationSteps: 3,
  maxLayers: 3,
};

let clothingLayers: ClothingLayer[] = [];
let physicsSimulationRunning = false;

// Function to load a 2D clothing image for overlay
export async function loadClothingImage(imageUri: string) {
  try {
    const asset = Asset.fromURI(imageUri);
    await asset.downloadAsync();
    return asset.localUri;
  } catch (error) {
    console.error('Error loading clothing image:', error);
    throw error;
  }
}

// Function to initialize TensorFlow.js and pose detection model
export async function initializeMLPoseDetection(): Promise<boolean> {
  try {
    if (isTfReady && detector) {
      return true;
    }

    // Initialize TensorFlow.js
    await tf.ready();
    isTfReady = true;

    // Create pose detector using MoveNet model (lightweight and fast)
    const model = poseDetection.SupportedModels.MoveNet;
    const detectorConfig = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
      minPoseScore: 0.3,
    };

    detector = await poseDetection.createDetector(model, detectorConfig);

    console.log('ML pose detection initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing ML pose detection:', error);
    isTfReady = false;
    detector = null;
    throw error;
  }
}

// Function to initialize AR session for 2D overlay (now includes ML initialization)
export async function initializeAR(): Promise<boolean> {
  try {
    console.log('Initializing AR with ML pose detection...');

    // Initialize ML pose detection
    const mlReady = await initializeMLPoseDetection();

    if (mlReady) {
      console.log('AR overlay session with ML pose detection initialized');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error initializing AR:', error);
    // Fallback to basic 2D overlay without ML
    console.log('Falling back to basic 2D overlay');
    return true;
  }
}

// Configuration functions for enhanced features
export function setPoseStabilityConfig(config: Partial<PoseStabilityConfig>) {
  stabilityConfig = { ...stabilityConfig, ...config };
}

export function setPerspectiveCorrectionConfig(config: Partial<PerspectiveCorrectionConfig>) {
  perspectiveConfig = { ...perspectiveConfig, ...config };
}

export function setMeasurementIntegrationConfig(config: Partial<MeasurementIntegrationConfig>) {
  measurementConfig = { ...measurementConfig, ...config };
}

export function setPhysicsConfig(config: Partial<PhysicsConfig>) {
  physicsConfig = { ...physicsConfig, ...config };
}

// Advanced pose stability functions
function calculatePoseConfidence(landmarks: BodyLandmarks): number {
  // Calculate confidence based on landmark distribution and consistency
  const shoulderWidth = Math.abs(landmarks.rightShoulder.x - landmarks.leftShoulder.x);
  const hipWidth = Math.abs(landmarks.rightHip.x - landmarks.leftHip.x);
  const torsoHeight = Math.abs((landmarks.leftShoulder.y + landmarks.rightShoulder.y) / 2 - (landmarks.leftHip.y + landmarks.rightHip.y) / 2);

  // Basic validation: reasonable proportions
  const shoulderToHipRatio = shoulderWidth / hipWidth;
  const isValidRatio = shoulderToHipRatio > 0.8 && shoulderToHipRatio < 1.5;

  const isValidHeight = torsoHeight > 50 && torsoHeight < screenHeight * 0.8;

  return (isValidRatio && isValidHeight) ? 0.9 : 0.3;
}

function applyTemporalSmoothing(currentPose: PoseHistoryEntry): BodyLandmarks {
  if (poseHistory.length === 0) {
    return currentPose.landmarks;
  }

  // Keep only recent poses within temporal window
  const now = Date.now();
  poseHistory = poseHistory.filter(entry => now - entry.timestamp < 1000); // 1 second window

  // Apply exponential moving average smoothing
  let smoothedLandmarks = { ...currentPose.landmarks };

  poseHistory.forEach((entry, index) => {
    const weight = Math.pow(stabilityConfig.smoothingFactor, poseHistory.length - index);
    (Object.keys(smoothedLandmarks) as Array<keyof BodyLandmarks>).forEach(key => {
      smoothedLandmarks[key] = {
        x: smoothedLandmarks[key].x * (1 - weight) + entry.landmarks[key].x * weight,
        y: smoothedLandmarks[key].y * (1 - weight) + entry.landmarks[key].y * weight,
      };
    });
  });

  return smoothedLandmarks;
}

function detectAndCorrectPerspective(landmarks: BodyLandmarks, boundingBox: any): BodyLandmarks {
  if (!perspectiveConfig.enableAngleCompensation && !perspectiveConfig.enableOrientationNormalization) {
    return landmarks;
  }

  let correctedLandmarks = { ...landmarks };

  // Calculate body orientation angle
  const shoulderCenter = {
    x: (landmarks.leftShoulder.x + landmarks.rightShoulder.x) / 2,
    y: (landmarks.leftShoulder.y + landmarks.rightShoulder.y) / 2,
  };
  const hipCenter = {
    x: (landmarks.leftHip.x + landmarks.rightHip.x) / 2,
    y: (landmarks.leftHip.y + landmarks.rightHip.y) / 2,
  };

  const bodyAngle = Math.atan2(hipCenter.y - shoulderCenter.y, hipCenter.x - shoulderCenter.x) * (180 / Math.PI);

  // Apply orientation normalization if enabled
  if (perspectiveConfig.enableOrientationNormalization && Math.abs(bodyAngle) > 5) {
    const correctionAngle = Math.min(Math.max(bodyAngle, -perspectiveConfig.maxCorrectionAngle), perspectiveConfig.maxCorrectionAngle);
    const cos = Math.cos(-correctionAngle * Math.PI / 180);
    const sin = Math.sin(-correctionAngle * Math.PI / 180);

    // Rotate all landmarks around body center
    const bodyCenter = {
      x: (shoulderCenter.x + hipCenter.x) / 2,
      y: (shoulderCenter.y + hipCenter.y) / 2,
    };

    (Object.keys(correctedLandmarks) as Array<keyof BodyLandmarks>).forEach(key => {
      const point = correctedLandmarks[key];
      const dx = point.x - bodyCenter.x;
      const dy = point.y - bodyCenter.y;

      correctedLandmarks[key] = {
        x: bodyCenter.x + dx * cos - dy * sin,
        y: bodyCenter.y + dx * sin + dy * cos,
      };
    });
  }

  // Apply distance-based scaling if enabled
  if (perspectiveConfig.enableDistanceScaling) {
    const estimatedDistance = boundingBox.height / (screenHeight * 0.6); // Rough distance estimation
    const scaleFactor = perspectiveConfig.referenceDistance / estimatedDistance;

    const bodyCenter = {
      x: (correctedLandmarks.leftShoulder.x + correctedLandmarks.rightShoulder.x) / 2,
      y: (correctedLandmarks.leftShoulder.y + correctedLandmarks.rightShoulder.y) / 2,
    };

    (Object.keys(correctedLandmarks) as Array<keyof BodyLandmarks>).forEach(key => {
      const point = correctedLandmarks[key];
      correctedLandmarks[key] = {
        x: bodyCenter.x + (point.x - bodyCenter.x) * scaleFactor,
        y: bodyCenter.y + (point.y - bodyCenter.y) * scaleFactor,
      };
    });
  }

  return correctedLandmarks;
}

// Function to detect body pose using ML model with enhanced stability
export async function detectBodyPose(imageUri?: string): Promise<{ landmarks: BodyLandmarks; boundingBox: { x: number; y: number; width: number; height: number } } | null> {
  try {
    console.log('🔍 DEBUG: detectBodyPose called with imageUri:', imageUri ? 'provided' : 'not provided');
    console.log('🔍 DEBUG: Platform:', Platform.OS);
    console.log('🔍 DEBUG: detector ready:', !!detector, 'isTfReady:', isTfReady);

    // Try ML-based pose detection first (only on web where DOM APIs exist)
    if (detector && isTfReady && imageUri && Platform.OS === 'web') {
      try {
        console.log('🔍 DEBUG: Attempting ML pose detection with camera frame...');

        // Load image from URI and convert to tensor
        // For React Native, we need to use a different approach since fetch and canvas don't work the same way
        // We'll use expo-file-system and a more direct tensor approach
        console.log('🔍 DEBUG: Loading asset from URI...');
        const asset = Asset.fromURI(imageUri);
        await asset.downloadAsync();
        console.log('🔍 DEBUG: Asset loaded, localUri:', asset.localUri);

        // CRITICAL: React Native doesn't have DOM APIs like Image, canvas, document
        // This is the likely source of the render error
        console.log('🔍 DEBUG: Attempting to create Image element (web only path)...');
        const img = new Image();
        img.src = asset.localUri || imageUri;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        console.log('🔍 DEBUG: Image loaded, attempting canvas creation...');
        // Create a canvas element for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        console.log('🔍 DEBUG: Canvas processing complete, creating tensor...');
        // Convert to tensor
        const imageTensor = tf.browser.fromPixels(imageData);
        const resizedTensor = tf.image.resizeBilinear(imageTensor, [192, 192]); // MoveNet input size
        const normalizedTensor = resizedTensor.div(255.0).expandDims(0) as tf.Tensor3D;

        console.log('🔍 DEBUG: Running pose detection...');
        // Run pose detection
        const poses = await detector.estimatePoses(normalizedTensor);

        // Clean up tensors
        imageTensor.dispose();
        resizedTensor.dispose();
        normalizedTensor.dispose();

        if (poses.length > 0) {
          const pose = poses[0];
          console.log('ML pose detection successful:', pose.keypoints.length, 'keypoints detected');

          // Convert ML keypoints to our BodyLandmarks format
          // Scale keypoints back to screen coordinates
          const scaleX = screenWidth / 192; // Input tensor width
          const scaleY = screenHeight / 192; // Input tensor height

          const keypoints = pose.keypoints;
          const landmarks: BodyLandmarks = {
            nose: {
              x: (keypoints.find(k => k.name === 'nose')?.x || 96) * scaleX,
              y: (keypoints.find(k => k.name === 'nose')?.y || 48) * scaleY
            },
            leftShoulder: {
              x: (keypoints.find(k => k.name === 'left_shoulder')?.x || 70) * scaleX,
              y: (keypoints.find(k => k.name === 'left_shoulder')?.y || 70) * scaleY
            },
            rightShoulder: {
              x: (keypoints.find(k => k.name === 'right_shoulder')?.x || 122) * scaleX,
              y: (keypoints.find(k => k.name === 'right_shoulder')?.y || 70) * scaleY
            },
            leftElbow: {
              x: (keypoints.find(k => k.name === 'left_elbow')?.x || 50) * scaleX,
              y: (keypoints.find(k => k.name === 'left_elbow')?.y || 100) * scaleY
            },
            rightElbow: {
              x: (keypoints.find(k => k.name === 'right_elbow')?.x || 142) * scaleX,
              y: (keypoints.find(k => k.name === 'right_elbow')?.y || 100) * scaleY
            },
            leftWrist: {
              x: (keypoints.find(k => k.name === 'left_wrist')?.x || 40) * scaleX,
              y: (keypoints.find(k => k.name === 'left_wrist')?.y || 130) * scaleY
            },
            rightWrist: {
              x: (keypoints.find(k => k.name === 'right_wrist')?.x || 152) * scaleX,
              y: (keypoints.find(k => k.name === 'right_wrist')?.y || 130) * scaleY
            },
            leftHip: {
              x: (keypoints.find(k => k.name === 'left_hip')?.x || 75) * scaleX,
              y: (keypoints.find(k => k.name === 'left_hip')?.y || 120) * scaleY
            },
            rightHip: {
              x: (keypoints.find(k => k.name === 'right_hip')?.x || 117) * scaleX,
              y: (keypoints.find(k => k.name === 'right_hip')?.y || 120) * scaleY
            },
            leftKnee: {
              x: (keypoints.find(k => k.name === 'left_knee')?.x || 78) * scaleX,
              y: (keypoints.find(k => k.name === 'left_knee')?.y || 160) * scaleY
            },
            rightKnee: {
              x: (keypoints.find(k => k.name === 'right_knee')?.x || 114) * scaleX,
              y: (keypoints.find(k => k.name === 'right_knee')?.y || 160) * scaleY
            },
            leftAnkle: {
              x: (keypoints.find(k => k.name === 'left_ankle')?.x || 80) * scaleX,
              y: (keypoints.find(k => k.name === 'left_ankle')?.y || 190) * scaleY
            },
            rightAnkle: {
              x: (keypoints.find(k => k.name === 'right_ankle')?.x || 112) * scaleX,
              y: (keypoints.find(k => k.name === 'right_ankle')?.y || 190) * scaleY
            },
          };

          // Calculate bounding box from landmarks
          const xCoords = Object.values(landmarks).map(l => l.x);
          const yCoords = Object.values(landmarks).map(l => l.y);
          const minX = Math.min(...xCoords);
          const maxX = Math.max(...xCoords);
          const minY = Math.min(...yCoords);
          const maxY = Math.max(...yCoords);

          const boundingBox = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          };

          console.log('ML pose detection completed with real camera frame');
          return { landmarks, boundingBox };
        }
      } catch (mlError) {
        console.warn('🔍 DEBUG: ML pose detection failed, falling back to simplified approach:', mlError);
        console.warn('🔍 DEBUG: Error details:', mlError instanceof Error ? mlError.message : String(mlError));
        console.warn('🔍 DEBUG: Stack trace:', mlError instanceof Error ? mlError.stack : 'No stack trace');
      }
    }

    // Fallback: Use mock pose data when no imageUri or ML fails
    console.log('🔍 DEBUG: Using fallback pose detection...');

    // Fallback to simplified pose detection
    console.log('🔍 DEBUG: Using fallback pose detection...');
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;

    // Estimate body proportions (rough approximation)
    const shoulderWidth = screenWidth * 0.3;
    const bodyHeight = screenHeight * 0.6;
    const shoulderY = centerY - bodyHeight * 0.2;

    const landmarks: BodyLandmarks = {
      nose: { x: centerX, y: centerY - bodyHeight * 0.3 },
      leftShoulder: { x: centerX - shoulderWidth / 2, y: shoulderY },
      rightShoulder: { x: centerX + shoulderWidth / 2, y: shoulderY },
      leftElbow: { x: centerX - shoulderWidth / 2 - 30, y: shoulderY + 80 },
      rightElbow: { x: centerX + shoulderWidth / 2 + 30, y: shoulderY + 80 },
      leftWrist: { x: centerX - shoulderWidth / 2 - 20, y: shoulderY + 150 },
      rightWrist: { x: centerX + shoulderWidth / 2 + 20, y: shoulderY + 150 },
      leftHip: { x: centerX - shoulderWidth / 3, y: centerY + bodyHeight * 0.1 },
      rightHip: { x: centerX + shoulderWidth / 3, y: centerY + bodyHeight * 0.1 },
      leftKnee: { x: centerX - shoulderWidth / 4, y: centerY + bodyHeight * 0.3 },
      rightKnee: { x: centerX + shoulderWidth / 4, y: centerY + bodyHeight * 0.3 },
      leftAnkle: { x: centerX - shoulderWidth / 5, y: centerY + bodyHeight * 0.5 },
      rightAnkle: { x: centerX + shoulderWidth / 5, y: centerY + bodyHeight * 0.5 },
    };

    const boundingBox = {
      x: centerX - shoulderWidth / 2,
      y: centerY - bodyHeight * 0.4,
      width: shoulderWidth,
      height: bodyHeight
    };

    return { landmarks, boundingBox };
  } catch (error) {
    console.error('Error detecting body pose:', error);
    // Return null instead of throwing to allow fallback handling
    return null;
  }
}

// Measurement-based positioning functions
function applyMeasurementBasedPositioning(
  clothingCategory: string,
  landmarks: BodyLandmarks,
  imageDimensions: { width: number; height: number },
  userMeasurements?: any
): { position: { x: number; y: number }; scale: number } {
  if (!userMeasurements || !measurementConfig.enableMeasurementPositioning) {
    return { position: { x: 0, y: 0 }, scale: 1 };
  }

  const { leftShoulder, rightShoulder, leftHip, rightHip, nose } = landmarks;

  // Extract relevant measurements for positioning
  const userShoulderWidth = userMeasurements.shoulder || userMeasurements.shoulder_width || 16; // inches
  const userChest = userMeasurements.chest || 40; // inches
  const userWaist = userMeasurements.waist || 32; // inches
  const userHip = userMeasurements.hip || 38; // inches
  const userHeight = userMeasurements.height || 68; // inches

  // Calculate detected body proportions
  const detectedShoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const detectedHipWidth = Math.abs(rightHip.x - leftHip.x);
  const detectedTorsoHeight = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2);

  // Calculate positioning adjustments based on user measurements
  let positionOffset = { x: 0, y: 0 };
  let scaleAdjustment = 1;

  switch (clothingCategory) {
    case 'tops':
    case 'outerwear':
      // Adjust position based on shoulder width vs user measurement
      const shoulderRatio = detectedShoulderWidth / (userShoulderWidth * 10); // rough pixel conversion
      positionOffset.x = (detectedShoulderWidth - detectedShoulderWidth * shoulderRatio) * 0.5;
      positionOffset.y = (nose.y < (leftShoulder.y + rightShoulder.y) / 2) ?
        ((leftShoulder.y + rightShoulder.y) / 2 - nose.y) * 0.1 : 0;
      scaleAdjustment = Math.max(0.8, Math.min(1.2, shoulderRatio));
      break;

    case 'bottoms':
      // Adjust position based on hip width vs user measurement
      const hipRatio = detectedHipWidth / (userHip * 10);
      positionOffset.x = (detectedHipWidth - detectedHipWidth * hipRatio) * 0.5;
      positionOffset.y = detectedTorsoHeight * 0.1; // Slight downward adjustment
      scaleAdjustment = Math.max(0.8, Math.min(1.2, hipRatio));
      break;

    case 'dresses':
      // Comprehensive adjustment for full body garments
      const bodyRatio = Math.min(
        detectedShoulderWidth / (userShoulderWidth * 10),
        detectedHipWidth / (userHip * 10)
      );
      positionOffset.x = (detectedShoulderWidth - detectedShoulderWidth * bodyRatio) * 0.5;
      positionOffset.y = (nose.y < (leftShoulder.y + rightShoulder.y) / 2) ?
        ((leftShoulder.y + rightShoulder.y) / 2 - nose.y) * 0.05 : 0;
      scaleAdjustment = Math.max(0.8, Math.min(1.2, bodyRatio));
      break;
  }

  return {
    position: positionOffset,
    scale: scaleAdjustment
  };
}

// Function to calculate clothing overlay position based on body landmarks with enhanced measurement integration and anchor points
export function calculateClothingPosition(
  clothingCategory: string,
  landmarks: BodyLandmarks,
  imageDimensions: { width: number; height: number },
  userMeasurements?: any,
  anchorPoints?: Array<{ name: string; x: number; y: number; type: string }>
): ClothingOverlay['position'] & { scale: number; aspectRatio?: number } {
  const { leftShoulder, rightShoulder, leftHip, rightHip, nose } = landmarks;

  // Use user measurements for more realistic scaling if available
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const hipWidth = Math.abs(rightHip.x - leftHip.x);
  const torsoHeight = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2);

  // Apply measurement-based scaling if user measurements are provided
  let scaleMultiplier = 1;
  if (userMeasurements && measurementConfig.enableMeasurementScaling) {
    // Calculate scale based on user's actual measurements vs detected pose proportions
    const detectedShoulderWidth = shoulderWidth;
    const userShoulderWidth = userMeasurements.shoulder || userMeasurements.shoulder_width || 16; // inches, default average
    scaleMultiplier = detectedShoulderWidth / (userShoulderWidth * 10); // rough pixel conversion
  }

  // Ensure minimum scale to prevent clothing from being too small
  const minScale = 0.3;
  const maxScale = 2.0;
  scaleMultiplier = Math.max(minScale, Math.min(maxScale, scaleMultiplier));

  // Get measurement-based positioning adjustments
  const measurementAdjustments = applyMeasurementBasedPositioning(
    clothingCategory,
    landmarks,
    imageDimensions,
    userMeasurements
  );

  // If anchor points are provided, use them for precise positioning
  if (anchorPoints && anchorPoints.length > 0) {
    return calculateAnchorBasedPosition(
      anchorPoints,
      landmarks,
      imageDimensions,
      scaleMultiplier,
      measurementAdjustments
    );
  }

  switch (clothingCategory) {
    case 'tops':
    case 'outerwear':
      // Enhanced positioning using ML landmarks with smoothing
      const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
      const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;

      // Adjust Y position based on nose for better head clearance
      const headClearance = nose.y < shoulderCenterY ? (shoulderCenterY - nose.y) * 0.1 : 0;
      const adjustedY = shoulderCenterY - headClearance;

      // Calculate scale based on shoulder width with aspect ratio preservation
      const targetScale = shoulderWidth / imageDimensions.width;
      const topsAspectRatio = imageDimensions.width / imageDimensions.height;
      const finalScale = Math.max(minScale, Math.min(maxScale, targetScale * scaleMultiplier * measurementAdjustments.scale));
    
      return {
        x: shoulderCenterX - (imageDimensions.width * 0.5 * finalScale) + measurementAdjustments.position.x,
        y: adjustedY - (imageDimensions.height * 0.2 * finalScale) + measurementAdjustments.position.y,
        scale: finalScale,
        aspectRatio: topsAspectRatio
      };

    case 'bottoms':
      // Position at hips with improved accuracy and smoothing
      const hipCenterX = (leftHip.x + rightHip.x) / 2;
      const hipCenterY = (leftHip.y + rightHip.y) / 2;

      // Calculate scale based on hip width with aspect ratio preservation
      const hipScale = hipWidth / imageDimensions.width;
      const bottomsAspectRatio = imageDimensions.width / imageDimensions.height;
      const finalHipScale = Math.max(minScale, Math.min(maxScale, hipScale * scaleMultiplier * measurementAdjustments.scale));

      return {
        x: hipCenterX - (imageDimensions.width * 0.5 * finalHipScale) + measurementAdjustments.position.x,
        y: hipCenterY - (imageDimensions.height * 0.1 * finalHipScale) + measurementAdjustments.position.y,
        scale: finalHipScale,
        aspectRatio: bottomsAspectRatio
      };

    case 'dresses':
      // Full body positioning from shoulders to hips with enhanced accuracy
      const dressCenterX = (leftShoulder.x + rightShoulder.x) / 2;
      const dressTopY = (leftShoulder.y + rightShoulder.y) / 2;
      const dressBottomY = (leftHip.y + rightHip.y) / 2;
      const dressHeight = Math.abs(dressBottomY - dressTopY);

      // Calculate scale based on both width and height constraints with aspect ratio preservation
      const widthScale = shoulderWidth / imageDimensions.width;
      const heightScale = dressHeight / imageDimensions.height;
      const dressScale = Math.min(widthScale, heightScale);
      const dressesAspectRatio = imageDimensions.width / imageDimensions.height;
      const finalDressScale = Math.max(minScale, Math.min(maxScale, dressScale * scaleMultiplier * measurementAdjustments.scale));

      return {
        x: dressCenterX - (imageDimensions.width * 0.5 * finalDressScale) + measurementAdjustments.position.x,
        y: dressTopY - (imageDimensions.height * 0.05 * finalDressScale) + measurementAdjustments.position.y,
        scale: finalDressScale,
        aspectRatio: dressesAspectRatio
      };

    default:
      const defaultAspectRatio = imageDimensions.width / imageDimensions.height;
      return {
        x: screenWidth / 2 - (imageDimensions.width * scaleMultiplier) / 2,
        y: screenHeight / 2 - (imageDimensions.height * scaleMultiplier) / 2,
        scale: Math.max(minScale, Math.min(maxScale, scaleMultiplier)),
        aspectRatio: defaultAspectRatio
      };
  }
}

// Multi-layer clothing management functions
export function addClothingLayer(clothingItem: any, layerIndex: number = 0): ClothingLayer {
  const layer: ClothingLayer = {
    id: clothingItem.id,
    clothing: {
      id: clothingItem.id,
      imageUri: clothingItem.virtual_tryon_images?.[0] || clothingItem.images?.[0] || clothingItem.imageUri,
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      opacity: 0.85,
      category: clothingItem.category,
      layer: layerIndex,
      physics: createDefaultPhysicsForCategory(clothingItem.category)
    },
    zIndex: layerIndex,
    visible: true,
    physicsEnabled: physicsConfig.enablePhysics
  };

  // Insert at correct position or add to end
  const existingIndex = clothingLayers.findIndex(l => l.zIndex >= layerIndex);
  if (existingIndex >= 0) {
    clothingLayers.splice(existingIndex, 0, layer);
  } else {
    clothingLayers.push(layer);
  }

  // Reorder z-indices
  clothingLayers.forEach((l, index) => {
    l.zIndex = index;
    l.clothing.layer = index;
  });

  return layer;
}

export function removeClothingLayer(layerId: string): boolean {
  const index = clothingLayers.findIndex(layer => layer.id === layerId);
  if (index >= 0) {
    clothingLayers.splice(index, 1);
    // Reorder remaining layers
    clothingLayers.forEach((l, i) => {
      l.zIndex = i;
      l.clothing.layer = i;
    });
    return true;
  }
  return false;
}

export function updateClothingLayers(bodyPose: { landmarks: BodyLandmarks; boundingBox: any }, userMeasurements?: any): ClothingLayer[] {
  clothingLayers.forEach(layer => {
    if (layer.visible) {
      const imageDimensions = { width: 200, height: 300 }; // Placeholder dimensions
      const position = calculateClothingPosition(layer.clothing.category, bodyPose.landmarks, imageDimensions, userMeasurements);

      layer.clothing.position = { x: position.x, y: position.y };
      layer.clothing.scale = position.scale;

      // Apply physics simulation if enabled
      if (layer.physicsEnabled && layer.clothing.physics) {
        applyPhysicsToLayer(layer, bodyPose);
      }
    }
  });

  return clothingLayers;
}

function createDefaultPhysicsForCategory(category: string): ClothPhysics {
  const basePhysics: ClothPhysics = {
    stiffness: 0.7,
    damping: 0.8,
    gravity: physicsConfig.gravityStrength,
    windForce: { x: 0, y: 0 },
    deformationPoints: [],
    anchorPoints: []
  };

  switch (category) {
    case 'tops':
      return {
        ...basePhysics,
        stiffness: 0.6,
        anchorPoints: [
          { landmark: 'leftShoulder', offset: { x: -10, y: 0 } },
          { landmark: 'rightShoulder', offset: { x: 10, y: 0 } },
          { landmark: 'leftHip', offset: { x: -5, y: 20 } },
          { landmark: 'rightHip', offset: { x: 5, y: 20 } }
        ]
      };
    case 'bottoms':
      return {
        ...basePhysics,
        stiffness: 0.8,
        anchorPoints: [
          { landmark: 'leftHip', offset: { x: -15, y: 0 } },
          { landmark: 'rightHip', offset: { x: 15, y: 0 } },
          { landmark: 'leftKnee', offset: { x: -10, y: 30 } },
          { landmark: 'rightKnee', offset: { x: 10, y: 30 } }
        ]
      };
    case 'dresses':
      return {
        ...basePhysics,
        stiffness: 0.5,
        anchorPoints: [
          { landmark: 'leftShoulder', offset: { x: -8, y: 0 } },
          { landmark: 'rightShoulder', offset: { x: 8, y: 0 } },
          { landmark: 'leftHip', offset: { x: -12, y: 40 } },
          { landmark: 'rightHip', offset: { x: 12, y: 40 } }
        ]
      };
    case 'outerwear':
      return {
        ...basePhysics,
        stiffness: 0.9,
        anchorPoints: [
          { landmark: 'leftShoulder', offset: { x: -12, y: 0 } },
          { landmark: 'rightShoulder', offset: { x: 12, y: 0 } },
          { landmark: 'leftHip', offset: { x: -8, y: 25 } },
          { landmark: 'rightHip', offset: { x: 8, y: 25 } }
        ]
      };
    default:
      return basePhysics;
  }
}

function applyPhysicsToLayer(layer: ClothingLayer, bodyPose: { landmarks: BodyLandmarks; boundingBox: any }) {
  if (!layer.clothing.physics) return;

  const physics = layer.clothing.physics;
  const currentTime = Date.now();

  // Apply gravity effect
  if (physics.gravity > 0) {
    const gravityOffset = physics.gravity * 2;
    layer.clothing.position.y += gravityOffset;
  }

  // Apply wind force if enabled
  if (physicsConfig.windEnabled && physics.windForce) {
    layer.clothing.position.x += physics.windForce.x * 0.1;
    layer.clothing.position.y += physics.windForce.y * 0.1;
  }

  // Simulate cloth deformation based on anchor points
  physics.anchorPoints.forEach(anchor => {
    const landmarkPos = bodyPose.landmarks[anchor.landmark];
    if (landmarkPos) {
      const targetX = landmarkPos.x + anchor.offset.x;
      const targetY = landmarkPos.y + anchor.offset.y;

      // Apply spring physics towards anchor points
      const dx = targetX - layer.clothing.position.x;
      const dy = targetY - layer.clothing.position.y;

      const force = physics.stiffness;
      const damping = physics.damping;

      layer.clothing.position.x += dx * force * damping;
      layer.clothing.position.y += dy * force * damping;
    }
  });

  // Add subtle movement for realism
  const timeOffset = Math.sin(currentTime * 0.001) * 0.5;
  layer.clothing.position.x += timeOffset * (1 - physics.stiffness);
}

// Function to render clothing overlay on detected body with enhanced features
export async function renderClothingOverlay(
  clothingItem: any,
  bodyPose: { landmarks: BodyLandmarks; boundingBox: any } | null,
  imageDimensions: { width: number; height: number },
  userMeasurements?: any
): Promise<ClothingOverlay> {
  try {
    // Use virtual try-on images if available, otherwise fall back to regular images
    const imageUri = clothingItem.virtual_tryon_images?.[0] || clothingItem.images?.[0] || clothingItem.imageUri;

    // If no body pose is provided, use fallback positioning
    let position: { x: number; y: number; scale: number; aspectRatio?: number };
    if (bodyPose && bodyPose.landmarks) {
      position = calculateClothingPosition(clothingItem.category, bodyPose.landmarks, imageDimensions, userMeasurements);
    } else {
      // Fallback positioning - center the clothing on screen
      console.log('Using fallback positioning for clothing overlay');
      const centerX = screenWidth / 2;
      const centerY = screenHeight / 2;

      // Estimate reasonable scale based on screen size and clothing category
      let scale = 1;
      switch (clothingItem.category) {
        case 'tops':
        case 'outerwear':
          scale = Math.min(screenWidth / imageDimensions.width, screenHeight * 0.4 / imageDimensions.height);
          break;
        case 'bottoms':
          scale = Math.min(screenWidth / imageDimensions.width, screenHeight * 0.3 / imageDimensions.height);
          break;
        case 'dresses':
          scale = Math.min(screenWidth / imageDimensions.width, screenHeight * 0.6 / imageDimensions.height);
          break;
        default:
          scale = Math.min(screenWidth * 0.8 / imageDimensions.width, screenHeight * 0.8 / imageDimensions.height);
      }

      position = {
        x: centerX - (imageDimensions.width * scale) / 2,
        y: centerY - (imageDimensions.height * scale) / 2,
        scale: Math.max(0.3, Math.min(2.0, scale)),
        aspectRatio: imageDimensions.width / imageDimensions.height
      };
    }

    // Get anchor points from the clothing item if available
    const anchorPoints = clothingItem.virtual_tryon_anchor_points?.find(
      (ap: any) => ap.imageIndex === 0
    )?.anchorPoints || [];

    // Enhanced overlay with better transparency and positioning
    const overlay: ClothingOverlay = {
      id: clothingItem.id,
      imageUri: imageUri,
      position: { x: position.x, y: position.y },
      scale: position.scale,
      rotation: 0,
      opacity: 0.85, // Slightly higher opacity for better visibility
      category: clothingItem.category,
      layer: 0, // Default layer
      physics: createDefaultPhysicsForCategory(clothingItem.category),
      anchorPoints: anchorPoints,
      aspectRatio: position.aspectRatio
    };

    return overlay;
  } catch (error) {
    console.error('Error rendering clothing overlay:', error);
    // Return a basic overlay even on error
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    const fallbackScale = Math.min(screenWidth * 0.6 / imageDimensions.width, screenHeight * 0.6 / imageDimensions.height);

    return {
      id: clothingItem.id,
      imageUri: clothingItem.virtual_tryon_images?.[0] || clothingItem.images?.[0] || clothingItem.imageUri,
      position: {
        x: centerX - (imageDimensions.width * fallbackScale) / 2,
        y: centerY - (imageDimensions.height * fallbackScale) / 2
      },
      scale: Math.max(0.3, fallbackScale),
      rotation: 0,
      opacity: 0.7,
      category: clothingItem.category,
      layer: 0,
      physics: createDefaultPhysicsForCategory(clothingItem.category),
      anchorPoints: []
    };
  }
}

// Function to process image for better overlay transparency (basic image processing)
export async function processImageForOverlay(imageUri: string): Promise<string> {
  try {
    // In a full implementation, this would process the image to improve transparency
    // For now, return the original URI
    console.log('Processing image for overlay:', imageUri);
    return imageUri;
  } catch (error) {
    console.error('Error processing image for overlay:', error);
    return imageUri; // Return original on error
  }
}

// Function to save AR session result
export async function saveARResult(imageUri: string, filename: string) {
  try {
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: imageUri,
      to: fileUri,
    });
    return fileUri;
  } catch (error) {
    console.error('Error saving AR result:', error);
    throw error;
  }
}

// Function to calculate position based on anchor points
function calculateAnchorBasedPosition(
  anchorPoints: Array<{ name: string; x: number; y: number; type: string }>,
  landmarks: BodyLandmarks,
  imageDimensions: { width: number; height: number },
  scaleMultiplier: number,
  measurementAdjustments: { position: { x: number; y: number }; scale: number }
): ClothingOverlay['position'] & { scale: number } {
  if (anchorPoints.length === 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  // Group anchor points by type
  const anchorGroups = anchorPoints.reduce((groups, point) => {
    if (!groups[point.type]) {
      groups[point.type] = [];
    }
    groups[point.type].push(point);
    return groups;
  }, {} as Record<string, typeof anchorPoints>);

  // Calculate position based on anchor point types
  let totalOffsetX = 0;
  let totalOffsetY = 0;
  let totalScale = 0;
  let anchorCount = 0;

  Object.entries(anchorGroups).forEach(([type, points]) => {
    points.forEach(anchor => {
      // Map anchor point type to body landmark
      const landmarkKey = getLandmarkForAnchorType(type);
      if (landmarkKey && landmarks[landmarkKey]) {
        const landmark = landmarks[landmarkKey];

        // Calculate offset from anchor point to landmark
        const anchorOffsetX = landmark.x - (anchor.x / imageDimensions.width) * screenWidth;
        const anchorOffsetY = landmark.y - (anchor.y / imageDimensions.height) * screenHeight;

        totalOffsetX += anchorOffsetX;
        totalOffsetY += anchorOffsetY;
        totalScale += Math.sqrt(
          Math.pow(landmark.x - (anchor.x / imageDimensions.width) * screenWidth, 2) +
          Math.pow(landmark.y - (anchor.y / imageDimensions.height) * screenHeight, 2)
        );
        anchorCount++;
      }
    });
  });

  if (anchorCount === 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  // Average the offsets and scale
  const avgOffsetX = totalOffsetX / anchorCount;
  const avgOffsetY = totalOffsetY / anchorCount;
  const avgScale = totalScale / anchorCount;

  // Calculate final scale
  const baseScale = avgScale / Math.max(imageDimensions.width, imageDimensions.height);
  const finalScale = Math.max(0.3, Math.min(2.0, baseScale * scaleMultiplier * measurementAdjustments.scale));

  return {
    x: avgOffsetX + measurementAdjustments.position.x,
    y: avgOffsetY + measurementAdjustments.position.y,
    scale: finalScale
  };
}

// Helper function to map anchor types to body landmarks
function getLandmarkForAnchorType(anchorType: string): keyof BodyLandmarks | null {
  switch (anchorType) {
    case 'shoulder':
      return 'leftShoulder'; // Use left shoulder as reference, adjust as needed
    case 'hip':
      return 'leftHip';
    case 'neck':
      return 'nose'; // Closest approximation
    case 'waist':
      return 'leftHip'; // Approximation
    case 'arm':
      return 'leftElbow';
    case 'leg':
      return 'leftKnee';
    default:
      return null;
  }
}

// Function to check if AR is supported on the device
export function isARSupported() {
  // Enable 2D overlay AR
  return true;
}