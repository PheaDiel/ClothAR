import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Notification } from '../types';
import { NotificationService } from '../services/notificationService';
import { supabase } from '../services/supabase';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      if (data) {
        const notifications: Notification[] = data.map((item: any) => ({
          id: item.id,
          type: item.type as Notification['type'],
          title: item.title,
          message: item.message,
          read: item.read,
          createdAt: new Date(item.created_at),
          orderId: item.order_id,
        }));
        setNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
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

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error clearing notification:', error);
        return;
      }

      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing all notifications:', error);
        return;
      }

      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
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
