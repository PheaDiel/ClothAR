import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, HelperText, TextInput, Menu } from 'react-native-paper';
import { RegistrationData, PhilippineLocations, Province, City } from '../../../types';
import { wp, rf } from '../../../utils/responsiveUtils';

interface AddressStepProps {
  data: RegistrationData;
  locations: PhilippineLocations;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function AddressStep({ data, locations, onUpdate, onNext, onPrev }: AddressStepProps) {
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [provinceMenuVisible, setProvinceMenuVisible] = useState(false);
  const [cityMenuVisible, setCityMenuVisible] = useState(false);
  const [barangayMenuVisible, setBarangayMenuVisible] = useState(false);

  const provinceItems = locations.provinces.map(province => ({
    label: province.name,
    value: province.code,
  }));

  const cityItems = data.province?.cities.map(city => ({
    label: city.name,
    value: city.code,
  })) || [];

  const barangayItems = data.city?.barangays.map(barangay => ({
    label: barangay,
    value: barangay,
  })) || [];

  const validateAddress = () => {
    const newErrors: {[key: string]: string} = {};

    if (!data.province) {
      newErrors.province = 'Please select a province';
    }
    if (!data.city) {
      newErrors.city = 'Please select a municipality/city';
    }
    if (!data.barangay) {
      newErrors.barangay = 'Please select a barangay';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateAddress()) {
      onNext();
    }
  };

  const handleProvinceChange = (value: string) => {
    const selectedProvince = locations.provinces.find(p => p.code === value);
    onUpdate({
      province: selectedProvince || null,
      city: null,
      barangay: null,
    });
    setErrors(prev => ({ ...prev, province: '', city: '', barangay: '' }));
  };

  const handleCityChange = (value: string) => {
    const selectedCity = data.province?.cities.find(c => c.code === value);
    onUpdate({
      city: selectedCity || null,
      barangay: null,
    });
    setErrors(prev => ({ ...prev, city: '', barangay: '' }));
  };

  const handleBarangayChange = (value: string) => {
    onUpdate({ barangay: value });
    setErrors(prev => ({ ...prev, barangay: '' }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Address Information</Text>
      <Text style={styles.subtitle}>
        Please select your location within the Philippines
      </Text>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Province</Text>
        <Menu
          visible={provinceMenuVisible}
          onDismiss={() => setProvinceMenuVisible(false)}
          anchor={
            <TextInput
              mode="outlined"
              value={data.province?.name || ''}
              placeholder="Select Province"
              editable={false}
              onPressIn={() => setProvinceMenuVisible(true)}
              right={<TextInput.Icon icon="chevron-down" onPress={() => setProvinceMenuVisible(true)} />}
            />
          }
        >
          {provinceItems.map((item) => (
            <Menu.Item
              key={item.value}
              onPress={() => {
                handleProvinceChange(item.value);
                setProvinceMenuVisible(false);
              }}
              title={item.label}
            />
          ))}
        </Menu>
        <HelperText type="error" visible={!!errors.province}>
          {errors.province}
        </HelperText>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Municipality/City</Text>
        <Menu
          visible={cityMenuVisible}
          onDismiss={() => setCityMenuVisible(false)}
          anchor={
            <TextInput
              mode="outlined"
              value={data.city?.name || ''}
              placeholder="Select Municipality/City"
              editable={false}
              onPressIn={() => data.province && setCityMenuVisible(true)}
              right={<TextInput.Icon icon="chevron-down" onPress={() => data.province && setCityMenuVisible(true)} />}
              disabled={!data.province}
            />
          }
        >
          {cityItems.map((item) => (
            <Menu.Item
              key={item.value}
              onPress={() => {
                handleCityChange(item.value);
                setCityMenuVisible(false);
              }}
              title={item.label}
            />
          ))}
        </Menu>
        <HelperText type="error" visible={!!errors.city}>
          {errors.city}
        </HelperText>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Barangay</Text>
        <Menu
          visible={barangayMenuVisible}
          onDismiss={() => setBarangayMenuVisible(false)}
          anchor={
            <TextInput
              mode="outlined"
              value={data.barangay || ''}
              placeholder="Select Barangay"
              editable={false}
              onPressIn={() => data.city && setBarangayMenuVisible(true)}
              right={<TextInput.Icon icon="chevron-down" onPress={() => data.city && setBarangayMenuVisible(true)} />}
              disabled={!data.city}
            />
          }
        >
          {barangayItems.map((item) => (
            <Menu.Item
              key={item.value}
              onPress={() => {
                handleBarangayChange(item.value);
                setBarangayMenuVisible(false);
              }}
              title={item.label}
            />
          ))}
        </Menu>
        <HelperText type="error" visible={!!errors.barangay}>
          {errors.barangay}
        </HelperText>
      </View>

      <View style={styles.buttonContainer}>
        <Button mode="outlined" onPress={onPrev} style={styles.backButton}>
          Back to Basic Info
        </Button>
        <Button mode="contained" onPress={handleNext} style={styles.completeButton}>
          Complete Registration
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: rf(20),
    fontWeight: 'bold',
    marginBottom: wp(2),
    color: '#333',
  },
  subtitle: {
    fontSize: rf(14),
    marginBottom: wp(6),
    color: '#666',
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
  buttonContainer: {
    marginTop: wp(6),
  },
  backButton: {
    width: '100%',
    marginBottom: wp(2),
  },
  completeButton: {
    width: '100%',
  },
});
