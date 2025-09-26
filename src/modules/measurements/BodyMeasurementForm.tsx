import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity
} from 'react-native';
import { TextInput, Button, Switch } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthContext } from '../../context/AuthContext';
import { Measurement } from '../../types';

type BodyMeasurementFormProps = {
  navigation: NativeStackNavigationProp<any>;
  route?: { params?: { measurement?: Measurement } };
  isOnboarding?: boolean;
};

export default function BodyMeasurementForm({ navigation, route, isOnboarding = false }: BodyMeasurementFormProps) {
  const { user } = useContext(AuthContext);
  const existingMeasurement = route?.params?.measurement;

  const [formData, setFormData] = useState({
    name: existingMeasurement?.name || '',
    measurements: {
      bust: existingMeasurement?.measurements.bust?.toString() || '',
      waist: existingMeasurement?.measurements.waist?.toString() || '',
      hip: existingMeasurement?.measurements.hip?.toString() || '',
      inseam: existingMeasurement?.measurements.inseam?.toString() || '',
      shoulder: existingMeasurement?.measurements.shoulder?.toString() || '',
      sleeve: existingMeasurement?.measurements.sleeve?.toString() || '',
      neck: existingMeasurement?.measurements.neck?.toString() || '',
      chest: existingMeasurement?.measurements.chest?.toString() || '',
      armhole: existingMeasurement?.measurements.armhole?.toString() || '',
      wrist: existingMeasurement?.measurements.wrist?.toString() || '',
      thigh: existingMeasurement?.measurements.thigh?.toString() || '',
      knee: existingMeasurement?.measurements.knee?.toString() || '',
      ankle: existingMeasurement?.measurements.ankle?.toString() || '',
      outseam: existingMeasurement?.measurements.outseam?.toString() || '',
    },
    notes: existingMeasurement?.notes || '',
    isDefault: existingMeasurement?.isDefault || false,
  });

  const [loading, setLoading] = useState(false);

  const updateMeasurement = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [key]: value
      }
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name for your measurements');
      return false;
    }

    // Check if at least one measurement is provided
    const hasMeasurements = Object.values(formData.measurements).some(val => val.trim() !== '');
    if (!hasMeasurements) {
      Alert.alert('Error', 'Please enter at least one measurement');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (user?.isGuest) {
      Alert.alert(
        'Account Required',
        'Please create an account to save measurements.',
        [
          { text: 'Create Account', onPress: () => navigation.navigate('Register') },
          { text: 'Cancel' }
        ]
      );
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      const measurementData: Omit<Measurement, '_id' | 'createdAt' | 'updatedAt'> = {
        userId: user?.id || '',
        name: formData.name.trim(),
        measurements: Object.fromEntries(
          Object.entries(formData.measurements)
            .map(([key, value]) => [key, value.trim() ? parseFloat(value) : undefined])
            .filter(([, value]) => value !== undefined)
        ),
        notes: formData.notes.trim() || undefined,
        isDefault: formData.isDefault,
      };

      // TODO: Replace with actual API call
      console.log('Saving measurement:', measurementData);

      Alert.alert(
        'Success',
        existingMeasurement ? 'Measurements updated successfully!' : 'Measurements saved successfully!',
        [{ text: 'OK', onPress: () => {
          if (isOnboarding) {
            navigation.navigate('ProfileSetup' as never);
          } else {
            navigation.goBack();
          }
        } }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save measurements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderMeasurementInput = (
    label: string,
    key: string,
    placeholder: string,
    required = false
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        mode="outlined"
        placeholder={placeholder}
        value={formData.measurements[key as keyof typeof formData.measurements]}
        onChangeText={(value) => updateMeasurement(key, value)}
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Measurement Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Measurement Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              mode="outlined"
              placeholder="e.g., My Standard Measurements"
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
              style={styles.input}
            />
          </View>

          {/* Basic Measurements */}
          <Text style={styles.sectionTitle}>Basic Measurements</Text>
          <View style={styles.measurementsGrid}>
            {renderMeasurementInput('Bust', 'bust', '36 inches', true)}
            {renderMeasurementInput('Waist', 'waist', '28 inches', true)}
            {renderMeasurementInput('Hip', 'hip', '38 inches', true)}
            {renderMeasurementInput('Inseam', 'inseam', '32 inches')}
          </View>

          {/* Upper Body Measurements */}
          <Text style={styles.sectionTitle}>Upper Body</Text>
          <View style={styles.measurementsGrid}>
            {renderMeasurementInput('Shoulder', 'shoulder', '16 inches')}
            {renderMeasurementInput('Sleeve', 'sleeve', '24 inches')}
            {renderMeasurementInput('Neck', 'neck', '15 inches')}
            {renderMeasurementInput('Chest', 'chest', '40 inches')}
            {renderMeasurementInput('Armhole', 'armhole', '18 inches')}
            {renderMeasurementInput('Wrist', 'wrist', '7 inches')}
          </View>

          {/* Lower Body Measurements */}
          <Text style={styles.sectionTitle}>Lower Body</Text>
          <View style={styles.measurementsGrid}>
            {renderMeasurementInput('Thigh', 'thigh', '24 inches')}
            {renderMeasurementInput('Knee', 'knee', '15 inches')}
            {renderMeasurementInput('Ankle', 'ankle', '9 inches')}
            {renderMeasurementInput('Outseam', 'outseam', '42 inches')}
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              mode="outlined"
              placeholder="Any additional notes about these measurements..."
              value={formData.notes}
              onChangeText={(value) => setFormData(prev => ({ ...prev, notes: value }))}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.notesInput]}
            />
          </View>

          {/* Default Setting */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Set as Default Measurements</Text>
            <Switch
              value={formData.isDefault}
              onValueChange={(value) => setFormData(prev => ({ ...prev, isDefault: value }))}
              color="#2E86AB"
            />
          </View>

          {/* Help Text */}
          <TouchableOpacity
            style={styles.helpContainer}
            onPress={() => navigation.navigate('MeasurementGuide')}
          >
            <Ionicons name="help-circle-outline" size={20} color="#2E86AB" />
            <Text style={styles.helpText}>Need help measuring? View our guide</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.saveButton}
        >
          {existingMeasurement ? 'Update Measurements' : 'Save Measurements'}
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
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    backgroundColor: '#fff',
  },
  notesInput: {
    height: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  helpText: {
    fontSize: 14,
    color: '#2E86AB',
    marginLeft: 8,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    paddingVertical: 8,
  },
});