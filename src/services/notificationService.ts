import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  static async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      throw new Error('Permission not granted for notifications');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }

  static async scheduleNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null, // Show immediately
    });
  }

  static async sendOrderStatusNotification(orderId: string, status: string) {
    const messages = {
      confirmed: {
        title: 'Order Confirmed',
        body: `Your order #${orderId} has been confirmed and is being processed.`,
      },
      'in production': {
        title: 'Order in Production',
        body: `Your order #${orderId} is now in production.`,
      },
      shipped: {
        title: 'Order Shipped',
        body: `Your order #${orderId} has been shipped and is on its way!`,
      },
      delivered: {
        title: 'Order Delivered',
        body: `Your order #${orderId} has been successfully delivered.`,
      },
    };

    const message = messages[status as keyof typeof messages];
    if (message) {
      await this.scheduleNotification(message.title, message.body, { orderId, status });
    }
  }

  static async getExpoPushToken() {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  }

  static addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  static addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}