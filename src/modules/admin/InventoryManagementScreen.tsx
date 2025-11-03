import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Title, Paragraph, FAB, Searchbar, Chip, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';
import { supabase } from '../../services/supabase';
import { ProductService } from '../../services/productService';

interface InventoryItem {
  id: string;
  product_name: string;
  variant_sku: string;
  size: string;
  color: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_available: boolean;
  last_updated: string;
}

const InventoryManagementScreen = () => {
  const navigation = useNavigation();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchQuery, stockFilter]);

  const loadInventory = async () => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) {
         Alert.alert('Error', 'User not authenticated');
         return;
       }

       // Check if user is admin/shop_owner
       const { data: profile } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', user.id)
         .single();

       if (!['admin', 'shop_owner'].includes(profile?.role)) {
         Alert.alert('Error', 'Unauthorized to view inventory');
         return;
       }

       // Load real inventory data from database
       const { data: inventoryData, error } = await supabase
         .from('product_variants')
         .select(`
           id,
           sku,
           size,
           color,
           color_hex,
           stock_quantity,
           low_stock_threshold,
           is_available,
           updated_at,
           products (
             id,
             name,
             category
           )
         `)
         .order('updated_at', { ascending: false });

       if (error) throw error;

       // Transform data to match interface
       const transformedInventory: InventoryItem[] = (inventoryData || []).map((item: any) => ({
         id: item.id,
         product_name: item.products?.[0]?.name || 'Unknown Product',
         variant_sku: item.sku,
         size: item.size || '',
         color: item.color || '',
         stock_quantity: item.stock_quantity,
         low_stock_threshold: item.low_stock_threshold,
         is_available: item.is_available,
         last_updated: item.updated_at,
       }));

       setInventory(transformedInventory);
     } catch (error) {
       console.error('Error loading inventory:', error);
       Alert.alert('Error', 'Failed to load inventory');
     } finally {
       setLoading(false);
     }
   };

  const filterInventory = () => {
    let filtered = inventory;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.variant_sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (stockFilter === 'low') {
      filtered = filtered.filter(item =>
        item.stock_quantity > 0 && item.stock_quantity <= item.low_stock_threshold
      );
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(item => item.stock_quantity === 0);
    }

    setFilteredInventory(filtered);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.stock_quantity === 0) return 'out_of_stock';
    if (item.stock_quantity <= item.low_stock_threshold) return 'low_stock';
    return 'in_stock';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock': return theme.colors.danger;
      case 'low_stock': return theme.colors.warning;
      case 'in_stock': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'Out of Stock';
      case 'low_stock': return 'Low Stock';
      case 'in_stock': return 'In Stock';
      default: return 'Unknown';
    }
  };

  const handleUpdateStock = async (item: InventoryItem) => {
     Alert.prompt(
       'Update Stock',
       `Current stock for ${item.product_name} (${item.size}, ${item.color}): ${item.stock_quantity}\n\nEnter new stock quantity:`,
       [
         { text: 'Cancel', style: 'cancel' },
         {
           text: 'Update',
           onPress: async (newQuantity) => {
             if (!newQuantity || isNaN(Number(newQuantity))) {
               Alert.alert('Error', 'Please enter a valid number');
               return;
             }

             try {
               const result = await ProductService.updateStock(item.id, Number(newQuantity));
               if (result.success) {
                 Alert.alert('Success', 'Stock updated successfully');
                 loadInventory(); // Refresh the list
               } else {
                 Alert.alert('Error', result.error || 'Failed to update stock');
               }
             } catch (error) {
               Alert.alert('Error', 'Failed to update stock');
             }
           }
         }
       ]
     );
   };

  const handleToggleAvailability = (item: InventoryItem) => {
    const updatedInventory = inventory.map(inv =>
      inv.id === item.id ? { ...inv, is_available: !inv.is_available } : inv
    );
    setInventory(updatedInventory);
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const stockStatus = getStockStatus(item);

    return (
      <Card style={styles.inventoryCard}>
        <Card.Content>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Title style={styles.productName}>{item.product_name}</Title>
              <Paragraph style={styles.variantInfo}>
                SKU: {item.variant_sku} • Size: {item.size} • Color: {item.color}
              </Paragraph>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStockStatusColor(stockStatus) + '20' }]}
              textStyle={{ color: getStockStatusColor(stockStatus) }}
            >
              {getStockStatusText(stockStatus)}
            </Chip>
          </View>

          <View style={styles.stockInfo}>
            <View style={styles.stockRow}>
              <Ionicons name="cube-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.stockText}>
                Current Stock: <Text style={styles.stockNumber}>{item.stock_quantity}</Text>
              </Text>
            </View>

            <View style={styles.stockRow}>
              <Ionicons name="warning-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.stockText}>
                Low Stock Threshold: <Text style={styles.stockNumber}>{item.low_stock_threshold}</Text>
              </Text>
            </View>

            <View style={styles.stockRow}>
              <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.stockText}>
                Last Updated: {new Date(item.last_updated).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.itemActions}>
            <Button
              mode="outlined"
              onPress={() => handleUpdateStock(item)}
              style={styles.updateButton}
            >
              Update Stock
            </Button>

            <TouchableOpacity
              style={[styles.availabilityButton, {
                backgroundColor: item.is_available ? theme.colors.success + '20' : theme.colors.warning + '20'
              }]}
              onPress={() => handleToggleAvailability(item)}
            >
              <Ionicons
                name={item.is_available ? "checkmark-circle" : "close-circle"}
                size={20}
                color={item.is_available ? theme.colors.success : theme.colors.warning}
              />
              <Text style={[styles.availabilityText, {
                color: item.is_available ? theme.colors.success : theme.colors.warning
              }]}>
                {item.is_available ? 'Available' : 'Unavailable'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Management</Text>
        <Text style={styles.subtitle}>Stock and inventory control</Text>
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

      {/* Stock Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, stockFilter === 'all' && styles.filterChipSelected]}
          onPress={() => setStockFilter('all')}
        >
          <Text style={[styles.filterChipText, stockFilter === 'all' && styles.filterChipTextSelected]}>
            All Items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, stockFilter === 'low' && styles.filterChipSelected]}
          onPress={() => setStockFilter('low')}
        >
          <Text style={[styles.filterChipText, stockFilter === 'low' && styles.filterChipTextSelected]}>
            Low Stock
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, stockFilter === 'out' && styles.filterChipSelected]}
          onPress={() => setStockFilter('out')}
        >
          <Text style={[styles.filterChipText, stockFilter === 'out' && styles.filterChipTextSelected]}>
            Out of Stock
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inventory List */}
      <FlatList
        data={filteredInventory}
        renderItem={renderInventoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.inventoryList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No inventory items found</Text>
            <Text style={styles.emptySubtext}>
              {stockFilter === 'all' ? 'Add products to start managing inventory' : `No items match the ${stockFilter} filter`}
            </Text>
          </View>
        }
      />

      {/* Add Product FAB */}
      <FAB
        icon="add"
        style={styles.fab}
        onPress={() => {
          // Navigate to add product screen
          Alert.alert('Add Product', 'Navigate to add product screen');
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    marginBottom: hp(1),
  },
  filterChip: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginRight: wp(2),
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
  inventoryList: {
    padding: wp(5),
    paddingBottom: hp(10),
  },
  inventoryCard: {
    marginBottom: hp(2),
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1),
  },
  itemInfo: {
    flex: 1,
    marginRight: wp(2),
  },
  productName: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  variantInfo: {
    fontSize: rf(12),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  stockInfo: {
    marginBottom: hp(2),
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  stockText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginLeft: wp(2),
  },
  stockNumber: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateButton: {
    flex: 1,
    marginRight: wp(2),
  },
  availabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: wp(2),
  },
  availabilityText: {
    fontSize: rf(12),
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

export default InventoryManagementScreen;