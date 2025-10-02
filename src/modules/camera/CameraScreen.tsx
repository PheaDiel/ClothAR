// src/modules/camera/CameraScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import { Button, Card, IconButton, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import { isARSupported } from '../../utils/arUtils';
import { wp, hp, rf, rw, rh } from '../../utils/responsiveUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CameraScreen() {
  const theme = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [isARMode, setIsARMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [arRenderer, setArRenderer] = useState<any>(null);
  const [scene, setScene] = useState<any>(null);
  const [camera, setCamera] = useState<any>(null);
  const [clothingModel, setClothingModel] = useState<any>(null);
  const [selectedClothing, setSelectedClothing] = useState<any>(null);
  const [clothingItems, setClothingItems] = useState([
    { id: 1, name: 'T-Shirt', category: 'tops', color: theme.colors.primary },
    { id: 2, name: 'Jeans', category: 'bottoms', color: theme.colors.secondary },
    { id: 3, name: 'Dress', category: 'dresses', color: theme.colors.tertiary },
    { id: 4, name: 'Jacket', category: 'outerwear', color: '#FF6B6B' },
  ]);
  const [arSettings, setArSettings] = useState({
    showGrid: false,
    showLandmarks: false,
    clothingOpacity: 1.0,
  });

  // Animation values
  const controlsVisible = useSharedValue(1);
  const settingsPanelY = useSharedValue(screenHeight);
  const captureButtonScale = useSharedValue(1);
  const topControlsOpacity = useSharedValue(1);
  const bottomControlsOpacity = useSharedValue(1);

  const cameraRef = useRef<any>(null);
  const glViewRef = useRef<any>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

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

  const selectClothingItem = (item: any) => {
    setSelectedClothing(item);
    if (clothingModel) {
      const material = new THREE.MeshBasicMaterial({ color: item.color });
      clothingModel.material = material;
    }
  };

  const toggleArSetting = (setting: string) => {
    setArSettings({
      ...arSettings,
      [setting]: !arSettings[setting as keyof typeof arSettings]
    });
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

  const setupARScene = (gl: any) => {
    try {
      const renderer = new THREE.WebGLRenderer({ context: gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      setArRenderer(renderer);

      const newScene = new THREE.Scene();
      setScene(newScene);

      const newCamera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      setCamera(newCamera);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      newScene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(0, 1, 0);
      newScene.add(directionalLight);

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: theme.colors.primary });
      const cube = new THREE.Mesh(geometry, material);
      newScene.add(cube);
      setClothingModel(cube);

      const animate = () => {
        requestAnimationFrame(animate);

        if (cube) {
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;
        }

        renderer.render(newScene, newCamera);
      };

      animate();
    } catch (error) {
      Alert.alert('AR Error', `Failed to setup AR: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

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
        {isARMode && cameraReady && (
          <GLView
            ref={glViewRef}
            style={styles.arView}
            onContextCreate={(gl) => setupARScene(gl)}
          />
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
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: `${theme.colors.surface}99` }]}
              onPress={toggleSettingsPanel}
            >
              <Ionicons name="options-outline" size={rf(20)} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Bottom Controls Bar - Cleaner Design */}
        <Animated.View style={[styles.bottomControlsBar, controlsAnimatedStyle]}>
          {/* AR Mode Indicator - Smaller and more subtle */}
          {isARMode && (
            <View style={[styles.arIndicator, { backgroundColor: `${theme.colors.surface}99` }]}>
              <Text style={[styles.arIndicatorText, { color: theme.colors.primary }]}>AR</Text>
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
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={[
                    styles.clothingChipText, 
                    { color: selectedClothing?.id === item.id ? theme.colors.surface : theme.colors.onSurface }
                  ]}>
                    {item.name}
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
  arView: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
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
});
