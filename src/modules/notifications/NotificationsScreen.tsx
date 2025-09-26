import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Card, Button, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../../components/AppHeader';
import { useNotifications } from '../../context/NotificationContext';
import { Notification } from '../../types';

type NotificationsScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    unreadCount
  } = useNotifications();

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'order_status' && notification.orderId) {
      navigation.navigate('OrderTracking', { orderId: notification.orderId });
    }
  };

  const handleClearNotification = (id: string) => {
    Alert.alert(
      'Clear Notification',
      'Are you sure you want to remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', onPress: () => clearNotification(id) }
      ]
    );
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;

    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to remove all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', onPress: clearAllNotifications }
      ]
    );
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order_status':
        return 'cube-outline';
      case 'tailoring_update':
        return 'cut-outline';
      case 'general':
        return 'information-circle-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'order_status':
        return '#2E86AB';
      case 'tailoring_update':
        return '#AB47BC';
      case 'general':
        return '#FFA726';
      default:
        return '#666';
    }
  };

  const renderNotification = (notification: Notification) => (
    <Card
      key={notification.id}
      style={[
        styles.notificationCard,
        !notification.read && styles.unreadCard
      ]}
    >
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={getNotificationIcon(notification.type) as any}
              size={20}
              color={getNotificationColor(notification.type)}
            />
          </View>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, !notification.read && styles.unreadText]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTimeAgo(notification.createdAt)}
            </Text>
          </View>
          {!notification.read && (
            <View style={styles.unreadDot} />
          )}
        </View>

        <Text style={styles.notificationMessage}>
          {notification.message}
        </Text>

        {notification.type === 'order_status' && notification.orderId && (
          <Chip
            mode="outlined"
            style={styles.orderChip}
            textStyle={styles.orderChipText}
          >
            Pre-order #{notification.orderId}
          </Chip>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.clearButton}
        onPress={() => handleClearNotification(notification.id)}
      >
        <Ionicons name="close" size={20} color="#666" />
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Notifications" />

      {/* Header with actions */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
        </Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Button
              mode="text"
              onPress={markAllAsRead}
              style={styles.markAllButton}
            >
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              mode="text"
              onPress={handleClearAll}
              textColor="#e74c3c"
            >
              Clear all
            </Button>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              You'll receive notifications about your pre-orders and updates here.
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map(renderNotification)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  markAllButton: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationsList: {
    padding: 16,
  },
  notificationCard: {
    marginBottom: 12,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E86AB',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  unreadText: {
    color: '#2E86AB',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E86AB',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  orderChip: {
    alignSelf: 'flex-start',
    borderColor: '#2E86AB',
  },
  orderChipText: {
    color: '#2E86AB',
  },
  clearButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
  },
});