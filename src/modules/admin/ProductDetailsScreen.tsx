import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Card, Title, Paragraph, Button, Chip, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';

interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock_quantity: number;
  price_modifier: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  images: string[];
  variants: ProductVariant[];
  fabric_ids: string[];
  is_active: boolean;
  created_at: string;
}

const ProductDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId } = (route.params as { productId: string }) || {};

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  const availableFabrics = [
    { id: '1', name: 'Premium Cotton' },
    { id: '2', name: 'Italian Wool' },
    { id: '3', name: 'Silk Blend' },
  ];

  useEffect(() => {
    loadProductDetails();
  }, [productId]);

  const loadProductDetails = async () => {
    try {
      // Mock data - replace with actual API call
      const mockProduct: Product = {
        id: productId || '1',
        name: 'Classic White Shirt',
        description: 'Premium cotton dress shirt perfect for formal occasions. Made with high-quality Egyptian cotton for comfort and durability.',
        category: 'shirt',
        base_price: 2500,
        images: [
          'https://via.placeholder.com/300x300?text=Shirt+Front',
          'https://via.placeholder.com/300x300?text=Shirt+Back',
        ],
        variants: [
          {
            id: '1',
            size: 'M',
            color: 'White',
            stock_quantity: 25,
            price_modifier: 0,
          },
          {
            id: '2',
            size: 'L',
            color: 'White',
            stock_quantity: 20,
            price_modifier: 100,
          },
        ],
        fabric_ids: ['1'],
        is_active: true,
        created_at: '2024-01-15T00:00:00Z',
      };
      setProduct(mockProduct);
    } catch (error) {
      console.error('Error loading product details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFabricNames = (fabricIds: string[]) => {
    return availableFabrics
      .filter(fabric => fabricIds.includes(fabric.id))
      .map(fabric => fabric.name);
  };

  const handleEditProduct = () => {
    if (!product) return;
    (navigation as any).navigate('AddEditProduct', { product });
  };

  const handleToggleActive = async () => {
    if (!product) return;

    try {
      // Mock update - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setProduct(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
    } catch (error) {
      console.error('Error updating product status');
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>Product not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Product Details</Text>
          <Text style={styles.productName}>{product.name}</Text>
        </View>

        {/* Product Images */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Product Images</Title>
            <View style={styles.imagesContainer}>
              {product.images.map((image, index) => (
                <Image key={index} source={{ uri: image }} style={styles.image} />
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Basic Information */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.basicInfoHeader}>
              <Title style={styles.sectionTitle}>Basic Information</Title>
              <Chip
                style={[styles.statusChip, {
                  backgroundColor: product.is_active ? theme.colors.success + '20' : theme.colors.warning + '20'
                }]}
                textStyle={{
                  color: product.is_active ? theme.colors.success : theme.colors.warning
                }}
              >
                {product.is_active ? 'Active' : 'Inactive'}
              </Chip>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Category:</Text>
              <Text style={styles.value}>{product.category.charAt(0).toUpperCase() + product.category.slice(1)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Base Price:</Text>
              <Text style={styles.priceValue}>₱{product.base_price.toLocaleString()}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Created:</Text>
              <Text style={styles.value}>
                {new Date(product.created_at).toLocaleDateString()}
              </Text>
            </View>

            <Text style={styles.description}>{product.description}</Text>
          </Card.Content>
        </Card>

        {/* Product Variants */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Product Variants</Title>

            {product.variants.map((variant) => (
              <View key={variant.id} style={styles.variantItem}>
                <View style={styles.variantHeader}>
                  <Text style={styles.variantInfo}>
                    Size: {variant.size} • Color: {variant.color}
                  </Text>
                  <Text style={styles.variantStock}>
                    Stock: {variant.stock_quantity}
                  </Text>
                </View>

                {variant.price_modifier !== 0 && (
                  <Text style={styles.variantPrice}>
                    Price Modifier: {variant.price_modifier > 0 ? '+' : ''}₱{variant.price_modifier}
                  </Text>
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Available Fabrics */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Available Fabrics</Title>
            <View style={styles.fabricsContainer}>
              {getFabricNames(product.fabric_ids).map((fabricName, index) => (
                <Chip key={index} style={styles.fabricChip}>
                  {fabricName}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Statistics */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Statistics</Title>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{product.variants.length}</Text>
                <Text style={styles.statLabel}>Variants</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {product.variants.reduce((sum, variant) => sum + variant.stock_quantity, 0)}
                </Text>
                <Text style={styles.statLabel}>Total Stock</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{product.images.length}</Text>
                <Text style={styles.statLabel}>Images</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={handleToggleActive}
          style={styles.toggleButton}
          icon={product.is_active ? "eye-off" : "eye"}
        >
          {product.is_active ? 'Deactivate' : 'Activate'}
        </Button>

        <Button
          mode="contained"
          onPress={handleEditProduct}
          style={styles.editButton}
          icon="pencil"
        >
          Edit Product
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
  productName: {
    fontSize: rf(18),
    color: theme.colors.primary,
    fontWeight: '600',
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
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  image: {
    width: wp(25),
    height: wp(25),
    borderRadius: wp(2),
    marginRight: wp(2),
    marginBottom: hp(1),
  },
  basicInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  label: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    fontSize: rf(14),
    color: theme.colors.textPrimary,
  },
  priceValue: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  description: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    lineHeight: rf(20),
    marginTop: hp(2),
  },
  variantItem: {
    marginBottom: hp(2),
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  variantInfo: {
    fontSize: rf(14),
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  variantStock: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  variantPrice: {
    fontSize: rf(12),
    color: theme.colors.primary,
    fontWeight: '600',
  },
  fabricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fabricChip: {
    marginRight: wp(2),
    marginBottom: hp(1),
    backgroundColor: theme.colors.primary + '20',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: rf(12),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: wp(5),
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  toggleButton: {
    flex: 1,
    marginRight: wp(2),
  },
  editButton: {
    flex: 1,
    marginLeft: wp(2),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(10),
  },
  emptyText: {
    fontSize: rf(18),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: hp(2),
  },
});

export default ProductDetailsScreen;