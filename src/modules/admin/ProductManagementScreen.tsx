import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Title, Paragraph, FAB, Searchbar, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';
import { ProductService } from '../../services/productService';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  base_price: number;
  is_active: boolean;
  created_at: string;
}

const ProductManagementScreen = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ['shirt', 'pants', 'dress', 'jacket', 'skirt', 'blouse'];

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  const loadProducts = async () => {
    try {
      const result = await ProductService.getProducts();
      if (result.success && result.products) {
        setProducts(result.products);
      } else {
        console.error('Failed to load products:', result.error);
        Alert.alert('Error', result.error || 'Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const handleEditProduct = (product: Product) => {
    // Navigate to edit product screen
    (navigation as any).navigate('AddEditProduct', { product });
  };

  const handleDeleteProduct = async (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ProductService.deleteProduct(product.id);
              if (result.success) {
                // Remove from local state
                setProducts(products.filter(p => p.id !== product.id));
                Alert.alert('Success', 'Product deleted successfully');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete product');
              }
            } catch (error) {
              console.error('Delete product error:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = (product: Product) => {
    const updatedProducts = products.map(p =>
      p.id === product.id ? { ...p, is_active: !p.is_active } : p
    );
    setProducts(updatedProducts);
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity onPress={() => (navigation as any).navigate('ProductDetails', { productId: item.id })}>
      <Card style={styles.productCard}>
        <Card.Content style={styles.productCardContent}>
          <View style={styles.productInfo}>
            <Title style={styles.productName}>{item.name}</Title>
            <Paragraph style={styles.productDescription}>{item.description}</Paragraph>
            <View style={styles.productMeta}>
              <Chip style={styles.productCategoryChip}>{item.category}</Chip>
              <Text style={styles.priceText}>₱{item.base_price}</Text>
            </View>
          </View>
          <View style={styles.productActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.info + '20' }]}
              onPress={() => handleEditProduct(item)}
            >
              <Ionicons name="pencil" size={20} color={theme.colors.info} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, {
                backgroundColor: item.is_active ? theme.colors.success + '20' : theme.colors.warning + '20'
              }]}
              onPress={() => handleToggleActive(item)}
            >
              <Ionicons
                name={item.is_active ? "eye" : "eye-off"}
                size={20}
                color={item.is_active ? theme.colors.success : theme.colors.warning}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.danger + '20' }]}
              onPress={() => handleDeleteProduct(item)}
            >
              <Ionicons name="trash" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Product Management</Text>
        <Text style={styles.subtitle}>Manage your product catalog</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search products..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Category Filters */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipSelected]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextSelected]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryChip, selectedCategory === category && styles.categoryChipSelected]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextSelected]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>Add your first product to get started</Text>
          </View>
        }
      />

      {/* Add Product FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          // Navigate to add product screen
          (navigation as any).navigate('AddEditProduct');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  searchContainer: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(1),
  },
  searchBar: {
    elevation: 2,
  },
  categoryContainer: {
    paddingHorizontal: wp(5),
    marginBottom: hp(1),
  },
  categoryChip: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginRight: wp(2),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  productsList: {
    padding: wp(5),
    paddingBottom: hp(10),
  },
  productCard: {
    marginBottom: hp(2),
    elevation: 2,
  },
  productCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  productDescription: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(1),
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCategoryChip: {
    backgroundColor: theme.colors.primary + '20',
  },
  priceText: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    justifyContent: 'center',
    alignItems: 'center',
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
  emptySubtext: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginTop: hp(1),
  },
  fab: {
    position: 'absolute',
    margin: wp(4),
    right: 0,
    bottom: hp(2),
    backgroundColor: theme.colors.primary,
  },
});

export default ProductManagementScreen;