import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { Item } from '../../../types';
import { wp, getNumColumns } from '../../../utils/responsiveUtils';
import LazyImage from '../../../components/LazyImage';

const ItemCard = React.memo(function ItemCard({ item, onPress }: { item: Item; onPress?: () => void }) {
   const numColumns = useMemo(() => getNumColumns(), []);
   const cardWidth = useMemo(() => {
     const screenWidth = Dimensions.get('window').width;
     return (screenWidth - wp(6)) / numColumns - wp(2);
   }, [numColumns]);

   // Helper function to get valid image source
   const getImageSource = () => {
     if (!item.images || item.images.length === 0) {
       console.log('ItemCard: No images for item:', item.name, 'using sample data image');
       // Use sample data images as fallback
       const sampleImages = [
         'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop',
         'https://i.etsystatic.com/53627910/r/il/fb3cbnpf/6187582920/il_570xN.6187582920_3v69.jpg',
         'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=600&fit=crop'
       ];
       return { uri: sampleImages[Math.floor(Math.random() * sampleImages.length)] };
     }

     const firstImage = item.images[0];
     if (typeof firstImage === 'string') {
       // Validate URL format
       if (firstImage.startsWith('http')) {
         console.log('ItemCard: Using image URL:', firstImage);
         return { uri: firstImage };
       } else {
         console.log('ItemCard: Invalid URL format, using fallback:', firstImage);
         return { uri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop' };
       }
     } else if (typeof firstImage === 'object' && (firstImage as any).uri) {
       console.log('ItemCard: Using image object:', firstImage);
       return firstImage as any;
     } else {
       console.log('ItemCard: Unknown image format, using fallback:', firstImage);
       return { uri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop' };
     }
   };

   return (
     <Card style={[styles.card, { width: cardWidth }]} onPress={onPress}>
       <LazyImage
         source={getImageSource()}
         style={styles.cardCover}
         placeholder="https://via.placeholder.com/300x400.png?text=Loading..."
         resizeMode="cover"
         priority="low"
         quality={75}
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
});

export default ItemCard;

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
