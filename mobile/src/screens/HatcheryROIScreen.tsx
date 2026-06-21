import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';

export default function HatcheryROIScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  // Sourcing & Species
  const [species, setSpecies] = useState<'rohu' | 'catla'>('rohu');
  const [priceSource, setPriceSource] = useState<'cifa' | 'bihar' | 'custom'>('bihar');
  const [customSpawnPrice, setCustomSpawnPrice] = useState(2050); // ₹ per lakh
  const [district, setDistrict] = useState<string>('Begusarai');
  const [districtModalVisible, setDistrictModalVisible] = useState(false);

  // Production Inputs
  const [capacityMillion, setCapacityMillion] = useState(5); // 5 Million spawn
  const [cyclesPerYear, setCyclesPerYear] = useState(6); // 6 spawning cycles
  const [survivalRate, setSurvivalRate] = useState(30); // 30% survival rate to fingerlings
  const [sellingPrice, setSellingPrice] = useState(2.2); // ₹2.20 per piece

  // Detailed OPEX fields (per fingerling produced)
  const [feedCost, setFeedCost] = useState(0.30);
  const [healthCost, setHealthCost] = useState(0.10);
  const [utilitiesCost, setUtilitiesCost] = useState(0.40);

  // Modal State
  const [benchmarkModalVisible, setBenchmarkModalVisible] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'production' | 'revenue' | 'opex' | 'margin' | 'capex' | 'payback'>('opex');


  // Computed Spawn Price based on Species and Source Selection
  const spawnPricePerLakh = useMemo(() => {
    if (priceSource === 'cifa') {
      return species === 'rohu' ? 1500 : 2000;
    }
    if (priceSource === 'bihar') {
      switch (district) {
        case 'Banka':
          return 2050;
        case 'Begusarai':
        case 'Purnia':
          return species === 'rohu' ? 1802 : 2252;
        case 'Darbhanga':
        case 'Madhubani':
          return species === 'rohu' ? 2167 : 2667;
        case 'Muzaffarpur':
        case 'Samastipur':
          return species === 'rohu' ? 2100 : 2600;
        case 'East Champaran':
          return species === 'rohu' ? 1967 : 2467;
        default:
          return species === 'rohu' ? 2050 : 2094;
      }
    }
    return customSpawnPrice;
  }, [species, priceSource, customSpawnPrice, district]);

  useEffect(() => {
    if (priceSource === 'bihar') {
      switch (district) {
        case 'Banka':
          setSellingPrice(8.5);
          break;
        case 'Begusarai':
        case 'Purnia':
          setSellingPrice(8.8);
          break;
        case 'Darbhanga':
        case 'Madhubani':
          setSellingPrice(9.8);
          break;
        case 'Muzaffarpur':
        case 'Samastipur':
          setSellingPrice(9.5);
          break;
        case 'East Champaran':
          setSellingPrice(9.0);
          break;
        default:
          setSellingPrice(8.5);
          break;
      }
    }
  }, [district, priceSource]);

  // Calculations
  const calculations = useMemo(() => {
    // Capacity in Millions -> convert to lakhs
    const spawnLakhsPerYear = capacityMillion * 10 * cyclesPerYear;
    const annualSpawnCount = capacityMillion * 1_000_000 * cyclesPerYear;
    
    // Survival rate converts spawn to fingerlings
    const annualFingerlingProd = Math.round(annualSpawnCount * (survivalRate / 100));

    // Spawn Sourcing Cost
    const annualSpawnPurchaseCost = spawnLakhsPerYear * spawnPricePerLakh;
    
    // OPEX Breakdown
    const annualFeedCost = annualFingerlingProd * feedCost;
    const annualHealthCost = annualFingerlingProd * healthCost;
    const annualUtilitiesCost = annualFingerlingProd * utilitiesCost;

    const annualOpex = annualSpawnPurchaseCost + annualFeedCost + annualHealthCost + annualUtilitiesCost;
    const annualRevenue = annualFingerlingProd * sellingPrice;
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
      annualSpawnPurchaseCost,
      annualFeedCost,
      annualHealthCost,
      annualUtilitiesCost,
      annualNetProfit,
      capex,
      netMargin,
      paybackPeriodYears,
    };
  }, [capacityMillion, cyclesPerYear, survivalRate, sellingPrice, spawnPricePerLakh, feedCost, healthCost, utilitiesCost]);

  const adjustValue = (
    type: 'capacity' | 'cycles' | 'survival' | 'price' | 'customSpawn' | 'feed' | 'health' | 'utilities',
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
    } else if (type === 'customSpawn') {
      setCustomSpawnPrice((prev) => Math.max(500, Math.min(10000, prev + (increment ? 50 : -50))));
    } else if (type === 'feed') {
      setFeedCost((prev) => parseFloat(Math.max(0.05, Math.min(5.0, prev + (increment ? 0.05 : -0.05))).toFixed(2)));
    } else if (type === 'health') {
      setHealthCost((prev) => parseFloat(Math.max(0.01, Math.min(2.0, prev + (increment ? 0.02 : -0.02))).toFixed(2)));
    } else if (type === 'utilities') {
      setUtilitiesCost((prev) => parseFloat(Math.max(0.05, Math.min(5.0, prev + (increment ? 0.05 : -0.05))).toFixed(2)));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Hatchery ROI Simulator" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Intro */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calculate Hatchery Economics</Text>
          <Text style={styles.cardSubtitle}>
            Adjust your hatchery capacity and costs to simulate annual revenue, costs, and payback period. Setup cost based on Bihar Govt yojana: ₹8L for new carp hatchery, ₹5L for renovation (50-70% subsidy available).
          </Text>
        </View>

        {/* 1. Sourcing & Species Parameters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Sourcing & Species</Text>
          
          <Text style={styles.fieldLabel}>Select Species</Text>
          <View style={styles.selectorContainer}>
            <TouchableOpacity
              style={[styles.selectorBtn, species === 'rohu' && styles.selectorBtnActive]}
              onPress={() => setSpecies('rohu')}
            >
              <Text style={[styles.selectorText, species === 'rohu' && styles.selectorTextActive]}>
                Jayanti Rohu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectorBtn, species === 'catla' && styles.selectorBtnActive]}
              onPress={() => setSpecies('catla')}
            >
              <Text style={[styles.selectorText, species === 'catla' && styles.selectorTextActive]}>
                CIFA Amrit Catla
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Spawn Cost Source</Text>
          <View style={styles.selectorContainer}>
            <TouchableOpacity
              style={[styles.selectorBtn, priceSource === 'bihar' && styles.selectorBtnActive]}
              onPress={() => setPriceSource('bihar')}
            >
              <Text style={[styles.selectorText, priceSource === 'bihar' && styles.selectorTextActive]}>
                Bihar Market
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectorBtn, priceSource === 'cifa' && styles.selectorBtnActive]}
              onPress={() => setPriceSource('cifa')}
            >
              <Text style={[styles.selectorText, priceSource === 'cifa' && styles.selectorTextActive]}>
                ICAR-CIFA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectorBtn, priceSource === 'custom' && styles.selectorBtnActive]}
              onPress={() => setPriceSource('custom')}
            >
              <Text style={[styles.selectorText, priceSource === 'custom' && styles.selectorTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {priceSource === 'bihar' && (
            <>
              <Text style={styles.fieldLabel}>Bihar District</Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: theme.colors.surfaceLow ?? theme.colors.background,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  marginBottom: 12,
                }}
                onPress={() => setDistrictModalVisible(true)}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary }}>
                  {district}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </>
          )}

          {/* Spawn Price display / adjust */}
          <View style={styles.spawnPriceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Spawn Sourcing Rate</Text>
              <Text style={styles.inputHint}>
                {priceSource === 'cifa' ? 'CIFA Breeding Rate' :
                 priceSource === 'bihar' ? 'Bihar Farmgate Avg' : 'Custom Spawn Rate'}
              </Text>
            </View>
            {priceSource === 'custom' ? (
              <View style={styles.controlGroup}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('customSpawn', false)}>
                  <Ionicons name="remove-circle-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.controlVal}>₹{customSpawnPrice}</Text>
                <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('customSpawn', true)}>
                  <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.spawnPriceValue}>₹{spawnPricePerLakh.toLocaleString('en-IN')} / Lakh</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.benchmarkLink}
            onPress={() => setBenchmarkModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.benchmarkLinkText}>View Price Benchmark Sheet</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Production Parameters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Production & Sales</Text>

          {/* Spawn Capacity */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Spawn per Cycle</Text>
              <Text style={styles.inputHint}>Spawning capacity per batch</Text>
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

          {/* Spawning Cycles */}
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

          {/* Survival Rate */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Survival Rate (%)</Text>
              <Text style={styles.inputHint}>Spawn to Fingerling stage</Text>
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

          {/* Selling Price */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Selling Price (₹)</Text>
              <Text style={styles.inputHint}>Per Fingerling piece sold</Text>
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

          {/* Hatchery Operational Constraints Banner */}
          <View style={{
            backgroundColor: theme.colors.primary + '11',
            borderWidth: 1,
            borderColor: theme.colors.primary + '33',
            borderRadius: 12,
            padding: 12,
            marginTop: 14,
            gap: 8,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.primary }}>Bihar Hatchery Operational Notes</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16 }}>
                • <Text style={{ fontWeight: '700' }}>Rotational Ponds Required</Text>: Achieving {cyclesPerYear} cycles/year is not possible in a single rearing pond. Since carps (like Rohu) breed only from May to September (monsoon season) and fingerling rearing takes ~90 days, you must staggered-stock and rotate across multiple nursery and rearing ponds.
              </Text>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16 }}>
                • <Text style={{ fontWeight: '700' }}>Bihar Survival (30%)</Text>: In Bihar's climatic conditions, the average survival rate from spawn to ready fingerling stage in rearing ponds typically averages 30%.
              </Text>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16 }}>
                • <Text style={{ fontWeight: '700' }}>Price Benchmarks</Text>: Default spawn costs and fingerling selling prices are based on official ICAR-CIFA list prices and average Bihar Fisheries farm-gate rates.
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Detailed Operating Costs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Operating Costs Breakdown</Text>
          <Text style={styles.costSectionDesc}>
            Adjust estimated costs required to rear seeds from spawn to fingerling size.
          </Text>

          {/* Feed & Inputs */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Feed & Inputs (₹)</Text>
              <Text style={styles.inputHint}>Plankton, floating feed / piece</Text>
            </View>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('feed', false)}>
                <Ionicons name="remove-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.controlVal}>₹{feedCost.toFixed(2)}</Text>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('feed', true)}>
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Health & Vaccine */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Health & Vaccine (₹)</Text>
              <Text style={styles.inputHint}>Probiotics, Brood-Vac / piece</Text>
            </View>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('health', false)}>
                <Ionicons name="remove-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.controlVal}>₹{healthCost.toFixed(2)}</Text>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('health', true)}>
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Utilities & Labor */}
          <View style={styles.inputRow}>
            <View style={styles.inputMeta}>
              <Text style={styles.inputLabel}>Utilities & Labor (₹)</Text>
              <Text style={styles.inputHint}>Water, electricity, labor / piece</Text>
            </View>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('utilities', false)}>
                <Ionicons name="remove-circle-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.controlVal}>₹{utilitiesCost.toFixed(2)}</Text>
              <TouchableOpacity style={styles.controlBtn} onPress={() => adjustValue('utilities', true)}>
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

          <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 10, marginTop: -4 }}>
            Tap on any box below to see how the number is calculated.
          </Text>

          <View style={styles.resultsGrid}>
            <TouchableOpacity
              style={[styles.gridItem, selectedMetric === 'production' && styles.gridItemActive]}
              onPress={() => setSelectedMetric('production')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.gridLabel}>Production</Text>
                <Ionicons name="information-circle-outline" size={13} color={selectedMetric === 'production' ? theme.colors.primary : theme.colors.textMuted} />
              </View>
              <Text style={styles.gridValue}>
                {(calculations.annualFingerlingProd / 100000).toFixed(1)} Lakh pcs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridItem, selectedMetric === 'revenue' && styles.gridItemActive]}
              onPress={() => setSelectedMetric('revenue')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.gridLabel}>Est. Revenue</Text>
                <Ionicons name="information-circle-outline" size={13} color={selectedMetric === 'revenue' ? theme.colors.primary : theme.colors.textMuted} />
              </View>
              <Text style={styles.gridValue}>
                ₹{(calculations.annualRevenue / 100000).toFixed(2)} L
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridItem, selectedMetric === 'opex' && styles.gridItemActive]}
              onPress={() => setSelectedMetric('opex')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.gridLabel}>Operating Costs</Text>
                <Ionicons name="information-circle-outline" size={13} color={selectedMetric === 'opex' ? theme.colors.primary : theme.colors.textMuted} />
              </View>
              <Text style={styles.gridValue}>
                ₹{(calculations.annualOpex / 100000).toFixed(2)} L
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridItem, selectedMetric === 'margin' && styles.gridItemActive]}
              onPress={() => setSelectedMetric('margin')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.gridLabel}>Profit Margin</Text>
                <Ionicons name="information-circle-outline" size={13} color={selectedMetric === 'margin' ? theme.colors.primary : theme.colors.textMuted} />
              </View>
              <Text style={styles.gridValue}>
                {calculations.netMargin.toFixed(1)}%
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridItem, selectedMetric === 'capex' && styles.gridItemActive]}
              onPress={() => setSelectedMetric('capex')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.gridLabel}>Setup Capex</Text>
                <Ionicons name="information-circle-outline" size={13} color={selectedMetric === 'capex' ? theme.colors.primary : theme.colors.textMuted} />
              </View>
              <Text style={styles.gridValue}>
                ₹{calculations.capex.toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridItem, selectedMetric === 'payback' && styles.gridItemActive]}
              onPress={() => setSelectedMetric('payback')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.gridLabel}>Payback Period</Text>
                <Ionicons name="information-circle-outline" size={13} color={selectedMetric === 'payback' ? theme.colors.primary : theme.colors.textMuted} />
              </View>
              <Text style={styles.gridValue}>
                {calculations.paybackPeriodYears
                  ? `${calculations.paybackPeriodYears.toFixed(1)} Years`
                  : 'N/A'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Explanatory Box */}
          {selectedMetric && (
            <View style={{
              marginTop: 16,
              backgroundColor: theme.colors.primary + '08',
              borderWidth: 1,
              borderColor: theme.colors.primary + '33',
              borderRadius: 14,
              padding: 14,
              gap: 6,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons 
                  name={
                    selectedMetric === 'production' ? 'fish-outline' :
                    selectedMetric === 'revenue' ? 'cash-outline' :
                    selectedMetric === 'opex' ? 'wallet-outline' :
                    selectedMetric === 'margin' ? 'trending-up-outline' :
                    selectedMetric === 'capex' ? 'construct-outline' : 'time-outline'
                  } 
                  size={16} 
                  color={theme.colors.primary} 
                />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.primary }}>
                  {selectedMetric === 'production' ? 'About Production' :
                   selectedMetric === 'revenue' ? 'About Estimated Revenue' :
                   selectedMetric === 'opex' ? 'About Annual Operating Costs' :
                   selectedMetric === 'margin' ? 'About Profit Margin' :
                   selectedMetric === 'capex' ? 'About Setup Capex' : 'About Payback Period'}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.colors.textPrimary, lineHeight: 18, fontWeight: '500' }}>
                {selectedMetric === 'production' && 
                  `This is the number of healthy fingerlings you produce per year: ${(calculations.annualFingerlingProd / 100000).toFixed(1)} Lakh pieces. It is calculated by taking your total spawn stocked (${(capacityMillion * 10 * cyclesPerYear)} Lakh eggs) and applying your survival rate (${survivalRate}%).`}
                
                {selectedMetric === 'revenue' && 
                  `This is the total money you receive from selling your surviving fingerlings: ₹${(calculations.annualRevenue / 100000).toFixed(2)} Lakhs per year. It is calculated by multiplying your harvested fish (${(calculations.annualFingerlingProd / 100000).toFixed(1)} Lakh pieces) by your selling price of ₹${sellingPrice.toFixed(2)} per fish.`}
                
                {selectedMetric === 'opex' && 
                  `This is the total cost to run your hatchery for a year: ₹${(calculations.annualOpex / 100000).toFixed(2)} Lakhs. It covers spawn purchases, feed, health/vaccines, labor, and electricity. Crucially, this is a "blended cost", meaning it includes all inputs spent on rearing the fish, including those that do not survive.`}
                
                {selectedMetric === 'margin' && 
                  `Out of every ₹100 you make in sales, you keep ₹${calculations.netMargin.toFixed(1)} as actual profit (simulating a ${calculations.netMargin.toFixed(1)}% margin). Hatcheries typically have high margins because spawn eggs are very cheap to buy relative to the final sale price of grown fingerlings.`}
                
                {selectedMetric === 'capex' && 
                  `This is the one-time cost to construct breeding pools, hatching pool, prepare/excavate ponds, and install plumbing: ₹${calculations.capex.toLocaleString('en-IN')}. Bihar government schemes often provide 50% to 70% subsidy on this, so you don't have to pay all of it yourself.`}
                
                {selectedMetric === 'payback' && 
                  `This is the time it takes to recover your initial setup investment from your annual profits: ${calculations.paybackPeriodYears ? `${calculations.paybackPeriodYears.toFixed(1)} Years` : 'N/A'}. It is calculated by dividing your setup cost (₹${calculations.capex.toLocaleString('en-IN')}) by your annual net profit (₹${calculations.annualNetProfit.toLocaleString('en-IN')}).`}
              </Text>
            </View>
          )}

          {/* Detailed Costs Breakdown in results */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Annual Operating Cost Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Spawn Sourcing Cost</Text>
              <Text style={styles.breakdownVal}>₹{(calculations.annualSpawnPurchaseCost / 100000).toFixed(2)} Lakhs</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Feed & Input Costs</Text>
              <Text style={styles.breakdownVal}>₹{(calculations.annualFeedCost / 100000).toFixed(2)} Lakhs</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Health & Vaccine Costs</Text>
              <Text style={styles.breakdownVal}>₹{(calculations.annualHealthCost / 100000).toFixed(2)} Lakhs</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Utilities & Labor Costs</Text>
              <Text style={styles.breakdownVal}>₹{(calculations.annualUtilitiesCost / 100000).toFixed(2)} Lakhs</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={benchmarkModalVisible} transparent animationType="slide" onRequestClose={() => setBenchmarkModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Seed Price Benchmark Sheet</Text>
            <ScrollView style={styles.modalScrollArea} showsVerticalScrollIndicator={false}>
              
              {/* Rohu Table */}
              <View style={styles.tableCard}>
                <Text style={styles.tableTitle}>Jayanti Rohu (AhR) Spawn & Seed</Text>
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCell, styles.cellHeader, { flex: 2 }]}>Stage / Size</Text>
                  <Text style={[styles.tableCell, styles.cellHeader]}>CIFA Rate</Text>
                  <Text style={[styles.tableCell, styles.cellHeader]}>Bihar Avg</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Spawn (6-8 mm)</Text>
                  <Text style={styles.tableCell}>₹1,500 / L</Text>
                  <Text style={styles.tableCell}>₹2,050 / L</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Fry (20-30 mm)</Text>
                  <Text style={styles.tableCell}>₹300 / K</Text>
                  <Text style={styles.tableCell}>₹400 / K</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Fry (31-40 mm)</Text>
                  <Text style={styles.tableCell}>₹750 / K</Text>
                  <Text style={styles.tableCell}>₹900 / K</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Fry (41-60 mm)</Text>
                  <Text style={styles.tableCell}>₹2,500 / K</Text>
                  <Text style={styles.tableCell}>₹3,000 / K</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Fingerling (61-100 mm)</Text>
                  <Text style={styles.tableCell}>₹7,500 / K</Text>
                  <Text style={styles.tableCell}>₹8,500 / K</Text>
                </View>
              </View>

              <View style={{ height: 12 }} />

              {/* Catla Table */}
              <View style={styles.tableCard}>
                <Text style={styles.tableTitle}>CIFA Amrit Catla Spawn & Seed</Text>
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCell, styles.cellHeader, { flex: 2 }]}>Stage / Size</Text>
                  <Text style={[styles.tableCell, styles.cellHeader]}>CIFA Rate</Text>
                  <Text style={[styles.tableCell, styles.cellHeader]}>Bihar Avg</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Spawn (6-8 mm)</Text>
                  <Text style={styles.tableCell}>₹2,000 / L</Text>
                  <Text style={styles.tableCell}>₹2,094 / L</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Spawn (20-30 mm)</Text>
                  <Text style={styles.tableCell}>₹500 / L</Text>
                  <Text style={styles.tableCell}>₹600 / L</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Fry (31-40 mm)</Text>
                  <Text style={styles.tableCell}>₹800 / K</Text>
                  <Text style={styles.tableCell}>₹1,000 / K</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Fry (41-60 mm)</Text>
                  <Text style={styles.tableCell}>₹3,000 / K</Text>
                  <Text style={styles.tableCell}>₹3,500 / K</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Fingerling (61-100 mm)</Text>
                  <Text style={styles.tableCell}>₹7,500 / K</Text>
                  <Text style={styles.tableCell}>₹8,500 / K</Text>
                </View>
              </View>

              <Text style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 12, fontStyle: 'italic' }}>
                * Note: / L = per Lakh spawns (100,000); / K = per Thousand seeds (1,000). Bihar averages based on survey data of nurseries and hatcheries in Bihar.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setBenchmarkModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* District Selection Modal */}
      <Modal
        visible={districtModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDistrictModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { minHeight: 250 }]}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Select Bihar District</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                'Begusarai',
                'Purnia',
                'Darbhanga',
                'Madhubani',
                'Muzaffarpur',
                'Samastipur',
                'East Champaran',
                'Banka',
                'Others / Average',
              ].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  }}
                  onPress={() => {
                    setDistrict(d === 'Others / Average' ? 'Others' : d);
                    setDistrictModalVisible(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: (d === 'Others / Average' ? 'Others' : d) === district ? '800' : '600',
                      color: (d === 'Others / Average' ? 'Others' : d) === district ? theme.colors.primary : theme.colors.textPrimary,
                    }}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setDistrictModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  const r = theme.borderRadius ?? {};
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
    fieldLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginTop: 8,
      marginBottom: 4,
    },
    selectorContainer: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt || c.background,
      borderRadius: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
    },
    selectorBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    selectorBtnActive: {
      backgroundColor: c.surface,
      ...theme.shadows?.sm,
    },
    selectorText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted || c.textSecondary,
    },
    selectorTextActive: {
      color: c.primary,
    },
    spawnPriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginTop: 8,
    },
    spawnPriceValue: {
      fontSize: 15,
      fontWeight: '800',
      color: c.primary,
    },
    benchmarkLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 10,
      marginTop: 4,
    },
    benchmarkLinkText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
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
    costSectionDesc: {
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 10,
      lineHeight: 16,
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
    gridItemActive: {
      borderColor: c.primary,
      backgroundColor: c.primary + '0c',
      borderWidth: 1.5,
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
    breakdownCard: {
      marginTop: 16,
      backgroundColor: c.surfaceLow || c.background,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    breakdownTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.border + '50',
    },
    breakdownLabel: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '500',
    },
    breakdownVal: {
      fontSize: 12,
      color: c.textPrimary,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 32,
      paddingTop: 12,
      maxHeight: '80%',
      minHeight: 300,
    },
    modalDragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalScrollArea: {
      flex: 1,
    },
    modalTitle: {
      color: c.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 12,
    },
    modalClose: {
      marginTop: 14,
      height: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt || c.background,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalCloseText: {
      color: c.textPrimary,
      fontWeight: '800',
      fontSize: 15,
    },
    tableCard: {
      backgroundColor: c.surface,
      borderRadius: r.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 10,
      ...theme.shadows?.sm,
    },
    tableTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 4,
    },
    tableRowHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingBottom: 6,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: c.border + '50',
      paddingVertical: 8,
    },
    tableCell: {
      flex: 1.2,
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '600',
    },
    cellHeader: {
      fontWeight: '800',
      color: c.textPrimary,
      fontSize: 11,
    },
  });
};
