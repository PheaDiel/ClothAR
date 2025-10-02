// App.tsx (root)
import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { InventoryProvider } from './src/context/InventoryContext';
import { CartProvider } from './src/context/CartContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { theme, navigationTheme } from './src/theme/theme';

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <InventoryProvider>
          <CartProvider>
            <PaperProvider theme={theme}>
              <NavigationContainer theme={navigationTheme}>
                <RootNavigator />
              </NavigationContainer>
            </PaperProvider>
          </CartProvider>
        </InventoryProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
