// src/navigation/index.tsx
import React, { useContext, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme/theme';
import LoginScreen from '../modules/auth/LoginScreen';
import RegistrationFlow from '../modules/auth/RegistrationFlow';
import ProfileSetupScreen from '../modules/auth/ProfileSetupScreen';
import MeasurementOnboardingScreen from '../modules/auth/MeasurementOnboardingScreen';
import PasswordResetScreen from '../modules/auth/PasswordResetScreen';
import OnboardingScreen from '../modules/onboarding/OnboardingScreen';
import DashboardScreen from '../modules/dashboard/DashboardScreen';
import ChatScreen from '../modules/chat/ChatScreen';
import ProductScreen from '../modules/orders/ProductScreen';
import CartScreen from '../modules/orders/CartScreen';
import CheckoutScreen from '../modules/orders/CheckoutScreen';
import OrderConfirmationScreen from '../modules/orders/OrderConfirmationScreen';
import OrderTrackingScreen from '../modules/orders/OrderTrackingScreen';
import CameraScreen from '../modules/camera/CameraScreen';
import ProfileScreen from '../modules/profile/ProfileScreen';
import EditProfileScreen from '../modules/profile/EditProfileScreen';
import BodyMeasurementForm from '../modules/measurements/BodyMeasurementForm';
import MeasurementGuide from '../modules/measurements/MeasurementGuide';
import HelpScreen from '../modules/help/HelpScreen';
import NotificationsScreen from '../modules/notifications/NotificationsScreen';
import AdminDashboardScreen from '../modules/admin/AdminDashboardScreen';
import ProductManagementScreen from '../modules/admin/ProductManagementScreen';
import FabricManagementScreen from '../modules/admin/FabricManagementScreen';
import OrderManagementScreen from '../modules/admin/OrderManagementScreen';
import InventoryManagementScreen from '../modules/admin/InventoryManagementScreen';
import CustomerManagementScreen from '../modules/admin/CustomerManagementScreen';
import AddEditProductScreen from '../modules/admin/AddEditProductScreen';
import AddEditFabricScreen from '../modules/admin/AddEditFabricScreen';
import FabricAnalyticsScreen from '../modules/admin/FabricAnalyticsScreen';
import OrderDetailsScreen from '../modules/admin/OrderDetailsScreen';
import ProductDetailsScreen from '../modules/admin/ProductDetailsScreen';
import AdminChatScreen from '../modules/admin/AdminChatScreen';
import { AuthContext } from '../context/AuthContext';
import { CartContext, CartProvider } from '../context/CartContext';
import { IconButton } from 'react-native-paper';
import Loading from '../components/Loading';
import { hp, wp, rf } from '../utils/responsiveUtils';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  const { count } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.info,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 5,
          paddingBottom: hp(1),
          height: hp(9),
        },
        tabBarLabelStyle: {
          fontSize: rf(12),
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
          } else if (route.name === 'Admin') {
            iconName = 'shield-checkmark-outline';
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
      {/* Hide Chat tab for admin users */}
      {!user?.is_admin && (
        <Tabs.Screen
          name="Chat"
          component={ChatScreen}
          options={{ tabBarLabel: 'Chat' }}
        />
      )}
      {/* Hide Cart tab for admin users */}
      {!user?.is_admin && (
        <Tabs.Screen
          name="Cart"
          component={CartScreen}
          options={{ tabBarLabel: 'Cart' }}
        />
      )}
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
      {/* Admin tab - only visible to admin users */}
      {user?.is_admin && (
        <Tabs.Screen
          name="Admin"
          component={AdminDashboardScreen}
          options={{ tabBarLabel: 'Admin' }}
        />
      )}
    </Tabs.Navigator>
  );
}

