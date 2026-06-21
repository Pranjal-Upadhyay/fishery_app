import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import YouTubeCard, { YouTubeLinkItem } from '../components/YouTubeCard';

type Tab = 'lifecycle' | 'pricing' | 'videos' | 'pitfalls';

interface LifecycleStage {
  id: string;
  title: string;
  duration: string;
  survival: string;
  description: string;
  details: string[];
}

export default function HatcheryLearningScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<Tab>('lifecycle');
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  const toggleStage = (id: string) => {
    setExpandedStages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const STAGES: LifecycleStage[] = [
    {
      id: 's1',
      title: '1. Broodstock Management',
      duration: '1–2 Years',
      survival: 'N/A',
      description: 'Selection, rearing, and conditioning of mature parent fish to ensure high-quality gamete production.',
      details: [
        'Maintain a balanced diet rich in protein (30-35%) and vitamin E.',
        'Use Broodstock vaccines like CIFA-Brood-Vac (₹500/vial or ₹50/dose) to build immunity against bacterial infections.',
        'Keep stocking density low (1,000–1,500 kg per Hectare) to reduce stress.',
      ],
    },
    {
      id: 's2',
      title: '2. Induced Breeding & Spawning',
      duration: '24 Hours',
      survival: '70% – 85% (Egg Fertilization)',
      description: 'Injecting mature brooders with synthetic hormones to trigger spawning (egg and milt release).',
      details: [
        'Standard female dosage of ovaprim/ovatide is 0.3-0.5 ml/kg; males get 0.1-0.2 ml/kg.',
        'Introduce injected pairs into circular breeding pools with artificial rain/shower flow rate maintained at 200–250 L/min.',
        'Disinfect brooders with a 3 ppm potassium permanganate (KMnO₄) bath after spawning to prevent bacterial red sore infections.',
        'Spawning typically occurs 6–10 hours after injection depending on water temperature (ideal: 26-30°C).',
      ],
    },
    {
      id: 's3',
      title: '3. Hatching',
      duration: '72 Hours',
      survival: '60% – 70% (Hatch to Active Spawn)',
      description: 'Incubation of fertilized eggs in circular Chinese hatcheries until they hatch into active spawn.',
      details: [
        'Maintain a circular hatching density of 0.7–1.0 million eggs per cubic meter (eggs/m³).',
        'Eggs hatch in 14-18 hours, but remain as hatchlings (yolk-sac fry) for 72 hours.',
        'Maintain constant water circulation inside circular hatching pools to keep eggs suspended.',
        'Do not feed during these 72 hours; hatchlings derive nutrition entirely from their yolk sac.',
      ],
    },
    {
      id: 's4',
      title: '4. Nursery Phase (Spawn to Fry)',
      duration: '15–20 Days',
      survival: '35% – 50%',
      description: 'Rearing active 6-8 mm spawn in nursery ponds until they grow to 20-40 mm fry.',
      details: [
        'Prepare nursery ponds: eradicate predatory insects/fishes using soap-oil emulsion (18 kg soap + 56 kg oil per Hectare).',
        'Stocking density: 3 to 5 Million spawn per Hectare.',
        'Feed daily with finely powdered Mustard Oil Cake (MOC) and Rice Bran (DORB) in a 1:1 ratio: Days 1-5 at 4x spawn weight (approx. 500g/lakh/day), Days 6-13 at 8x spawn weight (approx. 1.1kg/lakh/day).',
      ],
    },
    {
      id: 's5',
      title: '5. Rearing Phase (Fry to Fingerling)',
      duration: '45–60 Days',
      survival: '60% – 75%',
      description: 'Rearing 20-40 mm fry in rearing ponds until they become 61-100 mm fingerlings.',
      details: [
        'Stocking density: 0.1 to 0.2 Million fry per Hectare.',
        'Apply organic manuring: 5–10 tonnes cow dung per Hectare per year (1/3 basal application, rest split in monthly doses) along with Urea (10 kg/Hectare) and Single Super Phosphate (SSP, 15 kg/Hectare).',
        'Feed daily at 3-5% of total biomass with floating or sinking crumbles (28-32% protein).',
        'Regularly sample weight to monitor growth and adjust feed quantities accordingly.',
      ],
    },
    {
      id: 's6',
      title: '6. Advanced Rearing (Fingerling to Yearling)',
      duration: '90–120 Days',
      survival: '80% – 90%',
      description: 'Growing 100 mm fingerlings to 101-200 mm advanced fingerlings or yearlings.',
      details: [
        'Ideal for stocking reservoirs or large-scale intensive farming (higher survival rates post-stocking).',
        'Stocking density: 20,000 to 30,000 fingerlings per Hectare.',
        'Allows farmers to stock yearlings during early spring to bypass winter slow-growth periods.',
      ],
    },
  ];

  const ytHatchery: YouTubeLinkItem[] = [
    { search_query: 'induced breeding of carp fish farming India circular hatchery', title: 'Induced Breeding & Spawning', hint: 'Step-by-step hormone injections and spawning' },
    { search_query: 'nursery pond preparation management spawn to fry India', title: 'Nursery Pond Management (Spawn to Fry)', hint: 'Pre-stocking pond preparation and feeding' },
    { search_query: 'fish hatchery design setup construction India cost', title: 'Carp Hatchery Design & Setup Cost', hint: 'Constructing breeding pools and hatching tubs' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Hatchery Learning Center" onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['lifecycle', 'pricing', 'videos', 'pitfalls'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabButton, activeTab === t && styles.tabButtonActive]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'lifecycle' ? 'Lifecycle' :
               t === 'pricing' ? 'CIFA & Market Rates' :
               t === 'videos' ? 'Tutorials' : 'Best Practices'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'lifecycle' && (
          <View style={styles.tabContent}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.infoCardText}>
                Hatchery management requires precise timing. Tap on any stage to see detailed recommendations.
              </Text>
            </View>

            {STAGES.map(stage => {
              const isExpanded = expandedStages[stage.id];
              return (
                <View key={stage.id} style={styles.stageCard}>
                  <TouchableOpacity
                    style={styles.stageCardHeader}
                    onPress={() => toggleStage(stage.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stageTitle}>{stage.title}</Text>
                      <View style={styles.stageMetaRow}>
                        <View style={styles.metaBadge}>
                          <Ionicons name="time-outline" size={11} color={theme.colors.textSecondary} />
                          <Text style={styles.metaBadgeText}>{stage.duration}</Text>
                        </View>
                        <View style={styles.metaBadge}>
                          <Ionicons name="heart-outline" size={11} color={theme.colors.textSecondary} />
                          <Text style={styles.metaBadgeText}>Survival: {stage.survival}</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.stageCardBody}>
                      <Text style={styles.stageDesc}>{stage.description}</Text>
                      <Text style={styles.bulletHeader}>Key Protocols:</Text>
                      {stage.details.map((bullet, idx) => (
                        <View key={idx} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{bullet}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'pricing' && (
          <View style={styles.tabContent}>
            <View style={styles.infoCard}>
              <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.infoCardText}>
                Official ICAR-CIFA Rates (June 2025) and average Bihar farmgate rates. Use these to benchmark your production inputs and sales.
              </Text>
            </View>

            {/* Species 1: Jayanti Rohu */}
            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Species: Jayanti Rohu (AhR)</Text>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 2 }]}>Stage / Size</Text>
                <Text style={[styles.tableCell, styles.cellHeader]}>ICAR-CIFA Rate</Text>
                <Text style={[styles.tableCell, styles.cellHeader]}>Bihar Market Avg</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Spawn (6-8 mm)</Text>
                <Text style={styles.tableCell}>₹1,500 / Lakh</Text>
                <Text style={styles.tableCell}>₹2,050 / Lakh</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fry (20-30 mm)</Text>
                <Text style={styles.tableCell}>₹300 / 1000</Text>
                <Text style={styles.tableCell}>₹400 / 1000</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fry (31-40 mm)</Text>
                <Text style={styles.tableCell}>₹750 / 1000</Text>
                <Text style={styles.tableCell}>₹900 / 1000</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fry (41-60 mm)</Text>
                <Text style={styles.tableCell}>₹2,500 / 1000</Text>
                <Text style={styles.tableCell}>₹3,000 / 1000</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fingerling (61-100 mm)</Text>
                <Text style={styles.tableCell}>₹7,500 / 1000</Text>
                <Text style={styles.tableCell}>₹8,500 / 1000</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fingerling (101-200 mm)</Text>
                <Text style={styles.tableCell}>₹15,000 / 1000</Text>
                <Text style={styles.tableCell}>₹17,000 / 1000</Text>
              </View>
            </View>

            {/* Species 2: CIFA Amrit Catla */}
            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Species: CIFA Amrit Catla</Text>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 2 }]}>Stage / Size</Text>
                <Text style={[styles.tableCell, styles.cellHeader]}>ICAR-CIFA Rate</Text>
                <Text style={[styles.tableCell, styles.cellHeader]}>Bihar Market Avg</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Spawn (6-8 mm)</Text>
                <Text style={styles.tableCell}>₹2,000 / Lakh</Text>
                <Text style={styles.tableCell}>₹2,094 / Lakh</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fry (20-30 mm)</Text>
                <Text style={styles.tableCell}>₹500 / 1000</Text>
                <Text style={styles.tableCell}>₹600 / 1000</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fry (31-40 mm)</Text>
                <Text style={styles.tableCell}>₹800 / 1000</Text>
                <Text style={styles.tableCell}>₹1,000 / 1000</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fry (41-60 mm)</Text>
                <Text style={styles.tableCell}>₹3,000 / 1000</Text>
                <Text style={styles.tableCell}>₹3,500 / 1000</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fingerling (61-100 mm)</Text>
                <Text style={styles.tableCell}>₹7,500 / 1000</Text>
                <Text style={styles.tableCell}>₹8,500 / 1000</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Fingerling (101-200 mm)</Text>
                <Text style={styles.tableCell}>₹15,000 / 1000</Text>
                <Text style={styles.tableCell}>₹17,000 / 1000</Text>
              </View>
            </View>

            {/* Other Products */}
            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Hatchery Medicines & Therapeutics</Text>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 2 }]}>Product</Text>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 2 }]}>Size / Dose</Text>
                <Text style={[styles.tableCell, styles.cellHeader]}>CIFA Price</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>CIFA-Brood-Vac (Broodstock Vaccine)</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>1 Vial (10 Doses)</Text>
                <Text style={styles.tableCell}>₹500 / vial</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'videos' && (
          <View style={styles.tabContent}>
            <View style={styles.infoCard}>
              <Ionicons name="play-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.infoCardText}>
                Learn hatchery setup, induced breeding, and nursery management visually. Tap on a video to launch.
              </Text>
            </View>
            {ytHatchery.map((video) => (
              <YouTubeCard key={video.title} item={video} />
            ))}
          </View>
        )}

        {activeTab === 'pitfalls' && (
          <View style={styles.tabContent}>
            <View style={[styles.infoCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <Ionicons name="warning-outline" size={20} color="#dc2626" />
              <Text style={[styles.infoCardText, { color: '#991b1b' }]}>
                Avoid these common operator pitfalls to protect your batches and maximize survival rates.
              </Text>
            </View>

            <View style={styles.bulletCard}>
              <Text style={styles.bulletCardTitle}>Critical Hatchery Pitfalls</Text>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: '#ef4444' }]}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: 'bold' }}>DO Deficit at 4 AM</Text>: Plankton blooms respire at night, consuming dissolved oxygen. Nursery ponds must run aerators from midnight until sunrise to prevent total crop loss.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: '#ef4444' }]}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: 'bold' }}>Predatory Insects</Text>: Backswimmers and water beetles feed voraciously on 6 mm spawn. Treat nursery ponds with soap-oil emulsion 24 hours before stocking.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: '#ef4444' }]}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: 'bold' }}>Broodstock Inbreeding</Text>: Breeding the same cohort repeatedly leads to genetic degeneration and high deformities. Exchange broodstock with certified centers (like ICAR-CIFA) every 2–3 years.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: '#ef4444' }]}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: 'bold' }}>Overstocking Spawn</Text>: Stocking spawn above 5 Million/Hectare increases disease susceptibility and stunts growth. Stick to benchmark densities.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => {
  const c = theme.colors;
  const r = theme.borderRadius ?? {};
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 16, gap: 14 },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingHorizontal: 8,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: {
      borderBottomColor: c.primary,
    },
    tabText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    tabTextActive: { color: c.primary },
    tabContent: { gap: 14 },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.primary + '12',
      borderWidth: 1,
      borderColor: c.primary + '30',
      borderRadius: r.lg ?? 14,
      padding: 14,
    },
    infoCardText: { fontSize: 12, color: c.textPrimary, flex: 1, lineHeight: 18, fontWeight: '500' },
    stageCard: {
      backgroundColor: c.surface,
      borderRadius: r.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 10,
      ...theme.shadows?.sm,
    },
    stageCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stageTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    stageMetaRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    metaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
    },
    metaBadgeText: { fontSize: 10, color: c.textSecondary, fontWeight: '700' },
    stageCardBody: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 12,
      gap: 8,
    },
    stageDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
    bulletHeader: { fontSize: 12, fontWeight: '800', color: c.textPrimary, marginTop: 4 },
    bulletRow: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
    bulletDot: { fontSize: 14, color: c.primary, fontWeight: '800' },
    bulletText: { fontSize: 12, color: c.textSecondary, flex: 1, lineHeight: 18 },
    tableCard: {
      backgroundColor: c.surface,
      borderRadius: r.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 10,
      ...theme.shadows?.sm,
    },
    tableTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary, marginBottom: 4 },
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
    tableCell: { flex: 1.2, fontSize: 11, color: c.textSecondary, fontWeight: '600' },
    cellHeader: { fontWeight: '800', color: c.textPrimary, fontSize: 11 },
    bulletCard: {
      backgroundColor: c.surface,
      borderRadius: r.lg ?? 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 12,
      ...theme.shadows?.sm,
    },
    bulletCardTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary, marginBottom: 2 },
  });
};
