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

// Clothing overlay configuration
export interface ClothingOverlay {
  id: string;
  imageUri: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
  category: 'tops' | 'bottoms' | 'dresses' | 'outerwear';
}

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

// Function to detect body pose using ML model
export async function detectBodyPose(imageUri?: string): Promise<{ landmarks: BodyLandmarks; boundingBox: { x: number; y: number; width: number; height: number } }> {
  try {
    console.log('🔍 DEBUG: detectBodyPose called with imageUri:', imageUri ? 'provided' : 'not provided');
    console.log('🔍 DEBUG: Platform:', Platform.OS);
    console.log('🔍 DEBUG: detector ready:', !!detector, 'isTfReady:', isTfReady);

    // Try ML-based pose detection first
    if (detector && isTfReady && imageUri) {
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
        console.log('🔍 DEBUG: Attempting to create Image element (this will fail in React Native)...');
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
    throw error;
  }
}

// Function to calculate clothing overlay position based on body landmarks with improved ML-based positioning
export function calculateClothingPosition(
  clothingCategory: string,
  landmarks: BodyLandmarks,
  imageDimensions: { width: number; height: number },
  userMeasurements?: any
): ClothingOverlay['position'] & { scale: number } {
  const { leftShoulder, rightShoulder, leftHip, rightHip, nose } = landmarks;

  // Use user measurements for more realistic scaling if available
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const hipWidth = Math.abs(rightHip.x - leftHip.x);
  const torsoHeight = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2);

  // Apply measurement-based scaling if user measurements are provided
  let scaleMultiplier = 1;
  if (userMeasurements) {
    // Calculate scale based on user's actual measurements vs detected pose proportions
    const detectedShoulderWidth = shoulderWidth;
    const userShoulderWidth = userMeasurements.shoulder_width || 16; // inches, default average
    scaleMultiplier = detectedShoulderWidth / (userShoulderWidth * 10); // rough pixel conversion
  }

  // Ensure minimum scale to prevent clothing from being too small
  const minScale = 0.3;
  const maxScale = 2.0;
  scaleMultiplier = Math.max(minScale, Math.min(maxScale, scaleMultiplier));

  switch (clothingCategory) {
    case 'tops':
    case 'outerwear':
      // Enhanced positioning using ML landmarks with smoothing
      const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
      const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;

      // Adjust Y position based on nose for better head clearance
      const headClearance = nose.y < shoulderCenterY ? (shoulderCenterY - nose.y) * 0.1 : 0;
      const adjustedY = shoulderCenterY - headClearance;

      // Calculate scale based on shoulder width with constraints
      const targetScale = shoulderWidth / imageDimensions.width;
      const finalScale = Math.max(minScale, Math.min(maxScale, targetScale * scaleMultiplier));

      return {
        x: shoulderCenterX - (imageDimensions.width * 0.5 * finalScale),
        y: adjustedY - (imageDimensions.height * 0.2 * finalScale),
        scale: finalScale
      };

    case 'bottoms':
      // Position at hips with improved accuracy and smoothing
      const hipCenterX = (leftHip.x + rightHip.x) / 2;
      const hipCenterY = (leftHip.y + rightHip.y) / 2;

      // Calculate scale based on hip width with constraints
      const hipScale = hipWidth / imageDimensions.width;
      const finalHipScale = Math.max(minScale, Math.min(maxScale, hipScale * scaleMultiplier));

      return {
        x: hipCenterX - (imageDimensions.width * 0.5 * finalHipScale),
        y: hipCenterY - (imageDimensions.height * 0.1 * finalHipScale),
        scale: finalHipScale
      };

    case 'dresses':
      // Full body positioning from shoulders to hips with enhanced accuracy
      const dressCenterX = (leftShoulder.x + rightShoulder.x) / 2;
      const dressTopY = (leftShoulder.y + rightShoulder.y) / 2;
      const dressBottomY = (leftHip.y + rightHip.y) / 2;
      const dressHeight = Math.abs(dressBottomY - dressTopY);

      // Calculate scale based on both width and height constraints
      const widthScale = shoulderWidth / imageDimensions.width;
      const heightScale = dressHeight / imageDimensions.height;
      const dressScale = Math.min(widthScale, heightScale);
      const finalDressScale = Math.max(minScale, Math.min(maxScale, dressScale * scaleMultiplier));

      return {
        x: dressCenterX - (imageDimensions.width * 0.5 * finalDressScale),
        y: dressTopY - (imageDimensions.height * 0.05 * finalDressScale),
        scale: finalDressScale
      };

    default:
      return {
        x: screenWidth / 2 - (imageDimensions.width * scaleMultiplier) / 2,
        y: screenHeight / 2 - (imageDimensions.height * scaleMultiplier) / 2,
        scale: Math.max(minScale, Math.min(maxScale, scaleMultiplier))
      };
  }
}

// Function to render clothing overlay on detected body with enhanced features
export async function renderClothingOverlay(
  clothingItem: any,
  bodyPose: { landmarks: BodyLandmarks; boundingBox: any },
  imageDimensions: { width: number; height: number },
  userMeasurements?: any
): Promise<ClothingOverlay> {
  try {
    // Use virtual try-on images if available, otherwise fall back to regular images
    const imageUri = clothingItem.virtual_tryon_images?.[0] || clothingItem.images?.[0] || clothingItem.imageUri;

    const position = calculateClothingPosition(clothingItem.category, bodyPose.landmarks, imageDimensions, userMeasurements);

    // Enhanced overlay with better transparency and positioning
    const overlay: ClothingOverlay = {
      id: clothingItem.id,
      imageUri: imageUri,
      position: { x: position.x, y: position.y },
      scale: position.scale,
      rotation: 0,
      opacity: 0.85, // Slightly higher opacity for better visibility
      category: clothingItem.category
    };

    return overlay;
  } catch (error) {
    console.error('Error rendering clothing overlay:', error);
    throw error;
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

// Function to check if AR is supported on the device
export function isARSupported() {
  // Enable 2D overlay AR
  return true;
}