// src/modules/checkout/CheckoutScreen.tsx
import React, { useContext, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, RadioButton, TextInput } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { CartContext } from '../../context/CartContext';
import { placeOrder } from '../../services/mockApi';

export default function CheckoutScreen({ navigation }: any) {
  const { items, total, clear } = useContext(CartContext);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const onPlaceOrder = async () => {
    if (!name || !phone || (deliveryType === 'delivery' && !address)) {
      Alert.alert('Missing info', 'Please fill in all required fields.');
      return;
    }
    const order = {
      items,
      total: total(),
      deliveryType,
      customer: { name, phone, address },
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await placeOrder(order);
      clear();
      navigation.replace('OrderConfirmation', { orderId: res.orderId || Math.floor(Math.random() * 1000000) });
    } catch (e) {
      Alert.alert('Error', 'Could not place order. Try again.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Checkout" />
      <View style={styles.container}>
        <Text variant="titleMedium">Contact info</Text>
        <TextInput label="Full name" value={name} onChangeText={setName} style={{ marginTop: 8 }} />
        <TextInput label="Phone" value={phone} onChangeText={setPhone} style={{ marginTop: 8 }} keyboardType="phone-pad" />

        <Text variant="titleMedium" style={{ marginTop: 12 }}>
          Delivery
        </Text>
        <RadioButton.Group onValueChange={(v) => setDeliveryType(v as any)} value={deliveryType}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <RadioButton value="delivery" />
            <Text>Delivery</Text>
            <RadioButton value="pickup" />
            <Text>Pickup</Text>
          </View>
        </RadioButton.Group>

        {deliveryType === 'delivery' && (
          <TextInput label="Address" value={address} onChangeText={setAddress} style={{ marginTop: 8 }} />
        )}

        <Text variant="bodyMedium" style={{ marginTop: 12 }}>
          Total: ₱{total().toFixed(2)}
        </Text>

        <Button mode="contained" onPress={onPlaceOrder} style={{ marginTop: 16 }}>
          Place order (mock)
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, flex: 1 },
});
