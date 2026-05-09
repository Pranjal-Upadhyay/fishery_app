import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';

export default function PolicyGuidanceScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const knowledgeInsights = route.params?.knowledgeInsights;
  const stateCode = route.params?.stateCode;
  const farmerCategory = route.params?.farmerCategory;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    meaning: true,
    planning: false,
    disclaimer: false,
  });

  const toggleSection = (key: string) =>
    setExpandedSections(cur => ({ ...cur, [key]: !cur[key] }));

  const beneficiarySubsidyText =
    knowledgeInsights?.beneficiarySubsidyPercent != null
      ? `${knowledgeInsights.beneficiarySubsidyPercent}%`
      : 'Not available yet';
  const fundingPatternText =
    knowledgeInsights?.fundingShare?.centralPercent != null &&
    knowledgeInsights?.fundingShare?.statePercent != null
      ? `${knowledgeInsights.fundingShare.centralPercent}:${knowledgeInsights.fundingShare.statePercent}`
      : 'Not available yet';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title="Policy Guidance"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header card ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>GOVERNMENT-BACKED EXPLANATION</Text>
          <Text style={styles.heroTitle}>What these subsidy numbers mean</Text>
          <Text style={styles.heroSubtitle}>
            This page translates the seeded government and institutional rules into plain language for new business starters.
          </Text>
        </View>

        {/* ── Your current preview ── */}
        <SectionLabel label="YOUR CURRENT PREVIEW" theme={theme} />
        <View style={styles.previewGrid}>
          <PreviewCell label="State" value={stateCode || 'Not selected'} theme={theme} />
          <PreviewCell label="Farmer Category" value={farmerCategory || 'Not selected'} theme={theme} />
          <PreviewCell
            label="Beneficiary Subsidy"
            value={beneficiarySubsidyText}
            valueColor={theme.colors.primary}
            theme={theme}
          />
          <PreviewCell
            label="Funding Pattern"
            value={fundingPatternText}
            valueColor={theme.colors.secondary}
            theme={theme}
          />
        </View>

        {/* ── Policy cards with colored left border ── */}
        {knowledgeInsights?.beneficiarySubsidyPercent != null && (
          <>
            <SectionLabel label="SCHEME SUMMARY" theme={theme} />
            <View style={[styles.schemeCard, { borderLeftColor: theme.colors.primary }]}>
              <View style={styles.schemeCardTop}>
                <View style={styles.schemeIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.schemeCardInfo}>
                  <Text style={styles.schemeName}>PMMSY — PM Matsya Sampada Yojana</Text>
                  <Text style={styles.schemeEligibility}>
                    {farmerCategory === 'GENERAL' ? 'General category applicant' : `${farmerCategory} category applicant`} — eligible for subsidy support
                  </Text>
                </View>
                <Text style={[styles.schemePercent, { color: theme.colors.primary }]}>
                  {beneficiarySubsidyText}
                </Text>
              </View>
            </View>

            {knowledgeInsights?.fundingShare?.centralPercent != null && (
              <View style={[styles.schemeCard, { borderLeftColor: theme.colors.secondary }]}>
                <View style={styles.schemeCardTop}>
                  <View style={[styles.schemeIconWrap, { backgroundColor: theme.colors.secondaryLight }]}>
                    <Ionicons name="flag-outline" size={18} color={theme.colors.secondary} />
                  </View>
                  <View style={styles.schemeCardInfo}>
                    <Text style={styles.schemeName}>Centre : State Funding Split</Text>
                    <Text style={styles.schemeEligibility}>
                      How the government subsidy is shared between Central and State governments
                    </Text>
                  </View>
                  <Text style={[styles.schemePercent, { color: theme.colors.secondary }]}>
                    {fundingPatternText}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Accordion sections ── */}
        <SectionLabel label="GUIDANCE ARTICLES" theme={theme} />

        <AccordionItem
          sectionKey="meaning"
          title="Simple meaning"
          icon="information-circle-outline"
          expanded={expandedSections.meaning}
          onToggle={toggleSection}
          theme={theme}
        >
          <Text style={styles.bodyText}>
            <Text style={styles.bodyBold}>Beneficiary subsidy</Text> tells you the maximum part of the approved project cost that the government may support for your category.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            <Text style={styles.bodyBold}>Funding pattern</Text> tells you how the government subsidy is split between the Centre and the State. It does not mean you only pay the remaining number shown there.
          </Text>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleTitle}>Example</Text>
            <Text style={styles.exampleText}>
              If your subsidy is 40% and the funding pattern is 60:40, the total subsidy is still 40% for you — but that subsidy is jointly funded by Centre and State in a 60:40 ratio.
            </Text>
          </View>
        </AccordionItem>

        <AccordionItem
          sectionKey="planning"
          title="How to use this in planning"
          icon="bulb-outline"
          expanded={expandedSections.planning}
          onToggle={toggleSection}
          theme={theme}
        >
          {[
            'Use the subsidy preview as a planning guide, not a guaranteed sanction amount.',
            'Bank loans, state release timing, and project approval can still affect the actual amount and timing.',
            'If the app shows state-specific benchmarks, those are useful for budgeting — especially pond development and system setup costs.',
            'If the app shows warnings or disclaimer notes, update feed price, sale price, and local market assumptions before making a business decision.',
          ].map((text, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </AccordionItem>

        {knowledgeInsights?.disclaimerHighlights?.length ? (
          <AccordionItem
            sectionKey="disclaimer"
            title="Important disclaimer"
            icon="alert-circle-outline"
            expanded={expandedSections.disclaimer}
            onToggle={toggleSection}
            theme={theme}
            accentColor={theme.colors.accent}
          >
            {knowledgeInsights.disclaimerHighlights.map((item: any) => (
              <Text key={item.idSlug} style={styles.bodyText}>
                {item.citationText || item.notes || item.metricName}
              </Text>
            ))}
          </AccordionItem>
        ) : null}

        {/* ── Document-backed assumptions ── */}
        {knowledgeInsights?.templateHighlights?.length ? (
          <>
            <SectionLabel label="DOCUMENT-BACKED ASSUMPTIONS" theme={theme} />
            {knowledgeInsights.templateHighlights.map((item: any) => (
              <PolicyDataCard key={item.idSlug} item={item} theme={theme} />
            ))}
          </>
        ) : null}

        {/* ── Learn center link ── */}
        <TouchableOpacity
          style={styles.learnCard}
          onPress={() =>
            navigation.navigate('LearningCenter', {
              knowledgeInsights,
              stateCode,
              farmerCategory,
            })
          }
          activeOpacity={0.85}
        >
          <View style={styles.learnCardLeft}>
            <View style={styles.learnCardIcon}>
              <Ionicons name="school-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.learnCardCopy}>
              <Text style={styles.learnCardTitle}>Need the beginner version?</Text>
              <Text style={styles.learnCardText}>
                Open Learning Center for simple explanations of FCR, BCR, subsidy, capital, and land planning.
              </Text>
            </View>
          </View>
          <View style={styles.learnCardArrow}>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
          </View>
        </TouchableOpacity>

        {/* ── Apply / info outline button ── */}
        {knowledgeInsights?.beneficiarySubsidyPercent != null && (
          <TouchableOpacity style={styles.applyButton} activeOpacity={0.85}>
            <Ionicons name="open-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.applyButtonText}>View PMMSY Application Info</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: number | null | undefined, unit?: string | null) {
  if (value == null) return 'N/A';
  switch (unit) {
    case 'PERCENT': return `${value}%`;
    case 'INR': return `Rs ${value.toLocaleString('en-IN')}`;
    case 'INR_PER_KG': return `Rs ${value}/kg`;
    case 'INR_PER_HA': return `Rs ${value.toLocaleString('en-IN')}/ha`;
    case 'FISH_PER_CUBIC_METER': return `${value} fish/m3`;
    case 'FINGERLINGS_PER_HA': return `${value.toLocaleString('en-IN')} fingerlings/ha`;
    case 'MONTH': return `${value} months`;
    case 'RATIO': return `${value}`;
    default: return `${value}`;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: any) {
  const styles = getStyles(theme);
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function PreviewCell({ label, value, valueColor, theme }: any) {
  const styles = getStyles(theme);
  return (
    <View style={styles.previewCell}>
      <Text style={styles.previewCellLabel}>{label}</Text>
      <Text style={[styles.previewCellValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

function AccordionItem({
  sectionKey,
  title,
  icon,
  expanded,
  onToggle,
  children,
  theme,
  accentColor,
}: any) {
  const styles = getStyles(theme);
  const color = accentColor || theme.colors.primary;
  return (
    <View style={styles.accordionItem}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => onToggle(sectionKey)}
        activeOpacity={0.8}
      >
        <View style={[styles.accordionIconWrap, { backgroundColor: accentColor ? theme.colors.accentSoft : theme.colors.primaryLight }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.accordionTitle, expanded && { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.accordionBody}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

function PolicyDataCard({ item, theme }: any) {
  const styles = getStyles(theme);
  return (
    <View style={styles.policyDataCard}>
      <View style={styles.policyDataCardTop}>
        <Text style={styles.policyDataCardTitle}>{item.metricName}</Text>
        {item.numericValue != null && (
          <Text style={styles.policyDataCardValue}>
            {formatValue(item.numericValue, item.unit)}
          </Text>
        )}
      </View>
      {item.notes || item.sourceLabel ? (
        <Text style={styles.policyDataCardMeta}>{item.notes || item.sourceLabel}</Text>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (theme: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 120 },

  // Hero
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 20,
  },
  heroEyebrow: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 28,
  },
  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  // Section label
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
    marginTop: 4,
  },

  // Preview grid
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  previewCell: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  previewCellLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  previewCellValue: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },

  // Scheme cards
  schemeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  schemeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  schemeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  schemeCardInfo: {
    flex: 1,
  },
  schemeName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  schemeEligibility: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  schemePercent: {
    fontSize: 22,
    fontWeight: '900',
    flexShrink: 0,
  },

  // Accordion
  accordionItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  accordionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accordionTitle: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGlass,
    gap: 8,
  },

  // Body text
  bodyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  bodyBold: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },

  // Example box
  exampleBox: {
    marginTop: 10,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  exampleTitle: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  exampleText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  // Bullet list
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  // Policy data cards
  policyDataCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  policyDataCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  policyDataCardTitle: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  policyDataCardValue: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  policyDataCardMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  // Learn card
  learnCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  learnCardLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  learnCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  learnCardCopy: { flex: 1 },
  learnCardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  learnCardText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  learnCardArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Apply / info button
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  applyButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
