import React, { useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthContext } from '../../context/AuthContext';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  // For guest users, show limited profile information
  const isGuest = user?.isGuest || false;
  const userName = isGuest ? "Guest User" : (user?.name || "User");
  const userEmail = isGuest ? "guest@local" : (user?.email || "user@example.com");
  const userAvatar = isGuest 
    ? "https://i.pravatar.cc/150?img=5" 
    : (user?.email ? `https://i.pravatar.cc/150?img=3` : "https://i.pravatar.cc/150?img=1");

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image source={{ uri: userAvatar }} style={styles.avatar} />
        <Text style={styles.name}>{userName}</Text>
        <Text style={styles.email}>{userEmail}</Text>
        
        {!isGuest && (
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionItem} 
          onPress={() => navigation.navigate('OrderTracking')}
        >
          <Ionicons name="cube-outline" size={24} color="#2E86AB" />
          <Text style={styles.actionText}>My Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionItem} 
          onPress={() => navigation.navigate('Cart')}
        >
          <Ionicons name="cart-outline" size={24} color="#2E86AB" />
          <Text style={styles.actionText}>My Cart</Text>
        </TouchableOpacity>

        {!isGuest && (
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#2E86AB" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Guest Notice */}
      {isGuest && (
        <View style={styles.guestNotice}>
          <Text style={styles.guestNoticeText}>
            You are currently using the app as a guest. Some features may be limited.
          </Text>
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    elevation: 2,
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#777',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E86AB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  actions: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    marginBottom: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  guestNotice: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  guestNoticeText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  registerButton: {
    backgroundColor: '#2E86AB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    padding: 14,
    marginHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 20,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});
