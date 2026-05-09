import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import ScreenHeader from '../components/ScreenHeader';

export default function EconomicsResultScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { simulationData } = route.params as any;
  const [expandedSpecies, setExpandedSpecies] = useState<Record<string, boolean>>({});

  if (!simulationData) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top']}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>No simulation data available.</Text>
      </SafeAreaView>
    );
  }

  const formatCurrency = (amount: number) => `Rs ${amount.toLocaleString('en-IN')}`;
  const knowledgeInsights = simulationData.knowledgeInsights;

  const openPolicyGuidance = () =>
    (navigation as any).navigate('PolicyGuidance', { knowledgeInsights });

  // Determine profit color
  const profit = simulationData.projectedNetProfitInr ?? 0;
  const isProfit = profit >= 0;
  const profitColor = isProfit ? theme.colors.secondary : theme.colors.error;

  // Surplus/deficit
  const surplus =
    simulationData.availableCapitalInr != null
      ? simulationData.availableCapitalInr - simulationData.totalProjectCostInr
      : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title={t('economics.results') || 'ROI Results'}
        onBack={() => (navigation as any).goBack()}
        rightSlot={
          <TouchableOpacity onPress={openPolicyGuidance}>
            <Text style={styles.helpLink}>Guide</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero result card ── */}
        <View style={styles.heroCard}>
          {/* Gradient backdrop simulation via layered views */}
          <View style={styles.heroGradientTop} />
          <View style={styles.heroGradientBottom} />

          <Text style={styles.heroEyebrow}>PROJECT VIABILITY</Text>

          <View style={styles.heroProfitRow}>
            <Text style={[styles.heroProfitValue, { color: profitColor }]}>
              {formatCurrency(profit)}
            </Text>
            <View style={[styles.heroProfitBadge, { backgroundColor: isProfit ? theme.colors.secondaryLight : theme.colors.errorSoft }]}>
              <Ionicons
                name={isProfit ? 'trending-up' : 'trending-down'}
                size={14}
                color={profitColor}
              />
              <Text style={[styles.heroProfitBadgeText, { color: profitColor }]}>
                {isProfit ? 'PROFIT' : 'LOSS'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroProfitLabel}>Projected net profit</Text>

          <View style={styles.heroDivider} />

          {/* BCR + Breakeven as a mini bento row */}
          <View style={styles.heroBentoRow}>
            <View style={styles.heroBentoItem}>
              <Text style={styles.heroBentoValue}>{simulationData.benefitCostRatio}</Text>
              <Text style={styles.heroBentoLabel}>BCR</Text>
            </View>
            <View style={styles.heroBentoDivider} />
            <View style={styles.heroBentoItem}>
              <Text style={styles.heroBentoValue}>{simulationData.breakevenTimelineMonths}mo</Text>
              <Text style={styles.heroBentoLabel}>Breakeven</Text>
            </View>
            <View style={styles.heroBentoDivider} />
            <View style={styles.heroBentoItem}>
              <Text style={styles.heroBentoValue}>{formatCurrency(simulationData.subsidyAmountInr)}</Text>
              <Text style={styles.heroBentoLabel}>Subsidy</Text>
            </View>
          </View>
        </View>

        {/* ── 4-col metric bento grid ── */}
        <View style={styles.bentoGrid}>
          <BentoCard
            label="EST. REVENUE"
            value={formatCurrency(simulationData.totalCapitalExpenditureInr)}
            icon="trending-up-outline"
            valueColor={theme.colors.primary}
            theme={theme}
          />
          <BentoCard
            label="TOTAL COST"
            value={formatCurrency(simulationData.totalProjectCostInr)}
            icon="receipt-outline"
            valueColor={theme.colors.error}
            theme={theme}
          />
          <BentoCard
            label="PROFIT"
            value={formatCurrency(profit)}
            icon="cash-outline"
            valueColor={theme.colors.secondary}
            theme={theme}
          />
          <BentoCard
            label="BREAK-EVEN"
            value={`${simulationData.breakevenTimelineMonths} mo`}
            icon="timer-outline"
            valueColor={theme.colors.textSecondary}
            theme={theme}
          />
        </View>

        {/* ── Investment breakdown ── */}
        <SectionHeader label="INVESTMENT BREAKDOWN" theme={theme} />
        <View style={styles.breakdownCard}>
          <BreakdownRow label="Initial CAPEX" value={formatCurrency(simulationData.totalCapitalExpenditureInr)} dot={theme.colors.primary} theme={theme} />
          <BreakdownRow label="Government Subsidy" value={`– ${formatCurrency(simulationData.subsidyAmountInr)}`} dot={theme.colors.secondary} valueColor={theme.colors.secondary} theme={theme} />
          <BreakdownRow label="Working Capital" value={formatCurrency(simulationData.firstCycleWorkingCapitalInr)} dot={theme.colors.accent} theme={theme} />
          <BreakdownRow label="Total Startup Capital" value={formatCurrency(simulationData.totalProjectCostInr)} dot={theme.colors.textMuted} strong theme={theme} />
          {surplus != null && (
            <BreakdownRow
              label="Your Capital (gap/surplus)"
              value={`${formatCurrency(simulationData.availableCapitalInr)} (${surplus >= 0 ? '+' : ''}${formatCurrency(surplus)})`}
              dot={surplus >= 0 ? theme.colors.success : theme.colors.error}
              valueColor={surplus >= 0 ? theme.colors.success : theme.colors.error}
              theme={theme}
            />
          )}
        </View>

        {/* ── Risk flags ── */}
        {knowledgeInsights?.warningHighlights?.length ? (
          <>
            <SectionHeader label="RISK FLAGS" theme={theme} />
            <View style={styles.riskCard}>
              <View style={styles.riskCardTitleRow}>
                <Ionicons name="warning-outline" size={16} color={theme.colors.accent} />
                <Text style={styles.riskCardTitle}>Use current market prices</Text>
              </View>
              {knowledgeInsights.warningHighlights.map((item: any) => (
                <View key={item.idSlug} style={styles.riskItem}>
                  <View style={styles.riskDot} />
                  <Text style={styles.riskText}>
                    <Text style={styles.riskItemName}>{item.metricName}: </Text>
                    {item.notes || 'Outdated benchmark — update locally before relying on it.'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ── Funding available subsidy highlight card ── */}
        {knowledgeInsights ? (
          <>
            <SectionHeader label="FUNDING AVAILABLE" theme={theme} />
            <View style={styles.fundingCard}>
              <View style={styles.fundingCardInner}>
                <View style={styles.fundingRow}>
                  <View style={[styles.fundingPill, { borderLeftColor: theme.colors.primary }]}>
                    <Text style={styles.fundingPillLabel}>BENEFICIARY SUBSIDY</Text>
                    <Text style={[styles.fundingPillValue, { color: theme.colors.primary }]}>
                      {knowledgeInsights.beneficiarySubsidyPercent != null
                        ? `${knowledgeInsights.beneficiarySubsidyPercent}%`
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.fundingPill, { borderLeftColor: theme.colors.secondary }]}>
                    <Text style={styles.fundingPillLabel}>CENTRE : STATE</Text>
                    <Text style={[styles.fundingPillValue, { color: theme.colors.secondary }]}>
                      {knowledgeInsights.fundingShare?.centralPercent != null &&
                      knowledgeInsights.fundingShare?.statePercent != null
                        ? `${knowledgeInsights.fundingShare.centralPercent}:${knowledgeInsights.fundingShare.statePercent}`
                        : 'N/A'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.fundingDescription}>
                  {getPolicyResultDescription(knowledgeInsights)}
                </Text>
                <TouchableOpacity style={styles.fundingLink} onPress={openPolicyGuidance}>
                  <Text style={styles.fundingLinkText}>Open full policy guidance</Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Policy highlights */}
            {knowledgeInsights.policyHighlights?.length ? (
              <View style={styles.policyList}>
                {knowledgeInsights.policyHighlights.map((item: any) => (
                  <PolicyCard key={item.idSlug} item={item} theme={theme} />
                ))}
              </View>
            ) : null}

            {knowledgeInsights.stateBenchmarks?.length ? (
              <View style={styles.policyList}>
                {knowledgeInsights.stateBenchmarks.map((item: any) => (
                  <PolicyCard
                    key={item.idSlug}
                    item={item}
                    showValue
                    theme={theme}
                  />
                ))}
              </View>
            ) : null}

            {knowledgeInsights.templateHighlights?.length ? (
              <View style={styles.policyList}>
                {knowledgeInsights.templateHighlights.map((item: any) => (
                  <PolicyCard key={item.idSlug} item={item} showValue theme={theme} />
                ))}
              </View>
            ) : null}

            {knowledgeInsights.disclaimerHighlights?.length ? (
              <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerTitle}>Institutional disclaimer</Text>
                {knowledgeInsights.disclaimerHighlights.map((item: any) => (
                  <Text key={item.idSlug} style={styles.disclaimerText}>
                    • {item.citationText || item.notes || item.metricName}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {/* ── Recommended Species ── */}
        {simulationData.recommendedSpecies?.length ? (
          <>
            <SectionHeader label="RECOMMENDED SPECIES" theme={theme} />
            {simulationData.recommendedSpecies.map((species: any, idx: number) => {
              const key = species.speciesId || species.scientificName || String(idx);
              const score = species.compatibilityScore || species.score || 0;
              const isExpanded = expandedSpecies[key];
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.88}
                  style={[styles.speciesCard, getCompatibilityCardStyle(score, theme)]}
                  onPress={() =>
                    setExpandedSpecies(cur => ({ ...cur, [key]: !cur[key] }))
                  }
                >
                  <View style={styles.speciesTopRow}>
                    <View style={styles.speciesTextWrap}>
                      <Text style={styles.speciesName}>
                        {species.commonName || species.speciesName || species.scientificName || 'Recommended species'}
                      </Text>
                      <Text style={styles.speciesMeta}>
                        {species.scientificName && species.scientificName !== species.commonName
                          ? `${species.scientificName} • `
                          : ''}
                        Compatibility {score}%
                      </Text>
                    </View>
                    <View style={[styles.speciesBadge, getCompatibilityBadgeStyle(score, theme)]}>
                      <Text style={[styles.speciesBadgeText, { color: getCompatibilityColor(score, theme) }]}>
                        {getCompatibilityLabel(score)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.speciesExpandHint}>
                    <Text style={styles.speciesHintText}>
                      {isExpanded ? 'Tap to collapse' : 'Tap to see why this species matches your profile'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={theme.colors.textMuted}
                    />
                  </View>

                  {isExpanded ? (
                    <View style={styles.speciesReasonBox}>
                      {(species.compatibilityReasons || []).map((reason: string, reasonIdx: number) => (
                        <Text key={reasonIdx} style={styles.speciesReason}>• {reason}</Text>
                      ))}
                      <Text style={styles.speciesSummary}>
                        {buildCompatibilitySummary(species)}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </>
        ) : null}

        {/* ── Recommended Systems ── */}
        {simulationData.recommendedSystems?.length ? (
          <>
            <SectionHeader label="RECOMMENDED SYSTEMS" theme={theme} />
            {simulationData.recommendedSystems.map((system: any, idx: number) => (
              <View key={idx} style={styles.systemCard}>
                <Text style={styles.systemName}>{system.system || system.name || 'System'}</Text>
                <Text style={styles.systemMeta}>Suitability {system.suitabilityScore || system.score || '–'}%</Text>
              </View>
            ))}
          </>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatKnowledgeValue(value: number | null | undefined, unit?: string | null) {
  if (value == null) return 'N/A';
  switch (unit) {
    case 'PERCENT': return `${value}%`;
    case 'INR': return `Rs ${value.toLocaleString('en-IN')}`;
    case 'INR_PER_KG': return `Rs ${value}/kg`;
    case 'INR_PER_HA': return `Rs ${value.toLocaleString('en-IN')}/ha`;
    case 'INR_PER_50M3': return `Rs ${value.toLocaleString('en-IN')}/50m3`;
    default: return `${value}`;
  }
}

function getPolicyResultDescription(knowledgeInsights: any) {
  if (!knowledgeInsights) return 'Institutional rule source unavailable';
  const subsidy = knowledgeInsights?.beneficiarySubsidyPercent;
  const central = knowledgeInsights?.fundingShare?.centralPercent;
  const state = knowledgeInsights?.fundingShare?.statePercent;
  if (subsidy == null) return knowledgeInsights.beneficiaryRuleSource || 'Institutional rule source unavailable';
  if (central != null && state != null) {
    return `This result uses a ${subsidy}% beneficiary subsidy rule. The ${central}:${state} pattern describes how the subsidy is jointly funded between Centre and State.`;
  }
  return `This result uses a ${subsidy}% beneficiary subsidy rule from the seeded institutional guidance.`;
}

function getCompatibilityLabel(score: number) {
  if (score > 60) return 'Strong fit';
  if (score >= 30) return 'Moderate';
  return 'Low fit';
}

function getCompatibilityColor(score: number, theme: any) {
  if (score > 60) return theme.colors.secondary;
  if (score >= 30) return theme.colors.accent;
  return theme.colors.error;
}

function getCompatibilityBadgeStyle(score: number, theme: any) {
  if (score > 60) return { backgroundColor: theme.colors.secondaryLight };
  if (score >= 30) return { backgroundColor: theme.colors.accentSoft };
  return { backgroundColor: theme.colors.errorSoft };
}

function getCompatibilityCardStyle(score: number, theme: any) {
  if (score > 60) {
    return {
      backgroundColor: theme.isDark ? '#101A12' : '#EAF8EE',
      borderWidth: 1,
      borderColor: theme.isDark ? '#1F6B37' : '#8CD3A3',
    };
  }
  if (score >= 30) {
    return {
      backgroundColor: theme.isDark ? '#1D170A' : '#FFF7DB',
      borderWidth: 1,
      borderColor: theme.isDark ? '#8A6B13' : '#F0C45D',
    };
  }
  return {
    backgroundColor: theme.isDark ? '#1E1111' : '#FCE8E8',
    borderWidth: 1,
    borderColor: theme.isDark ? '#8D3A3A' : '#E89A9A',
  };
}

function buildCompatibilitySummary(species: any) {
  const score = species.compatibilityScore || species.score || 0;
  const yieldText = species.expectedYieldKg != null ? ` Expected yield is about ${species.expectedYieldKg.toLocaleString('en-IN')} kg.` : '';
  const revenueText = species.expectedRevenueInr != null ? ` Revenue can reach around Rs ${species.expectedRevenueInr.toLocaleString('en-IN')}.` : '';
  const profitText = species.netProfitInr != null ? ` Net profit is estimated near Rs ${species.netProfitInr.toLocaleString('en-IN')}.` : '';
  if (score > 60) return `This species matches your farm profile well — efficiency and economics align strongly with the selected inputs.${yieldText}${revenueText}${profitText}`;
  if (score >= 30) return `This species can work for your profile, but the match is moderate. Review costs, survival, and local market demand before choosing it.${yieldText}${revenueText}${profitText}`;
  return `This species is a weaker match — it may need better capital, different water conditions, or higher risk tolerance.${yieldText}${revenueText}${profitText}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, theme }: any) {
  const styles = getStyles(theme);
  return (
    <Text style={styles.sectionHeaderLabel}>{label}</Text>
  );
}

function BentoCard({ label, value, icon, valueColor, theme }: any) {
  const styles = getStyles(theme);
  return (
    <View style={styles.bentoCard}>
      <Text style={styles.bentoCardLabel}>{label}</Text>
      <Text style={[styles.bentoCardValue, { color: valueColor }]}>{value}</Text>
      <Ionicons name={icon} size={22} color={valueColor} style={styles.bentoCardGhostIcon} />
    </View>
  );
}

function BreakdownRow({ label, value, dot, valueColor, strong, theme }: any) {
  const styles = getStyles(theme);
  return (
    <View style={styles.breakdownRow}>
      <View style={[styles.breakdownDot, { backgroundColor: dot }]} />
      <Text style={[styles.breakdownLabel, strong && styles.breakdownStrong]}>{label}</Text>
      <Text style={[styles.breakdownValue, valueColor ? { color: valueColor } : null, strong && styles.breakdownStrong]}>
        {value}
      </Text>
    </View>
  );
}

function PolicyCard({ item, showValue, theme }: any) {
  const styles = getStyles(theme);
  return (
    <View style={styles.policyCard}>
      <Text style={styles.policyCardTitle}>{item.metricName}</Text>
      {showValue && item.numericValue != null ? (
        <Text style={styles.policyCardValue}>{formatKnowledgeValue(item.numericValue, item.unit)}</Text>
      ) : null}
      {item.notes || item.sourceLabel ? (
        <Text style={styles.policyCardMeta}>{item.notes || item.sourceLabel}</Text>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (theme: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 120 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, color: theme.colors.textPrimary, fontSize: 16 },
  helpLink: { color: theme.colors.primary, fontWeight: '800', fontSize: 14 },

  // Hero card
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  heroGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.4,
  },
  heroGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: theme.colors.secondaryLight,
    opacity: 0.25,
  },
  heroEyebrow: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heroProfitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroProfitValue: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroProfitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroProfitBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroProfitLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 16,
  },
  heroDivider: {
    height: 1,
    backgroundColor: theme.colors.borderGlass,
    marginBottom: 16,
  },
  heroBentoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroBentoItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroBentoDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.borderGlass,
  },
  heroBentoValue: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  heroBentoLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 3,
  },

  // 4-col bento grid
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  bentoCard: {
    width: '47%',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  bentoCardLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  bentoCardValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  bentoCardGhostIcon: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    opacity: 0.15,
  },

  // Section header label
  sectionHeaderLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
    marginTop: 8,
  },

  // Breakdown
  breakdownCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGlass,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  breakdownLabel: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  breakdownValue: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  breakdownStrong: {
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontSize: 14,
  },

  // Risk flags
  riskCard: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    padding: 16,
    marginBottom: 20,
  },
  riskCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  riskCardTitle: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  riskItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
    marginTop: 6,
    flexShrink: 0,
  },
  riskText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  riskItemName: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },

  // Funding card
  fundingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  fundingCardInner: {
    padding: 16,
  },
  fundingRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  fundingPill: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    padding: 12,
  },
  fundingPillLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  fundingPillValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  fundingDescription: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  fundingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fundingLinkText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },

  // Policy list
  policyList: {
    gap: 8,
    marginBottom: 12,
  },
  policyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  policyCardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  policyCardValue: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  policyCardMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  // Disclaimer
  disclaimerBox: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  disclaimerTitle: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  disclaimerText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },

  // Species cards
  speciesCard: {
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: 10,
  },
  speciesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  speciesTextWrap: { flex: 1 },
  speciesName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  speciesMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  speciesBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  speciesBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  speciesExpandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  speciesHintText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  speciesReasonBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGlass,
    gap: 6,
  },
  speciesReason: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  speciesSummary: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  // System cards
  systemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  systemName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  systemMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
