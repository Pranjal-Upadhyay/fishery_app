import { query } from '../db';
import { FarmerCategory, PMMSYSubsidyInput } from '../types';

type KnowledgeRuleRecord = {
  id_slug: string;
  record_type: string;
  document_title: string;
  source_type: string;
  institution: string;
  scope_type: string;
  state_code: string | null;
  region_group: string | null;
  project_types: string[];
  species: string[];
  metric_name: string;
  numeric_value: number | null;
  min_value: number | null;
  max_value: number | null;
  unit: string | null;
  bucket: string;
  confidence: string | null;
  freshness: string | null;
  applicability_condition: string | null;
  user_editable: boolean;
  active_for_calculator: boolean;
  active_for_knowledgebase: boolean;
  warning_if_used: boolean;
  citation_text: string | null;
  citation_page: number | null;
  citation_section: string | null;
  notes: string | null;
};

export type KnowledgeHighlight = {
  idSlug: string;
  metricName: string;
  numericValue: number | null;
  unit: string | null;
  citationText: string | null;
  citationPage: number | null;
  notes: string | null;
  sourceLabel: string;
};

export type SubsidyKnowledgeContext = {
  beneficiarySubsidyPercent: number | null;
  beneficiaryRuleSource: string | null;
  regionGroup: string;
  fundingShare: {
    centralPercent: number | null;
    statePercent: number | null;
  };
  policyHighlights: KnowledgeHighlight[];
  stateBenchmarks: KnowledgeHighlight[];
  warningHighlights: KnowledgeHighlight[];
  templateHighlights: KnowledgeHighlight[];
  disclaimerHighlights: KnowledgeHighlight[];
};

export type EconomicTemplateDefaults = {
  matchedHighlights: KnowledgeHighlight[];
  disclaimerHighlights: KnowledgeHighlight[];
  fcrAverage: number | null;
  feedPriceInrPerKg: number | null;
  survivalPercent: number | null;
  cycleMonths: number | null;
  stockingDensity: number | null;
};

const NE_HILLY_STATE_CODES = new Set([
  'AR', 'AS', 'HP', 'JK', 'LA', 'MN', 'ML', 'MZ', 'NL', 'SK', 'TR', 'UT',
]);

const UNION_TERRITORY_CODES = new Set([
  'AN', 'CH', 'DH', 'DL', 'JK', 'LA', 'LD', 'PY',
]);

const SUBSIDY_PERCENT_SLUGS = {
  general: 'rncnaa-beneficiary-subsidy-general',
  priority: 'rncnaa-beneficiary-subsidy-priority',
};

const POLICY_HIGHLIGHT_SLUGS = [
  'nabard-margin-money-small-farmer',
  'nabard-loan-moratorium',
];

const SPECIES_ALIASES: Record<string, string[]> = {
  'litopenaeus vannamei': ['litopenaeus vannamei', 'vannamei', 'white leg shrimp', 'whiteleg shrimp'],
  'labeo rohita': ['labeo rohita', 'rohu'],
  'pangasianodon hypophthalmus': ['pangasianodon hypophthalmus', 'pangasius'],
  'oreochromis niloticus': ['oreochromis niloticus', 'tilapia'],
  // Penaeus monodon (Black Tiger Shrimp) removed — not cultivated in Bihar/UP inland systems
};

export class KnowledgeRulesService {
  static getRegionGroupForState(stateCode: string): string {
    const normalized = stateCode.toUpperCase();

    if (UNION_TERRITORY_CODES.has(normalized)) {
      return 'UT';
    }

    if (NE_HILLY_STATE_CODES.has(normalized)) {
      return 'NE_HILLY';
    }

    return 'STANDARD_STATES';
  }

  static mapProjectTypeToKnowledgeProject(
    projectType: PMMSYSubsidyInput['projectType']
  ): string {
    switch (projectType) {
      case 'RAS':
        return 'RAS';
      case 'INTEGRATED':
        return 'INTEGRATED_FARMING';
      case 'BRACKISH':
        return 'BRACKISHWATER';
      case 'FRESHWATER':
      default:
        return 'POND_CULTURE';
    }
  }

