import React, { useState } from "react";
import { View, FlatList, StyleSheet, Button } from "react-native";
import { mockClothingItems, ClothingItem } from "../../services/mockApi";
import ItemCard from "../dashboard/components/ItemCard";
import AppHeader from "../../components/AppHeader";
import { Item } from "../../types";

// Function to convert ClothingItem to Item type
function convertClothingItemToItem(clothingItem: ClothingItem): Item {
  return {
    id: clothingItem.id,
    name: clothingItem.name,
    price: clothingItem.price,
    images: clothingItem.images, // Already an array
    category: "Clothing", // Default category
    sizes: Object.keys(clothingItem.stock), // Get sizes from stock keys
    stock: clothingItem.stock, // Keep stock
  };
}

export default function InventoryListScreen({ navigation }: any) {
  const [items, setItems] = useState<Item[]>(mockClothingItems.map(convertClothingItemToItem));

  return (
    <View style={styles.container}>
      <AppHeader title="Inventory" />
      <Button
        title="Add Item"
        onPress={() => navigation.navigate("InventoryForm")}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => navigation.navigate('Product', { item })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
