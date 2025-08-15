import React, { useContext, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { TextInput, Button, Text, useTheme, Divider } from 'react-native-paper';
import { AuthContext } from '../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

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
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
          
          <TextInput 
            label="Email" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address" 
            style={styles.input}
          />
          <TextInput 
            label="Password" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
            style={styles.input}
          />
          
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
    padding: 16, 
    backgroundColor: '#FBFCFF' 
  },
  card: { 
    backgroundColor: '#FFF', 
    padding: 24, 
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
    fontSize: 28, 
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666'
  },
  input: {
    marginBottom: 16
  },
  button: {
    marginTop: 12,
    paddingVertical: 8
  },
  secondaryButton: {
    marginTop: 12
  },
  divider: {
    marginVertical: 24
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8
  },
  guestDescription: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666'
  },
  guestButton: {
    marginTop: 8
  }
});
