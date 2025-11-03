import React, { useState, useContext, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import LazyImage from '../../components/LazyImage';
import { useToast } from '../../context/ToastContext';
import { useNetwork } from '../../context/NetworkContext';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import ErrorBoundary from '../../components/ErrorBoundary';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { Text, Button, RadioButton, TextInput, ActivityIndicator, Portal, IconButton, Chip } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { Item, Measurement } from '../../types';
import { MeasurementService } from '../../services/measurementService';
import { CartService } from '../../services/cartService';
import { ProductService } from '../../services/productService';
import { theme } from '../../theme/theme';
import { wp, hp, rf, rmp, rw } from '../../utils/responsiveUtils';
import { Ionicons } from '@expo/vector-icons';

type ParamList = {
  Product: { item: Item };
};

export default function ProductScreen() {
   const route = useRoute<RouteProp<ParamList, 'Product'>>();
   const navigation = useNavigation();
   const item = route.params.item;
   const { add } = useContext(CartContext);
   const { user } = useContext(AuthContext);
   const { showToast, showError, showSuccess, showInfo } = useToast();
   const { isConnected, isInternetReachable } = useNetwork();
   const executeAsync = useAsyncOperation();

   // State for selected product variant
   const [selectedVariant, setSelectedVariant] = useState<any>(null);
   const [productVariants, setProductVariants] = useState<any[]>([]);
   const [loadingVariants, setLoadingVariants] = useState(false);

  const isGuest = user?.id === 'guest';

  // Measurements
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string>('');
  const [loadingMeasurements, setLoadingMeasurements] = useState<boolean>(true);
  const [measurementError, setMeasurementError] = useState<boolean>(false);
  const [measurementOption, setMeasurementOption] = useState<'default' | 'named' | 'new' | 'on-site'>('default');
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

  // Fetch measurements and product variants on component mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch measurements
      if (!isGuest) {
        try {
          const measurementResult = await MeasurementService.getUserMeasurements();
          if (measurementResult.success && measurementResult.measurements) {
            setMeasurements(measurementResult.measurements);
            // Set default measurement if available
            if (measurementResult.measurements.length > 0) {
              const defaultMeasurement = measurementResult.measurements.find(m => m.is_default);
              setSelectedMeasurement(defaultMeasurement ? defaultMeasurement.id || '' : measurementResult.measurements[0].id || '');
            }
          } else {
            setMeasurementError(true);
            showError(measurementResult.error || 'Failed to load measurements. You can still create new measurements.');
          }
          setMeasurementError(false);
        } catch (error) {
          setMeasurementError(true);
          showError('Failed to load measurements. You can still create new measurements.');
        }
      }

      // Fetch product variants
      try {
        setLoadingVariants(true);
        const variantResult = await ProductService.getProduct(item.id);
        if (variantResult.success && variantResult.product) {
          const variants = variantResult.product.variants || [];
          setProductVariants(variants);

          // Auto-select first available variant
          if (variants.length > 0) {
            const availableVariant = variants.find((v: any) => v.is_available && v.stock_quantity > 0);
            setSelectedVariant(availableVariant || variants[0]);
          }
        }
      } catch (error) {
        console.error('Error loading product variants:', error);
      } finally {
        setLoadingVariants(false);
        setLoadingMeasurements(false);
      }
    };

    fetchData();
  }, [isGuest, item.id]);

  // Update selected measurement based on option
  useEffect(() => {
    if (measurementOption === 'default') {
      // Use a default measurement ID
      setSelectedMeasurement('default');
    } else if (measurementOption === 'named' && measurements.length > 0) {
      const defaultMeasurement = measurements.find(m => m.is_default || m.isDefault);
      setSelectedMeasurement(defaultMeasurement ? (defaultMeasurement.id || defaultMeasurement._id || '') : (measurements[0].id || measurements[0]._id || ''));
    } else if (measurementOption === 'new') {
      // Will be set when creating new
      setSelectedMeasurement('');
    }
  }, [measurementOption, measurements]);

  const onAdd = async () => {
    if (isGuest) {
      showInfo(
        "As a guest, you cannot add items to the pre-order cart. Please create an account to unlock full functionality.",
        6000,
        {
          label: "Create Account",
          onPress: () => navigation.navigate('Register' as never)
        }
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
        showError('Please select a measurement profile');
        return;
      }
      const selectedMeasurementData = measurements.find(m => (m.id || m._id) === selectedMeasurement);
      if (!selectedMeasurementData) {
        showError('Selected measurement not found');
        return;
      }
      measurementId = selectedMeasurement;
      measurementName = selectedMeasurementData.name;
    } else if (measurementOption === 'new') {
      if (!selectedMeasurement || !measurements.find(m => m._id === selectedMeasurement)) {
        showError('Please create new measurements first');
        return;
      }
      const newMeasurementData = measurements.find(m => (m.id || m._id) === selectedMeasurement);
      measurementId = selectedMeasurement;
      measurementName = newMeasurementData!.name;
    } else if (measurementOption === 'on-site') {
      measurementId = 'on-site';
      measurementName = 'On-site Measurement by Tailor';
    }

    // Variant selection is now optional - no validation required

    // Calculate material fee (20% of item price if store provides)
    const materialFee = materialProvidedByCustomer ? 0 : Math.round(item.price * 0.2);

    // Add to local cart context
    add({
      itemId: selectedVariant?.id || item.id, // Use variant ID if selected, otherwise use item ID
      name: item.name,
      price: selectedVariant?.price_modifier ? item.price + selectedVariant.price_modifier : item.price,
      measurementId,
      measurementName,
      quantity: qty,
      image: typeof item.images?.[0] === 'string' ? item.images[0] : 'https://via.placeholder.com/300x400.png?text=No+Image',
      fabricType: selectedFabric,
      materialProvidedByCustomer,
      materialFee,
    });

    // Also add to database cart (if user is logged in)
    if (!isGuest) {
      try {
        const result = await CartService.addToCart(
          selectedVariant?.id || item.id, // Use variant ID if selected, otherwise use item ID
          qty,
          measurementId !== 'default' ? measurementId : undefined,
          selectedFabric ? undefined : undefined, // fabric_type_id if applicable
          undefined // customizations
        );

        if (!result.success) {
          console.warn('Failed to add to database cart:', result.error);
          // Don't show error to user since local cart was successful
        }
      } catch (error) {
        console.warn('Error adding to database cart:', error);
        // Don't show error to user since local cart was successful
      }
    }

    showSuccess(
      `${item.name} has been added to your pre-order cart.${materialFee > 0 ? ` Material fee: ₱${materialFee}` : ''}`,
      4000,
      {
        label: "View Cart",
        onPress: () => navigation.navigate('Cart' as never)
      }
    );
  };

  const handleNewMeasurement = () => {
    setShowNewMeasurementModal(true);
  };

  const handleSaveNewMeasurement = async () => {
    if (!newMeasurementForm.name.trim()) {
      showError('Please enter a name for your measurements');
      return;
    }

    const hasMeasurements = Object.values(newMeasurementForm.measurements).some(val => val.trim() !== '');
    if (!hasMeasurements) {
      showError('Please enter at least one measurement');
      return;
    }

    setSavingNewMeasurement(true);

    const success = await executeAsync.execute(
      async () => {
        const result = await MeasurementService.createMeasurement({
          name: newMeasurementForm.name.trim(),
          measurements: Object.fromEntries(
            Object.entries(newMeasurementForm.measurements)
              .map(([key, value]) => [key, value.trim() ? parseFloat(value) : undefined])
              .filter(([, value]) => value !== undefined)
          ),
          isDefault: false,
        });

        if (!result.success || !result.measurement) {
          throw new Error(result.error || 'Failed to create measurement');
        }

        return result.measurement;
      },
      {
        showSuccessToast: true,
        successMessage: 'New measurements added successfully!',
        errorMessage: 'Failed to save measurements. Please try again.',
        onSuccess: (measurement) => {
          // Add to local measurements list
          setMeasurements(prev => [...prev, measurement]);
          setSelectedMeasurement(measurement.id || measurement._id || '');

          // Reset form and close modal
          setNewMeasurementForm({
            name: '',
            measurements: { bust: '', waist: '', hip: '', inseam: '' }
          });
          setShowNewMeasurementModal(false);
        }
      }
    );

    setSavingNewMeasurement(false);
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
    <ErrorBoundary>
      <View style={styles.container}>
        <AppHeader title="" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
        <LazyImage
          source={typeof item.images?.[0] === 'string' ? { uri: item.images[0] } : { uri: 'https://via.placeholder.com/300x400.png?text=No+Image' }}
          style={styles.image}
          placeholder="https://via.placeholder.com/300x400.png?text=Loading..."
          resizeMode="cover"
          priority="high"
          quality={90}
        />
        
        {/* AR Try-on Button */}
        <TouchableOpacity
          style={styles.arButton}
          onPress={() => navigation.navigate('Camera' as never)}
        >
          <View style={styles.arButtonContent}>
            <Ionicons name="shirt-outline" size={rf(20)} color={theme.colors.surface} />
            <Ionicons name="eye-outline" size={rf(16)} color={theme.colors.surface} style={styles.arButtonSecondIcon} />
          </View>
          <Text style={styles.arButtonText}>AR Try On</Text>
        </TouchableOpacity>

        <View style={styles.detailsContainer}>
          <Text variant="titleLarge" style={styles.name}>
            {item.name}
          </Text>
          <Text variant="titleMedium" style={styles.price}>
            ₱{item.price.toFixed(2)}
          </Text>
          <View style={styles.categoryRow}>
            <Chip mode="outlined" style={styles.categoryChip}>
              {item.category}
            </Chip>
          </View>

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
              <RadioButton.Group onValueChange={(v) => setMeasurementOption(v as 'default' | 'named' | 'new' | 'on-site')} value={measurementOption}>
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
                  <View style={styles.measurementOption}>
                    <RadioButton value="on-site" />
                    <View style={styles.measurementInfo}>
                      <Text style={styles.measurementName}>On-site Measurement by Tailor</Text>
                      <Text style={styles.measurementDescription}>Professional tailors will measure you in-person</Text>
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
                        <View key={m.id || m._id} style={styles.measurementOption}>
                          <RadioButton value={m.id || m._id || ''} />
                          <View style={styles.measurementInfo}>
                            <Text style={styles.measurementName}>{m.name}</Text>
                            {(m.is_default || m.isDefault) && <Text style={styles.defaultText}>(Default)</Text>}
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

          {/* Product Variants Selection */}
          {productVariants.length > 0 && (
            <View style={styles.variantsContainer}>
              <Text variant="labelLarge" style={styles.variantsLabel}>
                Select Size & Color
              </Text>
              <View style={styles.variantsGrid}>
                {productVariants.map((variant: any) => (
                  <TouchableOpacity
                    key={variant.id}
                    style={[
                      styles.variantOption,
                      selectedVariant?.id === variant.id && styles.variantOptionSelected,
                      (!variant.is_available || variant.stock_quantity === 0) && styles.variantOptionDisabled
                    ]}
                    onPress={() => {
                      if (variant.is_available && variant.stock_quantity > 0) {
                        setSelectedVariant(variant);
                      }
                    }}
                    disabled={!variant.is_available || variant.stock_quantity === 0}
                  >
                    <Text style={[
                      styles.variantText,
                      selectedVariant?.id === variant.id && styles.variantTextSelected,
                      (!variant.is_available || variant.stock_quantity === 0) && styles.variantTextDisabled
                    ]}>
                      {variant.size} - {variant.color}
                    </Text>
                    <Text style={[
                      styles.variantStock,
                      selectedVariant?.id === variant.id && styles.variantStockSelected,
                      (!variant.is_available || variant.stock_quantity === 0) && styles.variantStockDisabled
                    ]}>
                      Stock: {variant.stock_quantity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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

          <Button
            mode="contained"
            onPress={onAdd}
            style={styles.addButton}
            icon={() => <Ionicons name="cart-outline" size={rf(20)} color={theme.colors.surface} />}
          >
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
    </ErrorBoundary>
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
  categoryRow: {
    flexDirection: 'row',
    marginBottom: wp(5),
  },
  categoryChip: {
    borderColor: theme.colors.primary,
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
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(4),
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.textPrimary,
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
    color: theme.colors.textPrimary,
    marginBottom: wp(2),
  },
  required: {
    color: theme.colors.danger,
  },
  input: {
    backgroundColor: theme.colors.surface,
    marginBottom: wp(2),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
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
    borderTopColor: theme.colors.border,
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
    color: theme.colors.textSecondary,
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
  arButton: {
    position: 'absolute',
    top: hp(25),
    right: wp(5),
    backgroundColor: theme.colors.primary,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: rw(25),
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  arButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(2),
  },
  arButtonSecondIcon: {
    marginLeft: -wp(1),
    marginTop: -hp(0.5),
  },
  arButtonText: {
    color: theme.colors.surface,
    fontSize: rf(14),
    fontWeight: '600',
  },
  variantsContainer: {
    marginBottom: wp(5),
  },
  variantsLabel: {
    fontSize: rf(18),
    fontWeight: 'bold',
    marginBottom: wp(3),
  },
  variantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  variantOption: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: wp(2),
    backgroundColor: theme.colors.surface,
    minWidth: wp(25),
    alignItems: 'center',
  },
  variantOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  variantOptionDisabled: {
    backgroundColor: theme.colors.surfaceVariant,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  variantText: {
    fontSize: rf(14),
    color: theme.colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  variantTextSelected: {
    color: theme.colors.surface,
  },
  variantTextDisabled: {
    color: theme.colors.textSecondary,
  },
  variantStock: {
    fontSize: rf(12),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  variantStockSelected: {
    color: theme.colors.surface,
  },
  variantStockDisabled: {
    color: theme.colors.textLight,
  },
});
