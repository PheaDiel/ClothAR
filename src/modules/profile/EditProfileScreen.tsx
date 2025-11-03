import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  Menu,
  Checkbox,
  ActivityIndicator,
  useTheme
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthContext } from '../../context/AuthContext';
import { ProfileService } from '../../services/profileService';
import { User, NotificationSettings } from '../../types';
import { wp, rf } from '../../utils/responsiveUtils';

type EditProfileScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const theme = useTheme();
  const { user, updateProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    date_of_birth: user?.date_of_birth || '',
    gender: user?.gender || '',
    marketing_email_consent: user?.marketing_email_consent || false,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    user?.notification_settings || {
      email: { orders: true, promotions: false, updates: true },
      push: { orders: true, promotions: false }
    }
  );

  // UI state
  const [genderMenuVisible, setGenderMenuVisible] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },
  ];

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.phone && !/^\+?[\d\s-()]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(formData.date_of_birth)) {
      newErrors.date_of_birth = 'Please enter date in YYYY-MM-DD format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const updates: Partial<User> = {
        name: formData.name.trim(),
        full_name: formData.full_name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        date_of_birth: formData.date_of_birth.trim() || undefined,
        gender: formData.gender as any || undefined,
        marketing_email_consent: formData.marketing_email_consent,
        notification_settings: notificationSettings,
      };

      const success = await updateProfile(updates);
      if (success) {
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarPick = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        try {
          const uploadResult = await ProfileService.uploadAvatar(result.assets[0].uri);
          if (uploadResult.success) {
            // Update local user state with new avatar
            await updateProfile({ avatar_url: uploadResult.url });
            Alert.alert('Success', 'Avatar updated successfully');
          } else {
            Alert.alert('Error', uploadResult.error || 'Failed to upload avatar');
          }
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to upload avatar');
        } finally {
          setUploadingAvatar(false);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert(
      'Remove Avatar',
      'Are you sure you want to remove your avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ProfileService.deleteAvatar();
              if (result.success) {
                await updateProfile({ avatar_url: undefined });
                Alert.alert('Success', 'Avatar removed successfully');
              } else {
                Alert.alert('Error', result.error || 'Failed to remove avatar');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove avatar');
            }
          }
        }
      ]
    );
  };

  const updateNotificationSetting = (
    type: 'email' | 'push',
    key: string,
    value: boolean
  ) => {
    setNotificationSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: value
      }
    }));
  };

  const userAvatar = user?.avatar_url ||
    (user?.email ? `https://i.pravatar.cc/150?img=3` : "https://i.pravatar.cc/150?img=1");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.avatarButtons}>
            <TouchableOpacity style={styles.avatarButton} onPress={handleAvatarPick}>
              <Ionicons name="camera-outline" size={20} color="#2E86AB" />
              <Text style={styles.avatarButtonText}>Change</Text>
            </TouchableOpacity>
            {user?.avatar_url && (
              <TouchableOpacity style={[styles.avatarButton, styles.removeButton]} onPress={handleRemoveAvatar}>
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                <Text style={[styles.avatarButtonText, styles.removeButtonText]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <TextInput
            label="Display Name *"
            value={formData.name}
            onChangeText={(value) => {
              setFormData(prev => ({ ...prev, name: value }));
              if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
            }}
            style={styles.input}
            error={!!errors.name}
          />
          <HelperText type="error" visible={!!errors.name}>
            {errors.name}
          </HelperText>

          <TextInput
            label="Full Name (Optional)"
            value={formData.full_name}
            onChangeText={(value) => setFormData(prev => ({ ...prev, full_name: value }))}
            style={styles.input}
            placeholder="Enter your full name"
          />

          <TextInput
            label="Phone Number (Optional)"
            value={formData.phone}
            onChangeText={(value) => {
              setFormData(prev => ({ ...prev, phone: value }));
              if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
            }}
            style={styles.input}
            keyboardType="phone-pad"
            error={!!errors.phone}
          />
          <HelperText type="error" visible={!!errors.phone}>
            {errors.phone}
          </HelperText>

          <TextInput
            label="Date of Birth (Optional)"
            value={formData.date_of_birth}
            onChangeText={(value) => {
              setFormData(prev => ({ ...prev, date_of_birth: value }));
              if (errors.date_of_birth) setErrors(prev => ({ ...prev, date_of_birth: '' }));
            }}
            style={styles.input}
            placeholder="YYYY-MM-DD"
            error={!!errors.date_of_birth}
          />
          <HelperText type="error" visible={!!errors.date_of_birth}>
            {errors.date_of_birth}
          </HelperText>

          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Gender (Optional)</Text>
            <Menu
              visible={genderMenuVisible}
              onDismiss={() => setGenderMenuVisible(false)}
              anchor={
                <TextInput
                  mode="outlined"
                  value={formData.gender ? genderOptions.find(g => g.value === formData.gender)?.label : ''}
                  placeholder="Select gender (optional)"
                  editable={false}
                  onPressIn={() => setGenderMenuVisible(true)}
                  right={<TextInput.Icon icon="chevron-down" onPress={() => setGenderMenuVisible(true)} />}
                />
              }
            >
              {genderOptions.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, gender: option.value }));
                    setGenderMenuVisible(false);
                  }}
                  title={option.label}
                />
              ))}
            </Menu>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.checkboxContainer}>
            <Checkbox
              status={formData.marketing_email_consent ? 'checked' : 'unchecked'}
              onPress={() => setFormData(prev => ({
                ...prev,
                marketing_email_consent: !prev.marketing_email_consent
              }))}
            />
            <Text style={styles.checkboxLabel}>
              I agree to receive marketing emails and updates
            </Text>
          </View>

          <Text style={styles.subsectionTitle}>Email Notifications</Text>
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={notificationSettings.email.orders ? 'checked' : 'unchecked'}
              onPress={() => updateNotificationSetting('email', 'orders', !notificationSettings.email.orders)}
            />
            <Text style={styles.checkboxLabel}>Order updates</Text>
          </View>
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={notificationSettings.email.promotions ? 'checked' : 'unchecked'}
              onPress={() => updateNotificationSetting('email', 'promotions', !notificationSettings.email.promotions)}
            />
            <Text style={styles.checkboxLabel}>Promotional emails</Text>
          </View>
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={notificationSettings.email.updates ? 'checked' : 'unchecked'}
              onPress={() => updateNotificationSetting('email', 'updates', !notificationSettings.email.updates)}
            />
            <Text style={styles.checkboxLabel}>App updates and news</Text>
          </View>

          <Text style={styles.subsectionTitle}>Push Notifications</Text>
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={notificationSettings.push.orders ? 'checked' : 'unchecked'}
              onPress={() => updateNotificationSetting('push', 'orders', !notificationSettings.push.orders)}
            />
            <Text style={styles.checkboxLabel}>Order updates</Text>
          </View>
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={notificationSettings.push.promotions ? 'checked' : 'unchecked'}
              onPress={() => updateNotificationSetting('push', 'promotions', !notificationSettings.push.promotions)}
            />
            <Text style={styles.checkboxLabel}>Promotions and offers</Text>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
          >
            Save Changes
          </Button>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: wp(3),
    backgroundColor: '#fff',
    elevation: 2,
  },
  backButton: {
    padding: wp(2),
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    padding: wp(6),
    backgroundColor: '#fff',
    marginBottom: wp(2),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: wp(4),
  },
  avatar: {
    width: wp(30),
    height: wp(30),
    borderRadius: wp(15),
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: wp(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: wp(4),
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(2),
  },
  avatarButtonText: {
    marginLeft: wp(1),
    color: '#2E86AB',
    fontWeight: '600',
  },
  removeButton: {
    // No additional styles needed
  },
  removeButtonText: {
    color: '#e74c3c',
  },
  section: {
    backgroundColor: '#fff',
    padding: wp(4),
    marginBottom: wp(2),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: wp(4),
  },
  subsectionTitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: '#333',
    marginTop: wp(4),
    marginBottom: wp(2),
  },
  input: {
    marginBottom: wp(1),
  },
  pickerContainer: {
    marginBottom: wp(4),
  },
  label: {
    fontSize: rf(16),
    fontWeight: '600',
    marginBottom: wp(2),
    color: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: wp(2),
  },
  checkboxLabel: {
    fontSize: rf(14),
    marginLeft: wp(2),
    flex: 1,
    color: '#666',
    lineHeight: rf(20),
  },
  buttonContainer: {
    padding: wp(4),
  },
  saveButton: {
    // No additional styles needed
  },
  saveButtonContent: {
    height: wp(12),
  },
});