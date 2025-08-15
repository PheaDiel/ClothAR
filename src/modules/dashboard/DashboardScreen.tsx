import React, { useContext, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Searchbar, Chip, Text, Banner } from 'react-native-paper';
import { InventoryContext } from '../../context/InventoryContext';
import { AuthContext } from '../../context/AuthContext';
import ItemCard from '../../modules/dashboard/components/ItemCard';
import { Item } from '../../types';
import { useNavigation } from '@react-navigation/native';

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const { items } = useContext(InventoryContext);
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);

  const isGuest = user?.isGuest || false;

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
    <View style={styles.container}>
      {isGuest && bannerVisible && (
        <Banner
          visible={bannerVisible}
          actions={[
            {
              label: 'Create Account',
              onPress: () => navigation.navigate('Register'),
            },
            {
              label: 'Dismiss',
              onPress: () => setBannerVisible(false),
            },
          ]}
          icon="account-circle"
        >
          You're using the app as a guest. Some features may be limited.
        </Banner>
      )}
      
      <Searchbar
        placeholder="Search items"
        value={query}
        onChangeText={setQuery}
        style={{ margin: 12 }}
      />
      <View style={styles.chipContainer}>
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
      </View>
      <FlatList
        contentContainerStyle={{ padding: 12 }}
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleItemPress(item)}>
            <ItemCard item={item} />
          </TouchableOpacity>
        )}
        numColumns={2}
      />
      {filtered.length === 0 && (
        <Text style={styles.noItemsText}>No items found</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chipContainer: { paddingHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap' },
  chip: { marginRight: 8, marginBottom: 8 },
  noItemsText: { textAlign: 'center', marginTop: 20 }
});
