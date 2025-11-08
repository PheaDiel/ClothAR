import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Title, Paragraph, Button, Chip, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';
import { supabase } from '../../services/supabase';

interface OrderItem {
  id: string;
  product_name: string;
  variant_info: string;
  quantity: number;
  unit_price: number;
  fabric_name?: string;
  measurements?: any;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  user_address?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'tailoring' | 'quality_check' | 'ready_for_delivery' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  payment_method?: string;
  payment_status?: string;
  material_provided_by_customer?: boolean;
  measurement_info?: string;
  notes?: string;
}

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = (route.params as { orderId: string }) || {};

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [notes, setNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const orderStatuses = [
    'pending', 'confirmed', 'processing', 'tailoring',
    'quality_check', 'ready_for_delivery', 'shipped', 'delivered'
  ];

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
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

      if (!['admin', 'shop_owner'].includes(profile?.role)) {
        Alert.alert('Error', 'Unauthorized to view order details. Admin access required.');
        return;
      }

      // Fetch order details with customer profile and order items
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            product_description,
            variant_details,
            fabric_name,
            quantity,
            unit_price,
            total_price,
            material_provided_by_customer,
            measurement_snapshot,
            customizations
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch customer profile data
      const { data: customerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('name, phone, province_name, city_name, barangay')
        .eq('id', orderData.user_id)
        .single();

      if (profileError) {
        console.warn('Could not fetch customer profile:', profileError);
      }

      // Transform order items
      const transformedItems: OrderItem[] = (orderData.order_items || []).map((item: any) => ({
        id: item.id,
        product_name: item.product_name,
        variant_info: item.variant_details ? Object.entries(item.variant_details).map(([key, value]) => `${key}: ${value}`).join(', ') : '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        fabric_name: item.fabric_name,
        measurements: item.measurement_snapshot || {},
      }));

      // Construct customer address
      const customerAddress = customerProfile ?
        [customerProfile.barangay, customerProfile.city_name, customerProfile.province_name]
          .filter(Boolean)
          .join(', ') : '';

      // Determine material provision and measurement info
      const materialProvidedByCustomer = transformedItems.some(item => item.fabric_name && item.fabric_name !== 'Store Provided');
      const hasMeasurements = transformedItems.some(item => item.measurements && Object.keys(item.measurements).length > 0);
      const measurementInfo = hasMeasurements ? 'Measurements provided' : 'Measurement consultation needed';

      // Construct the order object
      const order: Order = {
        id: orderData.id,
        order_number: orderData.order_number,
        user_id: orderData.user_id,
        user_name: customerProfile?.name || 'Unknown Customer',
        user_email: '', // Email not stored in profiles, would need to be fetched from auth.users if needed
        user_phone: customerProfile?.phone || '',
        user_address: customerAddress,
        status: orderData.status,
        total_amount: orderData.total_amount,
        created_at: orderData.created_at,
        items: transformedItems,
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status,
        material_provided_by_customer: materialProvidedByCustomer,
        measurement_info: measurementInfo,
        notes: orderData.tailoring_notes || '',
      };

      setOrder(order);
      setNotes(order.notes || '');
    } catch (error) {
      console.error('Error loading order details:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
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

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return;

    setUpdatingStatus(true);
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

      if (!['admin', 'shop_owner'].includes(profile?.role)) {
        Alert.alert('Error', 'Unauthorized to update order status. Admin access required.');
        return;
      }

      // Update order status in database
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      setOrder(prev => prev ? { ...prev, status: newStatus as Order['status'] } : null);
      Alert.alert('Success', `Order status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', `Failed to update order status: ${error.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!order) return;

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

      if (!['admin', 'shop_owner'].includes(profile?.role)) {
        Alert.alert('Error', 'Unauthorized to update order notes. Admin access required.');
        return;
      }

      // Update order notes in database
      const { error } = await supabase
        .from('orders')
        .update({
          tailoring_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      setOrder(prev => prev ? { ...prev, notes } : null);
      Alert.alert('Success', 'Notes saved successfully');
    } catch (error: any) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', `Failed to save notes: ${error.message}`);
    }
  };

  const handleContactCustomer = () => {
    if (!order) return;

    Alert.alert(
      'Contact Customer',
      `How would you like to contact ${order.user_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email',
          onPress: () => {
            Alert.alert('Email', `Send email to ${order.user_email}`);
          }
        },
        {
          text: 'Call',
          onPress: () => {
            Alert.alert('Call', `Call ${order.user_phone}`);
          }
        }
      ]
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>Order not found</Text>
        </View>
      </View>
    );
  }

  const currentStatusIndex = orderStatuses.indexOf(order.status);
  const nextStatus = orderStatuses[currentStatusIndex + 1];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Order Details</Text>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
        </View>

        {/* Order Status */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statusContainer}>
              <Text style={styles.sectionTitle}>Order Status</Text>
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) + '20' }]}
                textStyle={{ color: getStatusColor(order.status) }}
              >
                {order.status.replace('_', ' ').toUpperCase()}
              </Chip>
            </View>

            {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Button
                mode="contained"
                onPress={() => handleUpdateStatus(nextStatus)}
                style={styles.updateButton}
                loading={updatingStatus}
              >
                Advance to {nextStatus.replace('_', ' ')}
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Customer Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Customer Information</Title>

            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{order.user_name}</Text>
              <Text style={styles.customerEmail}>{order.user_email}</Text>
              {order.user_phone && (
                <Text style={styles.customerPhone}>{order.user_phone}</Text>
              )}
              {order.user_address && (
                <Text style={styles.customerAddress}>{order.user_address}</Text>
              )}
            </View>

            <Button
              mode="outlined"
              onPress={handleContactCustomer}
              style={styles.contactButton}
              icon="chatbubble-outline"
            >
              Contact Customer
            </Button>
          </Card.Content>
        </Card>

        {/* Order Items */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Order Items</Title>

            {order.items.map((item, index) => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemPrice}>₱{item.unit_price.toLocaleString()}</Text>
                </View>

                <Text style={styles.itemVariant}>{item.variant_info}</Text>
                <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>

                {item.fabric_name && (
                  <Text style={styles.itemFabric}>Fabric: {item.fabric_name}</Text>
                )}

                {item.measurements && (
                  <View style={styles.measurementsContainer}>
                    <Text style={styles.measurementsTitle}>Measurements:</Text>
                    {Object.entries(item.measurements).map(([key, value]) => (
                      <Text key={key} style={styles.measurement}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}: {String(value)}"
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₱{order.total_amount.toLocaleString()}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Payment Information */}
        {order.payment_method && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Payment Information</Title>

              <View style={styles.paymentContainer}>
                <Text style={styles.paymentText}>Method: {order.payment_method}</Text>
                <Text style={[styles.paymentText, {
                  color: order.payment_status === 'paid' ? theme.colors.success : theme.colors.warning
                }]}>
                  Status: {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Material Provision */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Material Provision</Title>

            <View style={styles.materialContainer}>
              <Text style={styles.materialText}>
                {order.material_provided_by_customer ? 'Customer will provide fabric' : 'Store will provide fabric'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Measurement Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Measurement Information</Title>

            <View style={styles.measurementContainer}>
              <Text style={styles.measurementText}>
                {order.measurement_info || 'No measurement information available'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Order Notes */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Order Notes</Title>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={styles.notesInput}
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="Add notes about this order..."
            />

            <Button
              mode="outlined"
              onPress={handleSaveNotes}
              style={styles.saveNotesButton}
            >
              Save Notes
            </Button>
          </Card.Content>
        </Card>

        {/* Order Timeline */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Order Timeline</Title>

            <View style={styles.timelineContainer}>
              <View style={styles.timelineItem}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Order Placed</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(order.created_at).toLocaleDateString()} at{' '}
                    {new Date(order.created_at).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
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
  orderNumber: {
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
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  updateButton: {
    marginTop: hp(1),
  },
  customerInfo: {
    marginBottom: hp(2),
  },
  customerName: {
    fontSize: rf(18),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  customerEmail: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.5),
  },
  customerPhone: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  customerAddress: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  contactButton: {
    marginTop: hp(1),
  },
  orderItem: {
    marginBottom: hp(2),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1),
  },
  itemName: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  itemPrice: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  itemVariant: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.5),
  },
  itemQuantity: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.5),
  },
  itemFabric: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.5),
  },
  measurementsContainer: {
    marginTop: hp(1),
  },
  measurementsTitle: {
    fontSize: rf(14),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  measurement: {
    fontSize: rf(12),
    color: theme.colors.textSecondary,
    marginLeft: wp(2),
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  totalAmount: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  paymentContainer: {
    marginTop: hp(1),
  },
  paymentText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.5),
  },
  materialContainer: {
    marginTop: hp(1),
  },
  materialText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  measurementContainer: {
    marginTop: hp(1),
  },
  measurementText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  notesInput: {
    marginBottom: hp(2),
  },
  saveNotesButton: {
    alignSelf: 'flex-start',
  },
  timelineContainer: {
    marginTop: hp(1),
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: hp(2),
  },
  timelineContent: {
    marginLeft: wp(3),
    flex: 1,
  },
  timelineTitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  timelineDate: {
    fontSize: rf(12),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
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

export default OrderDetailsScreen;