export default function RootNavigation() {
  const { user, isLoading } = useContext(AuthContext);
  const [initializing, setInitializing] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Check onboarding status and auth loading
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem('onboardingCompleted');
        setOnboardingCompleted(completed === 'true');
      } catch (error) {
        setOnboardingCompleted(false);
      }
    };

    checkOnboarding();

    if (!isLoading) {
      setInitializing(false);
    }
  }, [isLoading]);

  // Debug: Log user state changes
  useEffect(() => {
    console.log('🔄 Navigation - User state changed:', {
      hasUser: !!user,
      userId: user?.id,
      profileComplete: user?.profileComplete,
      isLoading,
      initializing
    });
  }, [user, isLoading, initializing]);

  // Callback when onboarding is completed
  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
  };

  // Show loading screen while initializing or auth is loading
  if (initializing || isLoading) {
    return <Loading />;
  }

  // Show onboarding if not completed
  if (!onboardingCompleted) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
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
              component={RegistrationFlow}
              options={{
                headerShown: true,
                title: 'Create Account',
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="PasswordReset"
              component={PasswordResetScreen}
              options={{ headerShown: false }}
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
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{
                headerShown: true,
                title: 'Pre-order Checkout',
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="OrderConfirmation"
              component={OrderConfirmationScreen}
              options={{
                headerShown: true,
                title: 'Pre-order Confirmed',
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="OrderTracking"
              component={OrderTrackingScreen}
              options={{
                headerShown: true,
                title: 'Pre-order Tracking',
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="BodyMeasurementForm"
              component={BodyMeasurementForm}
              options={{
                headerShown: true,
                title: 'Body Measurements',
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="MeasurementGuide"
              component={MeasurementGuide}
              options={{
                headerShown: true,
                title: 'Measurement Guide',
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="HelpScreen"
              component={HelpScreen}
              options={{
                headerShown: true,
                title: 'Help & FAQ',
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                headerShown: true,
                title: 'Notifications',
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                headerShown: false, // EditProfileScreen has its own header
              }}
            />
            <Stack.Screen
              name="Register"
              component={RegistrationFlow}
              options={{
                headerShown: true,
                title: 'Create Account',
                headerStyle: { backgroundColor: theme.colors.info },
                headerTintColor: theme.colors.surface,
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            {/* Admin Screens - Only accessible to admin users */}
            {user?.is_admin && (
              <>
                <Stack.Screen
                  name="AdminDashboard"
                  component={AdminDashboardScreen}
                  options={{
                    headerShown: true,
                    title: 'Admin Dashboard',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="ProductManagement"
                  component={ProductManagementScreen}
                  options={{
                    headerShown: true,
                    title: 'Product Management',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="FabricManagement"
                  component={FabricManagementScreen}
                  options={{
                    headerShown: true,
                    title: 'Fabric Management',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="OrderManagement"
                  component={OrderManagementScreen}
                  options={{
                    headerShown: true,
                    title: 'Order Management',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="InventoryManagement"
                  component={InventoryManagementScreen}
                  options={{
                    headerShown: true,
                    title: 'Inventory Management',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="CustomerManagement"
                  component={CustomerManagementScreen}
                  options={{
                    headerShown: true,
                    title: 'Customer Management',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="AddEditProduct"
                  component={AddEditProductScreen}
                  options={{
                    headerShown: true,
                    title: 'Add/Edit Product',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="AddEditFabric"
                  component={AddEditFabricScreen}
                  options={{
                    headerShown: true,
                    title: 'Add/Edit Fabric',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="FabricAnalytics"
                  component={FabricAnalyticsScreen}
                  options={{
                    headerShown: true,
                    title: 'Fabric Analytics',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="OrderDetails"
                  component={OrderDetailsScreen}
                  options={{
                    headerShown: true,
                    title: 'Order Details',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="ProductDetails"
                  component={ProductDetailsScreen}
                  options={{
                    headerShown: true,
                    title: 'Product Details',
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTintColor: theme.colors.surface,
                    headerTitleStyle: { fontWeight: 'bold' }
                  }}
                />
                <Stack.Screen
                  name="AdminChat"
                  component={AdminChatScreen}
                  options={{
                    headerShown: false, // AdminChatScreen has its own header
                  }}
                />
              </>
            )}
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
    backgroundColor: theme.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: theme.colors.surface,
    fontSize: rf(10),
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
