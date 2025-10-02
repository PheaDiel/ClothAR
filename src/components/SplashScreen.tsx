import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { wp, hp, rf, rw } from '../utils/responsiveUtils';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const theme = useTheme();
  
  // Animation values
  const logoScale = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const loadingOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate logo entrance
    logoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 100,
    });

    // Rotate logo slightly
    logoRotation.value = withSequence(
      withTiming(10, { duration: 300 }),
      withTiming(-10, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );

    // Fade in text
    textOpacity.value = withTiming(1, { duration: 800 });

    // Show loading indicator
    loadingOpacity.value = withTiming(1, { duration: 500 });

    // Complete after 2 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      {
        translateY: interpolate(textOpacity.value, [0, 1], [20, 0]),
      },
    ],
  }));

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={[styles.logoCircle, { backgroundColor: theme.colors.surface }]}>
            <Ionicons 
              name="shirt" 
              size={rf(60)} 
              color={theme.colors.primary} 
            />
          </View>
        </Animated.View>

        <Animated.View style={textAnimatedStyle}>
          <Text style={[styles.title, { color: theme.colors.surface }]}>
            ClothAR
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.surface }]}>
            Virtual Fashion, Real Style
          </Text>
        </Animated.View>

        <Animated.View style={[styles.loadingContainer, loadingAnimatedStyle]}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.surface} 
          />
          <Text style={[styles.loadingText, { color: theme.colors.surface }]}>
            Preparing your experience...
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  logoContainer: {
    marginBottom: hp(4),
  },
  logoCircle: {
    width: rw(120),
    height: rw(120),
    borderRadius: rw(60),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: rf(36),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  subtitle: {
    fontSize: rf(16),
    textAlign: 'center',
    marginBottom: hp(6),
    opacity: 0.9,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: hp(10),
    alignItems: 'center',
  },
  loadingText: {
    fontSize: rf(14),
    marginTop: hp(2),
    opacity: 0.8,
  },
});
