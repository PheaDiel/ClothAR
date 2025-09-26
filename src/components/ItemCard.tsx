// src/components/ItemCard.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { ClothingItem } from '../services/mockApi';
import { wp } from '../utils/responsiveUtils';

export default function ItemCard({
  item,
  onPress,
}: {
  item: ClothingItem;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.wrapper} onPress={onPress}>
      <Card style={styles.card} mode="elevated">
        <Card.Cover source={typeof item.images[0] === 'string' ? { uri: item.images[0] } : item.images[0]} style={styles.image} />
        <Card.Content>
          <Text variant="titleMedium" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodyMedium">₱{item.price.toFixed(2)}</Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: wp(40), maxWidth: wp(60), padding: wp(1.5), minHeight: wp(12) },
  card: { borderRadius: 12, overflow: 'hidden' },
  image: { height: wp(40), backgroundColor: '#eee' },
});
