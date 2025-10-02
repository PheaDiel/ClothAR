import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { wp, hp, rf, rw, rh } from '../../utils/responsiveUtils';
import SplashScreen from '../../components/SplashScreen';

const { width, height } = Dimensions.get('window');

const screens = [
  {
    title: 'Welcome to ClothAR',
    subtitle: 'Revolutionize your fashion experience with AR-powered virtual try-ons and custom tailoring.',
    image: require('../../../assets/images/onboarding1.png'),
    icon: 'shirt-outline',
  },
  {
    title: 'Try Before You Buy',
    subtitle: 'Use your camera to virtually try on clothes and see how they look on you in real-time.',
    image: require('../../../assets/images/onboarding2.png'),
    icon: 'camera-outline',
  },
  {
    title: 'Perfect Fit, Every Time',
    subtitle: 'Get accurate body measurements for custom-tailored clothing that fits you perfectly.',
    image: require('../../../assets/images/onboarding3.png'),
    icon: 'resize-outline',
  },
  {
    title: 'Ready to Transform Your Wardrobe?',
    subtitle: 'Join thousands of fashion enthusiasts discovering their perfect style.',
    image: require('../../../assets/images/onboarding4.png'),
    icon: 'sparkles-outline',
  },
];

interface OnboardingScreenProps {
  onComplete?: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(false);
  const navigation = useNavigation();
  
