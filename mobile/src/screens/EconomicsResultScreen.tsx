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
  const formatRatio = (value: number | null | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '0.00';
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
              <Text style={styles.heroBentoValue}>{formatRatio(simulationData.benefitCostRatio)}</Text>
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
            value={formatCurrency(simulationData.projectedGrossRevenueInr ?? simulationData.firstCycleRevenueInr ?? 0)}
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

        {/* ── Risk & Management Assessment ── */}
        <SectionHeader label="RISK & MANAGEMENT ASSESSMENT" theme={theme} />
        <View style={styles.breakdownCard}>
          <BreakdownRow 
            label="Risk Tolerance Setting" 
            value={simulationData.riskAnalysisProfile?.overallRisk || 'MEDIUM'} 
            dot={
              (simulationData.riskAnalysisProfile?.overallRisk || 'MEDIUM') === 'LOW'
                ? theme.colors.success
                : (simulationData.riskAnalysisProfile?.overallRisk || 'MEDIUM') === 'MEDIUM'
                ? theme.colors.accent
                : theme.colors.error
            } 
            valueColor={
              (simulationData.riskAnalysisProfile?.overallRisk || 'MEDIUM') === 'LOW'
                ? theme.colors.success
                : (simulationData.riskAnalysisProfile?.overallRisk || 'MEDIUM') === 'MEDIUM'
                ? theme.colors.accent
                : theme.colors.error
            }
            strong 
            theme={theme} 
          />
          <BreakdownRow 
            label="Assumed Mortality Rate" 
            value={`${simulationData.riskAnalysisProfile?.mortalityRiskPercent || 15}%`} 
            dot={theme.colors.border} 
            theme={theme} 
          />
          <BreakdownRow 
            label="Price Volatility Buffer" 
            value={`±${Math.round((simulationData.riskAnalysisProfile?.marketPriceVolatility || 0.15) * 100)}%`} 
            dot={theme.colors.border} 
            theme={theme} 
          />
          <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              {(simulationData.riskAnalysisProfile?.overallRisk || 'MEDIUM') === 'LOW' ? (
                <Text style={{ fontWeight: '600', color: theme.colors.success }}>
                  Conservative Mode:
                </Text>
              ) : (simulationData.riskAnalysisProfile?.overallRisk || 'MEDIUM') === 'HIGH' ? (
                <Text style={{ fontWeight: '600', color: theme.colors.error }}>
                  Aggressive Mode:
                </Text>
              ) : (
                <Text style={{ fontWeight: '600', color: theme.colors.accent }}>
                  Balanced Mode:
                </Text>
              )}
              {' '}
              {(simulationData.riskAnalysisProfile?.overallRisk || 'MEDIUM') === 'LOW' 
                ? 'ROI is estimated using highly conservative yield/price baselines (20th percentile yield, 30th percentile price) and +3% higher survival rates. This ensures a safer, more reliable return projection.'
                : (simulationData.riskAnalysisProfile?.overallRisk || 'MEDIUM') === 'HIGH'
                ? 'ROI assumes a high-density, high-output management style (50th percentile yield/price) with a -5% lower survival rate penalty due to stress. Projections are more optimistic but carry higher operational risk.'
                : 'ROI uses moderate, balanced baselines (35th percentile yield, 40th percentile price) suitable for standard farming practices.'}
            </Text>
          </View>
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
            <SectionHeader label="SPECIES RANKING — BEST TO WORST" theme={theme} />
            {[...simulationData.recommendedSpecies]
              .sort((a: any, b: any) => (b.compatibilityScore || b.score || 0) - (a.compatibilityScore || a.score || 0))
              .map((species: any, idx: number, arr: any[]) => {
                const key = species.speciesId || species.scientificName || String(idx);
                const score = species.compatibilityScore || species.score || 0;
                const isExpanded = expandedSpecies[key];
                const isBest = idx === 0;
                const isWorst = idx === arr.length - 1 && arr.length > 1;
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.88}
                    style={[styles.speciesCard, getCompatibilityCardStyle(score, theme)]}
                    onPress={() =>
                      setExpandedSpecies(cur => ({ ...cur, [key]: !cur[key] }))
                    }
                  >
                    {/* Best / Worst banner */}
                    {isBest && (
                      <View style={[styles.speciesRankBanner, { backgroundColor: theme.colors.secondaryLight }]}>
                        <Ionicons name="trophy" size={12} color={theme.colors.secondary} />
                        <Text style={[styles.speciesRankText, { color: theme.colors.secondary }]}>BEST PICK FOR YOUR FARM</Text>
                      </View>
                    )}
                    {isWorst && (
                      <View style={[styles.speciesRankBanner, { backgroundColor: theme.colors.errorSoft }]}>
                        <Ionicons name="alert-circle-outline" size={12} color={theme.colors.error} />
                        <Text style={[styles.speciesRankText, { color: theme.colors.error }]}>LOWEST MATCH — CONSIDER CAREFULLY</Text>
                      </View>
                    )}

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

        {/* ── ROI Math Breakdown ── */}
        <RoiMathBreakdown simulationData={simulationData} theme={theme} />

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

// ── ROI Math Breakdown component ─────────────────────────────────────────────

function MathRow({ label, value, indent, bold, divider, valueColor, theme }: any) {
  const styles = getStyles(theme);
  return (
    <>
      <View style={[styles.mathRow, indent && styles.mathRowIndent]}>
        <Text style={[styles.mathLabel, bold && styles.mathLabelBold]} numberOfLines={3}>{label}</Text>
        <Text
          style={[styles.mathValue, bold && styles.mathValueBold, valueColor ? { color: valueColor } : null]}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
      {divider && <View style={styles.mathDivider} />}
    </>
  );
}

function MathSection({ title, children, theme }: any) {
  const styles = getStyles(theme);
  return (
    <View style={styles.mathSection}>
      <Text style={styles.mathSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RoiMathBreakdown({ simulationData, theme }: any) {
  const [expanded, setExpanded] = React.useState(false);
  const styles = getStyles(theme);
  const system: string = (simulationData.recommendedSystem || '').toUpperCase();
  const fc = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;

  const isRAS     = system === 'RAS';
  const isBiofloc = system === 'BIOFLOC';
  const isCage    = system === 'CAGE' || system === 'CAGES';

  // Pull numbers directly from simulationData so the math shown matches exactly
  const grossCapex      = simulationData.totalCapitalExpenditureInr ?? 0;
  const subsidy         = simulationData.subsidyAmountInr ?? 0;
  const effectiveCapex  = simulationData.subsidizedCapitalExpenditureInr ?? 0;
  const workingCap      = simulationData.firstCycleWorkingCapitalInr ?? 0;
  const totalProject    = simulationData.totalProjectCostInr ?? 0;
  const annualRevenue   = simulationData.projectedGrossRevenueInr ?? 0;
  const annualProfit    = simulationData.projectedNetProfitInr ?? 0;
  // Annual OPEX = Revenue − Profit (avoids the incorrect workingCap × 2 assumption
  // which breaks for Biofloc Mangur with 5-month cycles vs Pangasius 6-month cycles)
  const annualOpex      = annualRevenue - annualProfit;
  const bcr             = simulationData.benefitCostRatio ?? 0;
  const breakeven       = simulationData.breakevenTimelineMonths ?? 0;

  // Derive unit count from working capital (opex per cycle = workingCap)
  // RAS: opex/cycle/unit = 140,000 → units = workingCap / 140000
  const rasUnits        = isRAS     ? Math.round(workingCap / 140000) || 1 : 0;

  // Detect Biofloc species from primary species recommendation
  const primarySpecies  = simulationData.recommendedSpecies?.[0];
  const isMangur        = isBiofloc && (primarySpecies?.scientificName || '').toLowerCase().includes('clarias');
  // Fix #8: Use the correct per-cycle OPEX for the selected species when deriving
  // tank count. Mangur OPEX/cycle ≈ 82,000; Pangasius ≈ 36,000. Using the wrong
  // constant produced a tank count ~2.3× too high for Mangur setups.
  const bioflocOpexPerCycle = isMangur ? 82000 : 36000;
  const bioflocTanksActual  = isBiofloc ? Math.round(workingCap / bioflocOpexPerCycle) || 1 : 0;

  return (
    <View style={styles.mathCard}>
      {/* Header — always visible */}
      <TouchableOpacity
        style={styles.mathHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}
      >
        <View style={styles.mathHeaderLeft}>
          <Ionicons name="calculator-outline" size={18} color={theme.colors.primary} />
          <View>
            <Text style={styles.mathHeaderTitle}>HOW THIS WAS CALCULATED</Text>
            <Text style={styles.mathHeaderSub}>
              {isRAS
                ? `RAS fixed-unit model · ${rasUnits} unit${rasUnits !== 1 ? 's' : ''}`
                : isBiofloc
                ? `Biofloc tank model · ${bioflocTanksActual} tank${bioflocTanksActual !== 1 ? 's' : ''} · ${isMangur ? 'Mangur/Singhi' : 'Pangasius'}`
                : isCage
                ? `Cage culture model · NFDB/ICAR-CIFRI specs`
                : 'Pond area model'}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.mathBody}>

          {/* ── RAS Math ── */}
          {isRAS && (
            <>
              <MathSection title="STEP 1 — CAPEX (Setup Cost)" theme={theme}>
                <MathRow label="Tank construction" value={`Rs 1,00,000 × ${rasUnits} unit${rasUnits !== 1 ? 's' : ''}`} indent theme={theme} />
                <MathRow label="Equipment (cages, pumps, filters, aerators)" value={`Rs 4,60,000 × ${rasUnits}`} indent theme={theme} />
                <MathRow label="Gross CAPEX" value={fc(grossCapex)} bold divider theme={theme} />
                <MathRow label="PMMSY Subsidy (40–60% of CAPEX)" value={`– ${fc(subsidy)}`} indent valueColor={theme.colors.secondary} theme={theme} />
                <MathRow label="Effective CAPEX (you pay)" value={fc(effectiveCapex)} bold theme={theme} />
              </MathSection>

              <MathSection title="STEP 2 — OPEX per Cycle (Operating Cost)" theme={theme}>
                <MathRow label="Fingerling seeds (4,500 × Rs 6)" value={`Rs 27,000 × ${rasUnits}`} indent theme={theme} />
                <MathRow label="Fish feed (FCR 1.4 × 1,620 kg × Rs 60/kg)" value={`Rs 72,000 × ${rasUnits}`} indent theme={theme} />
                <MathRow label="Probiotics" value={`Rs 15,000 × ${rasUnits}`} indent theme={theme} />
                <MathRow label="Electricity" value={`Rs 8,000 × ${rasUnits}`} indent theme={theme} />
                <MathRow label="Transport + misc" value={`Rs 18,000 × ${rasUnits}`} indent theme={theme} />
                <MathRow label="OPEX per cycle" value={fc(workingCap)} bold divider theme={theme} />
                <MathRow label="Annual OPEX (× 2 cycles)" value={fc(annualOpex)} bold theme={theme} />
              </MathSection>

              <MathSection title="STEP 3 — Production per Unit per Cycle" theme={theme}>
                <MathRow label="Fingerlings stocked" value="4,500 fish" indent theme={theme} />
                <MathRow label="Survival rate" value="80%" indent theme={theme} />
                <MathRow label="Surviving fish" value="3,600 fish" indent theme={theme} />
                <MathRow label="Harvest weight" value="450 g (0.45 kg) per fish" indent theme={theme} />
                <MathRow label="Yield per cycle per unit" value="1,620 kg" bold divider theme={theme} />
                <MathRow label="Annual yield (× 2 cycles × units)" value={`${(1620 * 2 * rasUnits).toLocaleString('en-IN')} kg`} bold theme={theme} />
              </MathSection>

              <MathSection title="STEP 4 — Revenue" theme={theme}>
                <MathRow label="Sale price (live RAS premium)" value="Rs 150/kg" indent theme={theme} />
                <MathRow label="Annual yield" value={`${(1620 * 2 * rasUnits).toLocaleString('en-IN')} kg`} indent theme={theme} />
                <MathRow label="Annual Revenue" value={fc(annualRevenue)} bold divider theme={theme} />
                <MathRow label="Annual OPEX" value={`– ${fc(annualOpex)}`} indent theme={theme} />
                <MathRow label="Annual Gross Profit" value={fc(annualProfit)} bold valueColor={annualProfit >= 0 ? theme.colors.secondary : theme.colors.error} theme={theme} />
              </MathSection>

              <MathSection title="STEP 5 — Key Ratios" theme={theme}>
                <MathRow label="BCR = Revenue ÷ Annual OPEX" value={`${fc(annualRevenue)} ÷ ${fc(annualOpex)} = ${bcr.toFixed(2)}`} indent theme={theme} />
                <MathRow label="ROI % = Profit ÷ Gross CAPEX × 100" value={`${grossCapex > 0 ? ((annualProfit / grossCapex) * 100).toFixed(1) : '–'}%`} indent theme={theme} />
                <MathRow label="Break-even = (Eff. CAPEX ÷ Annual Profit) × 12" value={`${breakeven} months`} bold theme={theme} />
              </MathSection>

              <MathSection title="EQUIPMENT COST BREAKDOWN (per unit)" theme={theme}>
                <MathRow label="Tank construction (90,000 L conical)" value="Rs 1,00,000" indent theme={theme} />
                <MathRow label="3 floating cages (30 m³ each)" value="Rs 1,50,000" indent theme={theme} />
                <MathRow label="0.5 HP water pump" value="Rs 8,500" indent theme={theme} />
                <MathRow label="4 × Venturi aerators (0.5 HP each)" value="Rs 34,000" indent theme={theme} />
                <MathRow label="Bio-filters + media" value="Rs 1,20,000" indent theme={theme} />
                <MathRow label="Plumbing, pipes, fittings" value="Rs 25,000" indent theme={theme} />
                <MathRow label="Electrical wiring + installation" value="Rs 22,500" indent theme={theme} />
                <MathRow label="Total equipment per unit" value="Rs 4,60,000" bold divider theme={theme} />
                <MathRow label="Tank construction" value="Rs 1,00,000" bold theme={theme} />
                <MathRow label="TOTAL CAPEX PER UNIT" value="Rs 5,60,000" bold valueColor={theme.colors.primary} theme={theme} />
              </MathSection>
            </>
          )}

          {/* ── Biofloc Math ── */}
          {isBiofloc && (
            <>
              <MathSection title="STEP 1 — CAPEX (Setup Cost per Tank)" theme={theme}>
                <MathRow label="Tarpaulin tank (650 GSM, 10,000 L)" value="Rs 4,500" indent theme={theme} />
                <MathRow label="Iron mesh frame" value="Rs 2,000" indent theme={theme} />
                <MathRow label="Air blower (0.5 HP, 24/7)" value="Rs 3,500" indent theme={theme} />
                <MathRow label="Air stones (10 per tank)" value="Rs 400" indent theme={theme} />
                <MathRow label="Oxygen/air distribution pipes" value="Rs 600" indent theme={theme} />
                <MathRow label="PVC pipes and fittings" value="Rs 500" indent theme={theme} />
                <MathRow label="Inverter (24/7 aeration backup)" value="Rs 3,000" indent theme={theme} />
                <MathRow label="Battery for inverter" value="Rs 2,500" indent theme={theme} />
                <MathRow label="Ammonia test kit" value="Rs 400" indent theme={theme} />
                <MathRow label="Nitrite test kit" value="Rs 300" indent theme={theme} />
                <MathRow label="Nitrate test kit" value="Rs 300" indent theme={theme} />
                <MathRow label="pH test kit" value="Rs 200" indent theme={theme} />
                <MathRow label="Alkalinity test kit" value="Rs 200" indent theme={theme} />
                <MathRow label="DO (Dissolved Oxygen) test kit" value="Rs 1,500" indent theme={theme} />
                <MathRow label="Probiotics (startup)" value="Rs 240" indent theme={theme} />
                <MathRow label="Calcium carbonate (startup)" value="Rs 30" indent theme={theme} />
                <MathRow label="Molasses (startup)" value="Rs 45" indent theme={theme} />
                <MathRow label="Raw salt (startup)" value="Rs 170" indent theme={theme} />
                <MathRow label="Imhoff cone (floc measurement)" value="Rs 350" indent theme={theme} />
                <MathRow label="Thermometer" value="Rs 200" indent theme={theme} />
                <MathRow label="Hand net" value="Rs 150" indent theme={theme} />
                <MathRow label="CAPEX per tank (all 21 items)" value="Rs 22,000" bold divider theme={theme} />
                <MathRow label={`Total CAPEX (${bioflocTanksActual} tanks)`} value={fc(grossCapex)} bold theme={theme} />
                <MathRow label="PMMSY Subsidy (40–60%)" value={`– ${fc(subsidy)}`} indent valueColor={theme.colors.secondary} theme={theme} />
                <MathRow label="Effective CAPEX (you pay)" value={fc(effectiveCapex)} bold theme={theme} />
              </MathSection>

              <MathSection title={`STEP 2 — OPEX per Cycle (${isMangur ? 'Mangur/Singhi' : 'Pangasius'})`} theme={theme}>
                {isMangur ? (
                  <>
                    <MathRow label="Fingerling seeds (4,500 × Rs 5)" value={`Rs 22,500 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Feed (844 kg × FCR 1.5 × Rs 40/kg)" value={`Rs 50,640 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Electricity (Rs 700/mo × 5 mo)" value={`Rs 3,500 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Probiotics (Rs 400/mo × 5 mo)" value={`Rs 2,000 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Carbon/molasses (Rs 200/mo × 5 mo)" value={`Rs 1,000 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Water prep (salt + CaCO3 + probiotics)" value={`Rs 500 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Miscellaneous" value={`Rs 1,500 × ${bioflocTanksActual}`} indent theme={theme} />
                  </>
                ) : (
                  <>
                    <MathRow label="Fingerling seeds (1,350 × Rs 3)" value={`Rs 4,050 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Feed (540 kg × FCR 1.2 × Rs 35/kg)" value={`Rs 22,680 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Electricity (Rs 700/mo × 6 mo)" value={`Rs 4,200 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Probiotics (Rs 400/mo × 6 mo)" value={`Rs 2,400 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Carbon/molasses (Rs 200/mo × 6 mo)" value={`Rs 1,200 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Water prep (salt + CaCO3 + probiotics)" value={`Rs 500 × ${bioflocTanksActual}`} indent theme={theme} />
                    <MathRow label="Miscellaneous" value={`Rs 1,000 × ${bioflocTanksActual}`} indent theme={theme} />
                  </>
                )}
                <MathRow label="OPEX per cycle (all tanks)" value={fc(workingCap)} bold divider theme={theme} />
                <MathRow label="Annual OPEX (× 2 cycles)" value={fc(annualOpex)} bold theme={theme} />
              </MathSection>

              <MathSection title={`STEP 3 — Production (${isMangur ? 'Mangur/Singhi' : 'Pangasius'})`} theme={theme}>
                {isMangur ? (
                  <>
                    <MathRow label="Stocking density" value="4,500 fish per tank" indent theme={theme} />
                    <MathRow label="Survival rate" value="75%" indent theme={theme} />
                    <MathRow label="Surviving fish" value="3,375 fish per tank" indent theme={theme} />
                    <MathRow label="Harvest weight" value="250 g (0.25 kg) per fish" indent theme={theme} />
                    <MathRow label="Yield per cycle per tank" value="843.75 kg ≈ 844 kg" bold divider theme={theme} />
                  </>
                ) : (
                  <>
                    <MathRow label="Stocking density" value="1,350 fish per tank" indent theme={theme} />
                    <MathRow label="Survival rate" value="80%" indent theme={theme} />
                    <MathRow label="Surviving fish" value="1,080 fish per tank" indent theme={theme} />
                    <MathRow label="Harvest weight" value="500 g (0.50 kg) per fish" indent theme={theme} />
                    <MathRow label="Yield per cycle per tank" value="540 kg" bold divider theme={theme} />
                  </>
                )}
                <MathRow
                  label={`Annual yield (× 2 cycles × ${bioflocTanksActual} tanks)`}
                  value={`${Math.round((isMangur ? 844 : 540) * 2 * bioflocTanksActual).toLocaleString('en-IN')} kg`}
                  bold
                  theme={theme}
                />
              </MathSection>

              <MathSection title="STEP 4 — Revenue" theme={theme}>
                <MathRow label={`Sale price (${isMangur ? 'Mangur premium' : 'Pangasius wholesale'})`} value={isMangur ? 'Rs 180/kg' : 'Rs 85/kg'} indent theme={theme} />
                <MathRow label="Annual Revenue" value={fc(annualRevenue)} bold divider theme={theme} />
                <MathRow label="Annual OPEX" value={`– ${fc(annualOpex)}`} indent theme={theme} />
                <MathRow label="Annual Gross Profit" value={fc(annualProfit)} bold valueColor={annualProfit >= 0 ? theme.colors.secondary : theme.colors.error} theme={theme} />
              </MathSection>

              <MathSection title="STEP 5 — Key Ratios" theme={theme}>
                <MathRow label="BCR = Revenue ÷ Annual OPEX" value={`${fc(annualRevenue)} ÷ ${fc(annualOpex)} = ${bcr.toFixed(2)}`} indent theme={theme} />
                <MathRow label="ROI % = Profit ÷ Gross CAPEX × 100" value={`${grossCapex > 0 ? ((annualProfit / grossCapex) * 100).toFixed(1) : '–'}%`} indent theme={theme} />
                <MathRow label="Break-even = (Eff. CAPEX ÷ Annual Profit) × 12" value={`${breakeven} months`} bold theme={theme} />
              </MathSection>
            </>
          )}

          {/* ── Cage math ── */}
          {isCage && (
            <>
              <MathSection title="STEP 1 — CAPEX (Setup Cost per Cage)" theme={theme}>
                <MathRow label="GI cage frame (6m × 4m × 4m = 96 m³)" value="Rs 1,00,000" indent theme={theme} />
                <MathRow label="Inputs (seed, feed, labour per cycle)" value="Rs 2,00,000" indent theme={theme} />
                <MathRow label="Total cost per cage" value={fc(grossCapex / Math.max(1, Math.round(grossCapex / 300000)))} bold divider theme={theme} />
                <MathRow label="PMMSY / NFDB Subsidy (Blue Revolution)" value={`– ${fc(subsidy)}`} indent valueColor={theme.colors.secondary} theme={theme} />
                <MathRow label="Effective CAPEX (you pay)" value={fc(effectiveCapex)} bold theme={theme} />
              </MathSection>

              <MathSection title="STEP 2 — PRODUCTION (NFDB Official Figures)" theme={theme}>
                <MathRow label="Cage size" value="6m × 4m × 4m = 96 m³" indent theme={theme} />
                <MathRow label="Stocking density" value="60–100 fingerlings/m³ (grow-out)" indent theme={theme} />
                <MathRow label="Fish stocked per cage" value="9,600 fingerlings" indent theme={theme} />
                <MathRow label="Survival rate" value="80%" indent theme={theme} />
                <MathRow label="Surviving fish" value="7,680 fish per cage" indent theme={theme} />
                <MathRow label="Harvest weight" value="600g (0.6 kg) per fish" indent theme={theme} />
                <MathRow label="Yield per cage per cycle" value="4.608 MT (4,608 kg)" bold divider theme={theme} />
                <MathRow label="Culture period" value="7–8 months" indent theme={theme} />
              </MathSection>

              <MathSection title="STEP 3 — FEEDING SCHEDULE (NFDB)" theme={theme}>
                <MathRow label="Rearing stage" value="Up to 10% BW, 4–5 times/day" indent theme={theme} />
                <MathRow label="Grow-out: Month 1–2" value="5% BW, twice daily" indent theme={theme} />
                <MathRow label="Grow-out: Month 3–5" value="3% BW, twice daily" indent theme={theme} />
                <MathRow label="Grow-out: Month 6+" value="2% BW, twice daily" indent theme={theme} />
                <MathRow label="FCR" value="1.8" bold divider theme={theme} />
                <MathRow label="Harvest before October" value="Cold below 15°C causes Pangasius distress" indent valueColor={theme.colors.error} theme={theme} />
              </MathSection>

              <MathSection title="STEP 4 — REVENUE" theme={theme}>
                <MathRow label="Sale price (Pangasius wholesale)" value="Rs 90/kg (NFDB official)" indent theme={theme} />
                <MathRow label="Annual Revenue" value={fc(annualRevenue)} bold divider theme={theme} />
                <MathRow label="Annual OPEX" value={`– ${fc(annualOpex)}`} indent theme={theme} />
                <MathRow label="Annual Gross Profit" value={fc(annualProfit)} bold valueColor={annualProfit >= 0 ? theme.colors.secondary : theme.colors.error} theme={theme} />
              </MathSection>

              <MathSection title="STEP 5 — KEY RATIOS" theme={theme}>
                <MathRow label="BCR = Revenue ÷ Annual OPEX" value={`${fc(annualRevenue)} ÷ ${fc(annualOpex)} = ${bcr.toFixed(2)}`} indent theme={theme} />
                <MathRow label="Net return per cage per cycle" value="Rs 1,14,720 (NFDB official)" indent theme={theme} />
                <MathRow label="Break-even = (Eff. CAPEX ÷ Annual Profit) × 12" value={`${breakeven} months`} bold theme={theme} />
              </MathSection>

              <MathSection title="SITE REQUIREMENTS (NFDB/ICAR-CIFRI)" theme={theme}>
                <MathRow label="Minimum reservoir area" value="1,000 ha at FRL" indent theme={theme} />
                <MathRow label="Minimum depth at cage site" value="10 m year-round" indent theme={theme} />
                <MathRow label="Cage arrangement" value="Caterpillar battery design for water exchange" indent theme={theme} />
                <MathRow label="Anchoring" value="4+ corner anchors to prevent drifting" indent theme={theme} />
                <MathRow label="Approval required" value="NFDB + State Fisheries Dept" indent theme={theme} />
              </MathSection>
            </>
          )}

          {/* ── Generic pond math ── */}
          {!isRAS && !isBiofloc && !isCage && (
            <>
              <MathSection title="CAPEX → OPEX → REVENUE" theme={theme}>
                <MathRow label="Gross CAPEX (setup)" value={fc(grossCapex)} indent theme={theme} />
                <MathRow label="PMMSY Subsidy" value={`– ${fc(subsidy)}`} indent valueColor={theme.colors.secondary} theme={theme} />
                <MathRow label="Effective CAPEX" value={fc(effectiveCapex)} bold divider theme={theme} />
                <MathRow label="Working Capital (1st cycle OPEX)" value={fc(workingCap)} indent theme={theme} />
                <MathRow label="Total Startup Capital" value={fc(totalProject)} bold divider theme={theme} />
                <MathRow label="Projected Revenue" value={fc(annualRevenue)} indent theme={theme} />
                <MathRow label="Net Profit" value={fc(annualProfit)} bold valueColor={annualProfit >= 0 ? theme.colors.secondary : theme.colors.error} theme={theme} />
              </MathSection>
              <MathSection title="KEY RATIOS" theme={theme}>
                <MathRow label="BCR (Benefit-Cost Ratio)" value={bcr.toFixed(2)} indent theme={theme} />
                <MathRow label="Break-even" value={`${breakeven} months`} bold theme={theme} />
              </MathSection>
            </>
          )}

          {/* Formula legend */}
          <View style={styles.mathLegend}>
            <Text style={styles.mathLegendTitle}>FORMULA REFERENCE</Text>
            <Text style={styles.mathLegendText}>BCR = Annual Revenue ÷ Annual OPEX</Text>
            <Text style={styles.mathLegendText}>ROI % = (Annual Profit ÷ Gross CAPEX) × 100</Text>
            <Text style={styles.mathLegendText}>Break-even = (Effective CAPEX ÷ Annual Profit) × 12 months</Text>
            <Text style={styles.mathLegendText}>Effective CAPEX = Gross CAPEX − PMMSY Subsidy</Text>
          </View>

        </View>
      )}
    </View>
  );
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
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  heroProfitValue: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    flexShrink: 1,
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
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroBentoLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 3,
    textAlign: 'center',
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
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
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
    flexShrink: 1,
    maxWidth: '55%',
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
    overflow: 'hidden',
  },
  speciesRankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  speciesRankText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
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

  // ROI Math Breakdown card
  mathCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  mathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  mathHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mathHeaderTitle: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mathHeaderSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  mathBody: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGlass,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mathSection: {
    marginTop: 16,
    marginBottom: 4,
  },
  mathSectionTitle: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  mathRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 5,
    gap: 8,
  },
  mathRowIndent: {
    paddingLeft: 10,
  },
  mathLabel: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  mathLabelBold: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  mathValue: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '55%',
  },
  mathValueBold: {
    fontWeight: '800',
    fontSize: 13,
  },
  mathDivider: {
    height: 1,
    backgroundColor: theme.colors.borderGlass,
    marginVertical: 6,
  },
  mathLegend: {
    marginTop: 16,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 4,
  },
  mathLegendTitle: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  mathLegendText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '500',
  },
});
