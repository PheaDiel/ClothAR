import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import BodyMeasurementForm from '../measurements/BodyMeasurementForm';
import { wp, rf } from '../../utils/responsiveUtils';

export default function MeasurementOnboardingScreen() {
  const navigation = useNavigation();

  const handleSkip = () => {
    navigation.navigate('ProfileSetup' as never);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Your Measurements</Text>
          <Text style={styles.subtitle}>
            Help us provide better recommendations by adding your body measurements. You can skip this and add them later.
          </Text>
        </View>
        <BodyMeasurementForm navigation={navigation as any} isOnboarding={true} />
      </ScrollView>
      <View style={styles.skipContainer}>
        <Button
          mode="outlined"
          onPress={handleSkip}
          style={styles.skipButton}
        >
          Skip for Now
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: wp(4),
    backgroundColor: '#fff',
    marginBottom: wp(2),
  },
  title: {
    fontSize: rf(22),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: wp(2),
  },
  subtitle: {
    fontSize: rf(16),
    color: '#666',
    lineHeight: rf(22),
  },
  skipContainer: {
    padding: wp(4),
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  skipButton: {
    paddingVertical: wp(2),
  },
});