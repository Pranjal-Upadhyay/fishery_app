import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { resolveDiseaseImage } from '../utils/diseaseImages';

function Section({ title, items, theme, styles }: any) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item: string) => (
        <Text key={item} style={styles.bullet}>• {item}</Text>
      ))}
    </View>
  );
}

export default function DiseaseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const disease = route.params?.disease;
  const [imageError, setImageError] = useState(false);

  if (!disease) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Disease Detail" onBack={() => navigation.goBack()} />
        <View style={styles.empty}><Text style={styles.emptyText}>No disease data found.</Text></View>
      </SafeAreaView>
    );
  }

  const imgUri = resolveDiseaseImage({
    slug: disease.slug,
    category: disease.category,
    image_url: disease.image_url,
  });

  const severityColor =
    disease.severity === 'HIGH' ? theme.colors.error
    : disease.severity === 'MEDIUM' ? theme.colors.accent
    : theme.colors.success;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={disease.name} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero Image */}
        {imgUri && !imageError ? (
          <Image
            source={{ uri: imgUri }}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.heroImageFallback}>
            <Ionicons name="bug-outline" size={54} color={theme.colors.primary} />
            <Text style={styles.heroImageFallbackText}>{disease.category}</Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroMeta}>{disease.category}</Text>
            <View style={[styles.severityBadge, { backgroundColor: `${severityColor}22` }]}>
              <Ionicons
                name={disease.severity === 'HIGH' ? 'alert-circle' : disease.severity === 'MEDIUM' ? 'warning' : 'information-circle'}
                size={12}
                color={severityColor}
              />
              <Text style={[styles.severityText, { color: severityColor }]}>{disease.severity} RISK</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{disease.name}</Text>
          {disease.mortality_rate != null && (
            <Text style={styles.heroBody}>Mortality risk: <Text style={{ color: theme.colors.error, fontWeight: '800' }}>{disease.mortality_rate}%</Text></Text>
          )}
          <Text style={styles.heroBody}>Affected species: {(disease.affected_species || []).join(', ') || 'Not specified'}</Text>
          {(disease.seasonality || []).length > 0 && (
            <View style={styles.seasonRow}>
              <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
              <Text style={styles.seasonText}>Season: {disease.seasonality.join(', ')}</Text>
            </View>
          )}
        </View>

        <Section title="Symptoms" items={disease.symptoms} theme={theme} styles={styles} />
        <Section title="Causes" items={disease.causes} theme={theme} styles={styles} />
        <Section title="Prevention" items={disease.prevention} theme={theme} styles={styles} />
        <Section title="Treatment" items={disease.treatment} theme={theme} styles={styles} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 120 },
  heroImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  heroImageFallback: {
    width: '100%',
    height: 220,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroImageFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroCard: {
    margin: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroMeta: { color: theme.colors.primary, fontWeight: '800', fontSize: 12 },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  severityText: { fontWeight: '800', fontSize: 11 },
  heroTitle: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 22, marginTop: 4 },
  heroBody: { color: theme.colors.textSecondary, marginTop: 8, lineHeight: 21 },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  seasonText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
  },
  sectionTitle: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 16, marginBottom: 8 },
  bullet: { color: theme.colors.textSecondary, lineHeight: 22, marginBottom: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: theme.colors.textMuted },
});
