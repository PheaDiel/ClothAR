import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Title, Paragraph, FAB, Searchbar, Chip, Button, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';
import { getAdminConversations } from '../../services/chatService';
import { supabase } from '../../services/supabase';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  role_status: 'pending' | 'approved' | 'rejected';
  province_name?: string;
  city_name?: string;
  created_at: string;
  last_order_date?: string;
  total_orders: number;
  total_spent: number;
}

const CustomerManagementScreen = () => {
  const navigation = useNavigation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [chatConversations, setChatConversations] = useState<any[]>([]);

  const roles = ['customer', 'admin'];

  useEffect(() => {
    loadCustomers();
    loadChatConversations();
  }, []);

  // Add loading state management
  useEffect(() => {
    if (customers.length > 0) {
      setLoading(false);
    }
  }, [customers]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, roleFilter]);

  const loadCustomers = async () => {
    try {
      console.log('Starting to load customers...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      console.log('Checking admin permissions...');
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!['admin'].includes(profile?.role)) {
        console.log('User is not admin:', profile?.role);
        Alert.alert('Error', 'Unauthorized to view customers. Admin access required.');
        setLoading(false);
        return;
      }

      console.log('Loading customer profiles...');
      // Load all customers
      const { data: customersData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
        throw error;
      }

      console.log('Found', customersData?.length || 0, 'customers');

      // Fetch order statistics separately for each customer
      const transformedCustomers: Customer[] = await Promise.all(
        (customersData || []).map(async (customer: any) => {
          let totalOrders = 0;
          let totalSpent = 0;
          let lastOrderDate: string | undefined;

          try {
            const { data: ordersData } = await supabase
              .from('orders')
              .select('id, total_amount, created_at, status')
              .eq('user_id', customer.id);

            const completedOrders = ordersData?.filter((order: any) =>
              ['delivered', 'shipped'].includes(order.status)
            ) || [];

            totalOrders = completedOrders.length;
            totalSpent = completedOrders.reduce((sum: number, order: any) => sum + order.total_amount, 0);

            if (completedOrders.length > 0) {
              const sortedOrders = completedOrders.sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              lastOrderDate = sortedOrders[0].created_at;
            }
          } catch (ordersError) {
            console.warn('Could not fetch orders for customer:', customer.id, ordersError);
          }

          return {
            id: customer.id,
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone,
            role: customer.role,
            role_status: customer.role_status,
            province_name: customer.province_name,
            city_name: customer.city_name,
            created_at: customer.created_at,
            last_order_date: lastOrderDate,
            total_orders: totalOrders,
            total_spent: totalSpent,
          };
        })
      );

      console.log('Setting customers data:', transformedCustomers.length, 'customers');
      setCustomers(transformedCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const loadChatConversations = async () => {
    try {
      const chatService = await import('../../services/chatService');
      const conversations = await chatService.getAdminConversations();
      setChatConversations(conversations);
    } catch (error) {
      console.error('Error loading chat conversations:', error);
      // Don't show alert for chat loading errors, just log them
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (searchQuery) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(customer => customer.role === roleFilter);
    }

    setFilteredCustomers(filtered);
  };

  const getRoleStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'rejected': return theme.colors.danger;
      default: return theme.colors.textSecondary;
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    // Navigate to customer details screen
    Alert.alert('View Customer', `View details for ${customer.name}`);
  };

  const handleUpdateRoleStatus = async (customer: Customer, newStatus: 'approved' | 'rejected') => {
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
        Alert.alert('Error', 'Unauthorized to update role status. Admin access required.');
        return;
      }

      // Update role status in database
      const { error } = await supabase
        .from('profiles')
        .update({
          role_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (error) throw error;

      // Update local state
      const updatedCustomers = customers.map(c =>
        c.id === customer.id ? { ...c, role_status: newStatus } : c
      );
      setCustomers(updatedCustomers);
      Alert.alert('Success', `Customer role status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating role status:', error);
      Alert.alert('Error', `Failed to update role status: ${error.message}`);
    }
  };

  const handleContactCustomer = (customer: Customer) => {
    const conversation = chatConversations.find(conv => conv.customer_id === customer.id);

    Alert.alert(
      'Contact Customer',
      `How would you like to contact ${customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Chat',
          onPress: () => {
            if (conversation) {
              (navigation as any).navigate('AdminChat', {
                conversationId: conversation.id,
                customerName: customer.name,
              });
            } else {
              Alert.alert('No Chat History', 'This customer has not started a chat conversation yet.');
            }
          }
        },
        {
          text: 'Email',
          onPress: () => {
            // Open email client
            Alert.alert('Email', `Send email to ${customer.email}`);
          }
        },
        {
          text: 'Call',
          onPress: () => {
            // Initiate phone call
            Alert.alert('Call', `Call ${customer.phone}`);
          }
        }
      ]
    );
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <Card style={styles.customerCard}>
      <Card.Content>
        <View style={styles.customerHeader}>
          <View style={styles.customerInfo}>
            <Title style={styles.customerName}>{item.name}</Title>
            <Paragraph style={styles.customerEmail}>{item.email}</Paragraph>
            {item.phone && (
              <Paragraph style={styles.customerPhone}>{item.phone}</Paragraph>
            )}
          </View>
          <View style={styles.customerBadges}>
            <Chip
              style={[styles.roleChip, { backgroundColor: theme.colors.primary + '20' }]}
              textStyle={{ color: theme.colors.primary }}
            >
              {item.role.replace('_', ' ')}
            </Chip>
            <Chip
              style={[styles.statusChip, { backgroundColor: getRoleStatusColor(item.role_status) + '20' }]}
              textStyle={{ color: getRoleStatusColor(item.role_status) }}
            >
              {item.role_status}
            </Chip>
            {(() => {
              const conversation = chatConversations.find(conv => conv.customer_id === item.id);
              const unreadCount = conversation?.unread_count || 0;
              return unreadCount > 0 ? (
                <View style={styles.chatBadge}>
                  <Badge style={styles.badge}>{unreadCount}</Badge>
                </View>
              ) : null;
            })()}
          </View>
        </View>

        <View style={styles.customerDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              {item.city_name}, {item.province_name}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              Joined: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          {item.last_order_date && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>
                Last Order: {new Date(item.last_order_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.customerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.total_orders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₱{item.total_spent.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        <View style={styles.customerActions}>
          <Button
            mode="outlined"
            onPress={() => handleViewCustomer(item)}
            style={styles.viewButton}
          >
            View Details
          </Button>

          <Button
            mode="contained"
            onPress={() => handleContactCustomer(item)}
            style={styles.contactButton}
          >
            Contact
          </Button>

          {item.role !== 'customer' && item.role_status === 'pending' && (
            <View style={styles.approvalActions}>
              <TouchableOpacity
                style={[styles.approvalButton, { backgroundColor: theme.colors.success + '20' }]}
                onPress={() => handleUpdateRoleStatus(item, 'approved')}
              >
                <Ionicons name="checkmark" size={20} color={theme.colors.success} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approvalButton, { backgroundColor: theme.colors.danger + '20' }]}
                onPress={() => handleUpdateRoleStatus(item, 'rejected')}
              >
                <Ionicons name="close" size={20} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
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
        <Text style={styles.title}>Customer Management</Text>
        <Text style={styles.subtitle}>Customer database and communication</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search customers..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Role Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, !roleFilter && styles.filterChipSelected]}
          onPress={() => setRoleFilter(null)}
        >
          <Text style={[styles.filterChipText, !roleFilter && styles.filterChipTextSelected]}>
            All Roles
          </Text>
        </TouchableOpacity>
        {roles.map(role => (
          <TouchableOpacity
            key={role}
            style={[styles.filterChip, roleFilter === role && styles.filterChipSelected]}
            onPress={() => setRoleFilter(role)}
          >
            <Text style={[styles.filterChipText, roleFilter === role && styles.filterChipTextSelected]}>
              {role.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Customers List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.customersList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No customers found</Text>
            <Text style={styles.emptySubtext}>Customers will appear here when they register</Text>
          </View>
        }
      />

      {/* Export Data FAB */}
      <FAB
        icon="download"
        style={styles.fab}
        onPress={() => {
          // Export customer data
          Alert.alert('Export Data', 'Export customer data to CSV');
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
    textTransform: 'capitalize',
  },
  filterChipTextSelected: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  customersList: {
    padding: wp(5),
    paddingBottom: hp(10),
  },
  customerCard: {
    marginBottom: hp(2),
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  customerEmail: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  customerPhone: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  customerBadges: {
    alignItems: 'flex-end',
  },
  roleChip: {
    marginBottom: hp(0.5),
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  customerDetails: {
    marginBottom: hp(1.5),
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
  customerStats: {
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
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: rf(12),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  customerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewButton: {
    flex: 1,
    marginRight: wp(2),
  },
  contactButton: {
    flex: 1,
    marginLeft: wp(2),
  },
  approvalActions: {
    flexDirection: 'row',
    marginLeft: wp(2),
  },
  approvalButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    justifyContent: 'center',
    alignItems: 'center',
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
  chatBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  badge: {
    backgroundColor: theme.colors.danger,
    color: theme.colors.surface,
  },
});

export default CustomerManagementScreen;