  static async getSubsidyPercentForCategory(category: FarmerCategory): Promise<KnowledgeRuleRecord | null> {
    const slug =
      category === FarmerCategory.GENERAL
        ? SUBSIDY_PERCENT_SLUGS.general
        : SUBSIDY_PERCENT_SLUGS.priority;

    return this.getRuleBySlug(slug);
  }

  static async getSubsidyKnowledgeContext(
    stateCode: string,
    category: FarmerCategory,
    projectType: PMMSYSubsidyInput['projectType'],
    preferredSpecies?: string[],
    systemType?: string
  ): Promise<SubsidyKnowledgeContext> {
    const knowledgeProject = this.mapProjectTypeToKnowledgeProject(projectType);
    const regionGroup = this.getRegionGroupForState(stateCode);

    const [beneficiaryRule, projectSpecificSubsidyRule, centralShareRule, stateShareRule, policyHighlights, stateBenchmarks, warningHighlights, templateDefaults] =
      await Promise.all([
        this.getSubsidyPercentForCategory(category),
        this.getProjectSpecificSubsidyRule(knowledgeProject, regionGroup),
        this.getRuleByMetricName(
          regionGroup === 'NE_HILLY'
            ? 'Central Funding Share (NE/Hilly)'
            : 'Central Funding Share (Standard)'
        ),
        this.getRuleByMetricName(
          regionGroup === 'NE_HILLY'
            ? 'State Funding Share (NE/Hilly)'
            : 'State Funding Share (Standard)'
        ),
        this.getHighlightsBySlugs(POLICY_HIGHLIGHT_SLUGS),
        this.getStateBenchmarks(stateCode, knowledgeProject, systemType),
        this.getWarningHighlights(stateCode, knowledgeProject),
        this.getEconomicTemplateDefaults(stateCode, knowledgeProject, preferredSpecies),
      ]);

    const appliedRule = projectSpecificSubsidyRule ?? beneficiaryRule;

    return {
      beneficiarySubsidyPercent: appliedRule?.numeric_value ?? null,
      beneficiaryRuleSource: appliedRule
        ? `${appliedRule.institution} (${appliedRule.document_title})`
        : null,
      regionGroup,
      fundingShare: {
        centralPercent: centralShareRule?.numeric_value ?? null,
        statePercent: stateShareRule?.numeric_value ?? null,
      },
      policyHighlights,
      stateBenchmarks,
      warningHighlights,
      templateHighlights: templateDefaults.matchedHighlights,
      disclaimerHighlights: templateDefaults.disclaimerHighlights,
    };
  }

  static async getEconomicTemplateDefaults(
    stateCode: string,
    projectType: string,
    preferredSpecies?: string[]
  ): Promise<EconomicTemplateDefaults> {
    const result = await query<KnowledgeRuleRecord>(
      `
        SELECT *
        FROM knowledge_rules
        WHERE record_type IN ('biological_assumption', 'cost_benchmark', 'project_template')
          AND active_for_calculator = true
          AND (
            project_types ? $1
            OR project_types ? 'ALL'
          )
          AND (
            state_code = $2
            OR state_code IS NULL
          )
        ORDER BY
          CASE WHEN state_code = $2 THEN 0 ELSE 1 END,
          metric_name
      `,
      [projectType, stateCode.toUpperCase()]
    );

    const speciesTerms = this.buildSpeciesTerms(preferredSpecies);
    const filteredRows = result.rows.filter((row) => this.matchesSpecies(row.species, speciesTerms));
    const matchedRows = filteredRows.length > 0 ? filteredRows : result.rows.filter((row) => !row.species || row.species.length === 0);
    const disclaimerHighlights = await this.getDisclaimers(projectType);

    const fcrRule = matchedRows.find((row) => row.metric_name.includes('Feed Conversion Ratio'));
    const feedCostRule = matchedRows.find((row) => row.metric_name === 'Feed Cost' && row.unit === 'INR_PER_KG');
    const survivalRule = matchedRows.find((row) => row.metric_name === 'Survival Rate');
    const cycleRule = matchedRows.find((row) => row.metric_name.includes('Culture Period'));
    const stockingRule = matchedRows.find((row) => row.metric_name.includes('Stocking Density'));

    return {
      matchedHighlights: matchedRows.slice(0, 5).map(this.toHighlight),
      disclaimerHighlights,
      fcrAverage: this.getRuleAverage(fcrRule),
      feedPriceInrPerKg: feedCostRule?.numeric_value ?? null,
      survivalPercent: survivalRule?.numeric_value ?? null,
      cycleMonths: cycleRule?.numeric_value ?? null,
      stockingDensity: stockingRule?.numeric_value ?? null,
    };
  }

