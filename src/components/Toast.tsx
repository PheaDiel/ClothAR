// src/components/Toast.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { IconButton } from 'react-native-paper';
import { theme } from '../theme/theme';
import { hp, wp, rf } from '../utils/responsiveUtils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 4000,
  onDismiss,
  action,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getToastColors = () => {
    switch (type) {
      case 'success':
        return {
          background: theme.colors.success,
          text: theme.colors.onPrimary,
          icon: 'check-circle',
        };
      case 'error':
        return {
          background: theme.colors.error,
          text: theme.colors.onError,
          icon: 'alert-circle',
        };
      case 'warning':
        return {
          background: theme.colors.warning || '#FF9800',
          text: '#000000',
          icon: 'alert',
        };
      case 'info':
      default:
        return {
          background: theme.colors.info,
          text: theme.colors.onPrimary,
          icon: 'information',
        };
    }
  };

  const colors = getToastColors();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <IconButton
          icon={colors.icon}
          size={20}
          iconColor={colors.text}
          style={styles.icon}
        />
        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
            <Text style={[styles.actionText, { color: colors.text }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <IconButton
            icon="close"
            size={16}
            iconColor={colors.text}
            style={styles.closeIcon}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: hp(8), // Below status bar and safe area
    left: wp(4),
    right: wp(4),
    borderRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    minHeight: hp(6),
  },
  icon: {
    margin: 0,
    marginRight: wp(2),
  },
  message: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: '500',
    lineHeight: rf(20),
  },
  actionButton: {
    marginLeft: wp(2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    fontSize: rf(14),
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: wp(1),
  },
  closeIcon: {
    margin: 0,
  },
});