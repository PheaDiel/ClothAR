import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TextInput, Button, Card, Title, Switch } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';
import { ProductService } from '../../services/productService';

interface FabricType {
  id?: string;
  name: string;
  description: string;
  material_composition: string;
  care_instructions: string;
  price_per_meter: number;
  is_active: boolean;
}

const AddEditFabricScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { fabric } = (route.params as { fabric?: FabricType }) || {};

  const [loading, setLoading] = useState(false);
  const [fabricData, setFabricData] = useState<FabricType>({
    name: '',
    description: '',
    material_composition: '',
    care_instructions: '',
    price_per_meter: 0,
    is_active: true,
  });

  useEffect(() => {
    if (fabric) {
      setFabricData(fabric);
    }
  }, [fabric]);

  const handleSave = async () => {
    if (!fabricData.name || !fabricData.material_composition || !fabricData.care_instructions) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (fabric) {
        // Update existing fabric
        result = await ProductService.updateFabricType(fabric.id!, fabricData);
      } else {
        // Create new fabric
        result = await ProductService.createFabricType(fabricData);
      }

      if (result.success) {
        Alert.alert('Success', `Fabric ${fabric ? 'updated' : 'created'} successfully`);
        navigation.goBack();
      } else {
        Alert.alert('Error', result.error || 'Failed to save fabric');
      }
    } catch (error: any) {
      console.error('Save fabric error:', error);
      Alert.alert('Error', error.message || 'Failed to save fabric');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{fabric ? 'Edit Fabric' : 'Add New Fabric'}</Text>
          <Text style={styles.subtitle}>Fill in the fabric details below</Text>
        </View>

        {/* Fabric Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Fabric Information</Title>

            <TextInput
              label="Fabric Name *"
              value={fabricData.name}
              onChangeText={(text) => setFabricData(prev => ({ ...prev, name: text }))}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Description"
              value={fabricData.description}
              onChangeText={(text) => setFabricData(prev => ({ ...prev, description: text }))}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={2}
            />

            <TextInput
              label="Material Composition *"
              value={fabricData.material_composition}
              onChangeText={(text) => setFabricData(prev => ({ ...prev, material_composition: text }))}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., 100% Egyptian Cotton"
            />

            <TextInput
              label="Care Instructions *"
              value={fabricData.care_instructions}
              onChangeText={(text) => setFabricData(prev => ({ ...prev, care_instructions: text }))}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={2}
              placeholder="e.g., Machine wash cold, tumble dry low"
            />

            <TextInput
              label="Price per Meter (₱) *"
              value={fabricData.price_per_meter.toString()}
              onChangeText={(text) => setFabricData(prev => ({ ...prev, price_per_meter: parseFloat(text) || 0 }))}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Active Fabric</Text>
              <Switch
                value={fabricData.is_active}
                onValueChange={(value) => setFabricData(prev => ({ ...prev, is_active: value }))}
                color={theme.colors.primary}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Usage Tracking Preview */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Usage Tracking</Title>
            <Text style={styles.previewText}>
              This fabric will be available for selection when creating products.
              Usage statistics will be tracked once products using this fabric are ordered.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          loading={loading}
        >
          {fabric ? 'Update Fabric' : 'Create Fabric'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: wp(5),
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: rf(16),
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
  },
  card: {
    margin: wp(5),
    marginTop: 0,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(2),
  },
  input: {
    marginBottom: hp(2),
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1),
  },
  switchLabel: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  previewText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
    lineHeight: rf(20),
  },
  saveContainer: {
    padding: wp(5),
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    width: '100%',
  },
});

export default AddEditFabricScreen;