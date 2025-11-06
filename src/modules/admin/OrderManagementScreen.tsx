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

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'tailoring' | 'quality_check' | 'ready_for_delivery' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total_amount: number;
  created_at: string;
  user_name?: string;
  item_count?: number;
  payment_status?: string;
  payment_method?: string;
  requires_tailoring?: boolean;
}

const OrderManagementScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const orderStatuses = [
    'pending', 'confirmed', 'processing', 'tailoring',
    'quality_check', 'ready_for_delivery', 'shipped', 'delivered'
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, selectedStatus]);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!['admin'].includes(profile?.role)) {
        Alert.alert('Error', 'Unauthorized to view orders. Admin access required.');
        return;
      }

      // Load all orders, prioritizing paid orders
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity
          )
        `)
        .order('payment_status', { ascending: false }) // Paid orders first
        .order('created_at', { ascending: false }); // Then by date

      if (error) throw error;

      // Fetch user profiles separately for each order
      const transformedOrders: Order[] = await Promise.all(
        (ordersData || []).map(async (order: any) => {
          let userName = 'Unknown User';
          try {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', order.user_id)
              .single();
            userName = userProfile?.name || 'Unknown User';
          } catch (profileError) {
            console.warn('Could not fetch profile for user:', order.user_id, profileError);
          }

          return {
            id: order.id,
            order_number: order.order_number,
            user_id: order.user_id,
            status: order.status,
            total_amount: order.total_amount,
            created_at: order.created_at,
            user_name: userName,
            item_count: order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
            payment_status: order.payment_status,
            payment_method: order.payment_method,
            requires_tailoring: order.requires_tailoring,
          };
        })
      );

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: theme.colors.warning,
      confirmed: theme.colors.info,
      processing: theme.colors.secondary,
      tailoring: theme.colors.primary,
      quality_check: theme.colors.tertiary,
      ready_for_delivery: theme.colors.success,
      shipped: theme.colors.success,
      delivered: theme.colors.success,
      cancelled: theme.colors.danger,
      refunded: theme.colors.danger,
    };
    return colors[status as keyof typeof colors] || theme.colors.textSecondary;
  };

  const handleViewOrder = (order: Order) => {
    // Navigate to order details screen
    (navigation as any).navigate('OrderDetails', { orderId: order.id });
  };

  const handleUpdateStatus = async (order: Order, newStatus: string) => {
    try {
      // TODO: Implement actual order status update API call
      // For now, just update local state
      const updatedOrders = orders.map(o =>
        o.id === order.id ? { ...o, status: newStatus as Order['status'] } : o
      );
      setOrders(updatedOrders);
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <Card style={styles.orderCard}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <View>
            <Title style={styles.orderNumber}>{item.order_number}</Title>
            <Paragraph style={styles.customerName}>{item.user_name}</Paragraph>
          </View>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
            textStyle={{ color: getStatusColor(item.status) }}
          >
            {item.status.replace('_', ' ').toUpperCase()}
          </Chip>
        </View>

        <View style={styles.orderDetails}>
           <View style={styles.detailRow}>
             <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
             <Text style={styles.detailText}>
               {new Date(item.created_at).toLocaleDateString()}
             </Text>
           </View>

           <View style={styles.detailRow}>
             <Ionicons name="cube-outline" size={16} color={theme.colors.textSecondary} />
             <Text style={styles.detailText}>{item.item_count} items</Text>
           </View>

           <View style={styles.detailRow}>
             <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
             <Text style={styles.amountText}>₱{item.total_amount.toLocaleString()}</Text>
           </View>

           {item.payment_status && (
             <View style={styles.detailRow}>
               <Ionicons name="card-outline" size={16} color={item.payment_status === 'paid' ? theme.colors.success : theme.colors.warning} />
               <Text style={[styles.detailText, { color: item.payment_status === 'paid' ? theme.colors.success : theme.colors.warning }]}>
                 {item.payment_status === 'paid' ? 'Paid' : 'Pending Payment'}
               </Text>
             </View>
           )}

           {item.requires_tailoring && (
             <View style={styles.detailRow}>
               <Ionicons name="cut-outline" size={16} color={theme.colors.secondary} />
               <Text style={[styles.detailText, { color: theme.colors.secondary }]}>
                 Requires Tailoring
               </Text>
             </View>
           )}
         </View>

        <View style={styles.orderActions}>
          <Button
            mode="outlined"
            onPress={() => handleViewOrder(item)}
            style={styles.viewButton}
          >
            View Details
          </Button>

          {item.status !== 'delivered' && item.status !== 'cancelled' && (
            <Button
              mode="contained"
              onPress={() => {
                const currentIndex = orderStatuses.indexOf(item.status);
                const nextStatus = orderStatuses[currentIndex + 1];
                if (nextStatus) {
                  handleUpdateStatus(item, nextStatus);
                }
              }}
              style={styles.updateButton}
            >
              Advance Status
            </Button>
          )}
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
        <Text style={styles.title}>Order Management</Text>
        <Text style={styles.subtitle}>Complete order oversight</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search orders..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Status Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, !selectedStatus && styles.filterChipSelected]}
          onPress={() => setSelectedStatus(null)}
        >
          <Text style={[styles.filterChipText, !selectedStatus && styles.filterChipTextSelected]}>
            All
          </Text>
        </TouchableOpacity>
        {orderStatuses.slice(0, 4).map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, selectedStatus === status && styles.filterChipSelected]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text style={[styles.filterChipText, selectedStatus === status && styles.filterChipTextSelected]}>
              {status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>Orders will appear here when customers place them</Text>
          </View>
        }
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
    textTransform: 'capitalize',
  },
  filterChipTextSelected: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  ordersList: {
    padding: wp(5),
    paddingBottom: hp(10),
  },
  orderCard: {
    marginBottom: hp(2),
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1),
  },
  orderNumber: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  customerName: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  orderDetails: {
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
  },
  amountText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: wp(2),
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    flex: 1,
    marginRight: wp(2),
  },
  updateButton: {
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
  emptySubtext: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginTop: hp(1),
    textAlign: 'center',
  },
});

export default OrderManagementScreen;