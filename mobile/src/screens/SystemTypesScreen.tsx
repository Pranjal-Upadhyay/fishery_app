import React, { useState, useRef } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pre-load images at module level so Metro can statically resolve them
const IMG_RAS          = require('../../system_types/RAS.png');
const IMG_BIOFLOC      = require('../../system_types/biofloc.png');
const IMG_EARTHEN_POND = require('../../system_types/earthen_pond_system.png');
const IMG_CAGE         = require('../../system_types/cage_system.png');

// ─── System data ──────────────────────────────────────────────────────────────

interface CareItem {
  icon: string;
  label: string;
  text: string;
}

interface SystemData {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  category: string;
  accentColor: string;
  image: any;
  intro: string;
  howItWorks: string[];
  bestFish: { name: string; hindi: string; note: string }[];
  care: CareItem[];
}

const SYSTEMS: SystemData[] = [
  {
    id: 'ras',
    emoji: '🏢',
    name: 'Recirculating Aquaculture System',
    tagline: 'Advanced Indoor Farming 🐠',
    category: 'RAS',
    accentColor: '#3B82F6',
    image: IMG_RAS,
    intro:
      'Think of RAS as a modern, High-Tech Smart Home 🏠 for fish inside a room or a greenhouse shed! Instead of a traditional open field pond, fish live happily in large circular tanks. The coolest superpower of RAS? It cleans and recycles 90% to 95% of the water every single day! ♻️',
    howItWorks: [
      '🐟 Fish Comfort Tanks — Fish grow safely in a highly controlled, cozy environment.',
      '🧼 Super Filters (Bio-filters) — Dirty water exits the tank, enters smart filter machines. Friendly bacteria inside completely scrub away harmful gases and dirt!',
      '💨 Oxygen Booster — Fresh oxygen is constantly pumped into the sparkling clean water before it rushes back into the fish tanks!',
    ],
    bestFish: [
      { name: 'Pangasius', hindi: 'पंगासियस', note: 'Super tough fish that loves staying in groups! 💪' },
      { name: 'Tilapia (GIFT)', hindi: 'तिलापिया / गिफ्ट तिलापिया', note: 'Grows incredibly fast with amazing survival skills! 📈' },
      { name: 'Singhi / Magur', hindi: 'सिंघी / मागुर', note: 'Desi catfish that sell for great prices in local market! 💰' },
    ],
    care: [
      { icon: '⚡', label: 'Power Patrol', text: 'Water pumps and oxygen blowers must run 24/7. Always check your generator or solar backup battery! 🔋' },
      { icon: '🚿', label: 'Filter Flush', text: 'Give the mechanical filters a quick rinse daily to clear out trapped solid waste.' },
      { icon: '🧪', label: 'Water Check', text: 'Dip your digital testing meter into the water every morning to ensure oxygen levels are perfect before feeding!' },
    ],
  },
  {
    id: 'biofloc',
    emoji: '🟤',
    name: 'Biofloc Technology',
    tagline: 'Eco-Friendly Tank Farming 🧪',
    category: 'BFT',
    accentColor: '#8B5CF6',
    image: IMG_BIOFLOC,
    intro:
      'Biofloc is a magical farming style where we turn fish waste into free fish food! 🪄 The water here looks brownish and bubbly because it is packed with clouds of helpful, friendly microscopic organisms called "Floc"! 🦠',
    howItWorks: [
      '🍯 The Sweet Secret — Farmers mix a little bit of sugar or jaggery (Gur / गुड़) and special probiotic powder into the water.',
      '🍽️ Waste to Food — The friendly bacteria eat the fish waste and turn it into rich protein granules. The fish then eat these as a tasty snack!',
      '🫧 Continuous Bubbles — Air tubes at the bottom bubble the water non-stop so the bacteria and fish can breathe together.',
    ],
    bestFish: [
      { name: 'Tilapia', hindi: 'तिलापिया', note: 'The undisputed champion of Biofloc! They absolutely love munching on the protein floc. 😋' },
      { name: 'Pangasius', hindi: 'पंगासियस', note: 'Easily adapts to the thick, bubbling brown water. 🌊' },
      { name: 'Common Carp', hindi: 'कॉमन कार्प', note: 'A very stable, sturdy choice for backyard setups. 🏡' },
    ],
    care: [
      { icon: '🌬️', label: 'Bubbles On!', text: 'Never turn off the aeration system. The friendly bacteria need oxygen to survive and keep the water clean!' },
      { icon: '📐', label: 'Cone Test', text: 'Scoop up a water sample daily in a glass testing cone to check if the brown floc layer is at the perfect level.' },
      { icon: '🪵', label: 'Sweet Balance', text: "If the water's ammonia level goes up, simply add a splash of molasses/jaggery water to fix it instantly!" },
    ],
  },
  {
    id: 'earthen',
    emoji: '🚜',
    name: 'Earthen Pond Aquaculture',
    tagline: 'Traditional Open-Field Farming 🏞️',
    category: 'POND',
    accentColor: '#16A34A',
    image: IMG_EARTHEN_POND,
    intro:
      'This is the classic, time-tested natural way of fish farming across India! 🇮🇳 It simply means digging a beautifully planned pond right into your field. The natural mud and soil at the bottom work together to create an organic ecosystem for the fish. 🌎',
    howItWorks: [
      '☀️🌱 Sunlight Magic — Sunlight hits the natural pond water, growing tiny, healthy green plants (Phytoplankton) that fish love to graze on!',
      '🐂 Soil Energy — Farmers add natural organic manure (like cow dung) and lime (Chuna / चूना) to make the pond bed fertile and healthy.',
      '🔄 Modern Splash — To grow more fish today, we place floating Paddle Wheel Aerators inside the pond to trap oxygen from the air!',
    ],
    bestFish: [
      { name: 'Rohu + Catla + Mrigal', hindi: 'रोहू + कतला + मृगल', note: 'The genius IMC Polyculture! They live at different water depths so they never fight for food or space! 🤝' },
      { name: 'Freshwater Prawn', hindi: 'झींगा मछली', note: 'Can be added at the bottom layer for an extra high-value harvest! 🦐' },
    ],
    care: [
      { icon: '🧱', label: 'Wall Guard', text: 'Walk along the mud borders (Bunds) weekly to look for any leaks or damage from crabs or rats.' },
      { icon: '🎨', label: 'Color Check', text: 'Keep an eye on the water color. It should look a healthy light-green. If it turns too dark, skip feeding for a day!' },
      { icon: '⏰', label: 'Early Morning Splash', text: 'Run your paddle wheel aerators during the early morning hours (3 AM to 6 AM) when natural oxygen dips.' },
    ],
  },
  {
    id: 'cage',
    emoji: '🌊',
    name: 'Cage Aquaculture',
    tagline: 'Large Water Body Farming 🚣',
    category: 'CAGE',
    accentColor: '#0891B2',
    image: IMG_CAGE,
    intro:
      'No land? No problem! Cage farming means growing fish inside large floating net-rooms placed directly inside massive public water bodies like local fresh-water lakes, reservoirs, large rivers, or dams. 🏞️',
    howItWorks: [
      '🛢️ Floating Frames — Strong metal or heavy plastic pipe frames are kept floating on top of the lake using empty blue barrels.',
      '🕸️ The Net Room — A giant, durable mesh net hangs down from the frame into the deep water, keeping your fish safe and secure inside.',
      '💨 Natural Water Wash — The lake\'s natural water currents flow straight through the net, constantly bringing in fresh oxygen and carrying away fish waste naturally!',
    ],
    bestFish: [
      { name: 'Pangasius', hindi: 'पंगासियस', note: 'Grows beautifully heavy inside these cages, making bulk transport super easy! ⚖️' },
      { name: 'GIFT Tilapia', hindi: 'गिफ्ट तिलापिया', note: 'Grows into uniform sizes which wholesale merchants pay excellent prices for. 🏷️' },
      { name: 'Bekti / Sea Bass', hindi: 'भेड़की', note: 'An elite, premium choice grown in river-mouth areas for upscale markets! 🍽️' },
    ],
    care: [
      { icon: '🧹', label: 'Net Scrubbing', text: 'Algae and small lake weeds love to grow on the nets. Give them a nice brush-clean every 15 days so water keeps moving freely!' },
      { icon: '🌪️', label: 'Storm Check', text: 'Inspect the ropes, anchors, and frame bolts weekly to ensure strong winds or waves don\'t move your cages.' },
      { icon: '🦅', label: 'Bird Watch', text: 'Keep a light protective net zipped over the top of the cage to stop birds from swooping down and stealing your fish!' },
    ],
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SystemTypesScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const styles = getStyles(theme);
  const [activeSystem, setActiveSystem] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const system = SYSTEMS[activeSystem];

  const handleTabPress = (idx: number) => {
    setActiveSystem(idx);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Farming Systems" onBack={() => navigation.goBack()} />

      {/* ── Selector tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabsScroll}
      >
        {SYSTEMS.map((s, idx) => {
          const active = idx === activeSystem;
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.tab,
                active && { backgroundColor: s.accentColor, borderColor: s.accentColor },
              ]}
              onPress={() => handleTabPress(idx)}
              activeOpacity={0.8}
            >
              <Text style={styles.tabEmoji}>{s.emoji}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {s.category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Main scroll content ── */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Hero image */}
        <View style={[styles.imageContainer, { borderColor: system.accentColor + '40' }]}>
          <Image
            source={system.image}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Overlay badge */}
          <View style={[styles.imageBadge, { backgroundColor: system.accentColor }]}>
            <Text style={styles.imageBadgeText}>{system.category}</Text>
          </View>
        </View>

        {/* System name + tagline */}
        <View style={styles.titleBlock}>
          <Text style={styles.systemEmoji}>{system.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.systemName}>{system.name}</Text>
            <View style={[styles.categoryPill, { backgroundColor: system.accentColor + '20', borderColor: system.accentColor + '60' }]}>
              <Text style={[styles.categoryPillText, { color: system.accentColor }]}>
                {system.tagline}
              </Text>
            </View>
          </View>
        </View>

        {/* Intro */}
        <View style={styles.card}>
          <SectionLabel icon="information-circle-outline" label="What is it?" accentColor={system.accentColor} theme={theme} />
          <Text style={styles.bodyText}>{system.intro}</Text>
        </View>

        {/* How it works */}
        <View style={styles.card}>
          <SectionLabel icon="settings-outline" label="How It Works ⚙️" accentColor={system.accentColor} theme={theme} />
          {system.howItWorks.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: system.accentColor + '20' }]}>
                <Text style={[styles.stepNumText, { color: system.accentColor }]}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Best fish */}
        <View style={styles.card}>
          <SectionLabel icon="fish-outline" label="Best Fish for This System 🐟" accentColor={system.accentColor} theme={theme} />
          {system.bestFish.map((fish, i) => (
            <View key={i} style={[styles.fishCard, { borderLeftColor: system.accentColor }]}>
              <View style={styles.fishNameRow}>
                <Text style={styles.fishName}>{fish.name}</Text>
                <Text style={[styles.fishHindi, { color: system.accentColor }]}>{fish.hindi}</Text>
              </View>
              <Text style={styles.fishNote}>{fish.note}</Text>
            </View>
          ))}
        </View>

        {/* Daily care */}
        <View style={styles.card}>
          <SectionLabel icon="construct-outline" label="Daily Maintenance & Care 🛠️" accentColor={system.accentColor} theme={theme} />
          {system.care.map((item, i) => (
            <View key={i} style={[styles.careCard, { backgroundColor: system.accentColor + '10', borderColor: system.accentColor + '30' }]}>
              <Text style={styles.careEmoji}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.careLabel, { color: system.accentColor }]}>{item.label}</Text>
                <Text style={styles.careText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Navigation dots */}
        <View style={styles.dotsRow}>
          {SYSTEMS.map((s, i) => (
            <TouchableOpacity key={s.id} onPress={() => handleTabPress(i)}>
              <View
                style={[
                  styles.dot,
                  i === activeSystem
                    ? { backgroundColor: system.accentColor, width: 20 }
                    : { backgroundColor: theme.colors.border },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Prev / Next nav */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, activeSystem === 0 && styles.navBtnDisabled]}
            onPress={() => handleTabPress(Math.max(0, activeSystem - 1))}
            disabled={activeSystem === 0}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color={activeSystem === 0 ? theme.colors.textMuted : theme.colors.textPrimary} />
            <Text style={[styles.navBtnText, activeSystem === 0 && styles.navBtnTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnPrimary, { backgroundColor: system.accentColor }, activeSystem === SYSTEMS.length - 1 && styles.navBtnDisabled]}
            onPress={() => handleTabPress(Math.min(SYSTEMS.length - 1, activeSystem + 1))}
            disabled={activeSystem === SYSTEMS.length - 1}
            activeOpacity={0.8}
          >
            <Text style={[styles.navBtnText, { color: '#fff' }]}>
              {activeSystem === SYSTEMS.length - 1 ? 'Done! ✅' : 'Next System'}
            </Text>
            {activeSystem < SYSTEMS.length - 1 && (
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({
  icon, label, accentColor, theme,
}: { icon: any; label: string; accentColor: string; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: accentColor + '20', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={14} color={accentColor} />
      </View>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800', flex: 1 }}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: 16, paddingBottom: 100 },

    // Tabs
    tabsScroll: {
      maxHeight: 60,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    tabsContainer: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
    },
    tabEmoji: { fontSize: 14 },
    tabLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      letterSpacing: 0.5,
    },
    tabLabelActive: { color: '#fff' },

    // Hero image
    imageContainer: {
      marginTop: 16,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 2,
      height: 220,
      position: 'relative',
      ...theme.shadows?.md,
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    imageBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 12,
    },
    imageBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },

    // Title block
    titleBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginTop: 16,
      marginBottom: 4,
    },
    systemEmoji: { fontSize: 32, marginTop: 2 },
    systemName: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
      lineHeight: 26,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    categoryPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    categoryPillText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
    },

    // Cards
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginTop: 12,
      ...theme.shadows?.sm,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
    },

    // Steps
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 10,
    },
    stepNum: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1,
    },
    stepNumText: { fontSize: 12, fontWeight: '800' },
    stepText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },

    // Fish cards
    fishCard: {
      borderLeftWidth: 3,
      paddingLeft: 12,
      marginBottom: 10,
    },
    fishNameRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      flexWrap: 'wrap',
    },
    fishName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    fishHindi: {
      fontSize: 12,
      fontWeight: '600',
    },
    fishNote: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 2,
    },

    // Care cards
    careCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      marginBottom: 8,
    },
    careEmoji: { fontSize: 20, marginTop: 2 },
    careLabel: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 3,
    },
    careText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },

    // Navigation
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 24,
    },
    dot: {
      height: 6,
      borderRadius: 3,
      width: 6,
    },
    navRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    navBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    navBtnPrimary: {
      borderWidth: 0,
    },
    navBtnDisabled: {
      opacity: 0.35,
    },
    navBtnText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    navBtnTextDisabled: {
      color: theme.colors.textMuted,
    },
  });
