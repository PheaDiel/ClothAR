import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Notification } from '../types';
import { NotificationService } from '../services/notificationService';
import * as Notifications from 'expo-notifications';

type NotificationContextType = {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  unreadCount: number;
};

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotification: () => {},
  clearAllNotifications: () => {},
  unreadCount: 0,
});

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from storage on mount and setup push notifications
  useEffect(() => {
    loadNotifications();
    setupPushNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // For now, using mock data. In production, this would load from API/storage
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'order_status',
          title: 'Pre-order Update',
          message: 'Your pre-order #12345 has been accepted and is now in progress.',
          read: false,
          createdAt: new Date(Date.now() - 3600000), // 1 hour ago
          orderId: '12345'
        },
        {
          id: '2',
          type: 'general',
          title: 'Welcome to ClothAR!',
          message: 'Thanks for joining! Start by adding your measurements for a perfect fit.',
          read: false,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
        }
      ];
      setNotifications(mockNotifications);
    } catch (error) {
    }
  };

  const setupPushNotifications = async () => {
    try {
      await NotificationService.requestPermissions();

      // Listen for incoming notifications
      const receivedSubscription = NotificationService.addNotificationReceivedListener(notification => {
        // Add to in-app notifications
        addNotification({
          type: 'order_status',
          title: notification.request.content.title || 'Notification',
          message: notification.request.content.body || '',
          orderId: notification.request.content.data?.orderId as string,
        });
      });

      // Listen for notification interactions
      const responseSubscription = NotificationService.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.orderId) {
          // Handle navigation to order details or similar
          console.log('Notification tapped for order:', data.orderId);
        }
      });

      // Cleanup subscriptions on unmount
      return () => {
        receivedSubscription?.remove();
        responseSubscription?.remove();
      };
    } catch (error) {
      console.warn('Failed to setup push notifications:', error);
    }
  };

  const addNotification = (notificationData: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(notification => !notification.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
