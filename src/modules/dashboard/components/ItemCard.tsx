import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { Item } from '../../../types';

export default function ItemCard({ item, onPress }: { item: Item; onPress?: () => void }) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Cover source={item.images?.[0] ? { uri: item.images[0] } : require('../../../../assets/images/placeholder.png')} />
      <Card.Content>
        <Text variant="titleMedium">{item.name}</Text>
        <Text variant="bodyMedium">₱{item.price.toFixed(2)}</Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={onPress}>View</Button>
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 8, minWidth: 160, maxWidth: 220 }
});
