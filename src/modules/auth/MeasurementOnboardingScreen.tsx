import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BodyMeasurementForm from '../measurements/BodyMeasurementForm';
import { wp, hp, rf } from '../../utils/responsiveUtils';

export default function MeasurementOnboardingScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const handleSkip = () => {
    navigation.navigate('ProfileSetup' as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Add Your Measurements</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Help us provide better recommendations by adding your body measurements. You can skip this and add them later.
          </Text>
        </View>
        <BodyMeasurementForm navigation={navigation as any} isOnboarding={true} />
      </ScrollView>
      
      <View style={[styles.skipContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
        <Button
          mode="outlined"
          onPress={handleSkip}
          style={[styles.skipButton, { borderColor: theme.colors.primary }]}
          labelStyle={{ color: theme.colors.primary }}
        >
          Skip for Now
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: wp(4),
    marginBottom: hp(1),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: rf(22),
    fontWeight: 'bold',
    marginBottom: hp(1),
  },
  subtitle: {
    fontSize: rf(16),
    lineHeight: rf(22),
  },
  skipContainer: {
    padding: wp(4),
    borderTopWidth: 1,
  },
  skipButton: {
    paddingVertical: hp(1),
  },
});
