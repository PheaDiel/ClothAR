import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, HelperText, Text, Menu } from 'react-native-paper';
import PasswordInput from '../../../components/PasswordInput';
import { RegistrationData } from '../../../types';
import { wp, rf } from '../../../utils/responsiveUtils';
import { useRegistrationForm } from '../../../hooks/useFormValidation';
import { useToast } from '../../../context/ToastContext';

interface BasicInfoStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
}

export default function BasicInfoStep({ data, onUpdate, onNext }: BasicInfoStepProps) {
  const { showError } = useToast();

  // Initialize form with existing data
  const form = useRegistrationForm();

  // Sync form data with parent component
  React.useEffect(() => {
    if (data.name) form.setFieldValue('name', data.name);
    if (data.email) form.setFieldValue('email', data.email);
    if (data.phone) form.setFieldValue('phone', data.phone);
    if (data.password) form.setFieldValue('password', data.password);
  }, [data]);

  // Set default role to customer on component mount
  React.useEffect(() => {
    if (!data.role_request) {
      onUpdate({ role_request: 'customer' });
    }
  }, []);

  const handleFieldChange = (fieldName: string, value: string) => {
    form.setFieldValue(fieldName, value);
    // Update parent component data
    onUpdate({ [fieldName]: form.getFieldValue(fieldName) });
  };

  const handleConfirmPasswordChange = (value: string) => {
    form.setFieldValue('confirmPassword', value);
  };

  const handleNext = () => {
    // Validate password confirmation manually
    const password = form.getFieldValue('password');
    const confirmPassword = form.getFieldValue('confirmPassword');

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (form.validateForm()) {
      onNext();
    } else {
      showError('Please correct the errors in the form');
    }
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
        value={form.fields.name.value}
        onChangeText={(value) => handleFieldChange('name', value)}
        style={styles.input}
        error={!!form.fields.name.error}
      />
      <HelperText type="error" visible={!!form.fields.name.error}>
        {form.fields.name.error}
      </HelperText>

      <TextInput
        label="Email"
        value={form.fields.email.value}
        onChangeText={(value) => handleFieldChange('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        error={!!form.fields.email.error}
      />
      <HelperText type="error" visible={!!form.fields.email.error}>
        {form.fields.email.error}
      </HelperText>

      <PasswordInput
        label="Password"
        value={form.fields.password.value}
        onChangeText={(value) => handleFieldChange('password', value)}
        style={styles.input}
        error={!!form.fields.password.error}
      />
      <HelperText type="error" visible={!!form.fields.password.error}>
        {form.fields.password.error}
      </HelperText>

      <PasswordInput
        label="Confirm Password"
        value={form.fields.confirmPassword.value}
        onChangeText={handleConfirmPasswordChange}
        style={styles.input}
        error={!!form.fields.confirmPassword.error}
      />
      <HelperText type="error" visible={!!form.fields.confirmPassword.error}>
        {form.fields.confirmPassword.error}
      </HelperText>

      <TextInput
        label="Phone Number"
        value={form.fields.phone.value}
        onChangeText={(value) => handleFieldChange('phone', value)}
        keyboardType="phone-pad"
        style={styles.input}
        error={!!form.fields.phone.error}
      />
      <HelperText type="error" visible={!!form.fields.phone.error}>
        {form.fields.phone.error}
      </HelperText>


           <Button
             mode="contained"
             onPress={handleNext}
             style={styles.nextButton}
             contentStyle={styles.nextButtonContent}
             disabled={!form.isValid}
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
