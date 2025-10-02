import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, HelperText, Text } from 'react-native-paper';
import PasswordInput from '../../../components/PasswordInput';
import { RegistrationData } from '../../../types';
import { wp, rf } from '../../../utils/responsiveUtils';

interface BasicInfoStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
}

export default function BasicInfoStep({ data, onUpdate, onNext }: BasicInfoStepProps) {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!data.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(data.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!data.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(data.password)) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (data.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basic Information</Text>
      <Text style={styles.subtitle}>Please provide your basic details to create an account</Text>

      <TextInput
        label="Full Name"
        value={data.name}
        onChangeText={(value) => {
          onUpdate({ name: value });
          if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
        }}
        style={styles.input}
        error={!!errors.name}
      />
      <HelperText type="error" visible={!!errors.name}>
        {errors.name}
      </HelperText>

      <TextInput
        label="Email"
        value={data.email}
        onChangeText={(value) => {
          onUpdate({ email: value });
          if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        error={!!errors.email}
      />
      <HelperText type="error" visible={!!errors.email}>
        {errors.email}
      </HelperText>

      <PasswordInput
        label="Password"
        value={data.password}
        onChangeText={(value) => {
          onUpdate({ password: value });
          if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
        }}
        style={styles.input}
        error={!!errors.password}
      />
      <HelperText type="error" visible={!!errors.password}>
        {errors.password}
      </HelperText>

      <PasswordInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
        }}
        style={styles.input}
        error={!!errors.confirmPassword}
      />
      <HelperText type="error" visible={!!errors.confirmPassword}>
        {errors.confirmPassword}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleNext}
        style={styles.button}
        disabled={!data.name || !data.email || !data.password || !confirmPassword}
      >
        Next
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  button: {
    marginTop: wp(4),
    paddingVertical: wp(2),
  },
});
