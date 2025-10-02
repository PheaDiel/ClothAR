// src/components/AppHeader.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { wp, rf } from "../utils/responsiveUtils";
import { theme } from "../theme/theme";

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
    backgroundColor: theme.colors.primary,
    padding: wp(5)
  },
  title: {
    color: theme.colors.surface,
    fontSize: rf(24),
    fontWeight: "bold"
  }
});
