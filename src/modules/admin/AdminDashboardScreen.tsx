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

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockItems: number;
  totalRevenue: number;
}

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockStats: DashboardStats = {
        totalUsers: 1250,
        totalOrders: 456,
        pendingOrders: 23,
        totalProducts: 89,
        lowStockItems: 12,
        totalRevenue: 125000,
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      Alert.alert('Error', 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

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

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: 'people',
      color: theme.colors.primary,
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: 'receipt',
      color: theme.colors.secondary,
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: 'time',
      color: theme.colors.warning,
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      icon: 'cube',
      color: theme.colors.tertiary,
    },
    {
      title: 'Low Stock Items',
      value: stats?.lowStockItems || 0,
      icon: 'warning',
      color: theme.colors.danger,
    },
    {
      title: 'Total Revenue',
      value: `₱${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: 'cash',
      color: theme.colors.success,
    },
  ];

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.adminName}>{user?.name || 'Admin'}</Text>
          <Text style={styles.adminRole}>System Administrator</Text>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Dashboard Overview</Text>
          <View style={styles.statsGrid}>
            {statCards.map((stat, index) => (
              <Card key={index} style={styles.statCard}>
                <Card.Content style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <Ionicons
                      name={stat.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={stat.color}
                    />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statTitle}>{stat.title}</Text>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
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
  statsContainer: {
    paddingHorizontal: wp(5),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: wp(43),
    marginBottom: hp(2),
    elevation: 2,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: rf(20),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  statTitle: {
    fontSize: rf(12),
    color: theme.colors.textLight,
    marginTop: hp(0.5),
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