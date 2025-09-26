// src/modules/orders/OrderConfirmationScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { RouteProp, useRoute } from '@react-navigation/native';

type ParamList = {
  OrderConfirmation: { orderId: number; order?: any };
};

export default function OrderConfirmationScreen({ navigation }: any) {
  const route = useRoute<RouteProp<ParamList, 'OrderConfirmation'>>();
  const orderId = route.params?.orderId;
  const order = route.params?.order;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Pre-order Confirmed" />
      <View style={styles.container}>
        <Text variant="headlineSmall">Thank you!</Text>
        <Text style={{ marginTop: 12 }}>Your pre-order has been placed.</Text>
        <Text style={{ marginTop: 8 }}>Pre-order ID: #{orderId}</Text>

        {order && order.items && (
          <>
            <Text variant="titleMedium" style={{ marginTop: 16 }}>
              Order Details
            </Text>
            {order.items.map((item: any, index: number) => (
              <View key={index} style={{ marginTop: 8 }}>
                <Text>{item.name} (x{item.quantity}) - ₱{(item.price * item.quantity).toFixed(2)}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>Measurement: {item.measurementName}</Text>
              </View>
            ))}
            <Text variant="bodyMedium" style={{ marginTop: 12 }}>
              Total: ₱{order.total || order.totalAmount || 0}
            </Text>
          </>
        )}

        <Button mode="contained" onPress={() => navigation.navigate('OrderTracking', { orderId })} style={{ marginTop: 20 }}>
          Track pre-order
        </Button>

        <Button mode="outlined" onPress={() => navigation.navigate('Dashboard')} style={{ marginTop: 12 }}>
          Back to shop
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center' },
});
