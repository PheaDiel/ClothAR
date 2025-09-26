// src/modules/camera/CameraScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import { Button, Card, IconButton } from 'react-native-paper';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { isARSupported } from '../../utils/arUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CameraScreen() {
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
    { id: 1, name: 'T-Shirt', category: 'tops', color: '#00ff00' },
    { id: 2, name: 'Jeans', category: 'bottoms', color: '#0000ff' },
    { id: 3, name: 'Dress', category: 'dresses', color: '#ff0000' },
    { id: 4, name: 'Jacket', category: 'outerwear', color: '#ffff00' },
  ]);
  const [showClothingSelector, setShowClothingSelector] = useState(false);
  const [arSettings, setArSettings] = useState({
    showGrid: true,
    showLandmarks: true,
    clothingOpacity: 1.0,
  });
  const cameraRef = useRef<any>(null);
  const glViewRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Lock screen orientation to portrait
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      
      // Check if AR is supported on this device
      const arSupported = isARSupported();
      setIsARMode(arSupported);
    })();
    
    return () => {
      // Unlock screen orientation when component unmounts
      ScreenOrientation.unlockAsync();
    };
  }, []);

  const toggleCameraType = () => {
    setCameraType(
      cameraType === 'back'
        ? 'front'
        : 'back'
    );
  };

  const toggleFlashMode = () => {
    setFlashMode(
      flashMode === 'off'
        ? 'on'
        : 'off'
    );
  };

  const handleCapture = async () => {
    if (cameraRef.current && isARMode) {
      setIsLoading(true);
      try {
        // In a full implementation, this would capture the image and process it with AR
        console.log('Capturing image for AR processing');
        Alert.alert('AR Capture', 'In a full implementation, this would capture an image and process it with AR to show how clothing would look on you.');
      } catch (error) {
        console.error('Error capturing image:', error);
        Alert.alert('Error', 'Failed to capture image');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCameraReady = () => {
    setCameraReady(true);
  };

  // Function to detect body pose (placeholder implementation)
  const detectBodyPose = async (imageData: any) => {
    // In a full implementation, this would use ML models to detect body landmarks
    // For now, we'll return a mock result with approximate body positions
    return {
      landmarks: [
        { x: 0.5, y: 0.2 }, // Head
        { x: 0.5, y: 0.4 }, // Shoulders
        { x: 0.5, y: 0.6 }, // Waist
        { x: 0.5, y: 0.8 }, // Hips
      ],
      boundingBox: { x: 0.2, y: 0.1, width: 0.6, height: 0.8 }
    };
  };

  // Function to render clothing on detected body
  const renderClothingOnBody = (landmarks: any[], clothingItem: any) => {
    // Position clothing based on body landmarks
    if (clothingModel && scene) {
      // Position the clothing model based on body landmarks
      // For example, position a shirt around the shoulders
      clothingModel.position.set(
        landmarks[1].x * screenWidth,  // Shoulder x position
        landmarks[1].y * screenHeight, // Shoulder y position
        0
      );
      
      // Scale the clothing to fit the body
      const bodyWidth = landmarks[3].x - landmarks[1].x;
      const bodyHeight = landmarks[3].y - landmarks[1].y;
      clothingModel.scale.set(bodyWidth * 2, bodyHeight * 2, 1);
    }
  };

  // Function to select a clothing item
  const selectClothingItem = (item: any) => {
    setSelectedClothing(item);
    setShowClothingSelector(false);
    
    // Update the clothing model color based on selected item
    if (clothingModel) {
      const material = new THREE.MeshBasicMaterial({ color: item.color });
      clothingModel.material = material;
    }
  };

  // Function to toggle AR settings
  const toggleArSetting = (setting: string) => {
    setArSettings({
      ...arSettings,
      [setting]: !arSettings[setting as keyof typeof arSettings]
    });
  };

  const setupARScene = (gl: any) => {
    // Create THREE.js renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    setArRenderer(renderer);

    // Create scene
    const newScene = new THREE.Scene();
    setScene(newScene);
    
    // Create camera
    const newCamera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    setCamera(newCamera);
    
    // Add some basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    newScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    newScene.add(directionalLight);
    
    // Add a simple cube as a placeholder for clothing
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    newScene.add(cube);
    setClothingModel(cube);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Rotate the cube
      if (cube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
      }
      
      renderer.render(newScene, newCamera);
    };
    
    animate();
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Button 
          mode="contained" 
          onPress={() => Camera.requestCameraPermissionsAsync()}
          style={styles.button}
        >
          Grant Permission
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

        {cameraReady && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
              <Text style={styles.controlText}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={toggleFlashMode}>
              <Text style={styles.controlText}>
                Flash: {flashMode === 'on' ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isLoading}
            >
              <Text style={styles.captureText}>
                {isARMode ? 'Try On Clothing (AR)' : 'Capture Photo'}
              </Text>
            </TouchableOpacity>

            {/* AR Controls */}
            <View style={styles.arControls}>
              <TouchableOpacity
                style={styles.arControlButton}
                onPress={() => setShowClothingSelector(!showClothingSelector)}
              >
                <Text style={styles.controlText}>
                  {selectedClothing ? selectedClothing.name : 'Select Clothing'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.arControlButton}
                onPress={() => toggleArSetting('showGrid')}
              >
                <Text style={styles.controlText}>
                  Grid: {arSettings.showGrid ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.arControlButton}
                onPress={() => toggleArSetting('showLandmarks')}
              >
                <Text style={styles.controlText}>
                  Landmarks: {arSettings.showLandmarks ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </CameraView>

      {!cameraReady && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {isARMode
            ? 'AR Mode: Point the camera at yourself to try on clothing virtually'
            : 'AR not supported on this device. Using standard camera mode.'}
        </Text>
      </View>

      {/* Clothing Selector Modal */}
      {showClothingSelector && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Clothing</Text>
              <IconButton
                icon="close"
                onPress={() => setShowClothingSelector(false)}
                style={styles.closeButton}
              />
            </View>
            <ScrollView style={styles.clothingList}>
              {clothingItems.map((item) => (
                <Card key={item.id} style={styles.clothingItem} onPress={() => selectClothingItem(item)}>
                  <Card.Content>
                    <Text style={styles.clothingName}>{item.name}</Text>
                    <View style={[styles.colorPreview, { backgroundColor: item.color }]} />
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          </View>
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
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
    color: '#fff',
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
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 30,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    padding: 15,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  controlText: {
    color: '#fff',
    fontSize: 16,
  },
  captureButton: {
    backgroundColor: '#fff',
    borderRadius: 35,
    padding: 20,
    marginVertical: 10,
    width: 70,
    height: 70,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureText: {
    color: '#000',
    fontSize: 12,
    textAlign: 'center',
  },
  button: {
    marginVertical: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  infoContainer: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  infoText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
  },
  arControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 10,
  },
  arControlButton: {
    padding: 5,
    marginVertical: 2,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '80%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    margin: 0,
    padding: 0,
  },
  clothingList: {
    padding: 10,
  },
  clothingItem: {
    marginVertical: 5,
  },
  clothingName: {
    fontSize: 16,
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: 5,
  },
});
