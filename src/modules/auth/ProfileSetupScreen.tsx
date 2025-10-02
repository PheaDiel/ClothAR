import React, { useContext, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { wp, rf } from '../../utils/responsiveUtils';

export default function ProfileSetupScreen() {
  const { user, updateProfile } = useContext(AuthContext);
  const nav = useNavigation();
  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState('');

  const onCompleteProfile = async () => {
    try {
      const ok = await updateProfile(name.trim(), address.trim());
      if (ok) {
        nav.navigate('MainTabs' as never);
      }
    } catch (error) {
      // Error in onCompleteProfile
    }
  };

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: rf(22), marginBottom: wp(3) }}>Complete Your Profile</Text>
      <Text style={{ fontSize: rf(16), marginBottom: wp(5), textAlign: 'center', color: '#666' }}>
        Please provide your name and address to continue
      </Text>
      <TextInput
        label="Full Name"
        value={name}
        onChangeText={setName}
        style={{ marginBottom: wp(3) }}
      />
      <TextInput
        label="Address"
        value={address}
        onChangeText={setAddress}
        multiline
        numberOfLines={3}
        style={{ marginBottom: wp(3) }}
      />
      <Button
        mode="contained"
        onPress={onCompleteProfile}
        style={{ marginTop: wp(3) }}
        disabled={!name.trim() || !address.trim()}
      >
        Complete Profile
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: wp(4),
    flex: 1,
    backgroundColor: '#FBFCFF',
    justifyContent: 'center'
  }
});
