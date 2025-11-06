import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Title, Paragraph, Button, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { AuthContext } from '../../context/AuthContext';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';


const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);


  const adminMenuItems = [
    {
      title: 'Product Management',
      subtitle: 'Add, edit, and manage products',
      icon: 'cube-outline',
      screen: 'ProductManagement',
      color: theme.colors.primary,
    },
    {
      title: 'Fabric Management',
      subtitle: 'Manage fabric types and pricing',
      icon: 'color-palette-outline',
      screen: 'FabricManagement',
      color: theme.colors.secondary,
    },
    {
      title: 'Order Management',
      subtitle: 'Complete order oversight',
      icon: 'clipboard-outline',
      screen: 'OrderManagement',
      color: theme.colors.tertiary,
    },
    {
      title: 'Inventory Management',
      subtitle: 'Stock and inventory control',
      icon: 'storefront-outline',
      screen: 'InventoryManagement',
      color: theme.colors.info,
    },
    {
      title: 'Customer Management',
      subtitle: 'Customer database and communication',
      icon: 'people-outline',
      screen: 'CustomerManagement',
      color: theme.colors.success,
    },
  ];



  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.adminName}>{user?.name || 'Admin'}</Text>
          <Text style={styles.adminRole}>System Administrator</Text>
        </View>


        {/* Admin Functions */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Admin Functions</Text>
          {adminMenuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => (navigation as any).navigate(item.screen)}
            >
              <Card style={styles.menuCard}>
                <Card.Content style={styles.menuCardContent}>
                  <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={28}
                      color={item.color}
                    />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Title style={styles.menuTitle}>{item.title}</Title>
                    <Paragraph style={styles.menuSubtitle}>{item.subtitle}</Paragraph>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.colors.textLight}
                  />
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Quick Actions FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          // Quick add product action
          (navigation as any).navigate('ProductManagement');
        }}
      />
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
  welcomeText: {
    fontSize: rf(16),
    color: theme.colors.textLight,
    fontWeight: '400',
  },
  adminName: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: hp(0.5),
  },
  adminRole: {
    fontSize: rf(14),
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: hp(0.5),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: hp(2),
    marginTop: hp(2),
  },
  menuContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(10),
  },
  menuItem: {
    marginBottom: hp(1),
  },
  menuCard: {
    elevation: 1,
  },
  menuCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(4),
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  menuSubtitle: {
    fontSize: rf(14),
    color: theme.colors.textLight,
  },
  fab: {
    position: 'absolute',
    margin: wp(4),
    right: 0,
    bottom: hp(2),
    backgroundColor: theme.colors.primary,
  },
});

export default AdminDashboardScreen;