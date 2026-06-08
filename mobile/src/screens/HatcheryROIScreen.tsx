import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';

export default function HatcheryROIScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  // Adjustable inputs
  const [capacityMillion, setCapacityMillion] = useState(5); // 5 Million spawn
  const [cyclesPerYear, setCyclesPerYear] = useState(6); // 6 spawning cycles
  const [survivalRate, setSurvivalRate] = useState(30); // 30% survival rate to fingerlings
  const [sellingPrice, setSellingPrice] = useState(2.2); // ₹2.20 per piece
  const [costPerPiece, setCostPerPiece] = useState(0.8); // ₹0.80 production cost per piece

  // Calculations
  const calculations = useMemo(() => {
    const annualSpawnCount = capacityMillion * 1_000_000 * cyclesPerYear;
    const annualFingerlingProd = Math.round(annualSpawnCount * (survivalRate / 100));
    const annualRevenue = annualFingerlingProd * sellingPrice;
    const annualOpex = annualFingerlingProd * costPerPiece;
    const annualNetProfit = annualRevenue - annualOpex;

    // Estimate CAPEX based on Bihar yojana unit costs:
    // New carp hatchery: ₹8L (Mukhyamantri Talab Matsyiki Vikas Yojana)
    // Renovation: ₹5L/unit. Scale linearly above 5M spawn capacity.
    const capex = 800_000 + Math.max(0, capacityMillion - 5) * 60_000;
    const netMargin = annualRevenue > 0 ? (annualNetProfit / annualRevenue) * 100 : 0;
    const paybackPeriodYears = annualNetProfit > 0 ? capex / annualNetProfit : null;

    return {
      annualFingerlingProd,
      annualRevenue,
      annualOpex,
      annualNetProfit,
      capex,
      netMargin,
      paybackPeriodYears,
    };
  }, [capacityMillion, cyclesPerYear, survivalRate, sellingPrice, costPerPiece]);

  const adjustValue = (
    type: 'capacity' | 'cycles' | 'survival' | 'price' | 'cost',
    increment: boolean
  ) => {
    if (type === 'capacity') {
      setCapacityMillion((prev) => Math.max(1, Math.min(50, prev + (increment ? 1 : -1))));
    } else if (type === 'cycles') {
      setCyclesPerYear((prev) => Math.max(1, Math.min(12, prev + (increment ? 1 : -1))));
    } else if (type === 'survival') {
      setSurvivalRate((prev) => Math.max(5, Math.min(90, prev + (increment ? 5 : -5))));
    } else if (type === 'price') {
      setSellingPrice((prev) => parseFloat(Math.max(0.5, Math.min(10.0, prev + (increment ? 0.1 : -0.1))).toFixed(2)));
    } else if (type === 'cost') {
      setCostPerPiece((prev) => parseFloat(Math.max(0.1, Math.min(5.0, prev + (increment ? 0.05 : -0.05))).toFixed(2)));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Hatchery ROI Simulator" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Intro */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calculate Hatchery Economics</Text>
          <Text style={styles.cardSubtitle}>
            Adjust your hatchery capacity and costs to simulate annual revenue, costs, and payback period. Setup cost based on Bihar Govt yojana: ₹8L for new carp hatchery, ₹5L for renovation (50-70% subsidy available).
          </Text>
        </View>

        {/* Inputs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Input Parameters</Text>

          {/* 1. Spawn Capacity */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Spawn Capacity</Text>
              <Text style={styles.inputHint}>Per Spawning Cycle</Text>
            </View>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('capacity', false)}>
                <Ionicons name="remove-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.controlVal}>{capacityMillion} M</Text>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('capacity', true)}>
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Spawning Cycles */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Cycles Per Year</Text>
              <Text style={styles.inputHint}>Spawning Operations</Text>
            </View>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('cycles', false)}>
                <Ionicons name="remove-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.controlVal}>{cyclesPerYear}</Text>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('cycles', true)}>
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Survival Rate */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Survival Rate (%)</Text>
              <Text style={styles.inputHint}>Spawn to Fingerling</Text>
            </View>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('survival', false)}>
                <Ionicons name="remove-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.controlVal}>{survivalRate}%</Text>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('survival', true)}>
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Selling Price */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Selling Price (₹)</Text>
              <Text style={styles.inputHint}>Per Fingerling piece</Text>
            </View>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('price', false)}>
                <Ionicons name="remove-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.controlVal}>₹{sellingPrice.toFixed(2)}</Text>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('price', true)}>
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. Cost Per Piece */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Operating Cost (₹)</Text>
              <Text style={styles.inputHint}>Per Fingerling piece</Text>
            </View>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('cost', false)}>
                <Ionicons name="remove-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.controlVal}>₹{costPerPiece.toFixed(2)}</Text>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('cost', true)}>
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Estimates</Text>

          {/* Net Profit Big Banner */}
          <View style={styles.profitBanner}>
            <Text style={styles.profitBannerLabel}>Simulated Net Profit / Year</Text>
            <Text style={styles.profitBannerValue}>
              ₹{calculations.annualNetProfit.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.resultsGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Production</Text>
              <Text style={styles.gridValue}>
                {(calculations.annualFingerlingProd / 100000).toFixed(1)} Lakh pcs
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Est. Revenue</Text>
              <Text style={styles.gridValue}>
                ₹{(calculations.annualRevenue / 100000).toFixed(2)} L
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Operating Costs</Text>
              <Text style={styles.gridValue}>
                ₹{(calculations.annualOpex / 100000).toFixed(2)} L
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Profit Margin</Text>
              <Text style={styles.gridValue}>
                {calculations.netMargin.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Setup Capex</Text>
              <Text style={styles.gridValue}>
                ₹{calculations.capex.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Payback Period</Text>
              <Text style={styles.gridValue}>
                {calculations.paybackPeriodYears
                  ? `${calculations.paybackPeriodYears.toFixed(1)} Years`
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      padding: 16,
      gap: 16,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 6,
    },
    cardSubtitle: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
    },
    section: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    inputMeta: {
      flex: 1,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    inputHint: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 2,
    },
    controlGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    controlBtn: {
      padding: 4,
    },
    controlVal: {
      fontSize: 15,
      fontWeight: '800',
      color: c.textPrimary,
      minWidth: 54,
      textAlign: 'center',
    },
    profitBanner: {
      backgroundColor: c.primaryLight || '#e0fdf4',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    profitBannerLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    profitBannerValue: {
      fontSize: 28,
      fontWeight: '900',
      color: c.primary,
      marginTop: 4,
    },
    resultsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    gridItem: {
      width: '47%',
      backgroundColor: c.surfaceLow || c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 12,
    },
    gridLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
    },
    gridValue: {
      fontSize: 14,
      fontWeight: '800',
      color: c.textPrimary,
      marginTop: 4,
    },
  });
};
