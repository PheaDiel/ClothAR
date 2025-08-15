import React, { useContext, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function RegisterScreen() {
  const { register } = useContext(AuthContext);
  const nav = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onRegister = async () => {
    const ok = await register(name.trim(), email.trim(), password);
    if (ok) nav.navigate('Dashboard' as never); // navigate into main flow after register
  };

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>Create account</Text>
      <TextInput label="Name" value={name} onChangeText={setName} />
      <TextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button mode="contained" onPress={onRegister} style={{ marginTop: 12 }}>
        Register
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({ container: { padding: 16, flex: 1, backgroundColor: '#FBFCFF' } });
