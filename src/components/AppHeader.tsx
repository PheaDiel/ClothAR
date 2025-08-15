// src/components/AppHeader.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  title: string;
}

export default function AppHeader({ title }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#6200ee",
    padding: 16
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold"
  }
});
