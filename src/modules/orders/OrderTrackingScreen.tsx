// src/modules/orders/OrderTrackingScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar, Button } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { RouteProp, useRoute } from '@react-navigation/native';

type ParamList = {
  OrderTracking: { orderId?: number };
};

const STATUS_STEPS = ['Pending', 'Confirmed', 'Packed', 'Out for delivery', 'Delivered'];

export default function OrderTrackingScreen({ navigation }: any) {
  const route = useRoute<RouteProp<ParamList, 'OrderTracking'>>();
  const orderId = route.params?.orderId;
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    // Simulate progress over time: every 3.5s -> next step
    const timers: number[] = [];
    for (let s = 1; s < STATUS_STEPS.length; s++) {
      const t = setTimeout(() => {
        setStep(s);
      }, s * 3500);
      timers.push(Number(t));
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const progress = Math.min(1, (step + 1) / STATUS_STEPS.length);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Order Tracking" />
      <View style={styles.container}>
        <Text variant="titleMedium">Order ID: #{orderId || '—'}</Text>
        <Text style={{ marginTop: 8 }}>{STATUS_STEPS[step]}</Text>
        <ProgressBar progress={progress} style={{ marginTop: 12, height: 8, borderRadius: 8 }} />

        <View style={{ marginTop: 20 }}>
          {STATUS_STEPS.map((s, i) => (
            <Text key={s} style={{ marginVertical: 6, opacity: i <= step ? 1 : 0.5 }}>
              {i <= step ? '● ' : '○ '} {s}
            </Text>
          ))}
        </View>

        <Button mode="outlined" onPress={() => navigation.navigate('Dashboard')} style={{ marginTop: 24 }}>
          Back to shop
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
});
