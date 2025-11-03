import React, { useContext, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { TextInput, Button, Text, useTheme, Divider } from 'react-native-paper';
import { AuthContext } from '../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { wp, hp, rf } from '../../utils/responsiveUtils';
import PasswordInput from '../../components/PasswordInput';

export default function LoginScreen() {
  const { login, proceedAsGuest } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigation<NativeStackNavigationProp<any>>();
  const theme = useTheme();

  const onLogin = async () => {
    setLoading(true);
    await login(email.trim(), password);
    setLoading(false);
  };

  const onGuestAccess = async () => {
    setLoading(true);
    await proceedAsGuest();
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <KeyboardAvoidingView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to ClothAR</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
          
          <TextInput 
            label="Email" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address" 
            style={styles.input}
          />
          <PasswordInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <Button
            mode="text"
            onPress={() => nav.navigate('PasswordReset')}
            style={styles.forgotPasswordButton}
            disabled={loading}
          >
            Forgot Password?
          </Button>

          <Button
            mode="contained" 
            onPress={onLogin} 
            loading={loading} 
            style={styles.button}
            disabled={loading}
          >
            Login
          </Button>
          
          <Button 
            onPress={() => nav.navigate('Register')} 
            style={styles.secondaryButton}
            disabled={loading}
          >
            Create account
          </Button>
          
          <Divider style={styles.divider} />
          
          <Text style={styles.guestTitle}>Guest Access</Text>
          <Text style={styles.guestDescription}>
            Continue as a guest to explore limited features
          </Text>
          
          <Button 
            onPress={onGuestAccess} 
            style={styles.guestButton}
            mode="outlined"
            disabled={loading}
          >
            Proceed as Guest
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: wp(4),
    backgroundColor: '#FBFCFF'
  },
  card: {
    backgroundColor: '#FFF',
    padding: wp(6),
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: rf(28),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: wp(2),
    color: '#333'
  },
  subtitle: {
    fontSize: rf(16),
    textAlign: 'center',
    marginBottom: wp(6),
    color: '#666'
  },
  input: {
    marginBottom: wp(4)
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: wp(2),
  },
  button: {
    marginTop: wp(3),
    paddingVertical: wp(3)
  },
  secondaryButton: {
    marginTop: wp(3),
    paddingVertical: wp(3)
  },
  divider: {
    marginVertical: wp(6)
  },
  guestTitle: {
    fontSize: rf(18),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: wp(2)
  },
  guestDescription: {
    textAlign: 'center',
    marginBottom: wp(4),
    color: '#666'
  },
  guestButton: {
    marginTop: wp(2),
    paddingVertical: wp(3)
  }
});
