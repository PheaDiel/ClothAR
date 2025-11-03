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
  status: 'pending' | 'confirmed' | 'processing' | 'tailoring' | 'quality_check' | 'ready_for_delivery' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  shipping_address?: any;
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
      // Mock data - replace with actual API call
      const mockOrder: Order = {
        id: orderId || '1',
        order_number: '20240115001',
        user_id: 'user1',
        user_name: 'John Doe',
        user_email: 'john.doe@example.com',
        user_phone: '+63 912 345 6789',
        status: 'pending',
        total_amount: 2500,
        created_at: '2024-01-15T10:00:00Z',
        items: [
          {
            id: '1',
            product_name: 'Classic White Shirt',
            variant_info: 'Size: M, Color: White',
            quantity: 1,
            unit_price: 2500,
            fabric_name: 'Premium Cotton',
            measurements: {
              chest: 40,
              waist: 32,
              length: 28,
            },
          },
        ],
        shipping_address: {
          street: '123 Main St',
          city: 'Makati',
          province: 'Metro Manila',
          zip_code: '1200',
        },
        notes: 'Customer requested express delivery',
      };
      setOrder(mockOrder);
      setNotes(mockOrder.notes || '');
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
      // Mock update - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setOrder(prev => prev ? { ...prev, status: newStatus as Order['status'] } : null);
      Alert.alert('Success', `Order status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!order) return;

    try {
      // Mock save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setOrder(prev => prev ? { ...prev, notes } : null);
      Alert.alert('Success', 'Notes saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save notes');
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

        {/* Shipping Address */}
        {order.shipping_address && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Shipping Address</Title>

              <View style={styles.addressContainer}>
                <Text style={styles.addressText}>{order.shipping_address.street}</Text>
                <Text style={styles.addressText}>
                  {order.shipping_address.city}, {order.shipping_address.province}
                </Text>
                <Text style={styles.addressText}>{order.shipping_address.zip_code}</Text>
              </View>
            </Card.Content>
          </Card>
        )}

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
  addressContainer: {
    marginTop: hp(1),
  },
  addressText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.5),
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