  private static async getRuleBySlug(idSlug: string): Promise<KnowledgeRuleRecord | null> {
    const result = await query<KnowledgeRuleRecord>(
      `
        SELECT *
        FROM knowledge_rules
        WHERE id_slug = $1
        LIMIT 1
      `,
      [idSlug]
    );

    return result.rows[0] ?? null;
  }

  private static async getRuleByMetricName(metricName: string): Promise<KnowledgeRuleRecord | null> {
    const result = await query<KnowledgeRuleRecord>(
      `
        SELECT *
        FROM knowledge_rules
        WHERE metric_name = $1
        LIMIT 1
      `,
      [metricName]
    );

    return result.rows[0] ?? null;
  }

  private static async getHighlightsBySlugs(idSlugs: string[]): Promise<KnowledgeHighlight[]> {
    const result = await query<KnowledgeRuleRecord>(
      `
        SELECT *
        FROM knowledge_rules
        WHERE id_slug = ANY($1::text[])
        ORDER BY metric_name
      `,
      [idSlugs]
    );

    return result.rows.map(this.toHighlight);
  }

  private static async getProjectSpecificSubsidyRule(
    projectType: string,
    regionGroup: string
  ): Promise<KnowledgeRuleRecord | null> {
    const result = await query<KnowledgeRuleRecord>(
      `
        SELECT *
        FROM knowledge_rules
        WHERE record_type = 'subsidy_rule'
          AND active_for_calculator = true
          AND numeric_value IS NOT NULL
          AND unit = 'PERCENT'
          AND metric_name NOT ILIKE '%Funding Share%'
          AND (
            project_types ? $1
            OR project_types ? 'ALL'
          )
          AND (
            region_group = $2
            OR region_group IS NULL
          )
        ORDER BY
          CASE WHEN region_group = $2 THEN 0 ELSE 1 END,
          CASE WHEN project_types ? 'ALL' THEN 1 ELSE 0 END,
          id_slug
        LIMIT 1
      `,
      [projectType, regionGroup]
    );

    return result.rows[0] ?? null;
  }

  private static async getStateBenchmarks(
    stateCode: string,
    projectType: string,
    systemType?: string
  ): Promise<KnowledgeHighlight[]> {
    const result = await query<KnowledgeRuleRecord>(
      `
        SELECT *
        FROM knowledge_rules
        WHERE state_code = $1
          AND record_type IN ('cost_benchmark', 'project_template')
          AND active_for_calculator = true
          AND (project_types ? $2 OR project_types ? 'ALL')
        ORDER BY record_type, metric_name
        LIMIT 15
      `,
      [stateCode.toUpperCase(), projectType]
    );

    let rows = result.rows;

    if (systemType) {
      const normalizedSystem = systemType.toUpperCase();
      if (normalizedSystem === 'BIOFLOC') {
        rows = rows.filter(r => 
          r.id_slug.includes('biofloc') || 
          r.metric_name.toLowerCase().includes('biofloc') ||
          (!r.id_slug.includes('pond-construction') && 
           !r.id_slug.includes('cage') && 
           !r.id_slug.includes('hatchery') && 
           !r.metric_name.toLowerCase().includes('pond construction') &&
           !r.metric_name.toLowerCase().includes('cage culture') &&
           !r.metric_name.toLowerCase().includes('hatchery'))
        );
      } else if (normalizedSystem === 'CAGES') {
        rows = rows.filter(r => 
          r.id_slug.includes('cage') || 
          r.metric_name.toLowerCase().includes('cage') ||
          (!r.id_slug.includes('pond-construction') && 
           !r.id_slug.includes('biofloc') && 
           !r.id_slug.includes('hatchery') && 
           !r.metric_name.toLowerCase().includes('pond construction') &&
           !r.metric_name.toLowerCase().includes('biofloc') &&
           !r.metric_name.toLowerCase().includes('hatchery'))
        );
      } else if (normalizedSystem === 'EARTHEN') {
        rows = rows.filter(r => 
          !r.id_slug.includes('biofloc') && 
          !r.id_slug.includes('cage') && 
          !r.id_slug.includes('ras') &&
          !r.metric_name.toLowerCase().includes('biofloc') &&
          !r.metric_name.toLowerCase().includes('cage') &&
          !r.metric_name.toLowerCase().includes('ras')
        );
      } else if (normalizedSystem === 'RAS') {
        rows = rows.filter(r => 
          r.id_slug.includes('ras') || 
          r.metric_name.toLowerCase().includes('ras') ||
          (!r.id_slug.includes('pond-construction') && 
           !r.id_slug.includes('biofloc') && 
           !r.id_slug.includes('cage') && 
           !r.metric_name.toLowerCase().includes('pond construction') &&
           !r.metric_name.toLowerCase().includes('biofloc') &&
           !r.metric_name.toLowerCase().includes('cage'))
        );
      }
    }

    return rows.slice(0, 4).map(this.toHighlight);
  }

