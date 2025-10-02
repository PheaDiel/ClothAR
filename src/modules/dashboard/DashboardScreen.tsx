import React, { useContext, useMemo, useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, Chip, Text, Banner, Button } from 'react-native-paper';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import ItemCard from '../../modules/dashboard/components/ItemCard';
import BusinessMap from '../../components/BusinessMap';
import { Item } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { getNumColumns, wp } from '../../utils/responsiveUtils';
import { getBusinessLocation } from '../../services/api';
import { theme } from '../../theme/theme';

export default function DashboardScreen({ navigation }: { navigation: any }) {
   const { items } = useContext(InventoryContext);
   const { user } = useContext(AuthContext);
   const { total, count } = useContext(CartContext);
   const [query, setQuery] = useState('');
   const [category, setCategory] = useState<string | null>(null);
   const [businessLocation, setBusinessLocation] = useState<{ latitude: number; longitude: number; address: string; name: string } | null>(null);

   const isGuest = user?.isGuest || false;

   useEffect(() => {
     const fetchLocation = async () => {
       try {
         const location = await getBusinessLocation();
         setBusinessLocation(location);
       } catch (error) {
       }
     };
     fetchLocation();
   }, []);

  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category))), [items]);

  const filtered = items.filter((i: Item) => {
    const matchesText = i.name.toLowerCase().includes(query.toLowerCase());
    const matchesCat = category ? i.category === category : true;
    return matchesText && matchesCat;
  });


  const handleItemPress = (item: Item) => {
    if (isGuest) {
      Alert.alert(
        "Guest Access Limitation",
        "As a guest, you have limited access to features. Please create an account to unlock full functionality.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Create Account",
            onPress: () => navigation.navigate('Register')
          }
        ]
      );
    } else {
      navigation.navigate('Product', { item });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search items"
          value={query}
          onChangeText={setQuery}
          style={styles.searchBar}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContainer}
        >
          <Chip
            style={styles.chip}
            onPress={() => setCategory(null)}
            selected={category === null}
          >
            All
          </Chip>
          {categories.map(c => (
            <Chip
              key={c}
              style={styles.chip}
              onPress={() => setCategory(c)}
              selected={category === c}
            >
              {c}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {filtered.length > 0 ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleItemPress(item)} style={styles.itemContainer}>
                <ItemCard item={item} />
              </TouchableOpacity>
            )}
            decelerationRate="fast"
            snapToAlignment="start"
          />
        ) : (
          <View style={styles.noItemsContainer}>
            <Text style={styles.noItemsText}>No items found</Text>
          </View>
        )}
      </View>

      <View style={styles.mapContainer}>
        <BusinessMap location={businessLocation} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: wp(3), paddingTop: wp(3) },
    searchBar: { marginBottom: wp(2) },
    chipContainer: { flexDirection: 'row', marginBottom: wp(2) },
    chip: { marginRight: wp(2), marginBottom: wp(2), minHeight: 40 },
    content: { flex: 1 },
    listContainer: { padding: wp(3) },
    itemContainer: { marginRight: wp(2) },
    mapContainer: { flex: 1 },
    noItemsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noItemsText: { textAlign: 'center', fontSize: wp(4) }
   });
