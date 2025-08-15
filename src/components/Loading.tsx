// src/components/Loading.tsx
import React from "react";
import { ActivityIndicator, View, StyleSheet, Text, Image } from "react-native";
import { useTheme } from 'react-native-paper';

export default function Loading() {
  const theme = useTheme();
  
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.primary }]}>
        Loading...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600'
  }
});
