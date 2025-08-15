// src/modules/orders/OrderConfirmationScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { RouteProp, useRoute } from '@react-navigation/native';

type ParamList = {
  OrderConfirmation: { orderId: number };
};

export default function OrderConfirmationScreen({ navigation }: any) {
  const route = useRoute<RouteProp<ParamList, 'OrderConfirmation'>>();
  const orderId = route.params?.orderId;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Order Confirmed" />
      <View style={styles.container}>
        <Text variant="headlineSmall">Thank you!</Text>
        <Text style={{ marginTop: 12 }}>Your order has been placed.</Text>
        <Text style={{ marginTop: 8 }}>Order ID: #{orderId}</Text>

        <Button mode="contained" onPress={() => navigation.navigate('OrderTracking', { orderId })} style={{ marginTop: 20 }}>
          Track order
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
