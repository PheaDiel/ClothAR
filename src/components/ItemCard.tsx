// src/components/ItemCard.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { ClothingItem } from '../services/mockApi';

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
        <Card.Cover source={{ uri: item.image }} style={styles.image} />
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
  wrapper: { flex: 1, minWidth: 160, maxWidth: 240, padding: 6 },
  card: { borderRadius: 12, overflow: 'hidden' },
  image: { height: 160, backgroundColor: '#eee' },
});
