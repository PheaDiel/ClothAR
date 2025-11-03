import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Card, Title, Paragraph, Button, Chip, Dialog, Portal, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';
import { PaymentService } from '../../services/paymentService';

interface PendingOrder {
  id: string;
  order_number: string;
  total_amount: number;
  payment_type: string;
  receipt_url: string;
  created_at: string;
  profiles: {
    name: string;
    phone: string;
  };
}

const PaymentVerificationScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = async () => {
    try {
      const result = await PaymentService.getPendingVerifications();
      if (result.success) {
        setOrders(result.orders || []);
      } else {
        Alert.alert('Error', result.error || 'Failed to load pending orders');
      }
    } catch (error) {
      console.error('Load pending orders error:', error);
      Alert.alert('Error', 'Failed to load pending orders');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (status: 'verified' | 'rejected') => {
    if (!selectedOrder) return;

    setVerifying(true);
    try {
      const result = await PaymentService.verifyPayment(
        selectedOrder.id,
        status,
        verificationNotes.trim() || undefined
      );

      if (result.success) {
        Alert.alert(
          'Success',
          `Payment ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
          [{ text: 'OK', onPress: () => {
            setShowVerifyDialog(false);
            setSelectedOrder(null);
            setVerificationNotes('');
            loadPendingOrders(); // Refresh the list
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Verify payment error:', error);
      Alert.alert('Error', 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const openVerifyDialog = (order: PendingOrder) => {
    setSelectedOrder(order);
    setShowVerifyDialog(true);
  };

  const renderOrderItem = ({ item }: { item: PendingOrder }) => (
    <Card style={styles.orderCard}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Title style={styles.orderNumber}>Order #{item.order_number}</Title>
            <Paragraph style={styles.customerInfo}>
              {item.profiles?.name} • {item.profiles?.phone}
            </Paragraph>
          </View>
          <Chip
            style={[styles.paymentTypeChip, {
              backgroundColor: item.payment_type === 'gcash_full' ? '#E8F5E8' : '#FFF3E0'
            }]}
            textStyle={{
              color: item.payment_type === 'gcash_full' ? '#2E7D32' : '#E65100'
            }}
          >
            {item.payment_type === 'gcash_full' ? 'Full Payment' : 'Partial Payment'}
          </Chip>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.amountText}>
            Amount: ₱{item.total_amount.toFixed(2)}
          </Text>
          <Text style={styles.dateText}>
            Ordered: {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        {item.receipt_url && (
          <View style={styles.receiptSection}>
            <Text style={styles.receiptLabel}>Payment Receipt:</Text>
            <TouchableOpacity
              style={styles.receiptPreview}
              onPress={() => {
                // Open receipt in full screen or modal
                Alert.alert('Receipt', 'Tap to view full receipt', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'View', onPress: () => {
                    // Navigate to receipt viewer or open in browser
                    // For now, just show alert
                    Alert.alert('Receipt URL', item.receipt_url);
                  }}
                ]);
              }}
            >
              <Image
                source={{ uri: item.receipt_url }}
                style={styles.receiptImage}
                resizeMode="cover"
              />
              <View style={styles.receiptOverlay}>
                <Ionicons name="eye" size={24} color="white" />
                <Text style={styles.receiptOverlayText}>View Receipt</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={() => openVerifyDialog(item)}
            style={styles.verifyButton}
            icon="check-circle"
          >
            Verify Payment
          </Button>
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
        <Text style={styles.title}>Payment Verification</Text>
        <Text style={styles.subtitle}>Review and verify customer payments</Text>
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No pending payments</Text>
            <Text style={styles.emptySubtext}>
              All payments have been verified
            </Text>
          </View>
        }
      />

      {/* Verification Dialog */}
      <Portal>
        <Dialog visible={showVerifyDialog} onDismiss={() => setShowVerifyDialog(false)}>
          <Dialog.Title>Verify Payment</Dialog.Title>
          <Dialog.Content>
            {selectedOrder && (
              <View>
                <Text style={styles.dialogOrderInfo}>
                  Order #{selectedOrder.order_number}
                </Text>
                <Text style={styles.dialogAmount}>
                  Amount: ₱{selectedOrder.total_amount.toFixed(2)}
                </Text>

                <TextInput
                  label="Verification Notes (Optional)"
                  value={verificationNotes}
                  onChangeText={setVerificationNotes}
                  multiline
                  numberOfLines={3}
                  style={styles.notesInput}
                />
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowVerifyDialog(false)}>Cancel</Button>
            <Button
              onPress={() => handleVerifyPayment('rejected')}
              textColor={theme.colors.danger}
              disabled={verifying}
            >
              Reject
            </Button>
            <Button
              onPress={() => handleVerifyPayment('verified')}
              disabled={verifying}
              loading={verifying}
            >
              Verify
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  orderInfo: {
    flex: 1,
    marginRight: wp(2),
  },
  orderNumber: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  customerInfo: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  paymentTypeChip: {
    alignSelf: 'flex-start',
  },
  orderDetails: {
    marginBottom: hp(2),
  },
  amountText: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: hp(0.5),
  },
  dateText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  receiptSection: {
    marginBottom: hp(2),
  },
  receiptLabel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
  },
  receiptPreview: {
    position: 'relative',
    borderRadius: wp(2),
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: hp(20),
    backgroundColor: theme.colors.surface,
  },
  receiptOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptOverlayText: {
    color: 'white',
    fontSize: rf(14),
    fontWeight: '600',
    marginTop: hp(1),
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  verifyButton: {
    minWidth: wp(40),
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
  dialogOrderInfo: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
  },
  dialogAmount: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    marginBottom: hp(2),
  },
  notesInput: {
    marginTop: hp(1),
  },
});

export default PaymentVerificationScreen;