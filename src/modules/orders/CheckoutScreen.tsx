// src/modules/checkout/CheckoutScreen.tsx
import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Button, RadioButton, TextInput, Card } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import AppHeader from '../../components/AppHeader';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { OrderService } from '../../services/orderService';
import { PaymentService } from '../../services/paymentService';
import { rf } from '../../utils/responsiveUtils';

export default function CheckoutScreen({ navigation }: any) {
    const { items, total, clear } = useContext(CartContext);
    const { user } = useContext(AuthContext);
    const [paymentMethod, setPaymentMethod] = useState<'gcash_full' | 'gcash_partial' | 'pay_on_pickup'>('pay_on_pickup');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [materialProvidedByCustomer, setMaterialProvidedByCustomer] = useState<boolean>(false);
    const [showPaymentFlow, setShowPaymentFlow] = useState(false);
    const [orderId, setOrderId] = useState<string>('');
    const [receiptImage, setReceiptImage] = useState<string>('');
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [gcashQrUrl] = useState(PaymentService.getGcashQrUrl());

   // Pre-fill fields with user data
   useEffect(() => {
     if (user) {
       setName(user.name || '');
       setPhone(user.phone || '');
       setAddress(user.barangay && user.city_name && user.province_name ? `${user.barangay}, ${user.city_name}, ${user.province_name}` : '');
     }
   }, [user]);

  const onPlaceOrder = async () => {
    if (!name || !phone || !address) {
      Alert.alert('Missing info', 'Please fill in all required fields.');
      return;
    }

    const orderData = {
      cartItems: items,
      shippingAddress: {
        street: address,
        city: '',
        state: '',
        zipCode: '',
        country: 'Philippines',
      },
      paymentMethod,
    };

    try {
      const result = await OrderService.createOrder(
        items,
        orderData.shippingAddress,
        paymentMethod
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create order');
      }

      const createdOrder = result.order as any;
      const orderId = createdOrder?.order_number || createdOrder?.id;

      // If GCash payment, show payment flow
      if (paymentMethod === 'gcash_full' || paymentMethod === 'gcash_partial') {
        setOrderId(orderId);
        setShowPaymentFlow(true);
      } else {
        // Pay on pickup - go directly to confirmation
        clear();
        navigation.replace('OrderConfirmation', {
          orderId,
          order: result.order
        });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not place order. Try again.');
    }
  };

  const pickReceiptImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const uploadReceipt = async () => {
    if (!receiptImage) {
      Alert.alert('No image', 'Please select a receipt image first');
      return;
    }

    setUploadingReceipt(true);
    try {
      const result = await PaymentService.uploadReceipt(orderId, receiptImage);
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload receipt');
      }

      clear();
      navigation.replace('OrderConfirmation', {
        orderId,
        order: { id: orderId, payment_verification_status: 'pending' }
      });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not upload receipt. Try again.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  if (showPaymentFlow) {
    return (
      <View style={{ flex: 1 }}>
        <AppHeader title="Complete Payment" />
        <ScrollView style={styles.container}>
          <Card style={styles.paymentCard}>
            <Card.Content>
              <Text style={styles.paymentTitle}>Order #{orderId}</Text>
              <Text style={styles.paymentAmount}>
                Amount to Pay: ₱{paymentMethod === 'gcash_partial' ?
                  PaymentService.calculatePartialPayment(total()).toFixed(2) :
                  total().toFixed(2)}
              </Text>

              <Text style={styles.paymentInstructions}>
                1. Open your GCash app{'\n'}
                2. Scan the QR code below{'\n'}
                3. Pay the exact amount shown{'\n'}
                4. Take a screenshot of the payment confirmation{'\n'}
                5. Upload the screenshot below
              </Text>

              <View style={styles.qrContainer}>
                <Text style={styles.qrLabel}>GCash QR Code</Text>
                <Image
                  source={{ uri: gcashQrUrl }}
                  style={styles.qrCode}
                  resizeMode="contain"
                />
                <Text style={styles.qrNote}>
                  QR Code for Begino Tailoring
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.uploadCard}>
            <Card.Content>
              <Text style={styles.uploadTitle}>Upload Payment Receipt</Text>

              {!receiptImage ? (
                <TouchableOpacity style={styles.uploadButton} onPress={pickReceiptImage}>
                  <Text style={styles.uploadButtonText}>Select Receipt Image</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.receiptPreview}>
                  <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={pickReceiptImage}
                  >
                    <Text style={styles.changeButtonText}>Change Image</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Button
                mode="contained"
                onPress={uploadReceipt}
                disabled={!receiptImage || uploadingReceipt}
                loading={uploadingReceipt}
                style={styles.submitButton}
              >
                {uploadingReceipt ? 'Uploading...' : 'Submit Receipt'}
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
       <AppHeader title="Pre-order Checkout" />
       <ScrollView style={styles.container}>
         <Text variant="titleMedium">Contact info</Text>
         <TextInput label="Full name" value={name} onChangeText={setName} style={{ marginTop: 8 }} />
         <TextInput label="Phone" value={phone} onChangeText={setPhone} style={{ marginTop: 8 }} keyboardType="phone-pad" />
         <TextInput label="Address" value={address} onChangeText={setAddress} style={{ marginTop: 8 }} />

         <Text variant="titleMedium" style={{ marginTop: 12 }}>
           Payment Method
         </Text>
         <RadioButton.Group onValueChange={(v) => setPaymentMethod(v as any)} value={paymentMethod}>
           <View style={{ flexDirection: 'column' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
               <RadioButton value="gcash_full" />
               <Text>GCash - Full Payment (₱{total().toFixed(2)})</Text>
             </View>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
               <RadioButton value="gcash_partial" />
               <Text>GCash - Partial Payment (₱{PaymentService.calculatePartialPayment(total()).toFixed(2)})</Text>
             </View>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <RadioButton value="pay_on_pickup" />
               <Text>Pay on Pickup (₱{total().toFixed(2)})</Text>
             </View>
           </View>
         </RadioButton.Group>

         <Text variant="titleMedium" style={{ marginTop: 12 }}>
           Material Provision
         </Text>
         <RadioButton.Group onValueChange={(v) => setMaterialProvidedByCustomer(v === 'customer')} value={materialProvidedByCustomer ? 'customer' : 'shop'}>
           <View style={{ flexDirection: 'column' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
               <RadioButton value="shop" />
               <Text>Shop provides material</Text>
             </View>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <RadioButton value="customer" />
               <Text>Customer provides material</Text>
             </View>
           </View>
         </RadioButton.Group>

         <Text variant="titleMedium" style={{ marginTop: 12 }}>
           Order Summary
         </Text>
         {items.map((item, index) => (
           <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
             <Text>{item.name} (x{item.quantity})</Text>
             <Text>₱{(item.price * item.quantity).toFixed(2)}</Text>
           </View>
         ))}
         <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 8 }}>
           <Text variant="bodyMedium">Measurement</Text>
           <Text variant="bodyMedium">Details</Text>
         </View>
         {items.map((item, index) => (
           <View key={`measurement-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
             <Text style={{ fontSize: rf(12) }}>{item.name}</Text>
             <Text style={{ fontSize: rf(12) }}>{item.measurementName}</Text>
           </View>
         ))}

         <Text variant="bodyMedium" style={{ marginTop: 12 }}>
           Total: ₱{total().toFixed(2)}
         </Text>

         <Button mode="contained" onPress={onPlaceOrder} style={{ marginTop: 16, marginBottom: 20 }}>
           Place Pre-order
         </Button>
       </ScrollView>
    </View>
   );
}

const styles = StyleSheet.create({
   container: { padding: 12, flex: 1 },
   paymentCard: {
     marginBottom: 16,
     elevation: 2,
   },
   paymentTitle: {
     fontSize: 20,
     fontWeight: 'bold',
     color: '#333',
     marginBottom: 8,
   },
   paymentAmount: {
     fontSize: 24,
     fontWeight: 'bold',
     color: '#2E86AB',
     marginBottom: 16,
   },
   paymentInstructions: {
     fontSize: 14,
     color: '#666',
     lineHeight: 20,
     marginBottom: 16,
   },
   qrContainer: {
     alignItems: 'center',
     padding: 16,
     backgroundColor: '#f9f9f9',
     borderRadius: 8,
   },
   qrLabel: {
     fontSize: 16,
     fontWeight: '600',
     color: '#333',
     marginBottom: 12,
   },
   qrCode: {
     width: 200,
     height: 200,
     marginBottom: 8,
   },
   qrNote: {
     fontSize: 12,
     color: '#666',
     textAlign: 'center',
   },
   uploadCard: {
     marginBottom: 16,
     elevation: 2,
   },
   uploadTitle: {
     fontSize: 18,
     fontWeight: 'bold',
     color: '#333',
     marginBottom: 16,
   },
   uploadButton: {
     borderWidth: 2,
     borderColor: '#2E86AB',
     borderStyle: 'dashed',
     borderRadius: 8,
     padding: 40,
     alignItems: 'center',
     marginBottom: 16,
   },
   uploadButtonText: {
     fontSize: 16,
     color: '#2E86AB',
     fontWeight: '600',
   },
   receiptPreview: {
     alignItems: 'center',
     marginBottom: 16,
   },
   receiptImage: {
     width: 200,
     height: 300,
     borderRadius: 8,
     marginBottom: 12,
   },
   changeButton: {
     paddingHorizontal: 16,
     paddingVertical: 8,
     backgroundColor: '#f0f0f0',
     borderRadius: 6,
   },
   changeButtonText: {
     fontSize: 14,
     color: '#666',
   },
   submitButton: {
     marginTop: 8,
   },
 });
