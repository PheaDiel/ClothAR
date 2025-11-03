// src/modules/camera/CameraScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import { Button, Card, IconButton, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import { isARSupported, detectBodyPose, renderClothingOverlay, ClothingOverlay, initializeAR, BodyLandmarks, setPoseStabilityConfig, setPerspectiveCorrectionConfig, setMeasurementIntegrationConfig, setPhysicsConfig, addClothingLayer, removeClothingLayer, updateClothingLayers, ClothingLayer, physicsConfig } from '../../utils/arUtils';
import { ProductService } from '../../services/productService';
import { MeasurementService } from '../../services/measurementService';
import { wp, hp, rf, rw, rh } from '../../utils/responsiveUtils';
import VirtualTryOnTutorial, { shouldShowVirtualTryOnTutorial } from '../../components/VirtualTryOnTutorial';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CameraScreen() {
  const theme = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [isARMode, setIsARMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [bodyPose, setBodyPose] = useState<any>(null);
  const [clothingOverlay, setClothingOverlay] = useState<ClothingOverlay | null>(null);
  const [selectedClothing, setSelectedClothing] = useState<any>(null);
  const [selectedClothingDimensions, setSelectedClothingDimensions] = useState<{ width: number; height: number } | null>(null);
  const [clothingLayers, setClothingLayers] = useState<ClothingLayer[]>([]);
  const [multiLayerMode, setMultiLayerMode] = useState(false);
  const [clothingItems, setClothingItems] = useState<any[]>([]);
  const [arSettings, setArSettings] = useState({
    showGrid: false,
    showLandmarks: false,
    clothingOpacity: 0.8,
    enableRealTimePose: false,
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoadingPose, setIsLoadingPose] = useState(false);
  const [poseDetectionError, setPoseDetectionError] = useState<string | null>(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    processingTime: 0,
    lastFrameTime: Date.now(),
  });
  const [userMeasurements, setUserMeasurements] = useState<any>(null);
  const [measurementIntegrationStatus, setMeasurementIntegrationStatus] = useState<'loading' | 'loaded' | 'error' | 'none'>('none');

  // Animation values
  const controlsVisible = useSharedValue(1);
  const settingsPanelY = useSharedValue(screenHeight);
  const captureButtonScale = useSharedValue(1);
  const topControlsOpacity = useSharedValue(1);
  const bottomControlsOpacity = useSharedValue(1);

  const cameraRef = useRef<any>(null);
  const glViewRef = useRef<any>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const frameProcessingTimer = useRef<NodeJS.Timeout | null>(null);
  const frameCount = useRef(0);
  const lastFrameTime = useRef(Date.now());

  // Load clothing items from product service
  const loadClothingItems = async () => {
    try {
      const result = await ProductService.getProducts();
      if (result.success && result.products) {
        // Transform products to clothing items format
        const transformedItems = result.products.map(product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          images: product.images,
          virtual_tryon_images: product.virtual_tryon_images,
          price: product.base_price,
        }));
        setClothingItems(transformedItems);
      }
    } catch (error) {
      console.error('Error loading clothing items:', error);
      // Fallback to placeholder items
      setClothingItems([
        { id: '1', name: 'T-Shirt', category: 'tops', images: [], virtual_tryon_images: [], price: 29.99 },
        { id: '2', name: 'Jeans', category: 'bottoms', images: [], virtual_tryon_images: [], price: 59.99 },
        { id: '3', name: 'Dress', category: 'dresses', images: [], virtual_tryon_images: [], price: 89.99 },
        { id: '4', name: 'Jacket', category: 'outerwear', images: [], virtual_tryon_images: [], price: 119.99 },
      ]);
    }
  };

  const checkTutorialStatus = async () => {
    try {
      const shouldShow = await shouldShowVirtualTryOnTutorial();
      if (shouldShow) {
        setShowTutorial(true);
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    }
  };

  const loadUserMeasurements = async () => {
    try {
      setMeasurementIntegrationStatus('loading');
      const result = await MeasurementService.getDefaultMeasurement();

      if (result.success && result.measurement) {
        setUserMeasurements(result.measurement.measurements);
        setMeasurementIntegrationStatus('loaded');
        console.log('User measurements loaded for AR integration:', result.measurement.measurements);
      } else {
        setMeasurementIntegrationStatus('none');
        console.log('No default measurements found for user');
      }
    } catch (error) {
      console.error('Error loading user measurements:', error);
      setMeasurementIntegrationStatus('error');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // Request camera permissions
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');

        // Lock screen orientation to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

        // Check if AR is supported on this device
        const arSupported = isARSupported();
        setIsARMode(arSupported);

        // Initialize controls visibility and start auto-hide timer
        controlsVisible.value = withTiming(1, { duration: 500 });
        startAutoHideTimer();
      
        // Load clothing items from product service
        loadClothingItems();

        // Check if tutorial should be shown
        checkTutorialStatus();

        // Load user measurements for AR integration
        loadUserMeasurements();

        // Configure enhanced AR features
        setPoseStabilityConfig({
          smoothingFactor: 0.7,
          confidenceThreshold: 0.5,
          maxJitterThreshold: 10,
          temporalWindowSize: 5,
        });

        setPerspectiveCorrectionConfig({
          enableAngleCompensation: true,
          enableOrientationNormalization: true,
          enableDistanceScaling: true,
          referenceDistance: 2.0,
          maxCorrectionAngle: 45,
        });

        setMeasurementIntegrationConfig({
          enableMeasurementScaling: true,
          enableMeasurementPositioning: true,
          measurementConfidence: 0.8,
          fallbackToStandardSizing: true,
        });

        setPhysicsConfig({
          enablePhysics: true,
          gravityStrength: 0.3,
          windEnabled: false,
          clothStiffness: 0.7,
          simulationSteps: 3,
          maxLayers: 3,
        });
      } catch (error) {
        Alert.alert('Error', `Camera initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    return () => {
      // Cleanup
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Auto-hide controls after 3 seconds of inactivity
  const startAutoHideTimer = () => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      controlsVisible.value = withTiming(0.3, { duration: 500 });
    }, 3000);
  };

  const showControls = () => {
    controlsVisible.value = withTiming(1, { duration: 300 });
    startAutoHideTimer();
  };

  const toggleCameraType = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
    showControls(); // Show controls when interacting
  };

  const toggleFlashMode = () => {
    // Cycle through flash modes: off -> on -> auto -> off
    const modes: ('off' | 'on' | 'auto')[] = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
    showControls(); // Show controls when interacting
  };

  const handleCapture = async () => {
    if (cameraRef.current && isARMode) {
      setIsLoading(true);
      captureButtonScale.value = withSpring(0.9, {}, () => {
        captureButtonScale.value = withSpring(1);
      });
      
      try {
        Alert.alert('AR Capture', 'In a full implementation, this would capture an image and process it with AR to show how clothing would look on you.');
      } catch (error) {
        Alert.alert('Error', 'Failed to capture image');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCameraReady = () => {
    setCameraReady(true);
    // Start frame processing when camera is ready and real-time pose is enabled
    if (isARMode && arSettings.enableRealTimePose) {
      startFrameProcessing();
    }
  };

  // Function to start real-time frame processing
  const startFrameProcessing = () => {
    if (frameProcessingTimer.current) {
      clearInterval(frameProcessingTimer.current);
    }

    frameProcessingTimer.current = setInterval(async () => {
      if (!isProcessingFrame && cameraRef.current && isARMode && arSettings.enableRealTimePose) {
        await processCameraFrame();
      }
    }, 500); // Slower interval for smoother demo performance
  };

  // Function to process camera frame for pose detection
  const processCameraFrame = async () => {
    if (isProcessingFrame) return;

    console.log('🔍 DEBUG: processCameraFrame called');
    setIsProcessingFrame(true);
    const startTime = Date.now();

    try {
      console.log('🔍 DEBUG: Taking picture from camera...');
      // Capture frame from camera (using takePictureAsync for processing)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3, // Lower quality for faster processing while maintaining accuracy
        base64: false,
        exif: false,
      });
      console.log('🔍 DEBUG: Photo captured, URI:', photo.uri);

      console.log('🔍 DEBUG: Processing captured frame for pose detection...');
      // Process the captured frame for pose detection
      const poseResult = await detectBodyPose(photo.uri);
      console.log('🔍 DEBUG: Pose detection completed, landmarks count:', Object.keys(poseResult.landmarks).length);

      // Enhanced pose processing is now handled in arUtils.ts
      // The pose state is updated there with advanced stability features

      // Update overlay if clothing is selected (single layer mode)
      if (selectedClothing && !multiLayerMode) {
        const targetUri = selectedClothing.virtual_tryon_images?.[0] || selectedClothing.images?.[0] || selectedClothing.imageUri;
        let dims = selectedClothingDimensions;
        if (!dims && targetUri) {
          try {
            dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
              Image.getSize(
                targetUri,
                (w, h) => resolve({ width: w, height: h }),
                (e) => resolve({ width: 200, height: 300 })
              );
            });
            setSelectedClothingDimensions(dims);
          } catch {}
        }
        const imageDimensions = dims || { width: 200, height: 300 };
        const overlay = await renderClothingOverlay(selectedClothing, poseResult, imageDimensions, userMeasurements);
        setClothingOverlay(overlay);
      }

      // Update multi-layer clothing if in multi-layer mode
      if (multiLayerMode) {
        const updatedLayers = updateClothingLayers(poseResult, userMeasurements);
        setClothingLayers(updatedLayers);
      }

      // Update performance metrics
      const processingTime = Date.now() - startTime;
      frameCount.current++;
      const currentTime = Date.now();
      const timeDiff = currentTime - lastFrameTime.current;

      if (timeDiff >= 1000) { // Update FPS every second
        const fps = Math.round((frameCount.current * 1000) / timeDiff);
        setPerformanceMetrics({
          fps,
          processingTime,
          lastFrameTime: currentTime,
        });
        frameCount.current = 0;
        lastFrameTime.current = currentTime;
      }

    } catch (error) {
      console.error('🔍 DEBUG: Error processing camera frame:', error);
      console.error('🔍 DEBUG: Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('🔍 DEBUG: Error message:', error instanceof Error ? error.message : String(error));
      console.error('🔍 DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setPoseDetectionError('Failed to process camera frame');
    } finally {
      console.log('🔍 DEBUG: processCameraFrame completed');
      setIsProcessingFrame(false);
    }
  };

  const toggleControls = () => {
    if (controlsVisible.value < 0.5) {
      showControls();
    } else {
      controlsVisible.value = withTiming(0.3, { duration: 300 });
    }
  };

  const toggleSettingsPanel = () => {
    const isVisible = settingsPanelY.value < screenHeight * 0.8;
    const toValue = isVisible ? screenHeight : screenHeight * 0.3;
    
    settingsPanelY.value = withSpring(toValue, {
      damping: 20,
      stiffness: 200,
    });
  };

  const selectClothingItem = async (item: any) => {
    setSelectedClothing(item);
    setIsLoading(true);
    setIsLoadingPose(true);
    setPoseDetectionError(null);

    try {
      if (multiLayerMode) {
        // Add to multi-layer system
        const layerIndex = clothingLayers.length;
        const newLayer = addClothingLayer(item, layerIndex);
        setClothingLayers(prev => [...prev, newLayer]);
      } else {
        // Single layer mode
        // If real-time processing is not active, do a one-time pose detection
        if (!isARMode || !frameProcessingTimer.current) {
          const pose = await detectBodyPose();
          setBodyPose(pose);

          // Calculate overlay position based on body pose with measurement integration
          const targetUri = item.virtual_tryon_images?.[0] || item.images?.[0] || item.imageUri;
          let dims = null as { width: number; height: number } | null;
          if (targetUri) {
            try {
              dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
                Image.getSize(
                  targetUri,
                  (w, h) => resolve({ width: w, height: h }),
                  (e) => resolve({ width: 200, height: 300 })
                );
              });
              setSelectedClothingDimensions(dims);
            } catch {}
          }
          const imageDimensions = dims || { width: 200, height: 300 };
          const overlay = await renderClothingOverlay(item, pose, imageDimensions, userMeasurements);
          setClothingOverlay(overlay);
        }
        // If real-time processing is active, overlay will be updated automatically
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply clothing overlay';
      setPoseDetectionError(errorMessage);
      Alert.alert('Error', errorMessage);
      console.error('Error selecting clothing item:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingPose(false);
    }
  };

  const toggleMultiLayerMode = () => {
    setMultiLayerMode(!multiLayerMode);
    if (!multiLayerMode) {
      // Switching to multi-layer mode
      setClothingOverlay(null);
      setSelectedClothing(null);
    } else {
      // Switching to single layer mode
      setClothingLayers([]);
    }
    showControls();
  };

  const removeLayer = (layerId: string) => {
    const success = removeClothingLayer(layerId);
    if (success) {
      setClothingLayers(prev => prev.filter(layer => layer.id !== layerId));
    }
  };

  const toggleArSetting = (setting: string) => {
    const newSettings = {
      ...arSettings,
      [setting]: !arSettings[setting as keyof typeof arSettings]
    };
    setArSettings(newSettings);

    // Handle real-time pose detection toggle
    if (setting === 'enableRealTimePose') {
      if (newSettings.enableRealTimePose && isARMode && cameraReady) {
        startFrameProcessing();
      } else {
        if (frameProcessingTimer.current) {
          clearInterval(frameProcessingTimer.current);
          frameProcessingTimer.current = null;
        }
      }
    }
  };

  // Animated styles with semi-transparency
  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(controlsVisible.value, [0, 1], [0, 0.85]),
    transform: [
      {
        scale: interpolate(controlsVisible.value, [0, 1], [0.9, 1])
      }
    ]
  }));

  const topControlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: topControlsOpacity.value,
    transform: [
      {
        translateY: interpolate(topControlsOpacity.value, [0, 1], [-50, 0])
      }
    ]
  }));

  const bottomControlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bottomControlsOpacity.value,
    transform: [
      {
        translateY: interpolate(bottomControlsOpacity.value, [0, 1], [50, 0])
      }
    ]
  }));

  const captureButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureButtonScale.value }]
  }));

  const settingsPanelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settingsPanelY.value }]
  }));

  // Initialize body pose detection when AR mode is enabled
  useEffect(() => {
    console.log('🔍 DEBUG: AR initialization useEffect triggered');
    console.log('🔍 DEBUG: isARMode:', isARMode, 'cameraReady:', cameraReady);

    if (isARMode && cameraReady) {
      const initializePoseDetection = async () => {
        try {
          console.log('🔍 DEBUG: Initializing AR pose detection...');
          // Initialize ML pose detection
          await initializeAR();
          console.log('🔍 DEBUG: AR pose detection initialized successfully');

          // Start frame processing if real-time pose is enabled
          if (arSettings.enableRealTimePose) {
            console.log('🔍 DEBUG: Starting frame processing...');
            startFrameProcessing();
          }
        } catch (error) {
          console.error('🔍 DEBUG: Error initializing pose detection:', error);
          console.error('🔍 DEBUG: Error details:', error instanceof Error ? error.message : String(error));
        }
      };
      initializePoseDetection();
    } else {
      console.log('🔍 DEBUG: Stopping frame processing (AR mode disabled or camera not ready)');
      // Stop frame processing when AR mode is disabled or real-time pose is disabled
      if (frameProcessingTimer.current) {
        clearInterval(frameProcessingTimer.current);
        frameProcessingTimer.current = null;
      }
    }

    return () => {
      console.log('🔍 DEBUG: Cleanup: clearing frame processing timer');
      if (frameProcessingTimer.current) {
        clearInterval(frameProcessingTimer.current);
      }
    };
  }, [isARMode, cameraReady, arSettings.enableRealTimePose]);

  if (hasPermission === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <View style={styles.centerContainer}>
          <Text style={[styles.text, { color: theme.colors.onBackground }]}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <View style={styles.centerContainer}>
          <Text style={[styles.text, { color: theme.colors.onBackground }]}>No access to camera</Text>
          <Button 
            mode="contained" 
            onPress={() => Camera.requestCameraPermissionsAsync()}
            style={styles.button}
            buttonColor={theme.colors.primary}
          >
            Grant Permission
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        flash={flashMode}
        onCameraReady={handleCameraReady}
        ratio="4:3"
      >
        {/* Single layer clothing overlay */}
        {isARMode && cameraReady && clothingOverlay && !multiLayerMode && (
          <Animated.View
            style={[
              styles.clothingOverlay,
              {
                left: clothingOverlay.position.x,
                top: clothingOverlay.position.y,
                width: 200 * clothingOverlay.scale,
                height: 300 * clothingOverlay.scale,
                transform: [
                  { rotate: `${clothingOverlay.rotation}deg` }
                ],
                opacity: clothingOverlay.opacity,
              }
            ]}
          >
            <Image
              source={{ uri: clothingOverlay.imageUri }}
              style={styles.overlayImage}
              resizeMode="contain"
            />
          </Animated.View>
        )}

        {/* Multi-layer clothing overlays */}
        {isARMode && cameraReady && multiLayerMode && clothingLayers.map((layer) => (
          layer.visible && (
            <Animated.View
              key={layer.id}
              style={[
                styles.clothingOverlay,
                {
                  left: layer.clothing.position.x,
                  top: layer.clothing.position.y,
                  width: 200 * layer.clothing.scale,
                  height: 300 * layer.clothing.scale,
                  transform: [
                    { rotate: `${layer.clothing.rotation}deg` }
                  ],
                  opacity: layer.clothing.opacity,
                  zIndex: layer.zIndex,
                }
              ]}
            >
              <Image
                source={{ uri: layer.clothing.imageUri }}
                style={styles.overlayImage}
                resizeMode="contain"
              />
              {/* Remove button for multi-layer mode */}
              <TouchableOpacity
                style={styles.removeLayerButton}
                onPress={() => removeLayer(layer.id)}
              >
                <Ionicons name="close-circle" size={rf(20)} color="red" />
              </TouchableOpacity>
            </Animated.View>
          )
        ))}

        {/* Body pose landmarks visualization */}
        {isARMode && arSettings.showLandmarks && bodyPose && (
          <View style={styles.landmarksContainer}>
            {Object.entries(bodyPose.landmarks).map(([key, landmark]: [string, any]) => (
              <View
                key={key}
                style={[
                  styles.landmark,
                  { left: landmark.x - 3, top: landmark.y - 3 }
                ]}
              />
            ))}
          </View>
        )}

        {/* Performance metrics overlay */}
        {isARMode && arSettings.showLandmarks && (
          <View style={styles.performanceOverlay}>
            <Text style={styles.performanceText}>
              FPS: {performanceMetrics.fps} | Processing: {performanceMetrics.processingTime}ms
            </Text>
            {poseDetectionError && (
              <Text style={[styles.performanceText, { color: 'red' }]}>
                Error: {poseDetectionError}
              </Text>
            )}
            {/* Measurement integration status */}
            <Text style={[styles.performanceText, {
              color: measurementIntegrationStatus === 'loaded' ? 'green' :
                     measurementIntegrationStatus === 'error' ? 'red' : 'yellow'
            }]}>
              Measurements: {measurementIntegrationStatus === 'loaded' ? 'Active' :
                            measurementIntegrationStatus === 'error' ? 'Error' :
                            measurementIntegrationStatus === 'loading' ? 'Loading' : 'None'}
            </Text>
          </View>
        )}

        {/* Touch overlay to toggle controls */}
        <TapGestureHandler onActivated={toggleControls}>
          <Animated.View style={styles.touchOverlay} />
        </TapGestureHandler>

        {/* Top Controls Bar - Simplified and Semi-transparent */}
        <Animated.View style={[styles.topControlsBar, controlsAnimatedStyle]}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: `${theme.colors.surface}99` }]}
            onPress={toggleCameraType}
          >
            <Ionicons name="camera-reverse" size={rf(20)} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: `${theme.colors.surface}99` }]}
            onPress={toggleFlashMode}
          >
            <Ionicons
              name={
                flashMode === 'off' ? 'flash-off' :
                flashMode === 'on' ? 'flash' :
                'flash-outline'
              }
              size={rf(20)}
              color={flashMode === 'off' ? theme.colors.onSurface : theme.colors.primary}
            />
          </TouchableOpacity>

          {isARMode && (
            <>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: `${theme.colors.surface}99` }]}
                onPress={toggleMultiLayerMode}
              >
                <Ionicons
                  name={multiLayerMode ? "layers" : "layers-outline"}
                  size={rf(20)}
                  color={multiLayerMode ? theme.colors.primary : theme.colors.onSurface}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: `${theme.colors.surface}99` }]}
                onPress={toggleSettingsPanel}
              >
                <Ionicons name="options-outline" size={rf(20)} color={theme.colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Bottom Controls Bar - Cleaner Design */}
        <Animated.View style={[styles.bottomControlsBar, controlsAnimatedStyle]}>
          {/* AR Mode Indicator - Smaller and more subtle */}
          {isARMode && (
            <View style={[styles.arIndicator, { backgroundColor: `${theme.colors.surface}99` }]}>
              <Text style={[styles.arIndicatorText, { color: theme.colors.primary }]}>
                {multiLayerMode ? 'AR Multi' : 'AR'}
              </Text>
            </View>
          )}

          {/* Main Capture Button */}
          <Animated.View style={captureButtonAnimatedStyle}>
            <TouchableOpacity
              style={[styles.captureButton, { backgroundColor: `${theme.colors.surface}EE`, borderColor: theme.colors.primary }]}
              onPress={() => {
                handleCapture();
                showControls();
              }}
              disabled={isLoading}
            >
              <View style={[styles.captureButtonInner, { backgroundColor: theme.colors.primary }]}>
                <Ionicons
                  name={isARMode ? 'play' : 'camera'}
                  size={rf(28)}
                  color={theme.colors.surface}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Gallery/Recent Button */}
          <TouchableOpacity
            style={[styles.galleryButton, { backgroundColor: `${theme.colors.surface}99` }]}
            onPress={showControls}
          >
            <Ionicons name="images-outline" size={rf(20)} color={theme.colors.primary} />
          </TouchableOpacity>
        </Animated.View>
      </CameraView>

      {/* Modern Settings Panel */}
      <Animated.View style={[styles.settingsPanel, { backgroundColor: theme.colors.surface }, settingsPanelAnimatedStyle]}>
        <View style={[styles.settingsHandle, { backgroundColor: theme.colors.outline }]} />
        
        <View style={styles.settingsHeader}>
          <Text style={[styles.settingsTitle, { color: theme.colors.onSurface }]}>Camera Settings</Text>
          <IconButton
            icon="close"
            size={rf(24)}
            onPress={toggleSettingsPanel}
            iconColor={theme.colors.onSurface}
          />
        </View>

        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
          {/* Clothing Selector */}
          <View style={styles.settingSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Virtual Clothing</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clothingScroll}>
              {clothingItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.clothingChip,
                    { backgroundColor: theme.colors.surfaceVariant },
                    selectedClothing?.id === item.id && { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={() => selectClothingItem(item)}
                >
                  {item.images && item.images.length > 0 ? (
                    <Image
                      source={{ uri: item.images[0] }}
                      style={styles.clothingImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.colorDot, { backgroundColor: theme.colors.primary }]} />
                  )}
                  <Text style={[
                    styles.clothingChipText,
                    { color: selectedClothing?.id === item.id ? theme.colors.surface : theme.colors.onSurface }
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={[
                    styles.priceText,
                    { color: selectedClothing?.id === item.id ? theme.colors.surface : theme.colors.onSurfaceVariant }
                  ]}>
                    ${item.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* AR Settings */}
          {isARMode && (
            <View style={styles.settingSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>AR Options</Text>
              <View style={[styles.arOptions, { backgroundColor: theme.colors.surfaceVariant }]}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => toggleArSetting('showGrid')}
                >
                  <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>Show Grid</Text>
                  <Ionicons
                    name={arSettings.showGrid ? 'checkbox' : 'square-outline'}
                    size={rf(24)}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => toggleArSetting('showLandmarks')}
                >
                  <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>Show Landmarks</Text>
                  <Ionicons
                    name={arSettings.showLandmarks ? 'checkbox' : 'square-outline'}
                    size={rf(24)}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => toggleArSetting('enableRealTimePose')}
                >
                  <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>Real-time Pose Detection</Text>
                  <Ionicons
                    name={arSettings.enableRealTimePose ? 'checkbox' : 'square-outline'}
                    size={rf(24)}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>

                {/* Physics Settings */}
                <View style={styles.settingSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Physics Simulation</Text>
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => setPhysicsConfig({ enablePhysics: !physicsConfig.enablePhysics })}
                  >
                    <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>Enable Physics</Text>
                    <Ionicons
                      name={physicsConfig.enablePhysics ? 'checkbox' : 'square-outline'}
                      size={rf(24)}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => setPhysicsConfig({ windEnabled: !physicsConfig.windEnabled })}
                  >
                    <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>Wind Effects</Text>
                    <Ionicons
                      name={physicsConfig.windEnabled ? 'checkbox' : 'square-outline'}
                      size={rf(24)}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Loading Overlay */}
      {!cameraReady && (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.backdrop }]}>
          <Text style={[styles.loadingText, { color: theme.colors.surface }]}>Loading camera...</Text>
        </View>
      )}

      {/* Pose Detection Loading */}
      {isLoadingPose && (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.backdrop }]}>
          <Text style={[styles.loadingText, { color: theme.colors.surface }]}>
            Detecting body pose...
          </Text>
        </View>
      )}

      {/* Virtual Try-On Tutorial */}
      <VirtualTryOnTutorial
        visible={showTutorial}
        onComplete={() => setShowTutorial(false)}
        onSkip={() => setShowTutorial(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  text: {
    fontSize: rf(16),
    textAlign: 'center',
    marginVertical: hp(2),
  },
  camera: {
    flex: 1,
  },
  clothingOverlay: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  overlayImage: {
    width: '100%',
    height: '100%',
  },
  landmarksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  landmark: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'red',
    borderWidth: 1,
    borderColor: 'white',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topControlsBar: {
    position: 'absolute',
    top: hp(6),
    left: wp(4),
    right: wp(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomControlsBar: {
    position: 'absolute',
    bottom: hp(8),
    left: wp(4),
    right: wp(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  captureButton: {
    width: rw(70),
    height: rw(70),
    borderRadius: rw(35),
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  captureButtonInner: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  arIndicator: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
    borderRadius: rw(15),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  arIndicatorText: {
    fontSize: rf(12),
    fontWeight: '600',
  },
  settingsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.7,
    borderTopLeftRadius: rw(24),
    borderTopRightRadius: rw(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  settingsHandle: {
    width: rw(40),
    height: rh(4),
    borderRadius: rh(2),
    alignSelf: 'center',
    marginTop: hp(1),
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  settingsTitle: {
    fontSize: rf(20),
    fontWeight: 'bold',
  },
  settingsContent: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  settingSection: {
    marginBottom: hp(4),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: '600',
    marginBottom: hp(2),
  },
  clothingScroll: {
    marginBottom: hp(1),
  },
  clothingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rw(20),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    marginRight: wp(2),
  },
  colorDot: {
    width: rw(12),
    height: rw(12),
    borderRadius: rw(6),
    marginRight: wp(2),
  },
  clothingChipText: {
    fontSize: rf(14),
    fontWeight: '500',
  },
  clothingImage: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(6),
    marginBottom: hp(0.5),
  },
  priceText: {
    fontSize: rf(12),
    fontWeight: '400',
    marginTop: hp(0.2),
  },
  arOptions: {
    borderRadius: rw(12),
    padding: wp(3),
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(2),
  },
  optionText: {
    fontSize: rf(16),
  },
  button: {
    marginVertical: hp(2),
    width: '80%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: rf(18),
  },
  performanceOverlay: {
    position: 'absolute',
    top: hp(2),
    right: wp(2),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: rw(8),
  },
  performanceText: {
    color: 'white',
    fontSize: rf(10),
    fontWeight: '500',
  },
  removeLayerButton: {
    position: 'absolute',
    top: hp(0.5),
    right: wp(0.5),
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: rw(10),
    padding: wp(0.5),
  },
});
