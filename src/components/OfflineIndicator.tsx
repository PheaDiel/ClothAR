// src/components/OfflineIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useNetwork } from '../context/NetworkContext';
import { theme } from '../theme/theme';
import { hp, wp, rf } from '../utils/responsiveUtils';

export const OfflineIndicator: React.FC = () => {
  const { isConnected, isInternetReachable, retryConnection } = useNetwork();

  if (isConnected && isInternetReachable !== false) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.indicator}>
        <IconButton
          icon="wifi-off"
          size={20}
          iconColor={theme.colors.onError}
        />
        <Text style={styles.text}>
          {isConnected ? 'Limited connectivity' : 'No internet connection'}
        </Text>
        <TouchableOpacity onPress={retryConnection} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    paddingTop: hp(3), // Account for status bar
  },
  text: {
    flex: 1,
    color: theme.colors.onError,
    fontSize: rf(14),
    fontWeight: '500',
    marginLeft: wp(2),
  },
  retryButton: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  retryText: {
    color: theme.colors.onError,
    fontSize: rf(12),
    fontWeight: '600',
  },
});