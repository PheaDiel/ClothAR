import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  useTheme,
  ActivityIndicator
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileService } from '../../services/profileService';
import { wp, rf } from '../../utils/responsiveUtils';

type PasswordResetScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export default function PasswordResetScreen({ navigation }: PasswordResetScreenProps) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendResetEmail = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await ProfileService.requestPasswordReset(email.trim());
      if (result.success) {
        setEmailSent(true);
        Alert.alert(
          'Reset Email Sent',
          'Please check your email for password reset instructions.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send reset email');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.replace('Login');
  };

  if (emailSent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check Your Email</Text>
        </View>

        <View style={styles.successContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={80} color="#2E86AB" />
          </View>

          <Text style={styles.successTitle}>Reset Email Sent!</Text>

          <Text style={styles.successMessage}>
            We've sent password reset instructions to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <Text style={styles.instructions}>
            Click the link in the email to reset your password. If you don't see the email, check your spam folder.
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => setEmailSent(false)}
              style={styles.resendButton}
            >
              Try Different Email
            </Button>

            <Button
              mode="contained"
              onPress={handleBackToLogin}
              style={styles.backButton}
            >
              Back to Login
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <Text style={styles.headerSubtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            label="Email Address"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
            error={!!errors.email}
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSendResetEmail}
            loading={loading}
            disabled={loading || !email.trim()}
            style={styles.sendButton}
            contentStyle={styles.sendButtonContent}
          >
            Send Reset Email
          </Button>

          <Button
            mode="text"
            onPress={handleBackToLogin}
            style={styles.backButton}
          >
            Back to Login
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    padding: wp(6),
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: wp(2),
  },
  headerSubtitle: {
    fontSize: rf(16),
    color: '#666',
    textAlign: 'center',
    lineHeight: rf(22),
  },
  formContainer: {
    padding: wp(6),
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    marginBottom: wp(1),
  },
  sendButton: {
    marginTop: wp(4),
  },
  sendButtonContent: {
    height: wp(12),
  },
  backButton: {
    marginTop: wp(2),
  },
  successContainer: {
    flex: 1,
    padding: wp(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: wp(6),
  },
  successTitle: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: wp(4),
    textAlign: 'center',
  },
  successMessage: {
    fontSize: rf(16),
    color: '#666',
    textAlign: 'center',
    marginBottom: wp(4),
    lineHeight: rf(22),
  },
  emailText: {
    fontWeight: 'bold',
    color: '#2E86AB',
  },
  instructions: {
    fontSize: rf(14),
    color: '#666',
    textAlign: 'center',
    marginBottom: wp(8),
    lineHeight: rf(20),
  },
  buttonContainer: {
    width: '100%',
    gap: wp(3),
  },
  resendButton: {
    // No additional styles needed
  },
});