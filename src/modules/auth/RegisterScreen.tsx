import React, { useContext, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

import PasswordInput from '../../components/PasswordInput';
export default function RegisterScreen() {
  const { register } = useContext(AuthContext);
  const nav = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');

  const sendOtp = () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }
    // Mock OTP generation - in real app, this would call an API
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setOtpSent(true);
    Alert.alert('OTP Sent', `Your OTP is: ${mockOtp}`); // In production, don't show this
  };

  const verifyOtp = () => {
    if (otp === generatedOtp) {
      onRegister();
    } else {
      Alert.alert('Invalid OTP', 'Please enter the correct OTP');
    }
  };

  const onRegister = async () => {
    const ok = await register(name.trim(), email.trim(), password.trim(), phone.trim());
    if (ok) nav.navigate('MeasurementOnboarding' as never);
  };

  if (otpSent) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Button
            mode="text"
            onPress={() => setOtpSent(false)}
            style={styles.backButton}
          >
            ← Back
          </Button>
        </View>
        <Text style={{ fontSize: 22, marginBottom: 12 }}>Verify Phone Number</Text>
        <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center', color: '#666' }}>
          Enter the 6-digit OTP sent to {phone}
        </Text>
        <TextInput
          label="OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
          maxLength={6}
          style={{ marginBottom: 12 }}
        />
        <Button mode="contained" onPress={verifyOtp} style={{ marginTop: 12 }}>
          Verify & Register
        </Button>
        <Button mode="text" onPress={sendOtp} style={{ marginTop: 12 }}>
          Resend OTP
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>Create account</Text>
      <TextInput label="Name" value={name} onChangeText={setName} />
      <TextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <PasswordInput label="Password" value={password} onChangeText={setPassword} />
      <PasswordInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} />
      <TextInput
        label="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={{ marginBottom: 12 }}
      />
      <Button
        mode="contained"
        onPress={sendOtp}
        style={{ marginTop: 12 }}
        disabled={!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !phone.trim()}
      >
        Send OTP
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#FBFCFF'
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
  }
});
