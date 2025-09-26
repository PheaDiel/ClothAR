import React, { useState, useContext, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, Alert, Modal, TouchableOpacity } from 'react-native';
import { Text, Button, RadioButton, TextInput, ActivityIndicator, Portal, IconButton } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { Item, Measurement } from '../../types';
import { getUserMeasurements } from '../../services/api';
import { theme } from '../../theme/theme';
import { wp, hp, rf, rmp } from '../../utils/responsiveUtils';

type ParamList = {
  Product: { item: Item };
};

export default function ProductScreen() {
  const route = useRoute<RouteProp<ParamList, 'Product'>>();
  const navigation = useNavigation();
  const item = route.params.item;
  const { add } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const isGuest = user?.isGuest || false;

  // Measurements
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string>('');
  const [loadingMeasurements, setLoadingMeasurements] = useState<boolean>(true);
  const [measurementError, setMeasurementError] = useState<boolean>(false);
  const [measurementOption, setMeasurementOption] = useState<'default' | 'named' | 'new'>('default');
  const [qty, setQty] = useState<number>(1);
  const [selectedFabric, setSelectedFabric] = useState<string>(item.fabricTypes?.length ? item.fabricTypes[0] : '');
  const [materialProvidedByCustomer, setMaterialProvidedByCustomer] = useState<boolean>(false);

  // New measurement modal
  const [showNewMeasurementModal, setShowNewMeasurementModal] = useState<boolean>(false);
  const [newMeasurementForm, setNewMeasurementForm] = useState({
    name: '',
    measurements: {
      bust: '',
      waist: '',
      hip: '',
      inseam: ''
    }
  });
  const [savingNewMeasurement, setSavingNewMeasurement] = useState<boolean>(false);

  // Fetch measurements on component mount
  useEffect(() => {
    const fetchMeasurements = async () => {
      try {
        const userMeasurements = await getUserMeasurements();
        setMeasurements(userMeasurements);
        // Set default measurement if available
        if (userMeasurements.length > 0) {
          const defaultMeasurement = userMeasurements.find(m => m.isDefault);
          setSelectedMeasurement(defaultMeasurement ? defaultMeasurement._id! : userMeasurements[0]._id!);
        }
        setMeasurementError(false);
      } catch (error) {
        console.error('Error fetching measurements:', error);
        setMeasurementError(true);
        Alert.alert('Error', 'Failed to load measurements. You can still create new measurements.');
      } finally {
        setLoadingMeasurements(false);
      }
    };

    if (!isGuest) {
      fetchMeasurements();
    } else {
      setLoadingMeasurements(false);
    }
  }, [isGuest]);

  // Update selected measurement based on option
  useEffect(() => {
    if (measurementOption === 'default') {
      // Use a default measurement ID
      setSelectedMeasurement('default');
    } else if (measurementOption === 'named' && measurements.length > 0) {
      const defaultMeasurement = measurements.find(m => m.isDefault);
      setSelectedMeasurement(defaultMeasurement ? defaultMeasurement._id! : measurements[0]._id!);
    } else if (measurementOption === 'new') {
      // Will be set when creating new
      setSelectedMeasurement('');
    }
  }, [measurementOption, measurements]);

  const onAdd = () => {
    if (isGuest) {
      Alert.alert(
        "Guest Access Limitation",
        "As a guest, you cannot add items to the pre-order cart. Please create an account to unlock full functionality.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Create Account",
            onPress: () => navigation.navigate('Register' as never)
          }
        ]
      );
      return;
    }

    let measurementId = '';
    let measurementName = '';

    if (measurementOption === 'default') {
      measurementId = 'default';
      measurementName = 'Default Measurements';
    } else if (measurementOption === 'named') {
      if (!selectedMeasurement) {
        Alert.alert('Error', 'Please select a measurement profile');
        return;
      }
      const selectedMeasurementData = measurements.find(m => m._id === selectedMeasurement);
      if (!selectedMeasurementData) {
        Alert.alert('Error', 'Selected measurement not found');
        return;
      }
      measurementId = selectedMeasurement;
      measurementName = selectedMeasurementData.name;
    } else if (measurementOption === 'new') {
      if (!selectedMeasurement || !measurements.find(m => m._id === selectedMeasurement)) {
        Alert.alert('Error', 'Please create new measurements first');
        return;
      }
      const newMeasurementData = measurements.find(m => m._id === selectedMeasurement);
      measurementId = selectedMeasurement;
      measurementName = newMeasurementData!.name;
    }

    // Calculate material fee (20% of item price if store provides)
    const materialFee = materialProvidedByCustomer ? 0 : Math.round(item.price * 0.2);

    add({
      itemId: item.id,
      name: item.name,
      price: item.price,
      measurementId,
      measurementName,
      quantity: qty,
      image: typeof item.images?.[0] === 'string' ? item.images[0] : 'https://via.placeholder.com/300x400.png?text=No+Image',
      fabricType: selectedFabric,
      materialProvidedByCustomer,
      materialFee,
    });

    Alert.alert(
      "Added to Pre-order Cart",
      `${item.name} has been added to your pre-order cart.${materialFee > 0 ? ` Material fee: ₱${materialFee}` : ''}`,
      [
        {
          text: "Continue Shopping",
          style: "cancel"
        },
        {
          text: "View Pre-order Cart",
          onPress: () => navigation.navigate('Cart' as never)
        }
      ]
    );
  };

  const handleNewMeasurement = () => {
    setShowNewMeasurementModal(true);
  };

  const handleSaveNewMeasurement = async () => {
    if (!newMeasurementForm.name.trim()) {
      Alert.alert('Error', 'Please enter a name for your measurements');
      return;
    }

    const hasMeasurements = Object.values(newMeasurementForm.measurements).some(val => val.trim() !== '');
    if (!hasMeasurements) {
      Alert.alert('Error', 'Please enter at least one measurement');
      return;
    }

    setSavingNewMeasurement(true);
    try {
      // Create new measurement object
      const newMeasurement: Measurement = {
        _id: `temp_${Date.now()}`, // Temporary ID for cart use
        userId: user?.id || '',
        name: newMeasurementForm.name.trim(),
        measurements: Object.fromEntries(
          Object.entries(newMeasurementForm.measurements)
            .map(([key, value]) => [key, value.trim() ? parseFloat(value) : undefined])
            .filter(([, value]) => value !== undefined)
        ),
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to local measurements list
      setMeasurements(prev => [...prev, newMeasurement]);
      setSelectedMeasurement(newMeasurement._id!);

      // Reset form and close modal
      setNewMeasurementForm({
        name: '',
        measurements: { bust: '', waist: '', hip: '', inseam: '' }
      });
      setShowNewMeasurementModal(false);

      Alert.alert('Success', 'New measurements added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save measurements. Please try again.');
    } finally {
      setSavingNewMeasurement(false);
    }
  };

  const updateNewMeasurement = (key: string, value: string) => {
    setNewMeasurementForm(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [key]: value
      }
    }));
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Product Details" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Image
          source={typeof item.images?.[0] === 'string' ? { uri: item.images[0] } : { uri: 'https://via.placeholder.com/300x400.png?text=No+Image' } }
          style={styles.image}
        />
        <View style={styles.detailsContainer}>
          <Text variant="titleLarge" style={styles.name}>
            {item.name}
          </Text>
          <Text variant="titleMedium" style={styles.price}>
            ₱{item.price.toFixed(2)}
          </Text>
          <Text variant="bodyMedium" style={styles.category}>
            Category: {item.category}
          </Text>

          {isGuest && (
            <View style={styles.guestNotice}>
              <Text style={styles.guestNoticeText}>
                You're viewing this product as a guest. Some features may be limited.
              </Text>
            </View>
          )}

          {isGuest ? (
            <View style={styles.guestNotice}>
              <Text style={styles.guestNoticeText}>
                Please create an account to select measurements for custom tailoring.
              </Text>
            </View>
          ) : (
            <View style={styles.measurementsContainer}>
              <Text variant="labelLarge" style={styles.measurementsLabel}>
                Measurement Options
              </Text>
              <RadioButton.Group onValueChange={(v) => setMeasurementOption(v as 'default' | 'named' | 'new')} value={measurementOption}>
                <View style={styles.measurementOptions}>
                  <View style={styles.measurementOption}>
                    <RadioButton value="default" />
                    <View style={styles.measurementInfo}>
                      <Text style={styles.measurementName}>Use Default Measurements</Text>
                      <Text style={styles.measurementDescription}>Standard measurements for this item</Text>
                    </View>
                  </View>
                  {measurements.length > 1 && (
                    <View style={styles.measurementOption}>
                      <RadioButton value="named" disabled={loadingMeasurements || measurementError} />
                      <View style={styles.measurementInfo}>
                        <Text style={styles.measurementName}>Use Saved Measurements</Text>
                        <Text style={styles.measurementDescription}>
                          {loadingMeasurements ? 'Loading...' : measurementError ? 'Error loading measurements' : 'Choose from your saved profiles'}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.measurementOption}>
                    <RadioButton value="new" />
                    <View style={styles.measurementInfo}>
                      <Text style={styles.measurementName}>Create New Measurements</Text>
                      <Text style={styles.measurementDescription}>Enter custom measurements for this item</Text>
                    </View>
                  </View>
                </View>
              </RadioButton.Group>

              {measurementOption === 'named' && !loadingMeasurements && !measurementError && measurements.length > 0 && (
                <View style={styles.savedMeasurementsContainer}>
                  <Text variant="labelMedium" style={styles.savedMeasurementsLabel}>
                    Select Measurement Profile
                  </Text>
                  <RadioButton.Group onValueChange={(v) => setSelectedMeasurement(v)} value={selectedMeasurement}>
                    <View style={styles.measurements}>
                      {measurements.map((m) => (
                        <View key={m._id} style={styles.measurementOption}>
                          <RadioButton value={m._id!} />
                          <View style={styles.measurementInfo}>
                            <Text style={styles.measurementName}>{m.name}</Text>
                            {m.isDefault && <Text style={styles.defaultText}>(Default)</Text>}
                          </View>
                        </View>
                      ))}
                    </View>
                  </RadioButton.Group>
                </View>
              )}

              {measurementOption === 'new' && (
                <View style={styles.newMeasurementContainer}>
                  <TouchableOpacity
                    style={styles.newMeasurementOption}
                    onPress={handleNewMeasurement}
                  >
                    <View style={styles.newMeasurementContent}>
                      <Text style={styles.newMeasurementText}>+ Enter New Measurements</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.guideLink}
                    onPress={() => navigation.navigate('MeasurementGuide' as never)}
                  >
                    <Text style={styles.guideLinkText}>📏 View Measurement Guide</Text>
                  </TouchableOpacity>
                </View>
              )}

              {measurementError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Failed to load measurements. You can still create new measurements.</Text>
                  <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('MeasurementGuide' as never)}
                    style={styles.guideButton}
                  >
                    View Measurement Guide
                  </Button>
                </View>
              )}
            </View>
          )}

          {item.fabricTypes && item.fabricTypes.length > 0 && (
            <View style={styles.fabricContainer}>
              <Text variant="labelLarge" style={styles.fabricLabel}>
                Fabric Type
              </Text>
              <RadioButton.Group onValueChange={(v) => setSelectedFabric(v)} value={selectedFabric}>
                <View style={styles.fabrics}>
                  {item.fabricTypes.map((f) => (
                    <View key={f} style={styles.fabricOption}>
                      <RadioButton value={f} />
                      <Text style={styles.fabricText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </RadioButton.Group>
            </View>
          )}

          <View style={styles.materialContainer}>
            <Text variant="labelLarge" style={styles.materialLabel}>
              Material Provision
            </Text>
            <RadioButton.Group onValueChange={(v) => setMaterialProvidedByCustomer(v === 'customer')} value={materialProvidedByCustomer ? 'customer' : 'store'}>
              <View style={styles.materialOptions}>
                <View style={styles.materialOption}>
                  <RadioButton value="store" />
                  <View style={styles.materialInfo}>
                    <Text style={styles.materialText}>Store provides material</Text>
                    <Text style={styles.materialFeeText}>Additional fee: ₱{Math.round(item.price * 0.2)}</Text>
                  </View>
                </View>
                <View style={styles.materialOption}>
                  <RadioButton value="customer" />
                  <View style={styles.materialInfo}>
                    <Text style={styles.materialText}>Customer provides material</Text>
                    <Text style={styles.materialFeeText}>No additional fee</Text>
                  </View>
                </View>
              </View>
            </RadioButton.Group>
          </View>

          <View style={styles.quantityContainer}>
            <Text variant="labelLarge" style={styles.quantityLabel}>
              Quantity
            </Text>
            <TextInput
              label="Quantity"
              keyboardType="number-pad"
              value={String(qty)}
              onChangeText={(t) => {
                const n = parseInt(t || '0', 10);
                setQty(isNaN(n) ? 1 : Math.max(1, n));
              }}
              style={styles.quantityInput}
            />
          </View>

          <Button mode="contained" onPress={onAdd} style={styles.addButton}>
            {isGuest ? "Create Account to Pre-order" : "Add to Pre-order Cart"}
          </Button>
        </View>
      </ScrollView>

      {/* New Measurement Modal */}
      <Modal
        visible={showNewMeasurementModal}
        onRequestClose={() => setShowNewMeasurementModal(false)}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter New Measurements</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowNewMeasurementModal(false)}
              />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Measurement Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  mode="outlined"
                  placeholder="e.g., Quick Measurements"
                  value={newMeasurementForm.name}
                  onChangeText={(value) => setNewMeasurementForm(prev => ({ ...prev, name: value }))}
                  style={styles.input}
                />
              </View>

              <Text style={styles.sectionTitle}>Basic Measurements</Text>
              <View style={styles.measurementsGrid}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bust (inches)</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="36"
                    value={newMeasurementForm.measurements.bust}
                    onChangeText={(value) => updateNewMeasurement('bust', value)}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Waist (inches)</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="28"
                    value={newMeasurementForm.measurements.waist}
                    onChangeText={(value) => updateNewMeasurement('waist', value)}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hip (inches)</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="38"
                    value={newMeasurementForm.measurements.hip}
                    onChangeText={(value) => updateNewMeasurement('hip', value)}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Inseam (inches)</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="32"
                    value={newMeasurementForm.measurements.inseam}
                    onChangeText={(value) => updateNewMeasurement('inseam', value)}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowNewMeasurementModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveNewMeasurement}
                loading={savingNewMeasurement}
                disabled={savingNewMeasurement}
                style={styles.saveButton}
              >
                Save & Select
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    paddingBottom: wp(5),
  },
  image: {
    width: '100%',
    height: hp(30),
    resizeMode: 'cover',
  },
  detailsContainer: {
    padding: wp(5),
  },
  name: {
    fontSize: rf(24),
    fontWeight: 'bold',
    marginBottom: wp(2),
  },
  price: {
    fontSize: rf(20),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: wp(4),
  },
  category: {
    fontSize: rf(16),
    color: '#666',
    marginBottom: wp(5),
  },
  guestNotice: {
    backgroundColor: theme.colors.background,
    padding: wp(3),
    borderRadius: 8,
    marginBottom: wp(4),
  },
  guestNoticeText: {
    color: theme.colors.primary,
    textAlign: 'center',
    fontSize: rf(14),
  },
  sizesContainer: {
    marginBottom: wp(5),
  },
  sizesLabel: {
    fontSize: rf(18),
    fontWeight: 'bold',
    marginBottom: wp(3),
  },
  sizes: {
    flexDirection: 'column',
  },
  sizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp(2),
  },
  sizeText: {
    fontSize: rf(16),
  },
  quantityContainer: {
    marginBottom: wp(5),
  },
  quantityLabel: {
    fontSize: rf(18),
    fontWeight: 'bold',
    marginBottom: wp(3),
  },
  quantityInput: {
    width: wp(25),
  },
  addButton: {
    marginTop: wp(4),
    backgroundColor: theme.colors.primary,
    paddingVertical: wp(2),
  },
  fabricContainer: {
    marginBottom: wp(5),
  },
  fabricLabel: {
    fontSize: rf(18),
    fontWeight: 'bold',
    marginBottom: wp(3),
  },
  fabrics: {
    flexDirection: 'column',
  },
  fabricOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp(2),
  },
  fabricText: {
    fontSize: rf(16),
  },
  loadingContainer: {
    alignItems: 'center',
    padding: wp(5),
  },
  loadingText: {
    marginTop: wp(2.5),
    fontSize: rf(16),
    color: '#666',
  },
  noMeasurementsContainer: {
    backgroundColor: theme.colors.background,
    padding: wp(4),
    borderRadius: 8,
    marginBottom: wp(5),
  },
  noMeasurementsText: {
    fontSize: rf(16),
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: wp(3),
  },
  addMeasurementButton: {
    alignSelf: 'center',
  },
  measurementsContainer: {
    marginBottom: wp(5),
  },
  measurementsLabel: {
    fontSize: rf(18),
    fontWeight: 'bold',
    marginBottom: wp(3),
  },
  measurements: {
    flexDirection: 'column',
  },
  measurementOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp(2),
  },
  measurementInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  measurementName: {
    fontSize: rf(16),
    flex: 1,
  },
  defaultText: {
    fontSize: rf(14),
    color: theme.colors.primary,
    fontStyle: 'italic',
  },
  newMeasurementOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: wp(2),
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  newMeasurementContent: {
    flex: 1,
    alignItems: 'center',
  },
  newMeasurementText: {
    fontSize: rf(16),
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(4),
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '95%',
    maxWidth: 500,
    maxHeight: hp(90),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: wp(6),
  },
  inputGroup: {
    marginBottom: wp(4),
  },
  inputLabel: {
    fontSize: rf(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: wp(2),
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: wp(2),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: '#333',
    marginTop: wp(4),
    marginBottom: wp(3),
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(4),
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: wp(4),
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: wp(2),
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  measurementOptions: {
    flexDirection: 'column',
  },
  measurementDescription: {
    fontSize: rf(12),
    color: '#666',
    marginTop: wp(1),
  },
  savedMeasurementsContainer: {
    marginTop: wp(3),
    paddingTop: wp(3),
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  savedMeasurementsLabel: {
    fontSize: rf(16),
    fontWeight: 'bold',
    marginBottom: wp(2),
  },
  newMeasurementContainer: {
    marginTop: wp(3),
  },
  guideLink: {
    marginTop: wp(2),
    alignSelf: 'center',
  },
  guideLinkText: {
    fontSize: rf(14),
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: wp(3),
    borderRadius: 8,
    marginTop: wp(3),
  },
  errorText: {
    fontSize: rf(14),
    color: '#c62828',
    textAlign: 'center',
    marginBottom: wp(2),
  },
  guideButton: {
    alignSelf: 'center',
  },
  materialContainer: {
    marginBottom: wp(5),
  },
  materialLabel: {
    fontSize: rf(18),
    fontWeight: 'bold',
    marginBottom: wp(3),
  },
  materialOptions: {
    flexDirection: 'column',
  },
  materialOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp(2),
  },
  materialInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialText: {
    fontSize: rf(16),
    flex: 1,
  },
  materialFeeText: {
    fontSize: rf(14),
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
