// src/modules/checkout/CheckoutScreen.tsx
import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, RadioButton, TextInput } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { placeOrder } from '../../services/api';
import { rf } from '../../utils/responsiveUtils';

export default function CheckoutScreen({ navigation }: any) {
   const { items, total, clear } = useContext(CartContext);
   const { user } = useContext(AuthContext);
   const [paymentMethod, setPaymentMethod] = useState<'gcash_full' | 'gcash_installment' | 'pay_on_pickup'>('pay_on_pickup');
   const [name, setName] = useState('');
   const [phone, setPhone] = useState('');
   const [address, setAddress] = useState('');
   const [materialProvidedByCustomer, setMaterialProvidedByCustomer] = useState<boolean>(false);

   // Pre-fill fields with user data
   useEffect(() => {
     if (user) {
       setName(user.name || '');
       setPhone(user.phone || '');
       setAddress(user.address || '');
     }
   }, [user]);

  const onPlaceOrder = async () => {
    if (!name || !phone || !address) {
      Alert.alert('Missing info', 'Please fill in all required fields.');
      return;
    }
    const order = {
      items: items.map(item => ({
        itemId: item.itemId,
        name: item.name,
        price: item.price,
        measurementId: item.measurementId,
        measurementName: item.measurementName,
        quantity: item.quantity,
      })),
      totalAmount: total(),
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
      const res = await placeOrder(order);
      clear();
      navigation.replace('OrderConfirmation', { orderId: res._id || Math.floor(Math.random() * 1000000), order: res });
    } catch (e) {
      Alert.alert('Error', 'Could not place order. Try again.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Pre-order Checkout" />
      <View style={styles.container}>
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
              <Text>GCash - Full Payment</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <RadioButton value="gcash_installment" />
              <Text>GCash - Installments</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <RadioButton value="pay_on_pickup" />
              <Text>Pay on Pickup</Text>
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

        <Button mode="contained" onPress={onPlaceOrder} style={{ marginTop: 16 }}>
          Place Pre-order (mock)
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, flex: 1 },
});
