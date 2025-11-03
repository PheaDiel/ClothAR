import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button } from 'react-native-paper';
import BodyMeasurementForm from '../../../modules/measurements/BodyMeasurementForm';
import { wp, rf } from '../../../utils/responsiveUtils';

interface MeasurementsStepProps {
  onComplete: () => void;
  onPrev: () => void;
  loading: boolean;
}

export default function MeasurementsStep({ onComplete, onPrev, loading }: MeasurementsStepProps) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Body Measurements</Text>
          <Text style={styles.subtitle}>
            Help us provide better recommendations by adding your body measurements. You can skip this and add them later.
          </Text>
        </View>

        <View style={styles.content}>
          <BodyMeasurementForm
            navigation={{} as any}
            isOnboarding={true}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={onPrev}
            style={styles.backButton}
            contentStyle={styles.backButtonContent}
            disabled={loading}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={onComplete}
            style={styles.completeButton}
            contentStyle={styles.completeButtonContent}
            loading={loading}
            disabled={loading}
          >
            Complete Registration
          </Button>
        </View>
      </KeyboardAvoidingView>
    );
  }

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingBottom: wp(2),
    },
    title: {
      fontSize: rf(20),
      fontWeight: 'bold',
      marginBottom: wp(2),
      color: '#333',
    },
    subtitle: {
      fontSize: rf(14),
      marginBottom: wp(2),
      color: '#666',
    },
    content: {
      flex: 1,
      minHeight: 0,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: wp(2),
      paddingBottom: wp(2),
      paddingHorizontal: wp(4),
      backgroundColor: '#FBFCFF',
      borderTopWidth: 1,
      borderTopColor: '#E0E0E0',
    },
    backButton: {
      flex: 1,
      marginRight: wp(2),
    },
    completeButton: {
      flex: 1,
      marginLeft: wp(2),
    },
    backButtonContent: {
      height: wp(12),
    },
    completeButtonContent: {
      height: wp(12),
    },
  });
