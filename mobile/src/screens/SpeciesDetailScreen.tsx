import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import YouTubeCard, { YouTubeLinkItem } from '../components/YouTubeCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { getSpeciesImageUri } from '../utils/speciesImages';

export default function SpeciesDetailScreen() {
  const { t, i18n } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { speciesData } = route.params as any;
  const { theme } = useTheme();
  const styles = getStyles(theme);

  if (!speciesData) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="fish-outline" size={48} color={theme.colors.textMuted} />
        <Text style={styles.emptyText}>{t('species.noData')}</Text>
      </View>
    );
  }

  const d = speciesData.data || {};
  const params = d.biological_parameters || {};
  const econ = d.economic_parameters || {};
  const currentLang = i18n.language || 'en';
  const enName = d.common_names?.en;
  const translatedName = enName ? t(`species.names.${enName}`, { defaultValue: '' }) : '';
  const commonName = translatedName || d.common_names?.[currentLang] || enName || d.scientific_name;
  const heroImageUri = getSpeciesImageUri(d.scientific_name, d.image_url);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Full-width hero image (220px) with gradient at bottom */}
        <View style={styles.heroWrapper}>
          {heroImageUri ? (
            <Image source={heroImageUri} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroFallback}>
              <Ionicons name="fish" size={64} color={theme.colors.primary} />
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => (navigation as any).goBack()}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          {/* Gradient overlay — bottom section with species name */}
          <View style={styles.heroGradient}>
            <View style={styles.heroTextBlock}>
              {d.category ? (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{(d.category || '').replace(/_/g, ' ')}</Text>
                </View>
              ) : null}
              <Text style={styles.heroName}>{commonName}</Text>
              <Text style={styles.heroScientific}>({d.scientific_name})</Text>
            </View>
          </View>
        </View>

        {/* Description card */}
        {d.description ? (
          <View style={styles.descCard}>
            <Text style={styles.sectionLabel}>{t('species.about')}</Text>
            <Text style={styles.descText}>{d.description}</Text>
          </View>
        ) : null}

        {/* Biological Parameters */}
        <InfoSection title={t('species.biologicalParameters') || 'BIOLOGICAL PARAMETERS'} styles={styles} theme={theme}>
          <ParamRow
            icon="thermometer-outline"
            label={t('species.temperature')}
            value={`${params.temperature_celsius?.min ?? '–'}°C – ${params.temperature_celsius?.max ?? '–'}°C`}
            theme={theme}
            styles={styles}
          />
          <ParamRow
            icon="water-outline"
            label={t('species.dissolvedOxygen')}
            value={`> ${params.dissolved_oxygen_mg_l?.min ?? params.min_do ?? '5.0'} mg/L`}
            theme={theme}
            styles={styles}
          />
          <ParamRow
            icon="flask-outline"
            label={t('species.ph')}
            value={`${params.ph_range?.min ?? '6.5'} – ${params.ph_range?.max ?? '8.5'}`}
            theme={theme}
            styles={styles}
          />
          <ParamRow
            icon="water"
            label={t('species.salinity')}
            value={`${params.salinity_tolerance_ppt?.min ?? 0} – ${params.salinity_tolerance_ppt?.max ?? 5} ppt`}
            theme={theme}
            styles={styles}
            last
          />
        </InfoSection>

        {/* Water Quality — Ammonia / Nitrite if available */}
        {(params.ammonia_mg_l != null || params.nitrite_mg_l != null) ? (
          <InfoSection title={t('waterQuality.title')} styles={styles} theme={theme}>
            {params.ammonia_mg_l != null ? (
              <ParamRow
                icon="warning-outline"
                label={t('waterQuality.ammonia')}
                value={`< ${params.ammonia_mg_l} mg/L`}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {params.nitrite_mg_l != null ? (
              <ParamRow
                icon="alert-circle-outline"
                label={t('waterQuality.nitrite')}
                value={`< ${params.nitrite_mg_l} mg/L`}
                theme={theme}
                styles={styles}
                last
              />
            ) : null}
          </InfoSection>
        ) : null}

        {/* Economic Parameters */}
        <InfoSection title={t('species.economicParameters') || 'ECONOMIC PROJECTIONS'} styles={styles} theme={theme}>
          {d.excel_economics ? (
            <>
              <ParamRow
                icon="cash-outline"
                label={t('species.marketPrice')}
                value={`₹${d.excel_economics.market_price_inr_kg}/kg`}
                theme={theme}
                styles={styles}
              />
              <ParamRow
                icon="time-outline"
                label="Culture Duration"
                value={`${d.excel_economics.culture_period_months} months`}
                theme={theme}
                styles={styles}
              />
              <ParamRow
                icon="analytics-outline"
                label="Typical Survival"
                value={`${d.excel_economics.harvest_survival_percent}%`}
                theme={theme}
                styles={styles}
              />
              <ParamRow
                icon="business-outline"
                label="CAPEX"
                value={`₹${d.excel_economics.capital_investment_lakh_ha} Lakh / Ha`}
                theme={theme}
                styles={styles}
                last
              />
            </>
          ) : (
            <>
              <ParamRow
                icon="nutrition-outline"
                label={t('species.feedConversionRatio')}
                value={`${econ.feed_conversion_ratio?.min ?? 1.2} – ${econ.feed_conversion_ratio?.max ?? 1.8}`}
                theme={theme}
                styles={styles}
              />
              <ParamRow
                icon="trending-up-outline"
                label={t('species.expectedYield')}
                value={`${econ.expected_yield_mt_per_acre?.min ?? 3}–${econ.expected_yield_mt_per_acre?.max ?? 5} MT/Acre`}
                theme={theme}
                styles={styles}
              />
              <ParamRow
                icon="cash-outline"
                label={t('species.marketPrice')}
                value={`₹${econ.market_price_per_kg_inr?.min ?? 100}–${econ.market_price_per_kg_inr?.max ?? 150}/kg`}
                theme={theme}
                styles={styles}
              />
              <ParamRow
                icon="time-outline"
                label={t('species.culturePeriod')}
                value={`${d.culture_period_months?.min ?? 8}–${d.culture_period_months?.max ?? 10} months`}
                theme={theme}
                styles={styles}
                last
              />
            </>
          )}
        </InfoSection>

        {/* Seasonality */}
        {(d.best_stocking_months?.length || d.harvest_months?.length) ? (
          <InfoSection title={t('species.seasonality')} styles={styles} theme={theme}>
            {d.best_stocking_months?.length ? (
              <View style={styles.tagSection}>
                <Text style={styles.tagSectionLabel}>{t('species.bestStockingMonths')}</Text>
                <View style={styles.tagsRow}>
                  {d.best_stocking_months.map((m: string, i: number) => (
                    <View key={i} style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {d.harvest_months?.length ? (
              <View style={[styles.tagSection, styles.tagSectionBorder]}>
                <Text style={styles.tagSectionLabel}>{t('species.harvestMonths')}</Text>
                <View style={styles.tagsRow}>
                  {d.harvest_months.map((m: string, i: number) => (
                    <View key={i} style={[styles.tagBadge, styles.tagBadgeAccent]}>
                      <Text style={[styles.tagBadgeText, styles.tagBadgeTextAccent]}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </InfoSection>
        ) : null}

        {/* Optimal Systems */}
        {d.optimal_systems?.length ? (
          <InfoSection title={t('species.optimalSystems')} styles={styles} theme={theme}>
            <View style={styles.systemsRow}>
              {d.optimal_systems.map((s: string, idx: number) => (
                <View key={idx} style={styles.systemBadge}>
                  <Text style={styles.systemBadgeText}>{s.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </InfoSection>
        ) : null}

        {/* Breeding Guide */}
        {d.breeding_guide ? (
          <View style={[styles.section, { marginTop: 18 }]}>
            <Text style={styles.sectionTitle}>{t('species.howToRaise')}</Text>
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <Text style={styles.sectionCardHeaderText}>{t('species.breedingGuide')}</Text>
              </View>
              <View style={styles.sectionCardBody}>
                {/* Overview */}
                {d.breeding_guide.overview ? (
                  <View style={styles.breedingOverview}>
                    <Text style={styles.breedingOverviewText}>{d.breeding_guide.overview}</Text>
                  </View>
                ) : null}

                {/* Steps */}
                {d.breeding_guide.steps?.length ? (
                  <View style={styles.breedingSteps}>
                    <Text style={styles.breedingStepsTitle}>{t('species.stepByStep')}</Text>
                    {d.breeding_guide.steps.map((step: string, i: number) => (
                      <View key={i} style={styles.breedingStep}>
                        <View style={styles.stepNum}>
                          <Text style={styles.stepNumText}>{i + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Timeline */}
                {d.breeding_guide.timeline ? (
                  <View style={styles.breedingTimeline}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.breedingTimelineText}>{d.breeding_guide.timeline}</Text>
                  </View>
                ) : null}

                {/* Beginner tip */}
                {d.breeding_guide.beginner_tip ? (
                  <View style={styles.breedingTip}>
                    <Text style={styles.breedingTipText}>{d.breeding_guide.beginner_tip}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* YouTube Watch & Learn */}
        {d.youtube_links?.length ? (
          <View style={[styles.section, { marginTop: 18 }]}>
            <Text style={styles.sectionTitle}>{t('species.watchAndLearn')}</Text>
            <View style={{ gap: 0 }}>
              {d.youtube_links.map((link: YouTubeLinkItem, i: number) => (
                <YouTubeCard key={i} item={link} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoSection({ title, styles, theme, children }: {
  title: string;
  styles: any;
  theme: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {/* Section header: uppercase, textMuted, letterSpacing 2, fontSize 11, fontWeight 700 */}
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {/* Card with surfaceAlt header row implied by card bg + border */}
      <View style={styles.sectionCard}>
        {/* surfaceAlt header row */}
        <View style={styles.sectionCardHeader}>
          <Text style={styles.sectionCardHeaderText}>{title.toUpperCase()}</Text>
        </View>
        <View style={styles.sectionCardBody}>{children}</View>
      </View>
    </View>
  );
}

function ParamRow({ icon, label, value, theme, styles, last }: {
  icon: any;
  label: string;
  value: string;
  theme: any;
  styles: any;
  last?: boolean;
}) {
  return (
    <View style={[styles.paramRow, last && styles.paramRowLast]}>
      <View style={styles.paramIconWrap}>
        <Ionicons name={icon} size={15} color={theme.colors.primary} />
      </View>
      {/* label in textMuted */}
      <Text style={styles.paramLabel}>{label}</Text>
      {/* value in textPrimary bold, letterSpacing 0.5 */}
      <Text style={styles.paramValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (theme: any) => StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 110 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    gap: 12,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },

  // ── Hero (220px) ───────────────────────────────────────────────────────────
  heroWrapper: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.isDark ? 'rgba(11,19,38,0.65)' : 'rgba(14,25,50,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  // Gradient overlay — bottom portion of hero
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: theme.isDark ? 'rgba(11,19,38,0.72)' : 'rgba(14,25,50,0.62)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heroTextBlock: {
    gap: 4,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.secondaryLight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  heroBadgeText: {
    color: theme.colors.secondary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroName: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroScientific: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    fontSize: 13,
    marginTop: 2,
  },

  // ── Description card ───────────────────────────────────────────────────────
  descCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  // Reused section label (ABOUT header inside descCard)
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  descText: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
    fontSize: 14,
    padding: 16,
  },

  // ── Info sections ──────────────────────────────────────────────────────────
  section: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  // Section header: uppercase, textMuted, letterSpacing 2, fontSize 11, fontWeight 700
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  // surfaceAlt header row at top of each section card
  sectionCardHeader: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionCardHeaderText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionCardBody: {
    // No additional padding — paramRows handle their own
  },

  // ── Parameter rows ─────────────────────────────────────────────────────────
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  paramRowLast: {
    borderBottomWidth: 0,
  },
  paramIconWrap: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // label in textMuted
  paramLabel: {
    flex: 1,
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  // value in textPrimary bold, monospace-style letterSpacing 0.5
  paramValue: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
    maxWidth: '48%',
    textAlign: 'right',
  },

  // ── Seasonality tags ───────────────────────────────────────────────────────
  tagSection: {
    padding: 14,
    gap: 8,
  },
  tagSectionBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tagSectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  tagBadgeAccent: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  tagBadgeText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  tagBadgeTextAccent: {
    color: theme.colors.accent,
  },

  // ── Breeding guide ─────────────────────────────────────────────────────────
  breedingOverview: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breedingOverviewText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  breedingSteps: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  breedingStepsTitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  breedingStep: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  breedingTimeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breedingTimelineText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  breedingTip: {
    backgroundColor: theme.colors.primaryLight,
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary,
    padding: 14,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
  },
  breedingTipText: {
    color: theme.colors.primary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },

  // ── Optimal systems ────────────────────────────────────────────────────────
  systemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  systemBadge: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  systemBadgeText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'capitalize',
  },
});