  // Animation values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const swipeIndicatorOpacity = useSharedValue(0);
  const leftArrowOpacity = useSharedValue(0);
  const rightArrowOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    // Show swipe indicators on first load
    swipeIndicatorOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
    rightArrowOpacity.value = withDelay(1500, 
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(2000, withTiming(0.3, { duration: 300 }))
      )
    );

    // Update progress bar
    progressWidth.value = withSpring((currentIndex + 1) / screens.length);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < screens.length - 1) {
      animateToNext();
    } else {
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      animateToPrevious();
    }
  };

  const animateToNext = () => {
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setCurrentIndex)(currentIndex + 1);
      opacity.value = withTiming(1, { duration: 300 });
    });
  };

  const animateToPrevious = () => {
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setCurrentIndex)(currentIndex - 1);
      opacity.value = withTiming(1, { duration: 300 });
    });
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const onGestureEvent = (event: any) => {
    const { translationX, velocityX } = event.nativeEvent;
    
    // Show appropriate arrow based on swipe direction
    if (translationX < -20 && currentIndex < screens.length - 1) {
      rightArrowOpacity.value = withTiming(1, { duration: 150 });
      leftArrowOpacity.value = withTiming(0.3, { duration: 150 });
    } else if (translationX > 20 && currentIndex > 0) {
      leftArrowOpacity.value = withTiming(1, { duration: 150 });
      rightArrowOpacity.value = withTiming(0.3, { duration: 150 });
    } else {
      leftArrowOpacity.value = withTiming(0.3, { duration: 150 });
      rightArrowOpacity.value = withTiming(0.3, { duration: 150 });
    }
  };

  const onGestureEnd = (event: any) => {
    const { translationX, velocityX } = event.nativeEvent;
    
    // Reset arrow opacities
    leftArrowOpacity.value = withTiming(0.3, { duration: 300 });
    rightArrowOpacity.value = withTiming(0.3, { duration: 300 });
    
    // Determine swipe direction and threshold
    const swipeThreshold = width * 0.25;
    const velocityThreshold = 500;
    
    if ((translationX < -swipeThreshold || velocityX < -velocityThreshold) && currentIndex < screens.length - 1) {
      // Swipe left - next
      handleNext();
    } else if ((translationX > swipeThreshold || velocityX > velocityThreshold) && currentIndex > 0) {
      // Swipe right - previous
      handlePrevious();
    }
  };

  const completeOnboarding = async () => {
    try {
      // Save onboarding completion status BEFORE showing splash
      await AsyncStorage.setItem('onboardingCompleted', 'true');

      // Show splash screen after saving
      setShowSplash(true);

      // The splash screen will handle the navigation after 2 seconds
    } catch (error) {
      // Navigate directly if there's an error
      navigation.navigate('Login' as never);
    }
  };

  const handleSplashComplete = () => {
    setShowSplash(false);

    // Notify parent component that onboarding is complete AFTER splash screen
    if (onComplete) {
      onComplete();
    }

    // Navigate to Login screen
    navigation.navigate('Login' as never);
  };

  // Animated styles
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {
        scale: interpolate(opacity.value, [0, 1], [0.9, 1])
      }
    ]
  }));

  const swipeIndicatorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: swipeIndicatorOpacity.value,
  }));

  const leftArrowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: leftArrowOpacity.value,
    transform: [
      {
        translateX: interpolate(leftArrowOpacity.value, [0.3, 1], [10, 0])
      }
    ]
  }));

  const rightArrowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rightArrowOpacity.value,
    transform: [
      {
        translateX: interpolate(rightArrowOpacity.value, [0.3, 1], [-10, 0])
      }
    ]
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const renderProgressBar = () => {
    return (
      <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Animated.View 
          style={[
            styles.progressBar, 
            { backgroundColor: theme.colors.primary },
            progressAnimatedStyle
          ]} 
        />
      </View>
    );
  };

  const renderProgressDots = () => {
    return (
      <View style={styles.progressContainer}>
        {screens.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              { backgroundColor: theme.colors.surfaceVariant },
              index === currentIndex && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              if (index !== currentIndex) {
                opacity.value = withTiming(0, { duration: 200 }, () => {
                  runOnJS(setCurrentIndex)(index);
                  opacity.value = withTiming(1, { duration: 300 });
                });
              }
            }}
          />
        ))}
      </View>
    );
  };

  const currentScreen = screens[currentIndex];

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
          <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        
        {/* Skip Button */}
        <View style={styles.skipContainer}>
          <TouchableOpacity onPress={handleSkip} style={[styles.skipButton, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.skipText, { color: theme.colors.onSurface }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Main Content with Gesture Handler */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onEnded={onGestureEnd}
          activeOffsetX={[-10, 10]}
        >
          <Animated.View style={[styles.content, contentAnimatedStyle]}>
            {/* Icon instead of image for better performance */}
            <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Ionicons 
                name={currentScreen.icon as any} 
                size={rf(80)} 
                color={theme.colors.primary} 
              />
            </View>
            
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>
              {currentScreen.title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {currentScreen.subtitle}
            </Text>
          </Animated.View>
        </PanGestureHandler>

        {/* Swipe Indicators */}
        <Animated.View style={[styles.swipeIndicators, swipeIndicatorAnimatedStyle]}>
          {currentIndex > 0 && (
            <Animated.View style={[styles.leftArrow, leftArrowAnimatedStyle]}>
              <Ionicons name="chevron-back" size={rf(24)} color={theme.colors.primary} />
              <Text style={[styles.swipeText, { color: theme.colors.primary }]}>Swipe</Text>
            </Animated.View>
          )}
          
          {currentIndex < screens.length - 1 && (
            <Animated.View style={[styles.rightArrow, rightArrowAnimatedStyle]}>
              <Text style={[styles.swipeText, { color: theme.colors.primary }]}>Swipe</Text>
              <Ionicons name="chevron-forward" size={rf(24)} color={theme.colors.primary} />
            </Animated.View>
          )}
        </Animated.View>

        {/* Bottom Section */}
        <View style={styles.bottomContainer}>
          {renderProgressDots()}
          
          <View style={styles.buttonContainer}>
            {currentIndex > 0 && (
              <Button
                mode="outlined"
                onPress={handlePrevious}
                style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
                labelStyle={{ color: theme.colors.primary }}
              >
                Previous
              </Button>
            )}
            
            <Button
              mode="contained"
              onPress={handleNext}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              contentStyle={styles.buttonContent}
              labelStyle={{ color: theme.colors.surface }}
            >
              {currentIndex === screens.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </View>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>

      {/* Splash Screen Modal */}
      <Modal
        visible={showSplash}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <SplashScreen onComplete={handleSplashComplete} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
  },
  skipButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: rw(20),
  },
  skipText: {
    fontSize: rf(14),
    fontWeight: '500',
  },
  progressBarContainer: {
    height: rh(4),
    marginHorizontal: wp(4),
    marginTop: hp(2),
    borderRadius: rh(2),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: rh(2),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  iconContainer: {
    width: rw(160),
    height: rw(160),
    borderRadius: rw(80),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(4),
  },
  title: {
    fontSize: rf(28),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: hp(2),
  },
  subtitle: {
    fontSize: rf(16),
    textAlign: 'center',
    lineHeight: rf(24),
    paddingHorizontal: wp(2),
  },
  swipeIndicators: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    pointerEvents: 'none',
  },
  leftArrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightArrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeText: {
    fontSize: rf(12),
    fontWeight: '500',
    marginHorizontal: wp(1),
  },
  bottomContainer: {
    paddingHorizontal: wp(6),
    paddingBottom: hp(4),
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: hp(4),
  },
  dot: {
    width: rw(10),
    height: rw(10),
    borderRadius: rw(5),
    marginHorizontal: wp(1),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    flex: 1,
    marginLeft: wp(2),
    borderRadius: rw(8),
  },
  secondaryButton: {
    flex: 1,
    marginRight: wp(2),
    borderRadius: rw(8),
  },
  buttonContent: {
    paddingVertical: hp(1),
  },
});
