import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { TextInput, Button, Card, Title, Chip, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';

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
  const availableFabrics = [
    { id: '1', name: 'Premium Cotton' },
    { id: '2', name: 'Italian Wool' },
    { id: '3', name: 'Silk Blend' },
  ];

  useEffect(() => {
    if (product) {
      setProductData(product);
    }
  }, [product]);

  const handleSave = async () => {
    if (!productData.name || !productData.description || !productData.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual product save API call
      // For now, just show success message
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert('Success', `Product ${product ? 'updated' : 'created'} successfully`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const addImage = () => {
    // Mock image upload - replace with actual image picker
    const mockImageUrl = `https://via.placeholder.com/300x300?text=Product+Image+${productData.images.length + 1}`;
    setProductData(prev => ({
      ...prev,
      images: [...prev.images, mockImageUrl],
    }));
  };

  const removeImage = (index: number) => {
    setProductData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const addVirtualTryOnImage = () => {
    // Mock PNG image upload - replace with actual image picker that filters for PNG
    const mockImageUrl = `https://via.placeholder.com/300x300/FF0000/FFFFFF.png?text=Virtual+Try-On+PNG+${productData.virtual_tryon_images.length + 1}`;
    setProductData(prev => ({
      ...prev,
      virtual_tryon_images: [...prev.virtual_tryon_images, mockImageUrl],
    }));
  };

  const removeVirtualTryOnImage = (index: number) => {
    setProductData(prev => ({
      ...prev,
      virtual_tryon_images: prev.virtual_tryon_images.filter((_, i) => i !== index),
    }));
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
              onPress={addImage}
              style={styles.addButton}
              icon="camera"
            >
              Add Product Image
            </Button>

            <View style={styles.imagesContainer}>
              {productData.images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.danger} />
                  </TouchableOpacity>
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
              onPress={addVirtualTryOnImage}
              style={styles.addButton}
              icon="image-plus"
            >
              Add Virtual Try-On Image
            </Button>

            <View style={styles.imagesContainer}>
              {productData.virtual_tryon_images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeVirtualTryOnImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.danger} />
                  </TouchableOpacity>
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
});

export default AddEditProductScreen;