  private static async getWarningHighlights(
    stateCode: string,
    projectType: string
  ): Promise<KnowledgeHighlight[]> {
    const result = await query<KnowledgeRuleRecord>(
      `
        SELECT *
        FROM knowledge_rules
        WHERE warning_if_used = true
          AND (
            state_code = $1
            OR state_code IS NULL
          )
          AND (project_types ? $2 OR project_types ? 'ALL')
        ORDER BY metric_name
        LIMIT 3
      `,
      [stateCode.toUpperCase(), projectType]
    );

    return result.rows.map(this.toHighlight);
  }

  private static async getDisclaimers(projectType: string): Promise<KnowledgeHighlight[]> {
    const result = await query<KnowledgeRuleRecord>(
      `
        SELECT *
        FROM knowledge_rules
        WHERE record_type = 'risk_flag'
          AND active_for_knowledgebase = true
          AND (
            project_types ? $1
            OR project_types ? 'ALL'
          )
        ORDER BY metric_name
        LIMIT 3
      `,
      [projectType]
    );

    return result.rows.map(this.toHighlight);
  }

  private static getRuleAverage(rule?: KnowledgeRuleRecord | null): number | null {
    if (!rule) {
      return null;
    }

    if (rule.numeric_value != null) {
      return rule.numeric_value;
    }

    if (rule.min_value != null && rule.max_value != null) {
      return (rule.min_value + rule.max_value) / 2;
    }

    return rule.min_value ?? rule.max_value ?? null;
  }

  private static buildSpeciesTerms(preferredSpecies?: string[]): string[] {
    if (!preferredSpecies || preferredSpecies.length === 0) {
      return [];
    }

    const terms = new Set<string>();
    for (const species of preferredSpecies) {
      const normalized = species.toLowerCase();
      terms.add(normalized);
      const aliases = SPECIES_ALIASES[normalized] ?? [];
      for (const alias of aliases) {
        terms.add(alias);
      }
    }

    return Array.from(terms);
  }

  private static matchesSpecies(ruleSpecies: string[] | null | undefined, speciesTerms: string[]): boolean {
    if (!ruleSpecies || ruleSpecies.length === 0 || speciesTerms.length === 0) {
      return !ruleSpecies || ruleSpecies.length === 0;
    }

    return ruleSpecies.some((item) => speciesTerms.includes(item.toLowerCase()));
  }

  private static toHighlight(rule: KnowledgeRuleRecord): KnowledgeHighlight {
    return {
      idSlug: rule.id_slug,
      metricName: rule.metric_name,
      numericValue: rule.numeric_value,
      unit: rule.unit,
      citationText: rule.citation_text,
      citationPage: rule.citation_page,
      notes: rule.notes,
      sourceLabel: `${rule.institution} (${rule.document_title})`,
    };
  }
}
