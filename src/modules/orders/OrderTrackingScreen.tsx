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
import { BUSINESS_LOCATION } from '../../constants';
import { OrderService } from '../../services/orderService';

type ParamList = {
  OrderTracking: { orderId?: string; order?: Order };
};

const STATUS_STEPS = [
   { key: 'pending', label: 'Pre-order Placed', description: 'Your pre-order has been received' },
   { key: 'confirmed', label: 'Payment Confirmed', description: 'Your payment has been verified' },
   { key: 'processing', label: 'Processing', description: 'Your order is being prepared' },
   { key: 'tailoring', label: 'Tailoring', description: 'Your custom tailoring is in progress' },
   { key: 'quality_check', label: 'Quality Check', description: 'Final quality inspection' },
   { key: 'ready_for_delivery', label: 'Ready for Delivery', description: 'Your order is ready for delivery' },
   { key: 'shipped', label: 'Shipped', description: 'Your order has been shipped' },
   { key: 'delivered', label: 'Delivered', description: 'Your order has been delivered' },
   { key: 'cancelled', label: 'Cancelled', description: 'Order has been cancelled' }
 ];

const getStatusIndex = (status: OrderStatus) => {
  return STATUS_STEPS.findIndex(step => step.key === status) || 0;
};

const getStatusColor = (status: OrderStatus) => {
   switch (status) {
     case 'pending': return '#FFA726';
     case 'confirmed': return '#42A5F5';
     case 'processing': return '#AB47BC';
     case 'tailoring': return '#9C27B0';
     case 'quality_check': return '#FF9800';
     case 'ready_for_delivery': return '#2196F3';
     case 'shipped': return '#00BCD4';
     case 'delivered': return '#4CAF50';
     case 'cancelled': return '#EF5350';
     case 'refunded': return '#9E9E9E';
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
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const result = await OrderService.getOrder(orderId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to load order details');
      }

      setOrder(result.order || null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load order details');
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

  // Check if this is an on-site measurement order
  const isOnSiteMeasurement = order.items.some(item =>
    item.measurementId === 'on-site' ||
    item.measurementName === 'On-site Measurement by Tailor'
  );

  const currentStatusIndex = getStatusIndex(order.status);
  const progress = order.status === 'cancelled' ? 0 : (currentStatusIndex + 1) / STATUS_STEPS.length;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <Card style={styles.orderCard}>
          <Card.Content>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{order.order_number || order._id}</Text>
              <Chip
                mode="outlined"
                style={[styles.statusChip, {
                  borderColor: isOnSiteMeasurement ? '#FF9800' : getStatusColor(order.status)
                }]}
                textStyle={{
                  color: isOnSiteMeasurement ? '#FF9800' : getStatusColor(order.status)
                }}
              >
                {isOnSiteMeasurement ? 'Awaiting Measurement' : (STATUS_STEPS[currentStatusIndex]?.label || order.status)}
              </Chip>
            </View>

            <Text style={styles.orderDate}>
              Ordered on {order.created_at ? new Date(order.created_at).toLocaleDateString() : order.createdAt?.toLocaleDateString()}
            </Text>

            {/* Payment Verification Status */}
            {order.payment_verification_status && order.payment_verification_status !== 'verified' && (
              <View style={styles.paymentStatus}>
                <Chip
                  style={[
                    styles.paymentChip,
                    {
                      backgroundColor: order.payment_verification_status === 'pending' ? '#FFF3E0' :
                                      order.payment_verification_status === 'rejected' ? '#FFEBEE' : '#E8F5E8'
                    }
                  ]}
                  textStyle={{
                    color: order.payment_verification_status === 'pending' ? '#E65100' :
                           order.payment_verification_status === 'rejected' ? '#C62828' : '#2E7D32'
                  }}
                >
                  Payment: {order.payment_verification_status === 'pending' ? 'Under Review' :
                           order.payment_verification_status === 'rejected' ? 'Rejected' : 'Verified'}
                </Chip>
              </View>
            )}

            {order.tailoringRequired && (
              <View style={styles.tailoringBadge}>
                <Ionicons name="cut-outline" size={16} color="#AB47BC" />
                <Text style={styles.tailoringText}>Custom Tailoring Required</Text>
              </View>
            )}

            {isOnSiteMeasurement && (
              <View style={styles.measurementNotice}>
                <Ionicons name="information-circle" size={20} color="#FF9800" />
                <Text style={styles.measurementNoticeText}>
                  On-site measurement required before production
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Progress Bar or Measurement Status */}
        {isOnSiteMeasurement ? (
          <Card style={styles.progressCard}>
            <Card.Content>
              <Text style={styles.progressTitle}>Measurement Consultation Status</Text>
              
              <View style={styles.measurementStatusContainer}>
                <View style={styles.measurementIconContainer}>
                  <Ionicons name="calendar-outline" size={40} color="#FF9800" />
                </View>
                
                <Text style={styles.measurementStatusTitle}>
                  Waiting for Measurement Consultation
                </Text>
                
                <Text style={styles.measurementStatusDescription}>
                  Our tailor will contact you within 24-48 hours to schedule an appointment for your measurements.
                </Text>

                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Tailor Contact:</Text>
                  <Text style={styles.contactDetail}>+63 912 345 6789</Text>
                  <Text style={styles.contactDetail}>beginos.tailoring@email.com</Text>
                </View>

                <View style={styles.appointmentActions}>
                  <Button
                    mode="contained"
                    onPress={() => Alert.alert('Contact', 'Opening phone dialer...')}
                    style={styles.appointmentButton}
                    icon="phone"
                  >
                    Call Tailor
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => Alert.alert('Schedule', 'Opening calendar...')}
                    style={styles.appointmentButton}
                    icon="calendar"
                  >
                    Schedule Now
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
        ) : (
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

              {(order.status === 'processing' || order.status === 'tailoring') && (
                <View style={styles.inProgressDetails}>
                  <Text style={styles.inProgressTitle}>
                    {order.status === 'processing' ? 'Processing Progress' : 'Tailoring Progress'}
                  </Text>
                  <Text style={styles.inProgressInfo}>
                    {order.status === 'processing'
                      ? 'Your order is being prepared'
                      : 'Your custom tailoring is currently in progress'
                    }
                  </Text>
                  <ProgressBar
                    progress={order.status === 'processing' ? 0.3 : 0.7} // Example progress
                    color={getStatusColor(order.status)}
                    style={styles.inProgressBar}
                  />
                  <Text style={styles.inProgressPercentage}>
                    {order.status === 'processing' ? '30%' : '70%'} Complete
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

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
              {BUSINESS_LOCATION.address}
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
  measurementNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  measurementNoticeText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  measurementStatusContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  measurementIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  measurementStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  measurementStatusDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 20,
  },
  contactInfo: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  appointmentButton: {
    flex: 1,
  },
  inProgressDetails: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
  },
  inProgressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#AB47BC',
    marginBottom: 8,
  },
  inProgressInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  inProgressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  inProgressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AB47BC',
    textAlign: 'center',
  },
  paymentStatus: {
    marginTop: 8,
  },
  paymentChip: {
    alignSelf: 'flex-start',
  },
});
