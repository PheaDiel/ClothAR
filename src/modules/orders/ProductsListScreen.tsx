import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Title, Paragraph, Searchbar, Chip, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';
import { ProductService } from '../../services/productService';
import { Item } from '../../types';

const ProductsListScreen = React.memo(function ProductsListScreen() {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Item[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  const loadProducts = async () => {
    try {
      const result = await ProductService.getProducts();
      if (result.success) {
        // Transform database products to Item interface
        const transformedProducts: Item[] = (result.products || []).map((product: any) => ({
          id: product.id,
          name: product.name,
          price: product.base_price,
          images: product.images || [],
          category: product.category,
          sizes: product.product_variants?.map((v: any) => v.size).filter(Boolean) || [],
          stock: product.product_variants?.reduce((acc: any, v: any) => {
            if (v.size) {
              acc[v.size] = v.stock_quantity;
            }
            return acc;
          }, {} as Record<string, number>) || {},
          description: product.description,
        }));

        setProducts(transformedProducts);

        // Extract unique categories
        const uniqueCategories = [...new Set(transformedProducts.map(p => p.category))];
        setCategories(uniqueCategories);
      } else {
        Alert.alert('Error', result.error || 'Failed to load products');
      }
    } catch (error) {
      console.error('Load products error:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = useCallback(() => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  const getTotalStock = useCallback((stock: Record<string, number>) => {
    return Object.values(stock).reduce((sum, qty) => sum + qty, 0);
  }, []);

  const renderProductItem = useCallback(({ item }: { item: Item }) => {
    const totalStock = getTotalStock(item.stock);
    const isLowStock = totalStock <= 5;
    const isOutOfStock = totalStock === 0;

    return (
      <Card style={styles.productCard}>
        <Card.Content>
          <View style={styles.productHeader}>
            <View style={styles.productInfo}>
              <Title style={styles.productName}>{item.name}</Title>
              <Paragraph style={styles.productCategory}>{item.category}</Paragraph>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>
              <Chip
                style={[
                  styles.stockChip,
                  {
                    backgroundColor: isOutOfStock ? '#FFEBEE' :
                                   isLowStock ? '#FFF3E0' : '#E8F5E8'
                  }
                ]}
                textStyle={{
                  color: isOutOfStock ? '#C62828' :
                        isLowStock ? '#E65100' : '#2E7D32'
                }}
              >
                {isOutOfStock ? 'Out of Stock' :
                 isLowStock ? 'Low Stock' : 'In Stock'}
              </Chip>
            </View>
          </View>

          {item.description && (
            <Paragraph style={styles.description} numberOfLines={2}>
              {item.description}
            </Paragraph>
          )}

          <View style={styles.stockInfo}>
            <Text style={styles.stockText}>
              Total Stock: <Text style={styles.stockNumber}>{totalStock}</Text>
            </Text>
            <Text style={styles.sizesText}>
              Sizes: {item.sizes.join(', ') || 'N/A'}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => {
                // Navigate to product details - adjust navigation as needed
                Alert.alert('View Product', `Navigate to product details for ${item.name}`);
              }}
            >
              <Ionicons name="eye" size={16} color={theme.colors.primary} />
              <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  }, []);

  const keyExtractor = useCallback((item: Item) => item.id, []);

  const memoizedCategories = useMemo(() => categories, [categories]);

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.subtitle}>Browse and manage products</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search products..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Category Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipSelected]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextSelected]}>
            All Categories
          </Text>
        </TouchableOpacity>
        {memoizedCategories.map(category => (
          <TouchableOpacity
            key={category}
            style={[styles.filterChip, selectedCategory === category && styles.filterChipSelected]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.filterChipText, selectedCategory === category && styles.filterChipTextSelected]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add products to start selling'
              }
            </Text>
          </View>
        }
      />

      {/* Add Product FAB - Only show for admins */}
      {/* <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => Alert.alert('Add Product', 'Navigate to add product screen')}
      /> */}
    </View>
  );
});


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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    marginBottom: hp(1),
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginRight: wp(2),
    marginBottom: hp(1),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: rf(12),
    color: theme.colors.textSecondary,
  },
  filterChipTextSelected: {
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
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1),
  },
  productInfo: {
    flex: 1,
    marginRight: wp(2),
  },
  productName: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  productCategory: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: hp(0.5),
  },
  stockChip: {
    alignSelf: 'flex-end',
  },
  description: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(1),
  },
  stockInfo: {
    marginBottom: hp(2),
  },
  stockText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.5),
  },
  stockNumber: {
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  sizesText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    backgroundColor: theme.colors.primary + '20',
    borderRadius: wp(2),
  },
  viewButtonText: {
    fontSize: rf(14),
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: wp(1),
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
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: wp(4),
    right: 0,
    bottom: hp(2),
    backgroundColor: theme.colors.primary,
  },
});

export default ProductsListScreen;