// src/modules/cart/CartScreen.tsx
import React, { useContext } from 'react';
import { View, FlatList, StyleSheet, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, IconButton, Banner } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { wp, hp, rf } from '../../utils/responsiveUtils';

export default function CartScreen({ navigation }: any) {
  const { items, remove, updateQty, total, clear } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  
  const isGuest = user?.id === 'guest';

  const handleCheckout = () => {
    if (isGuest) {
      Alert.alert(
        "Guest Access Limitation",
        "As a guest, you cannot proceed to pre-order checkout. Please create an account to unlock full functionality.",
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
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <AppHeader title="Pre-order Cart" />
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
            You're using the app as a guest. Pre-order checkout is not available.
          </Banner>
        )}

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your pre-order cart is empty</Text>
            <Button mode="contained" onPress={() => navigation.navigate('Dashboard')} style={styles.emptyButton}>
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
                    <Text>Measurement: {item.measurementName}</Text>
                    <Text>Fabric: {item.fabricType || 'Not selected'}</Text>
                    {item.materialFee && item.materialFee > 0 && (
                      <Text>Material Fee: ₱{(item.materialFee * item.quantity).toFixed(2)}</Text>
                    )}
                    <Text>₱{((item.price + (item.materialFee || 0)) * item.quantity).toFixed(2)}</Text>
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
                {isGuest ? "Create Account to Pre-order" : "Pre-order Checkout"}
              </Button>
              {!isGuest && (
                <Button mode="outlined" onPress={() => clear()} style={{ marginTop: 8 }}>
                  Clear pre-order cart
                </Button>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: wp(3) },
  emptyContainer: { alignItems: 'center', marginTop: hp(8) },
  emptyText: { fontSize: rf(16), marginBottom: wp(3) },
  emptyButton: { marginTop: wp(3) },
  row: { flexDirection: 'row', padding: wp(2), backgroundColor: '#fff', marginBottom: wp(2), borderRadius: 8, elevation: 1 },
  thumb: { width: wp(20), height: wp(25), borderRadius: 6, marginRight: wp(3) },
  footer: { padding: wp(3), borderTopWidth: 1, borderColor: '#eee' },
});
