import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from 'react-native-paper';
import { useNotifications } from '../context/NotificationContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';

type NotificationIconProps = {
  navigation: NativeStackNavigationProp<any>;
};

export default function NotificationIcon({ navigation }: NotificationIconProps) {
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('Notifications')}
    >
      <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
      {unreadCount > 0 && (
        <Badge style={styles.badge} size={18}>
          {unreadCount > 99 ? '99+' : unreadCount.toString()}
        </Badge>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.danger,
  },
});
