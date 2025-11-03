import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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

interface FabricType {
  id: string;
  name: string;
  description?: string;
  material_composition?: string;
  care_instructions?: string;
  price_per_meter: number;
  is_active: boolean;
  created_at: string;
  usage_count?: number;
  total_orders?: number;
  revenue_generated?: number;
}

const FabricManagementScreen = () => {
  const navigation = useNavigation();
  const [fabrics, setFabrics] = useState<FabricType[]>([]);
  const [filteredFabrics, setFilteredFabrics] = useState<FabricType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFabrics();
  }, []);

  useEffect(() => {
    filterFabrics();
  }, [fabrics, searchQuery]);

  const loadFabrics = async () => {
    try {
      const result = await ProductService.getFabricTypes();
      if (result.success && result.fabrics) {
        setFabrics(result.fabrics);
      } else {
        console.error('Failed to load fabrics:', result.error);
        Alert.alert('Error', result.error || 'Failed to load fabrics');
      }
    } catch (error) {
      console.error('Error loading fabrics:', error);
      Alert.alert('Error', 'Failed to load fabrics');
    } finally {
      setLoading(false);
    }
  };

  const filterFabrics = () => {
    let filtered = fabrics;

    if (searchQuery) {
      filtered = filtered.filter(fabric =>
        fabric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fabric.description && fabric.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (fabric.material_composition && fabric.material_composition.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredFabrics(filtered);
  };

  const handleEditFabric = (fabric: FabricType) => {
    // Navigate to edit fabric screen
    (navigation as any).navigate('AddEditFabric', { fabric });
  };

  const handleDeleteFabric = (fabric: FabricType) => {
    Alert.alert(
      'Delete Fabric',
      `Are you sure you want to delete "${fabric.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implement delete logic
            setFabrics(fabrics.filter(f => f.id !== fabric.id));
          }
        }
      ]
    );
  };

  const handleToggleActive = (fabric: FabricType) => {
    const updatedFabrics = fabrics.map(f =>
      f.id === fabric.id ? { ...f, is_active: !f.is_active } : f
    );
    setFabrics(updatedFabrics);
  };

  const renderFabricItem = ({ item }: { item: FabricType }) => (
    <Card style={styles.fabricCard}>
      <Card.Content>
        <View style={styles.fabricHeader}>
          <Title style={styles.fabricName}>{item.name}</Title>
          <Chip
            style={[styles.statusChip, { backgroundColor: item.is_active ? theme.colors.success + '20' : theme.colors.warning + '20' }]}
            textStyle={{ color: item.is_active ? theme.colors.success : theme.colors.warning }}
          >
            {item.is_active ? 'Active' : 'Inactive'}
          </Chip>
        </View>

        <Paragraph style={styles.fabricDescription}>{item.description}</Paragraph>

        <View style={styles.fabricDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="leaf-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>{item.material_composition}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="shirt-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>{item.care_instructions}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.priceText}>₱{item.price_per_meter}/meter</Text>
          </View>
        </View>

        {/* Usage Statistics */}
        <View style={styles.usageStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.usage_count || 0}</Text>
            <Text style={styles.statLabel}>Used in Products</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.total_orders || 0}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₱{(item.revenue_generated || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>

        <View style={styles.fabricActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.info + '20' }]}
            onPress={() => handleEditFabric(item)}
          >
            <Ionicons name="pencil" size={20} color={theme.colors.info} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {
              backgroundColor: item.is_active ? theme.colors.warning + '20' : theme.colors.success + '20'
            }]}
            onPress={() => handleToggleActive(item)}
          >
            <Ionicons
              name={item.is_active ? "eye-off" : "eye"}
              size={20}
              color={item.is_active ? theme.colors.warning : theme.colors.success}
            />
            <Text style={[styles.actionText, {
              color: item.is_active ? theme.colors.warning : theme.colors.success
            }]}>
              {item.is_active ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.danger + '20' }]}
            onPress={() => handleDeleteFabric(item)}
          >
            <Ionicons name="trash" size={20} color={theme.colors.danger} />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Fabric Management</Text>
        <Text style={styles.subtitle}>Manage fabric types and pricing</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search fabrics..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Fabrics List */}
      <FlatList
        data={filteredFabrics}
        renderItem={renderFabricItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.fabricsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="color-palette-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No fabrics found</Text>
            <Text style={styles.emptySubtext}>Add your first fabric type to get started</Text>
          </View>
        }
      />

      {/* Action FABs */}
      <View style={styles.fabContainer}>
        <FAB
          icon="bar-chart"
          style={[styles.fab, styles.analyticsFab]}
          onPress={() => {
            // Navigate to fabric analytics screen
            (navigation as any).navigate('FabricAnalytics');
          }}
        />
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => {
            // Navigate to add fabric screen
            (navigation as any).navigate('AddEditFabric');
          }}
        />
      </View>
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
  fabricsList: {
    padding: wp(5),
    paddingBottom: hp(10),
  },
  fabricCard: {
    marginBottom: hp(2),
    elevation: 2,
  },
  fabricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  fabricName: {
    fontSize: rf(18),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  statusChip: {
    marginLeft: wp(2),
  },
  fabricDescription: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(1.5),
  },
  fabricDetails: {
    marginBottom: hp(2),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  detailText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginLeft: wp(2),
    flex: 1,
  },
  priceText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: wp(2),
  },
  fabricActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: wp(2),
    minWidth: wp(20),
    justifyContent: 'center',
  },
  actionText: {
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
  },
  fab: {
    position: 'absolute',
    margin: wp(4),
    right: 0,
    bottom: hp(2),
    backgroundColor: theme.colors.primary,
  },
  usageStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: hp(2),
    paddingVertical: hp(1),
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: wp(2),
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: rf(10),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    right: 0,
    bottom: hp(2),
  },
  analyticsFab: {
    marginBottom: hp(2),
    backgroundColor: theme.colors.secondary,
  },
});

export default FabricManagementScreen;