import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthContext } from '../../context/AuthContext';
import { Measurement } from '../../types';
import NotificationIcon from '../../components/NotificationIcon';
import { wp, hp } from '../../utils/responsiveUtils';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout } = useContext(AuthContext);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeasurements();
  }, []);

  const loadMeasurements = async () => {
    try {
      // For now, using mock data. In production, this would call the API
      const mockMeasurements: Measurement[] = [
        {
          _id: '1',
          userId: user?.id || '',
          name: 'My Standard Measurements',
          measurements: {
            bust: 36,
            waist: 28,
            hip: 38,
            inseam: 32
          },
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      setMeasurements(mockMeasurements);
    } catch (error) {
      console.error('Error loading measurements:', error);
    } finally {
      setLoading(false);
    }
  };

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
    ? "https://cdn.vectorstock.com/i/1000v/28/66/gray-profile-silhouette-avatar-vector-21542866.jpg" 
    : (user?.email ? `https://i.pravatar.cc/150?img=3` : "https://i.pravatar.cc/150?img=1");

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Image source={{ uri: userAvatar }} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.name}>{userName}</Text>
                <Text style={styles.email}>{userEmail}</Text>
              </View>
            </View>
            <NotificationIcon navigation={navigation} />
          </View>

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
            accessible={true}
            accessibilityLabel="My Pre-orders"
            accessibilityHint="View your pre-order tracking information"
          >
            <Ionicons name="cube-outline" size={24} color="#2E86AB" />
            <Text style={styles.actionText}>My Pre-orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Cart')}
            accessible={true}
            accessibilityLabel="My Cart"
            accessibilityHint="View items in your shopping cart"
          >
            <Ionicons name="cart-outline" size={24} color="#2E86AB" />
            <Text style={styles.actionText}>My Cart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('HelpScreen')}
            accessible={true}
            accessibilityLabel="Help and FAQ"
            accessibilityHint="Get help and view frequently asked questions"
          >
            <Ionicons name="help-circle-outline" size={24} color="#2E86AB" />
            <Text style={styles.actionText}>Help & FAQ</Text>
          </TouchableOpacity>


          {/* Measurements Section */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('MeasurementGuide')}
            accessible={true}
            accessibilityLabel="Measurement Guide"
            accessibilityHint="Learn how to take body measurements"
          >
            <Ionicons name="book-outline" size={24} color="#2E86AB" />
            <Text style={styles.actionText}>Measurement Guide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('BodyMeasurementForm')}
            accessible={true}
            accessibilityLabel="Add New Measurements"
            accessibilityHint="Add new body measurements for clothing"
          >
            <Ionicons name="add-circle-outline" size={24} color="#2E86AB" />
            <Text style={styles.actionText}>Add New Measurements</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Measurements */}
        {measurements.length > 0 && (
          <View style={styles.measurementsSection}>
            <Text style={styles.sectionTitle}>Saved Measurements</Text>
            {measurements.map((measurement) => (
              <TouchableOpacity
                key={measurement._id}
                style={styles.measurementItem}
                onPress={() => navigation.navigate('BodyMeasurementForm', { measurement })}
              >
                <View style={styles.measurementHeader}>
                  <Text style={styles.measurementName}>{measurement.name}</Text>
                  {measurement.isDefault && (
                    <Text style={styles.defaultBadge}>Default</Text>
                  )}
                </View>
                <Text style={styles.measurementDetails}>
                  Bust: {measurement.measurements.bust || 'N/A'}″ •
                  Waist: {measurement.measurements.waist || 'N/A'}″ •
                  Hip: {measurement.measurements.hip || 'N/A'}″
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Guest Notice */}
        {isGuest && (
          <View style={styles.guestNotice}>
            <Text style={styles.guestNoticeText}>
              You are currently using the app as a guest. Some features may be limited.
            </Text>
            <View style={styles.guestButtons}>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.registerButtonText}>Create Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={async () => {
                  // Clear guest user and return to login
                  await logout();
                  navigation.replace('Login');
                }}
              >
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    padding: wp(5),
    backgroundColor: '#fff',
    elevation: 2,
    marginBottom: wp(2.5),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: wp(3),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    marginLeft: wp(4),
    flex: 1,
  },
  avatar: {
    width: wp(25),
    height: wp(25),
    borderRadius: wp(12.5),
    marginBottom: wp(3),
  },
  name: {
    fontSize: wp(5),
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: wp(3.5),
    color: '#777',
    marginBottom: wp(3),
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E86AB',
    paddingHorizontal: wp(4),
    paddingVertical: wp(2),
    borderRadius: wp(5),
  },
  editText: {
    color: '#fff',
    marginLeft: wp(1.5),
    fontWeight: '600',
  },
  actions: {
    backgroundColor: '#fff',
    paddingVertical: wp(2.5),
    marginBottom: wp(2.5),
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3.75),
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: wp(4),
    color: '#333',
    marginLeft: wp(3),
  },
  guestNotice: {
    backgroundColor: '#fff',
    padding: wp(5),
    marginHorizontal: wp(4),
    borderRadius: wp(2),
    alignItems: 'center',
    marginBottom: wp(2.5),
  },
  guestNoticeText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: wp(3),
  },
  guestButtons: {
    gap: wp(3),
  },
  registerButton: {
    backgroundColor: '#2E86AB',
    paddingHorizontal: wp(5),
    paddingVertical: wp(2.5),
    borderRadius: wp(5),
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  backToLoginButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2E86AB',
    paddingHorizontal: wp(5),
    paddingVertical: wp(2.5),
    borderRadius: wp(5),
  },
  backToLoginText: {
    color: '#2E86AB',
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    padding: wp(3.5),
    marginHorizontal: wp(4),
    borderRadius: wp(2),
    justifyContent: 'center',
    marginTop: wp(5),
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: wp(2),
  },
  measurementsSection: {
    backgroundColor: '#fff',
    padding: wp(4),
    marginHorizontal: wp(4),
    marginBottom: wp(2.5),
    borderRadius: wp(2),
  },
  sectionTitle: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: wp(3),
  },
  measurementItem: {
    padding: wp(3),
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: wp(2),
    marginBottom: wp(2),
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: wp(1),
  },
  measurementName: {
    fontSize: wp(4),
    fontWeight: '600',
    color: '#333',
  },
  defaultBadge: {
    fontSize: wp(3),
    color: '#2E86AB',
    fontWeight: '600',
    backgroundColor: '#E8F4F8',
    paddingHorizontal: wp(2),
    paddingVertical: wp(0.5),
    borderRadius: wp(2.5),
  },
  measurementDetails: {
    fontSize: wp(3.5),
    color: '#666',
  },
});
