import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, Title, Paragraph, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { hp, wp, rf } from '../../utils/responsiveUtils';
import Loading from '../../components/Loading';

interface FabricAnalytics {
  id: string;
  name: string;
  usage_count: number;
  total_orders: number;
  revenue_generated: number;
  average_order_value: number;
  popularity_rank: number;
  trend_direction: 'up' | 'down' | 'stable';
}

const FabricAnalyticsScreen = () => {
  const navigation = useNavigation();
  const [analytics, setAnalytics] = useState<FabricAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'usage' | 'revenue' | 'orders'>('usage');

  useEffect(() => {
    loadFabricAnalytics();
  }, []);

  const loadFabricAnalytics = async () => {
    try {
      // Mock data - replace with actual API call
      const mockAnalytics: FabricAnalytics[] = [
        {
          id: '1',
          name: 'Premium Cotton',
          usage_count: 45,
          total_orders: 23,
          revenue_generated: 15750,
          average_order_value: 685,
          popularity_rank: 1,
          trend_direction: 'up',
        },
        {
          id: '2',
          name: 'Italian Wool',
          usage_count: 12,
          total_orders: 8,
          revenue_generated: 9600,
          average_order_value: 1200,
          popularity_rank: 2,
          trend_direction: 'stable',
        },
        {
          id: '3',
          name: 'Silk Blend',
          usage_count: 0,
          total_orders: 0,
          revenue_generated: 0,
          average_order_value: 0,
          popularity_rank: 3,
          trend_direction: 'down',
        },
        {
          id: '4',
          name: 'Linen Blend',
          usage_count: 8,
          total_orders: 5,
          revenue_generated: 3200,
          average_order_value: 640,
          popularity_rank: 4,
          trend_direction: 'up',
        },
      ];
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading fabric analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedAnalytics = () => {
    return [...analytics].sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.usage_count - a.usage_count;
        case 'revenue':
          return b.revenue_generated - a.revenue_generated;
        case 'orders':
          return b.total_orders - a.total_orders;
        default:
          return 0;
      }
    });
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return theme.colors.success;
      case 'down':
        return theme.colors.danger;
      default:
        return theme.colors.warning;
    }
  };

  const renderAnalyticsItem = ({ item }: { item: FabricAnalytics }) => (
    <Card style={styles.analyticsCard}>
      <Card.Content>
        <View style={styles.analyticsHeader}>
          <View style={styles.fabricInfo}>
            <Title style={styles.fabricName}>{item.name}</Title>
            <View style={styles.rankContainer}>
              <Chip style={styles.rankChip}>#{item.popularity_rank}</Chip>
              <Ionicons
                name={getTrendIcon(item.trend_direction) as keyof typeof Ionicons.glyphMap}
                size={20}
                color={getTrendColor(item.trend_direction)}
              />
            </View>
          </View>
        </View>

        <View style={styles.analyticsStats}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="cube-outline" size={20} color={theme.colors.textSecondary} />
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{item.usage_count}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="receipt-outline" size={20} color={theme.colors.textSecondary} />
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{item.total_orders}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
              <View style={styles.statContent}>
                <Text style={styles.statValue}>₱{item.revenue_generated.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
            </View>
          </View>

          <View style={styles.averageOrderContainer}>
            <Text style={styles.averageOrderLabel}>Average Order Value:</Text>
            <Text style={styles.averageOrderValue}>₱{item.average_order_value.toLocaleString()}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return <Loading />;
  }

  const sortedAnalytics = getSortedAnalytics();
  const totalRevenue = analytics.reduce((sum, fabric) => sum + fabric.revenue_generated, 0);
  const totalOrders = analytics.reduce((sum, fabric) => sum + fabric.total_orders, 0);
  const totalUsage = analytics.reduce((sum, fabric) => sum + fabric.usage_count, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Fabric Analytics</Text>
        <Text style={styles.subtitle}>Usage tracking and performance metrics</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Ionicons name="cube-outline" size={24} color={theme.colors.primary} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryValue}>{totalUsage}</Text>
              <Text style={styles.summaryLabel}>Total Usage</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Ionicons name="receipt-outline" size={24} color={theme.colors.secondary} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryValue}>{totalOrders}</Text>
              <Text style={styles.summaryLabel}>Total Orders</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Ionicons name="cash-outline" size={24} color={theme.colors.success} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryValue}>₱{totalRevenue.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortOptions}>
          <TouchableOpacity
            style={[styles.sortChip, sortBy === 'usage' && styles.sortChipSelected]}
            onPress={() => setSortBy('usage')}
          >
            <Text style={[styles.sortChipText, sortBy === 'usage' && styles.sortChipTextSelected]}>
              Usage
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sortBy === 'revenue' && styles.sortChipSelected]}
            onPress={() => setSortBy('revenue')}
          >
            <Text style={[styles.sortChipText, sortBy === 'revenue' && styles.sortChipTextSelected]}>
              Revenue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sortBy === 'orders' && styles.sortChipSelected]}
            onPress={() => setSortBy('orders')}
          >
            <Text style={[styles.sortChipText, sortBy === 'orders' && styles.sortChipTextSelected]}>
              Orders
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Analytics List */}
      <ScrollView style={styles.analyticsList} showsVerticalScrollIndicator={false}>
        {sortedAnalytics.map((item) => (
          <View key={item.id}>
            {renderAnalyticsItem({ item })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    marginBottom: hp(2),
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: wp(1),
    elevation: 2,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
  },
  summaryText: {
    marginLeft: wp(2),
    flex: 1,
  },
  summaryValue: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    fontSize: rf(12),
    color: theme.colors.textSecondary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    marginBottom: hp(2),
  },
  sortLabel: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: wp(3),
  },
  sortOptions: {
    flexDirection: 'row',
  },
  sortChip: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginRight: wp(2),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  sortChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortChipText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  sortChipTextSelected: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  analyticsList: {
    flex: 1,
    paddingHorizontal: wp(5),
  },
  analyticsCard: {
    marginBottom: hp(2),
    elevation: 2,
  },
  analyticsHeader: {
    marginBottom: hp(1),
  },
  fabricInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fabricName: {
    fontSize: rf(18),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankChip: {
    marginRight: wp(2),
    backgroundColor: theme.colors.primary + '20',
  },
  analyticsStats: {
    marginTop: hp(1),
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: hp(2),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statContent: {
    marginLeft: wp(2),
    alignItems: 'center',
  },
  statValue: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: rf(12),
    color: theme.colors.textSecondary,
  },
  averageOrderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp(1),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  averageOrderLabel: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  averageOrderValue: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default FabricAnalyticsScreen;