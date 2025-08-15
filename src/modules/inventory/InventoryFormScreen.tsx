import React, { useState } from "react";
import { View, TextInput, StyleSheet, Button, Alert } from "react-native";
import AppHeader from "../../components/AppHeader";

export default function InventoryFormScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  function saveItem() {
    Alert.alert("Item Saved", `${name} - ₱${price}`);
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Add / Edit Item" />
      <TextInput
        placeholder="Item Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={styles.input}
      />
      <Button title="Save" onPress={saveItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginBottom: 12
  }
});
