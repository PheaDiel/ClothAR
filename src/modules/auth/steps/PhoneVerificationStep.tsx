import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, HelperText, Text, ActivityIndicator } from 'react-native-paper';
import { parsePhoneNumber } from 'libphonenumber-js';
import { RegistrationData } from '../../../types';
import { wp, rf } from '../../../utils/responsiveUtils';
import { supabase } from '../../../services/supabase';
import { EmailService } from '../../../services/emailService';

interface PhoneVerificationStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function PhoneVerificationStep({ data, onUpdate, onNext, onPrev }: PhoneVerificationStepProps) {
  const [email, setEmail] = useState(data.email || '');
  const [emailSent, setEmailSent] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [emailError, setEmailError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendVerificationEmail = async () => {
    if (!email || !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');
    setLoading(true);

    try {
      // Generate verification token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Store token in database
      const { error: tokenError } = await supabase
        .from('email_verification_tokens')
        .insert({
          user_id: data.userId, // Assuming userId is available from registration
          email: email,
          token: token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });

      if (tokenError) {
        console.error('Token storage error:', tokenError);
        Alert.alert('Error', 'Failed to send verification email. Please try again.');
        return;
      }

      // Send verification email
      const emailService = EmailService.getInstance();
      const emailSent = await emailService.sendVerificationEmail({
        email: email,
        verificationToken: token,
        userId: data.userId || ''
      });

      if (emailSent) {
        setVerificationToken(token);
        setEmailSent(true);
        onUpdate({ email });
        Alert.alert('Verification Email Sent', `A verification link has been sent to ${email}`);
      } else {
        Alert.alert('Error', 'Failed to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailToken = async () => {
    if (!verificationToken.trim()) {
      setTokenError('Please enter the verification token from your email');
      return;
    }

    setTokenError('');
    setLoading(true);

    try {
      // Verify token with database function
      const { data: result, error } = await supabase
        .rpc('verify_email_with_token', {
          p_token: verificationToken.trim()
        });

      if (error) {
        console.error('Token verification error:', error);
        setTokenError('Invalid or expired verification token');
        return;
      }

      if (result && result.success) {
        Alert.alert('Success', 'Email verified successfully!');
        onUpdate({ emailVerified: true });
        onNext();
      } else {
        setTokenError(result?.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setTokenError('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError('');
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <Button
          mode="text"
          onPress={() => setEmailSent(false)}
          style={styles.backButton}
        >
          ← Back
        </Button>

        <Text style={styles.title}>Verify Email Address</Text>
        <Text style={styles.subtitle}>
          Enter the verification token sent to {email}
        </Text>

        <TextInput
          label="Verification Token"
          value={verificationToken}
          onChangeText={(value) => {
            setVerificationToken(value);
            setTokenError('');
          }}
          style={styles.input}
          error={!!tokenError}
          placeholder="Enter token from email"
        />
        <HelperText type="error" visible={!!tokenError}>
          {tokenError}
        </HelperText>

        <Button
          mode="contained"
          onPress={verifyEmailToken}
          style={styles.button}
          disabled={!verificationToken.trim() || loading}
        >
          {loading ? <ActivityIndicator size="small" color="white" /> : 'Verify Email'}
        </Button>

        <Button mode="text" onPress={sendVerificationEmail} style={styles.resendButton} disabled={loading}>
          Resend Verification Email
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email Verification</Text>
      <Text style={styles.subtitle}>
        We need to verify your email address for account security
      </Text>

      <TextInput
        label="Email Address"
        value={email}
        onChangeText={handleEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        error={!!emailError}
        placeholder="your.email@example.com"
      />
      <HelperText type="error" visible={!!emailError}>
        {emailError}
      </HelperText>

      <Button
        mode="contained"
        onPress={sendVerificationEmail}
        style={styles.button}
        disabled={!email || loading}
      >
        {loading ? <ActivityIndicator size="small" color="white" /> : 'Send Verification Email'}
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
