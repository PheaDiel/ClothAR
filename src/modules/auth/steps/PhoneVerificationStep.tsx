import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, HelperText, Text } from 'react-native-paper';
import { parsePhoneNumber } from 'libphonenumber-js';
import { RegistrationData } from '../../../types';
import { wp, rf } from '../../../utils/responsiveUtils';

interface PhoneVerificationStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function PhoneVerificationStep({ data, onUpdate, onNext, onPrev }: PhoneVerificationStepProps) {
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

  const validatePhilippinePhone = (phone: string) => {
    // Remove spaces and dashes for validation
    const cleanPhone = phone.replace(/[\s-]/g, '');

    // Check if it starts with +63 or 09
    if (!cleanPhone.startsWith('+63') && !cleanPhone.startsWith('09')) {
      return false;
    }

    try {
      const phoneNumber = parsePhoneNumber(cleanPhone, 'PH');
      return phoneNumber.isValid();
    } catch {
      return false;
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Basic formatting for Philippine numbers
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.startsWith('63')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      cleaned = '+63' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+63' + cleaned;
    }
    return cleaned;
  };

  const sendOtp = () => {
    if (!data.phone || !validatePhilippinePhone(data.phone)) {
      setPhoneError('Please enter a valid Philippine phone number (+63 or 09)');
      return;
    }

    setPhoneError('');

    // Mock OTP generation
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setOtpSent(true);
    Alert.alert('OTP Sent', `Your OTP is: ${mockOtp}`); // Remove in production
  };

  const verifyOtp = () => {
    if (otp === generatedOtp) {
      setOtpError('');
      onNext();
    } else {
      setOtpError('Invalid OTP. Please try again.');
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    onUpdate({ phone: formatted });
    setPhoneError('');
  };

  if (otpSent) {
    return (
      <View style={styles.container}>
        <Button
          mode="text"
          onPress={() => setOtpSent(false)}
          style={styles.backButton}
        >
          ← Back
        </Button>

        <Text style={styles.title}>Verify Phone Number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit OTP sent to {data.phone}
        </Text>

        <TextInput
          label="OTP"
          value={otp}
          onChangeText={(value) => {
            setOtp(value);
            setOtpError('');
          }}
          keyboardType="numeric"
          maxLength={6}
          style={styles.input}
          error={!!otpError}
        />
        <HelperText type="error" visible={!!otpError}>
          {otpError}
        </HelperText>

        <Button mode="contained" onPress={verifyOtp} style={styles.button}>
          Verify & Continue
        </Button>

        <Button mode="text" onPress={sendOtp} style={styles.resendButton}>
          Resend OTP
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phone Verification</Text>
      <Text style={styles.subtitle}>
        We need to verify your Philippine phone number for account security
      </Text>

      <TextInput
        label="Phone Number"
        value={data.phone}
        onChangeText={handlePhoneChange}
        keyboardType="phone-pad"
        placeholder="+63 or 09..."
        style={styles.input}
        error={!!phoneError}
      />
      <HelperText type="error" visible={!!phoneError}>
        {phoneError}
      </HelperText>

      <Button
        mode="contained"
        onPress={sendOtp}
        style={styles.button}
        disabled={!data.phone}
      >
        Send OTP
      </Button>

      <Button mode="text" onPress={onPrev} style={styles.backButton}>
        Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: wp(4),
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
  resendButton: {
    marginTop: wp(2),
  },
});
