import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { Item } from '../../../types';
import { wp, getNumColumns } from '../../../utils/responsiveUtils';

export default function ItemCard({ item, onPress }: { item: Item; onPress?: () => void }) {
  const numColumns = getNumColumns();
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - wp(6)) / numColumns - wp(2); // Account for padding and margins

  return (
    <Card style={[styles.card, { width: cardWidth }]} onPress={onPress}>
      <Card.Cover
        source={item.images?.[0] ? (typeof item.images[0] === 'string' ? { uri: item.images[0] } : item.images[0]) : { uri: 'https://via.placeholder.com/300x400.png?text=No+Image' }}
        style={styles.cardCover}
      />
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" numberOfLines={2} style={styles.title}>
          {item.name}
        </Text>
        <Text variant="bodyMedium" style={styles.price}>
          ₱{item.price.toFixed(2)}
        </Text>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button onPress={onPress} style={styles.button}>
          View
        </Button>
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: wp(1),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardCover: {
    height: wp(40), // Responsive height based on screen width
  },
  cardContent: {
    paddingHorizontal: wp(3),
    paddingVertical: wp(2),
  },
  title: {
    marginBottom: wp(1),
    lineHeight: wp(5),
  },
  price: {
    color: '#007BFF',
    fontWeight: '600',
  },
  cardActions: {
    paddingHorizontal: wp(2),
    paddingBottom: wp(2),
    justifyContent: 'center',
  },
  button: {
    width: '100%',
  },
});
