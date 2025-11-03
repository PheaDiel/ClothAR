import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme/theme';
import { hp, wp, rf } from '../utils/responsiveUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  highlight?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Virtual Try-On!',
    description: 'Experience clothes on yourself before buying. Our AI technology creates realistic overlays.',
    icon: 'sparkles-outline',
  },
  {
    id: 'camera',
    title: 'Position Yourself',
    description: 'Stand in front of the camera with good lighting. Make sure your full body is visible.',
    icon: 'camera-outline',
  },
  {
    id: 'select',
    title: 'Choose Your Item',
    description: 'Browse and select clothing items from our catalog. PNG images work best for transparent overlays.',
    icon: 'shirt-outline',
  },
  {
    id: 'adjust',
    title: 'Perfect the Fit',
    description: 'Use the settings panel to adjust opacity, position, and scale for the best look.',
    icon: 'options-outline',
  },
  {
    id: 'capture',
    title: 'Capture & Share',
    description: 'Take a photo of your virtual try-on and share it with friends or save for later.',
    icon: 'camera',
  },
];

interface VirtualTryOnTutorialProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const TUTORIAL_SHOWN_KEY = 'virtual_tryon_tutorial_shown';

export default function VirtualTryOnTutorial({
  visible,
  onComplete,
  onSkip
}: VirtualTryOnTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(screenHeight));

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_SHOWN_KEY, 'true');
    } catch (error) {
      console.error('Error saving tutorial completion:', error);
    }
    onComplete();
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_SHOWN_KEY, 'true');
    } catch (error) {
      console.error('Error saving tutorial skip:', error);
    }
    onSkip();
  };

  if (!visible) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        }
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />

      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <View style={styles.progressContainer}>
              {tutorialSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                    index < currentStep && styles.progressDotCompleted,
                  ]}
                />
              ))}
            </View>

            <View style={styles.stepCounter}>
              <Text style={styles.stepText}>
                {currentStep + 1} of {tutorialSteps.length}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={step.icon as any}
                size={rf(80)}
                color={theme.colors.primary}
              />
            </View>

            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            {step.highlight && (
              <View style={styles.highlightContainer}>
                <Text style={styles.highlightText}>{step.highlight}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {!isFirstStep && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handlePrevious}
              >
                <Ionicons name="chevron-back" size={rf(20)} color={theme.colors.primary} />
                <Text style={styles.buttonSecondaryText}>Previous</Text>
              </TouchableOpacity>
            )}

            <View style={styles.spacer} />

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleNext}
            >
              <Text style={styles.buttonPrimaryText}>
                {isLastStep ? 'Get Started' : 'Next'}
              </Text>
              {!isLastStep && (
                <Ionicons name="chevron-forward" size={rf(20)} color={theme.colors.surface} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Animated.View>
  );
}

// Utility function to check if tutorial should be shown
export const shouldShowVirtualTryOnTutorial = async (): Promise<boolean> => {
  try {
    const shown = await AsyncStorage.getItem(TUTORIAL_SHOWN_KEY);
    return shown !== 'true';
  } catch (error) {
    console.error('Error checking tutorial status:', error);
    return true; // Show tutorial if we can't check
  }
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: wp(8),
    borderTopRightRadius: wp(8),
    marginTop: hp(10),
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  skipButton: {
    padding: wp(2),
  },
  skipText: {
    fontSize: rf(16),
    color: theme.colors.primary,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    backgroundColor: theme.colors.border,
    marginHorizontal: wp(1),
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
    transform: [{ scaleX: 1.5 }],
  },
  progressDotCompleted: {
    backgroundColor: theme.colors.primary,
  },
  stepCounter: {
    padding: wp(2),
  },
  stepText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
  },
  iconContainer: {
    width: wp(32),
    height: wp(32),
    borderRadius: wp(16),
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(4),
  },
  title: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: hp(2),
  },
  description: {
    fontSize: rf(16),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(24),
    marginBottom: hp(3),
  },
  highlightContainer: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderRadius: wp(3),
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  highlightText: {
    fontSize: rf(14),
    color: theme.colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: wp(3),
    minWidth: wp(24),
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  buttonPrimaryText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.surface,
    marginRight: wp(1),
  },
  buttonSecondaryText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: wp(1),
  },
  spacer: {
    flex: 1,
  },
});