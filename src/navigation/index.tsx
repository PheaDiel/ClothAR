// src/navigation/index.tsx
import React, { useContext, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from '../modules/auth/LoginScreen';
import RegisterScreen from '../modules/auth/RegisterScreen';
import DashboardScreen from '../modules/dashboard/DashboardScreen';
import InventoryListScreen from '../modules/inventory/InventoryListScreen';
import InventoryFormScreen from '../modules/inventory/InventoryFormScreen';
import ProductScreen from '../modules/orders/ProductScreen';
import CartScreen from '../modules/orders/CartScreen';
import CheckoutScreen from '../modules/orders/CheckoutScreen';
import OrderConfirmationScreen from '../modules/orders/OrderConfirmationScreen';
import OrderTrackingScreen from '../modules/orders/OrderTrackingScreen';
import CameraScreen from '../modules/camera/CameraScreen';
import ProfileScreen from '../modules/profile/ProfileScreen';
import { AuthContext } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { IconButton } from 'react-native-paper';
import Loading from '../components/Loading';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Dashboard" component={DashboardScreen} />
      <Tabs.Screen name="Camera" component={CameraScreen} />
      <Tabs.Screen name="InventoryList" component={InventoryListScreen} options={{ title: 'Inventory' }} />
      <Tabs.Screen name="Cart" component={CartScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export default function RootNavigation() {
  const { user, isLoading } = useContext(AuthContext);
  const [initializing, setInitializing] = useState(true);

  // Check if we're still initializing
  useEffect(() => {
    if (!isLoading) {
      setInitializing(false);
    }
  }, [isLoading]);

  // Show loading screen while initializing
  if (initializing) {
    return <Loading />;
  }

  return (
    <CartProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Product" component={ProductScreen} />
            <Stack.Screen name="InventoryForm" component={InventoryFormScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          </>
        )}
      </Stack.Navigator>
    </CartProvider>
  );
}
