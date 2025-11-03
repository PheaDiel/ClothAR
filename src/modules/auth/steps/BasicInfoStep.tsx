import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import PasswordInput from '../../../components/PasswordInput';
import { RegistrationData } from '../../../types';
import { wp, rf } from '../../../utils/responsiveUtils';
import { useToast } from '../../../context/ToastContext';

interface BasicInfoStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
}

export default function BasicInfoStep({ data, onUpdate, onNext }: BasicInfoStepProps) {
  const { showError } = useToast();

  // Local state for form inputs to prevent interference
  const [formData, setFormData] = useState({
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    password: data.password || '',
    confirmPassword: '',
  });

  // Set default role to customer on component mount
  React.useEffect(() => {
    if (!data.role_request) {
      onUpdate({ role_request: 'customer' });
    }
  }, []);

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Update parent component data immediately with the new value
    onUpdate({ [fieldName]: value });
  };

  const handleConfirmPasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, confirmPassword: value }));
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.phone.trim()) errors.push('Phone is required');
    if (!formData.password) errors.push('Password is required');
    if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    // Basic phone validation (Philippine numbers)
    const phoneRegex = /^(\+63|0)[0-9]{10}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      errors.push('Please enter a valid Philippine phone number');
    }

    // Password strength
    if (formData.password && formData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return errors;
  };

  const handleNext = () => {
    const errors = validateForm();

    if (errors.length > 0) {
      showError(errors[0]); // Show first error
      return;
    }

    onNext();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
      <Text style={styles.title}>Basic Information</Text>
      <Text style={styles.subtitle}>Please provide your basic details to create an account</Text>

      <TextInput
        label="Full Name"
        value={formData.name}
        onChangeText={(value) => handleFieldChange('name', value)}
        style={styles.input}
      />

      <TextInput
        label="Email"
        value={formData.email}
        onChangeText={(value) => handleFieldChange('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <PasswordInput
        label="Password"
        value={formData.password}
        onChangeText={(value) => handleFieldChange('password', value)}
        style={styles.input}
      />

      <PasswordInput
        label="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        style={styles.input}
      />

      <TextInput
        label="Phone Number"
        value={formData.phone}
        onChangeText={(value) => handleFieldChange('phone', value)}
        keyboardType="phone-pad"
        style={styles.input}
      />


           <Button
             mode="contained"
             onPress={handleNext}
             style={styles.nextButton}
             contentStyle={styles.nextButtonContent}
             disabled={!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password || formData.password !== formData.confirmPassword}
           >
             Next
           </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: wp(8),
  },
  title: {
    fontSize: rf(20),
    fontWeight: 'bold',
    marginBottom: wp(2),
    color: '#333',
  },
  subtitle: {
    fontSize: rf(14),
    marginBottom: wp(6),
    color: '#666',
  },
  input: {
    marginBottom: wp(1),
  },
  nextButton: {
    marginTop: wp(4),
  },
  nextButtonContent: {
    height: wp(12),
  },
  pickerContainer: {
    marginBottom: wp(4),
  },
  label: {
    fontSize: rf(16),
    fontWeight: '600',
    marginBottom: wp(2),
    color: '#333',
  },
});
