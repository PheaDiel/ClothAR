// src/components/SkeletonLoader.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme/theme';
import { hp, wp } from '../utils/responsiveUtils';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = hp(2),
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; style?: any }> = ({
  lines = 1,
  style,
}) => (
  <View style={style}>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonLoader
        key={index}
        height={hp(2)}
        width={index === lines - 1 ? '70%' : '100%'}
        style={{ marginBottom: index < lines - 1 ? hp(1) : 0 }}
      />
    ))}
  </View>
);

export const SkeletonCard: React.FC = () => (
  <View style={styles.cardSkeleton}>
    <SkeletonLoader height={hp(20)} borderRadius={8} />
    <View style={styles.cardContent}>
      <SkeletonText lines={2} />
      <View style={styles.cardFooter}>
        <SkeletonLoader width="30%" height={hp(2)} />
        <SkeletonLoader width="20%" height={hp(3)} borderRadius={hp(1.5)} />
      </View>
    </View>
  </View>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.listSkeleton}>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.listItem}>
        <SkeletonLoader width={hp(6)} height={hp(6)} borderRadius={hp(3)} />
        <View style={styles.listItemContent}>
          <SkeletonText lines={2} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  cardSkeleton: {
    marginBottom: hp(2),
  },
  cardContent: {
    padding: wp(3),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(1),
  },
  listSkeleton: {
    padding: wp(4),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  listItemContent: {
    flex: 1,
    marginLeft: wp(3),
  },
});