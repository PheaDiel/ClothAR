// src/navigation/index.tsx
import React, { useContext, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import LoginScreen from '../modules/auth/LoginScreen';
import RegisterScreen from '../modules/auth/RegisterScreen';
import ProfileSetupScreen from '../modules/auth/ProfileSetupScreen';
import MeasurementOnboardingScreen from '../modules/auth/MeasurementOnboardingScreen';
import DashboardScreen from '../modules/dashboard/DashboardScreen';
import ChatScreen from '../modules/chat/ChatScreen';
import ProductScreen from '../modules/orders/ProductScreen';
import CartScreen from '../modules/orders/CartScreen';
import CheckoutScreen from '../modules/orders/CheckoutScreen';
import OrderConfirmationScreen from '../modules/orders/OrderConfirmationScreen';
import OrderTrackingScreen from '../modules/orders/OrderTrackingScreen';
import CameraScreen from '../modules/camera/CameraScreen';
import ProfileScreen from '../modules/profile/ProfileScreen';
import BodyMeasurementForm from '../modules/measurements/BodyMeasurementForm';
import MeasurementGuide from '../modules/measurements/MeasurementGuide';
import HelpScreen from '../modules/help/HelpScreen';
import NotificationsScreen from '../modules/notifications/NotificationsScreen';
import { AuthContext } from '../context/AuthContext';
import { CartContext, CartProvider } from '../context/CartContext';
import { IconButton } from 'react-native-paper';
import Loading from '../components/Loading';
import { hp, wp, rf } from '../utils/responsiveUtils';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  const { count } = useContext(CartContext);

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2E86AB',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 5,
          paddingBottom: hp(1),
          height: hp(9),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          if (route.name === 'Dashboard') {
            iconName = 'home-outline';
          } else if (route.name === 'Camera') {
            iconName = 'camera-outline';
          } else if (route.name === 'Chat') {
            iconName = 'chatbubble-outline';
          } else if (route.name === 'Cart') {
            iconName = 'cart-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }

          const icon = <Ionicons name={iconName} size={28} color={color} />;

          // Add badge for cart
          if (route.name === 'Cart' && count() > 0) {
            return (
              <View style={styles.iconContainer}>
                {icon}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {count() > 99 ? '99+' : count().toString()}
                  </Text>
                </View>
              </View>
            );
          }

          return icon;
        },
      })}
    >
      <Tabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tabs.Screen
        name="Camera"
        component={CameraScreen}
        options={{ tabBarLabel: 'AR Try-On' }}
      />
      <Tabs.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarLabel: 'Chat' }}
      />
      <Tabs.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarLabel: 'Cart' }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
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
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                headerShown: true,
                title: 'Create Account',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
          </>
        ) : user.isGuest ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="Product"
              component={ProductScreen}
              options={{
                headerShown: true,
                title: 'Product Details',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{
                headerShown: true,
                title: 'Pre-order Checkout',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="OrderConfirmation"
              component={OrderConfirmationScreen}
              options={{
                headerShown: true,
                title: 'Pre-order Confirmed',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="OrderTracking"
              component={OrderTrackingScreen}
              options={{
                headerShown: true,
                title: 'Pre-order Tracking',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="BodyMeasurementForm"
              component={BodyMeasurementForm}
              options={{
                headerShown: true,
                title: 'Body Measurements',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="MeasurementGuide"
              component={MeasurementGuide}
              options={{
                headerShown: true,
                title: 'Measurement Guide',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="HelpScreen"
              component={HelpScreen}
              options={{
                headerShown: true,
                title: 'Help & FAQ',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                headerShown: true,
                title: 'Notifications',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                headerShown: true,
                title: 'Create Account',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
          </>
        ) : !user.profileComplete ? (
           <>
             <Stack.Screen
               name="MeasurementOnboarding"
               component={MeasurementOnboardingScreen}
               options={{
                 headerShown: true,
                 title: 'Add Measurements',
                 headerStyle: { backgroundColor: '#2E86AB' },
                 headerTintColor: '#fff',
                 headerTitleStyle: { fontWeight: 'bold' }
               }}
             />
             <Stack.Screen
               name="ProfileSetup"
               component={ProfileSetupScreen}
               options={{
                 headerShown: true,
                 title: 'Complete Profile',
                 headerStyle: { backgroundColor: '#2E86AB' },
                 headerTintColor: '#fff',
                 headerTitleStyle: { fontWeight: 'bold' }
               }}
             />
           </>
         ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="Product"
              component={ProductScreen}
              options={{
                headerShown: true,
                title: 'Product Details',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{
                headerShown: true,
                title: 'Pre-order Checkout',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="OrderConfirmation"
              component={OrderConfirmationScreen}
              options={{
                headerShown: true,
                title: 'Pre-order Confirmed',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="OrderTracking"
              component={OrderTrackingScreen}
              options={{
                headerShown: true,
                title: 'Pre-order Tracking',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="BodyMeasurementForm"
              component={BodyMeasurementForm}
              options={{
                headerShown: true,
                title: 'Body Measurements',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="MeasurementGuide"
              component={MeasurementGuide}
              options={{
                headerShown: true,
                title: 'Measurement Guide',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="HelpScreen"
              component={HelpScreen}
              options={{
                headerShown: true,
                title: 'Help & FAQ',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                headerShown: true,
                title: 'Notifications',
                headerStyle: { backgroundColor: '#2E86AB' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: rf(10),
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
