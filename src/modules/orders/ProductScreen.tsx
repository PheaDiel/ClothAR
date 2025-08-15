import React, { useState, useContext } from 'react';
import { View, ScrollView, StyleSheet, Image, Dimensions, Alert } from 'react-native';
import { Text, Button, RadioButton, TextInput } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { Item } from '../../types';
import { Size } from '../../types';

type ParamList = {
  Product: { item: Item };
};

const { width } = Dimensions.get('window');

export default function ProductScreen() {
  const route = useRoute<RouteProp<ParamList, 'Product'>>();
  const navigation = useNavigation();
  const item = route.params.item;
  const { add } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const isGuest = user?.isGuest || false;

  // Convert sizes record to array of available sizes
  const availableSizes = Object.keys(item.sizes) as Size[];
  const [selectedSize, setSelectedSize] = useState<string>(availableSizes.length > 0 ? availableSizes[0] : '');
  const [qty, setQty] = useState<number>(1);

  const onAdd = () => {
    if (isGuest) {
      Alert.alert(
        "Guest Access Limitation",
        "As a guest, you cannot add items to the cart. Please create an account to unlock full functionality.",
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
      return;
    }
    
    if (selectedSize) {
      add({
        id: item.id,
        name: item.name,
        price: item.price,
        size: selectedSize,
        quantity: qty,
        image: item.images?.[0],
      });
      
      Alert.alert(
        "Added to Cart",
        `${item.name} has been added to your cart.`,
        [
          {
            text: "Continue Shopping",
            style: "cancel"
          },
          {
            text: "View Cart",
            onPress: () => navigation.navigate('Cart' as never)
          }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Product Details" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Image 
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300x400.png?text=No+Image' }} 
          style={styles.image} 
        />
        <View style={styles.detailsContainer}>
          <Text variant="titleLarge" style={styles.name}>
            {item.name}
          </Text>
          <Text variant="titleMedium" style={styles.price}>
            ₱{item.price.toFixed(2)}
          </Text>
          <Text variant="bodyMedium" style={styles.category}>
            Category: {item.category}
          </Text>

          {isGuest && (
            <View style={styles.guestNotice}>
              <Text style={styles.guestNoticeText}>
                You're viewing this product as a guest. Some features may be limited.
              </Text>
            </View>
          )}

          {availableSizes.length > 0 && (
            <View style={styles.sizesContainer}>
              <Text variant="labelLarge" style={styles.sizesLabel}>
                Available Sizes
              </Text>
              <RadioButton.Group onValueChange={(v) => setSelectedSize(v)} value={selectedSize}>
                <View style={styles.sizes}>
                  {availableSizes.map((s) => (
                    <View key={s} style={styles.sizeOption}>
                      <RadioButton value={s} />
                      <Text style={styles.sizeText}>{s} ({item.sizes[s]} available)</Text>
                    </View>
                  ))}
                </View>
              </RadioButton.Group>
            </View>
          )}

          <View style={styles.quantityContainer}>
            <Text variant="labelLarge" style={styles.quantityLabel}>
              Quantity
            </Text>
            <TextInput
              label="Quantity"
              keyboardType="number-pad"
              value={String(qty)}
              onChangeText={(t) => {
                const n = parseInt(t || '0', 10);
                setQty(isNaN(n) ? 1 : Math.max(1, n));
              }}
              style={styles.quantityInput}
            />
          </View>

          <Button mode="contained" onPress={onAdd} style={styles.addButton}>
            {isGuest ? "Create Account to Add to Cart" : "Add to Cart"}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  image: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
  },
  detailsContainer: {
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginBottom: 16,
  },
  category: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  guestNotice: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  guestNoticeText: {
    color: '#1976d2',
    textAlign: 'center',
  },
  sizesContainer: {
    marginBottom: 20,
  },
  sizesLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sizes: {
    flexDirection: 'column',
  },
  sizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sizeText: {
    fontSize: 16,
  },
  quantityContainer: {
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quantityInput: {
    width: 100,
  },
  addButton: {
    marginTop: 16,
    backgroundColor: '#2E86AB',
    paddingVertical: 8,
  },
});
