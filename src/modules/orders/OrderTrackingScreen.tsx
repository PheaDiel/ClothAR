import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Card, ProgressBar, Button, Chip, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { Order, OrderStatus } from '../../types';

type ParamList = {
  OrderTracking: { orderId?: string; order?: Order };
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Pre-order Placed', description: 'Your pre-order has been received' },
  { key: 'accepted', label: 'Pre-order Accepted', description: 'Your pre-order has been confirmed' },
  { key: 'in_progress', label: 'In Progress', description: 'Your custom tailoring is being prepared' },
  { key: 'completed', label: 'Ready for Pickup', description: 'Your pre-order is ready for collection' },
  { key: 'cancelled', label: 'Cancelled', description: 'Pre-order has been cancelled' }
];

const getStatusIndex = (status: OrderStatus) => {
  return STATUS_STEPS.findIndex(step => step.key === status) || 0;
};

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return '#FFA726';
    case 'accepted': return '#42A5F5';
    case 'in_progress': return '#AB47BC';
    case 'completed': return '#66BB6A';
    case 'cancelled': return '#EF5350';
    default: return '#999';
  }
};

export default function OrderTrackingScreen({ navigation }: any) {
  const route = useRoute<RouteProp<ParamList, 'OrderTracking'>>();
  const { user } = useContext(AuthContext);
  const orderId = route.params?.orderId;
  const passedOrder = route.params?.order;

  const [order, setOrder] = useState<Order | null>(passedOrder || null);
  const [loading, setLoading] = useState(!passedOrder);

  useEffect(() => {
    if (!passedOrder && orderId) {
      loadOrderDetails();
    }
  }, [orderId, passedOrder]);

  const loadOrderDetails = async () => {
    try {
      // Mock order data - replace with actual API call
      const mockOrder: Order = {
        _id: orderId || '12345',
        userId: user?.id || '',
        items: [
          {
            itemId: '1',
            name: 'Classic White Shirt',
            price: 499,
            measurementId: 'meas1',
            measurementName: 'My Measurements',
            quantity: 1,
            tailoringRequest: {
              measurementId: 'meas1',
              customizations: 'Slim fit, shorter sleeves',
              notes: 'Please ensure comfortable fit'
            }
          }
        ],
        totalAmount: 499,
        status: 'in_progress',
        shippingAddress: {
          street: 'Store Pickup',
          city: 'BGC',
          state: 'Taguig City',
          zipCode: '1634',
          country: 'Philippines'
        },
        paymentMethod: 'GCash - Full Payment',
        tailoringRequired: true,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date()
      };
      setOrder(mockOrder);
    } catch (error) {
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading order details...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Order not found</Text>
          <Button onPress={() => navigation.goBack()}>Go Back</Button>
        </View>
      </View>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const progress = order.status === 'cancelled' ? 0 : (currentStatusIndex + 1) / STATUS_STEPS.length;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <Card style={styles.orderCard}>
          <Card.Content>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{order._id}</Text>
              <Chip
                mode="outlined"
                style={[styles.statusChip, { borderColor: getStatusColor(order.status) }]}
                textStyle={{ color: getStatusColor(order.status) }}
              >
                {STATUS_STEPS[currentStatusIndex]?.label || order.status}
              </Chip>
            </View>

            <Text style={styles.orderDate}>
              Ordered on {order.createdAt?.toLocaleDateString()}
            </Text>

            {order.tailoringRequired && (
              <View style={styles.tailoringBadge}>
                <Ionicons name="cut-outline" size={16} color="#AB47BC" />
                <Text style={styles.tailoringText}>Custom Tailoring Required</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Progress Bar */}
        <Card style={styles.progressCard}>
          <Card.Content>
            <Text style={styles.progressTitle}>Order Progress</Text>
            <ProgressBar
              progress={progress}
              color={getStatusColor(order.status)}
              style={styles.progressBar}
            />

            <View style={styles.statusList}>
              {STATUS_STEPS.map((step, index) => (
                <View key={step.key} style={styles.statusItem}>
                  <View style={styles.statusIndicator}>
                    <Ionicons
                      name={index <= currentStatusIndex ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={index <= currentStatusIndex ? getStatusColor(order.status) : '#ccc'}
                    />
                  </View>
                  <View style={styles.statusText}>
                    <Text style={[
                      styles.statusLabel,
                      index <= currentStatusIndex && styles.statusActive
                    ]}>
                      {step.label}
                    </Text>
                    <Text style={styles.statusDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Order Items */}
        <Card style={styles.itemsCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {order.items.map((item, index) => (
              <View key={index}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetails}>
                      Measurement: {item.measurementName} • Quantity: {item.quantity}
                    </Text>
                    <Text style={styles.itemPrice}>₱{item.price}</Text>
                  </View>
                </View>

                {item.tailoringRequest && (
                  <View style={styles.tailoringRequest}>
                    <Text style={styles.tailoringTitle}>Tailoring Request:</Text>
                    {item.tailoringRequest.measurementId && (
                      <Text style={styles.tailoringDetail}>
                        • Using measurement: {item.tailoringRequest.measurementId}
                      </Text>
                    )}
                    {item.tailoringRequest.customizations && (
                      <Text style={styles.tailoringDetail}>
                        • Customizations: {item.tailoringRequest.customizations}
                      </Text>
                    )}
                    {item.tailoringRequest.notes && (
                      <Text style={styles.tailoringDetail}>
                        • Notes: {item.tailoringRequest.notes}
                      </Text>
                    )}
                  </View>
                )}

                {index < order.items.length - 1 && <Divider style={styles.itemDivider} />}
              </View>
            ))}

            <Divider style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₱{order.totalAmount}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Pickup Information */}
        <Card style={styles.shippingCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Pickup Information</Text>
            <Text style={styles.shippingAddress}>
              Store Location:{'\n'}
              123 Main Street{'\n'}
              BGC, Taguig City{'\n'}
              Metro Manila, Philippines
            </Text>
            <Text style={styles.paymentMethod}>
              Payment Method: {order.paymentMethod}
            </Text>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Profile')}
            style={styles.actionButton}
          >
            View All Pre-orders
          </Button>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Dashboard')}
            style={styles.actionButton}
          >
            Continue Shopping
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  orderCard: {
    margin: 16,
    marginBottom: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusChip: {
    borderWidth: 1,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  tailoringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
  },
  tailoringText: {
    fontSize: 14,
    color: '#AB47BC',
    marginLeft: 6,
    fontWeight: '600',
  },
  progressCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 20,
  },
  statusList: {
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusIndicator: {
    marginRight: 12,
    marginTop: 2,
  },
  statusText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  statusActive: {
    color: '#333',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  itemRow: {
    marginBottom: 12,
  },
  itemInfo: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginTop: 4,
  },
  tailoringRequest: {
    backgroundColor: '#F3E5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  tailoringTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AB47BC',
    marginBottom: 6,
  },
  tailoringDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemDivider: {
    marginVertical: 12,
  },
  totalDivider: {
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E86AB',
  },
  shippingCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  shippingAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
