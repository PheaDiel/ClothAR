// src/modules/cart/CartScreen.tsx
import React, { useContext } from 'react';
import { View, FlatList, StyleSheet, Image, Alert } from 'react-native';
import { Text, Button, IconButton, Banner } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';

export default function CartScreen({ navigation }: any) {
  const { items, remove, updateQty, total, clear } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  
  const isGuest = user?.isGuest || false;

  const handleCheckout = () => {
    if (isGuest) {
      Alert.alert(
        "Guest Access Limitation",
        "As a guest, you cannot proceed to checkout. Please create an account to unlock full functionality.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Create Account",
            onPress: () => navigation.navigate('Register' as never)
          }
        ]
      );
    } else {
      navigation.navigate('Checkout' as never);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Cart" />
      <View style={styles.container}>
        {isGuest && (
          <Banner
            visible={true}
            actions={[
              {
                label: 'Create Account',
                onPress: () => navigation.navigate('Register' as never),
              },
            ]}
            icon="account-circle"
          >
            You're using the app as a guest. Checkout is not available.
          </Banner>
        )}
        
        {items.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Text>Your cart is empty</Text>
            <Button mode="contained" onPress={() => navigation.navigate('Dashboard')} style={{ marginTop: 12 }}>
              Continue shopping
            </Button>
          </View>
        ) : (
          <>
            <FlatList
              data={items}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => (
                <View style={styles.row}>
                  <Image source={{ uri: item.image }} style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text>{item.name}</Text>
                    <Text>Size: {item.size}</Text>
                    <Text>₱{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                  {!isGuest && (
                    <View style={{ alignItems: 'center' }}>
                      <IconButton icon="minus" size={20} onPress={() => updateQty(index, Math.max(1, item.quantity - 1))} />
                      <Text>{item.quantity}</Text>
                      <IconButton icon="plus" size={20} onPress={() => updateQty(index, item.quantity + 1)} />
                      <IconButton icon="delete" size={20} onPress={() => remove(index)} />
                    </View>
                  )}
                </View>
              )}
            />

            <View style={styles.footer}>
              <Text variant="titleMedium">Total: ₱{total().toFixed(2)}</Text>
              <Button mode="contained" onPress={handleCheckout} disabled={isGuest}>
                {isGuest ? "Create Account to Checkout" : "Checkout"}
              </Button>
              {!isGuest && (
                <Button mode="outlined" onPress={() => clear()} style={{ marginTop: 8 }}>
                  Clear cart
                </Button>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  row: { flexDirection: 'row', padding: 8, backgroundColor: '#fff', marginBottom: 8, borderRadius: 8, elevation: 1 },
  thumb: { width: 80, height: 100, borderRadius: 6, marginRight: 12 },
  footer: { padding: 12, borderTopWidth: 1, borderColor: '#eee' },
});
