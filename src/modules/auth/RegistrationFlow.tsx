import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import StepIndicator from 'react-native-step-indicator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { RegistrationData, PhilippineLocations } from '../../types';
import philippineLocations from '../../data/philippineLocations';
import { wp, rf } from '../../utils/responsiveUtils';
import { useToast } from '../../context/ToastContext';
import { ValidationService } from '../../services/validationService';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';

// Import step components (will create them next)
import BasicInfoStep from './steps/BasicInfoStep.tsx';
import AddressStep from './steps/AddressStep.tsx';

const STORAGE_KEY = 'registration_progress';

const stepLabels = ['Basic Info', 'Address'];
const stepIndicatorStyles = {
  stepIndicatorSize: 30,
  currentStepIndicatorSize: 40,
  separatorStrokeWidth: 2,
  currentStepStrokeWidth: 3,
  stepStrokeCurrentColor: '#007AFF',
  stepStrokeWidth: 3,
  stepStrokeFinishedColor: '#007AFF',
  stepStrokeUnFinishedColor: '#aaaaaa',
  separatorFinishedColor: '#007AFF',
  separatorUnFinishedColor: '#aaaaaa',
  stepIndicatorFinishedColor: '#007AFF',
  stepIndicatorUnFinishedColor: '#ffffff',
  stepIndicatorCurrentColor: '#ffffff',
  stepIndicatorLabelFontSize: 13,
  currentStepIndicatorLabelFontSize: 13,
  stepIndicatorLabelCurrentColor: '#007AFF',
  stepIndicatorLabelFinishedColor: '#ffffff',
  stepIndicatorLabelUnFinishedColor: '#aaaaaa',
  labelColor: '#999999',
  labelSize: 13,
  currentStepLabelColor: '#007AFF',
};

export default function RegistrationFlow() {
    const [currentStep, setCurrentStep] = useState(0);
    // Set default province to Albay
    const defaultProvince = philippineLocations.provinces.find(p => p.name === 'ALBAY') || null;
    const [registrationData, setRegistrationData] = useState<RegistrationData>({
      name: '',
      email: '',
      password: '',
      phone: '',
      province: defaultProvince,
      city: null,
      barangay: null,
      role_request: null,
    });
   const { register, updateProfile } = useContext(AuthContext);
   const navigation = useNavigation();
   const { showSuccess, showError } = useToast();
   const executeAsync = useAsyncOperation();

  // Load saved progress on mount
  useEffect(() => {
    loadProgress();
  }, []);

  // Save progress whenever data changes
  useEffect(() => {
    saveProgress();
  }, [registrationData, currentStep]);

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { data, step } = JSON.parse(saved);
        setRegistrationData(data);
        setCurrentStep(step);
      }
    } catch (error) {
    }
  };

  const saveProgress = async () => {
    try {
      const progress = {
        data: registrationData,
        step: currentStep,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
    }
  };

  const clearProgress = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
    }
  };

  const updateRegistrationData = (updates: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < stepLabels.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
    } else {
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    const success = await executeAsync.execute(
      async () => {
        // First validate data on server
        const validationResult = await ValidationService.validateRegistration({
          name: registrationData.name,
          email: registrationData.email,
          phone: registrationData.phone,
          password: registrationData.password,
        });

        if (!validationResult.isValid) {
          throw new Error(validationResult.errors.join('\n'));
        }

        // Proceed with registration
        const registerSuccess = await register(
          registrationData.name,
          registrationData.email,
          registrationData.password,
          registrationData.phone,
          registrationData.role_request || 'customer'
        );

        if (!registerSuccess) {
          throw new Error('Registration failed');
        }

        // Update profile with address and measurements
        const profileSuccess = await updateProfile({
          province_code: registrationData.province?.code,
          province_name: registrationData.province?.name,
          city_code: registrationData.city?.code,
          city_name: registrationData.city?.name,
          barangay: registrationData.barangay || undefined,
          profileComplete: true,
        });

        if (!profileSuccess) {
          console.warn('Profile update failed, but registration succeeded');
        }

        return registerSuccess;
      },
      {
        showSuccessToast: true,
        successMessage: 'Registration successful! Welcome to ClothAR.',
        errorMessage: 'Registration failed. Please try again.',
        onSuccess: async () => {
          await clearProgress();

          // Clear registration data from state to prevent persistence
          setRegistrationData({
            name: '',
            email: '',
            password: '',
            phone: '',
            province: defaultProvince,
            city: null,
            barangay: null,
            role_request: null,
          });
          setCurrentStep(0);
        }
      }
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            data={registrationData}
            onUpdate={updateRegistrationData}
            onNext={nextStep}
          />
        );
      case 1:
        return (
          <AddressStep
            data={registrationData}
            locations={philippineLocations as PhilippineLocations}
            onUpdate={updateRegistrationData}
            onNext={handleComplete}
            onPrev={prevStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <StepIndicator
          customStyles={stepIndicatorStyles}
          currentPosition={currentStep}
          labels={stepLabels}
          stepCount={stepLabels.length}
        />
      </View>

      {currentStep === 0 || currentStep === 2 ? (
        <View style={styles.content}>
          {renderStep()}
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFCFF',
  },
  header: {
    padding: wp(4),
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: rf(24),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: wp(4),
    color: '#333',
  },
  content: {
    flex: 1,
    padding: wp(4),
  },
});
