import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Button, Card, Title, Chip, FAB, Portal, Modal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';
import { StorageService } from '../../services/storageService';
import { ProductService } from '../../services/productService';
import * as ImageManipulator from 'expo-image-manipulator';

interface Product {
  id?: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  images: string[];
  virtual_tryon_images: string[];
  fabric_ids: string[];
  is_active: boolean;
}

const AddEditProductScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { product } = (route.params as { product?: any }) || {};

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [currentImageType, setCurrentImageType] = useState<'product' | 'virtual'>('product');
  const [imageScale, setImageScale] = useState(1);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scalingImage, setScalingImage] = useState<string | null>(null);

  const [productData, setProductData] = useState<Product>({
    name: '',
    description: '',
    category: '',
    base_price: 0,
    images: [],
    virtual_tryon_images: [],
    fabric_ids: [],
    is_active: true,
  });

  const categories = ['shirt', 'pants', 'dress', 'jacket', 'skirt', 'blouse'];
  const [availableFabrics, setAvailableFabrics] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (product) {
      setProductData(product);
    }
  }, [product]);

  useEffect(() => {
    loadFabrics();
  }, []);

  const loadFabrics = async () => {
    try {
      const result = await ProductService.getFabricTypes();
      if (result.success && result.fabrics) {
        setAvailableFabrics(result.fabrics.map(fabric => ({
          id: fabric.id,
          name: fabric.name
        })));
      }
    } catch (error) {
      console.error('Error loading fabrics:', error);
    }
  };

  const handleSave = async () => {
    if (!productData.name || !productData.description || !productData.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let result;

      if (product) {
        // Update existing product
        result = await ProductService.updateProduct(product.id, productData);
      } else {
        // Create new product
        result = await ProductService.createProduct(productData);
      }

      if (result.success) {
        Alert.alert('Success', `Product ${product ? 'updated' : 'created'} successfully`);
        navigation.goBack();
      } else {
        Alert.alert('Error', result.error || 'Failed to save product');
      }
    } catch (error: any) {
      console.error('Save product error:', error);
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const showImagePicker = (imageType: 'product' | 'virtual') => {
    setCurrentImageType(imageType);
    setImagePickerVisible(true);
  };

  const handleImagePickerSelection = async (source: 'camera' | 'library') => {
    try {
      console.log('🔄 AddEditProductScreen: Starting image picker process...');
      console.log('📷 Source:', source, 'Type:', currentImageType);

      // First, test connectivity before attempting upload
      console.log('🔄 AddEditProductScreen: Testing connectivity...');
      const connectivityTest = await StorageService.testConnectivity();
      if (!connectivityTest.success) {
        console.error('❌ Connectivity test failed:', connectivityTest);
        Alert.alert(
          'Connection Error',
          `Unable to connect to server: ${connectivityTest.error}. Please check your internet connection and try again.`,
          [{ text: 'OK' }]
        );
        setImagePickerVisible(false);
        return;
      }
      console.log('✅ Connectivity test passed');

      setImagePickerVisible(false);
      setUploadingImages(true);

      let result;
      const options = StorageService.getImagePickerOptions(currentImageType === 'virtual');
      console.log('⚙️ Image picker options:', options);

      if (source === 'camera') {
        console.log('📷 Opening camera...');
        result = await StorageService.pickFromCamera(options);
      } else {
        console.log('🖼️ Opening image library...');
        result = await StorageService.pickFromLibrary(options);
      }

      console.log('📸 Image picker result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        console.log('🖼️ Selected image:', {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          fileSize: selectedImage.fileSize
        });

        // Upload the image
        const folder = currentImageType === 'virtual' ? 'virtual-tryon' : 'products';
        console.log('☁️ Starting upload to folder:', folder);

        const uploadResult = await StorageService.uploadImage(
          selectedImage.uri,
          `image_${Date.now()}.jpg`,
          folder
        );

        console.log('☁️ Upload result:', uploadResult);

        if (uploadResult.success && uploadResult.url) {
          console.log('✅ Upload successful, URL:', uploadResult.url);

          if (currentImageType === 'virtual') {
            setProductData(prev => ({
              ...prev,
              virtual_tryon_images: [...prev.virtual_tryon_images, uploadResult.url!],
            }));
          } else {
            setProductData(prev => ({
              ...prev,
              images: [...prev.images, uploadResult.url!],
            }));
          }
          Alert.alert('Success', 'Image uploaded successfully');
        } else {
          console.error('❌ Upload failed:', uploadResult.error);

          // Provide more specific error messages to user
          let errorMessage = 'Failed to upload image. ';
          if (uploadResult.error?.includes('Network request failed') || uploadResult.error?.includes('timeout')) {
            errorMessage += 'Please check your internet connection and try again.';
          } else if (uploadResult.error?.includes('Authentication error')) {
            errorMessage += 'Please log out and log back in.';
          } else if (uploadResult.error?.includes('Permission denied')) {
            errorMessage += 'You do not have permission to upload images.';
          } else if (uploadResult.error?.includes('Storage configuration')) {
            errorMessage += 'Storage service is not properly configured.';
          } else {
            errorMessage += uploadResult.error || 'Please try again.';
          }

          Alert.alert('Upload Failed', errorMessage);
        }
      } else {
        console.log('❌ Image picker canceled or no assets');
      }
    } catch (error: any) {
      console.error('❌ Image picker error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Error', error.message || 'Failed to pick image');
    } finally {
      setUploadingImages(false);
    }
  };

  const scaleImage = async (imageUri: string) => {
    try {
      setScalingImage(imageUri);
      const scaledImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 800 * imageScale, height: 800 * imageScale } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Replace the image in the state
      const isVirtual = productData.virtual_tryon_images.includes(imageUri);
      if (isVirtual) {
        setProductData(prev => ({
          ...prev,
          virtual_tryon_images: prev.virtual_tryon_images.map(img =>
            img === imageUri ? scaledImage.uri : img
          ),
        }));
      } else {
        setProductData(prev => ({
          ...prev,
          images: prev.images.map(img =>
            img === imageUri ? scaledImage.uri : img
          ),
        }));
      }

      setShowScaleModal(false);
      setScalingImage(null);
      Alert.alert('Success', 'Image scaled successfully');
    } catch (error) {
      console.error('Scale image error:', error);
      Alert.alert('Error', 'Failed to scale image');
      setScalingImage(null);
    }
  };

  const removeImage = async (index: number, isVirtualTryOn = false) => {
    const images = isVirtualTryOn ? productData.virtual_tryon_images : productData.images;
    const imageUrl = images[index];

    // If it's a local URI (not uploaded yet), just remove it
    if (!imageUrl.startsWith('http')) {
      if (isVirtualTryOn) {
        setProductData(prev => ({
          ...prev,
          virtual_tryon_images: prev.virtual_tryon_images.filter((_, i) => i !== index),
        }));
      } else {
        setProductData(prev => ({
          ...prev,
          images: prev.images.filter((_, i) => i !== index),
        }));
      }
      return;
    }

    // For uploaded images, ask for confirmation and delete from storage
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from storage
              await StorageService.deleteImage(imageUrl);

              // Remove from state
              if (isVirtualTryOn) {
                setProductData(prev => ({
                  ...prev,
                  virtual_tryon_images: prev.virtual_tryon_images.filter((_, i) => i !== index),
                }));
              } else {
                setProductData(prev => ({
                  ...prev,
                  images: prev.images.filter((_, i) => i !== index),
                }));
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove image');
            }
          }
        }
      ]
    );
  };


  const toggleFabric = (fabricId: string) => {
    setProductData(prev => ({
      ...prev,
      fabric_ids: prev.fabric_ids.includes(fabricId)
        ? prev.fabric_ids.filter(id => id !== fabricId)
        : [...prev.fabric_ids, fabricId],
    }));
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      {/* Image Picker Modal */}
      <Portal>
        <Modal
          visible={imagePickerVisible}
          onDismiss={() => setImagePickerVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add {currentImageType === 'virtual' ? 'Virtual Try-On' : 'Product'} Image
            </Text>
            <Text style={styles.modalSubtitle}>
              Choose how to add the image
            </Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleImagePickerSelection('camera')}
            >
              <Ionicons name="camera" size={24} color={theme.colors.primary} />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleImagePickerSelection('library')}
            >
              <Ionicons name="images" size={24} color={theme.colors.primary} />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <Button
              mode="outlined"
              onPress={() => setImagePickerVisible(false)}
              style={styles.modalCancelButton}
            >
              Cancel
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Image Scale Modal */}
      <Portal>
        <Modal
          visible={showScaleModal}
          onDismiss={() => setShowScaleModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scale Image</Text>
            <Text style={styles.modalSubtitle}>
              Adjust the scale factor for the image
            </Text>

            <View style={styles.scaleContainer}>
              <TouchableOpacity
                style={styles.scaleButtonControl}
                onPress={() => setImageScale(Math.max(0.1, imageScale - 0.1))}
              >
                <Ionicons name="remove" size={24} color={theme.colors.primary} />
              </TouchableOpacity>

              <Text style={styles.scaleText}>{imageScale.toFixed(1)}x</Text>

              <TouchableOpacity
                style={styles.scaleButtonControl}
                onPress={() => setImageScale(Math.min(3.0, imageScale + 0.1))}
              >
                <Ionicons name="add" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.scaleActions}>
              <Button
                mode="outlined"
                onPress={() => setShowScaleModal(false)}
                style={styles.scaleCancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => scalingImage && scaleImage(scalingImage)}
                style={styles.scaleApplyButton}
                loading={scalingImage !== null}
              >
                Apply Scale
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{product ? 'Edit Product' : 'Add New Product'}</Text>
          <Text style={styles.subtitle}>Fill in the product details below</Text>
        </View>

        {/* Basic Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Basic Information</Title>

            <TextInput
              label="Product Name *"
              value={productData.name}
              onChangeText={(text) => setProductData(prev => ({ ...prev, name: text }))}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Description *"
              value={productData.description}
              onChangeText={(text) => setProductData(prev => ({ ...prev, description: text }))}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
            />

            <View style={styles.categoryContainer}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryChips}>
                {categories.map(cat => (
                  <Chip
                    key={cat}
                    selected={productData.category === cat}
                    onPress={() => setProductData(prev => ({ ...prev, category: cat }))}
                    style={styles.categoryChip}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Chip>
                ))}
              </View>
            </View>

            <TextInput
              label="Base Price (₱) *"
              value={productData.base_price.toString()}
              onChangeText={(text) => setProductData(prev => ({ ...prev, base_price: parseFloat(text) || 0 }))}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
            />
          </Card.Content>
        </Card>

        {/* Product Images */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Product Images</Title>
            <Button
              mode="outlined"
              onPress={() => showImagePicker('product')}
              style={styles.addButton}
              icon="camera"
              disabled={uploadingImages}
            >
              {uploadingImages ? 'Uploading...' : 'Add Product Image'}
            </Button>

            <View style={styles.imagesContainer}>
              {productData.images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <View style={styles.imageControls}>
                    <TouchableOpacity
                      style={styles.scaleButton}
                      onPress={() => {
                        setScalingImage(image);
                        setShowScaleModal(true);
                      }}
                    >
                      <Ionicons name="resize" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Virtual Try-On Images */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Virtual Try-On Images (PNG)</Title>
            <Text style={styles.sectionDescription}>
              Upload PNG images specifically designed for virtual try-on overlays. These should be transparent backgrounds for best results.
            </Text>
            <Button
              mode="outlined"
              onPress={() => showImagePicker('virtual')}
              style={styles.addButton}
              icon="image-plus"
              disabled={uploadingImages}
            >
              {uploadingImages ? 'Uploading...' : 'Add Virtual Try-On Image'}
            </Button>

            <View style={styles.imagesContainer}>
              {productData.virtual_tryon_images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <View style={styles.imageControls}>
                    <TouchableOpacity
                      style={styles.scaleButton}
                      onPress={() => {
                        setScalingImage(image);
                        setShowScaleModal(true);
                      }}
                    >
                      <Ionicons name="resize" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index, true)}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>


        {/* Fabric Options */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Available Fabrics</Title>
            <View style={styles.fabricsContainer}>
              {availableFabrics.map(fabric => (
                <Chip
                  key={fabric.id}
                  selected={productData.fabric_ids.includes(fabric.id)}
                  onPress={() => toggleFabric(fabric.id)}
                  style={styles.fabricChip}
                >
                  {fabric.name}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          loading={loading}
        >
          {product ? 'Update Product' : 'Create Product'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: wp(5),
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: rf(16),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  card: {
    margin: wp(5),
    marginTop: 0,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(2),
  },
  input: {
    marginBottom: hp(2),
  },
  categoryContainer: {
    marginBottom: hp(2),
  },
  label: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    marginRight: wp(2),
    marginBottom: hp(1),
  },
  addButton: {
    marginBottom: hp(2),
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: wp(2),
    marginBottom: hp(2),
  },
  image: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(2),
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.surface,
    borderRadius: wp(6),
  },
  variantInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: hp(2),
  },
  variantInput: {
    width: wp(42),
    marginRight: wp(2),
    marginBottom: hp(1),
  },
  variantsList: {
    marginTop: hp(2),
  },
  variantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  variantText: {
    fontSize: rf(14),
    color: theme.colors.textPrimary,
    flex: 1,
  },
  fabricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fabricChip: {
    marginRight: wp(2),
    marginBottom: hp(1),
  },
  saveContainer: {
    padding: wp(5),
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    width: '100%',
  },
  sectionDescription: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(2),
    lineHeight: rf(20),
  },
  modalContainer: {
    margin: wp(5),
    backgroundColor: theme.colors.surface,
    borderRadius: wp(3),
    padding: wp(5),
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: rf(20),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
  },
  modalSubtitle: {
    fontSize: rf(16),
    color: theme.colors.textSecondary,
    marginBottom: hp(3),
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: wp(2),
    marginBottom: hp(2),
    width: '100%',
    backgroundColor: theme.colors.background,
  },
  modalOptionText: {
    fontSize: rf(16),
    color: theme.colors.textPrimary,
    marginLeft: wp(3),
    fontWeight: '500',
  },
  modalCancelButton: {
    marginTop: hp(2),
    width: '100%',
  },
  imageControls: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    gap: wp(1),
  },
  scaleButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: wp(6),
    padding: wp(1),
    elevation: 2,
  },
  scaleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: hp(3),
    gap: wp(4),
  },
  scaleButtonControl: {
    backgroundColor: theme.colors.background,
    borderRadius: wp(6),
    padding: wp(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scaleText: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    minWidth: wp(15),
    textAlign: 'center',
  },
  scaleActions: {
    flexDirection: 'row',
    gap: wp(3),
    marginTop: hp(2),
  },
  scaleCancelButton: {
    flex: 1,
  },
  scaleApplyButton: {
    flex: 1,
  },
});

export default AddEditProductScreen;