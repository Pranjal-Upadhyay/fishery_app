/**
 * Core Type Definitions for Fishing God Platform
 * All biological parameters, economic models, and entity interfaces
 */

// ============================================================================
// ENUMERATIONS
// ============================================================================

export enum NodeType {
  SYSTEM = 'SYSTEM',
  SPECIES = 'SPECIES',
  PARAMETER = 'PARAMETER',
  ECONOMIC_MODEL = 'ECONOMIC_MODEL',
  GEOGRAPHIC_ZONE = 'GEOGRAPHIC_ZONE',
  EQUIPMENT = 'EQUIPMENT',
  MARKET_DATA = 'MARKET_DATA'
}

export enum CultivationSystem {
  TRADITIONAL_POND = 'TRADITIONAL_POND',
  BIOFLOC = 'BIOFLOC',
  RAS = 'RAS',
  BRACKISH_POND = 'BRACKISH_POND',
  FLOATING_CAGE = 'FLOATING_CAGE',
  ORNAMENTAL_UNIT = 'ORNAMENTAL_UNIT'
}

export enum SpeciesCategory {
  INDIAN_MAJOR_CARP = 'INDIAN_MAJOR_CARP',
  PANGASIUS = 'PANGASIUS',
  VANNAMEI_SHRIMP = 'VANNAMEI_SHRIMP',
  SCAMPI = 'SCAMPI',
  TILAPIA = 'TILAPIA',
  ORNAMENTAL = 'ORNAMENTAL'
}

export enum WaterType {
  FRESHWATER = 'FRESHWATER',
  BRACKISH = 'BRACKISH',
  SALINE = 'SALINE'
}

export enum FarmerCategory {
  GENERAL = 'GENERAL',
  WOMEN = 'WOMEN',
  SC = 'SC',
  ST = 'ST',
  EBC = 'EBC'
}

export enum RiskTolerance {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// ============================================================================
// KNOWLEDGE GRAPH - HIERARCHICAL JSONB STRUCTURES
// ============================================================================

export interface KnowledgeNode {
  id: string;
  parent_id: string | null;
  node_type: NodeType;
  data: SpeciesData | SystemData | EconomicData | GeographicData | EquipmentData;
  created_at: Date;
  updated_at: Date;
  version: number;
}

export interface SpeciesData {
  scientific_name: string;
  common_names: Record<string, string>;
  category: SpeciesCategory;
  optimal_systems: CultivationSystem[];
  biological_parameters: BiologicalParameters;
  economic_parameters: SpeciesEconomicParameters;
  culture_period_months: Range;
  stocking_density_per_unit: Record<CultivationSystem, Range>;
  compatible_species: string[];
  prohibited_conditions: ProhibitedCondition[];
}

export interface BiologicalParameters {
  temperature_celsius: Range;
  dissolved_oxygen_mg_l: MinThreshold;
  ph_range: Range;
  salinity_tolerance_ppt: Range;
  total_alkalinity_ppm: Range;
  ammonia_tolerance_mg_l: MaxThreshold;
  nitrite_tolerance_mg_l: MaxThreshold;
  hardness_ppm: Range;
}

export interface SpeciesEconomicParameters {
  feed_conversion_ratio: Range;
  expected_yield_mt_per_acre: Range;
  market_price_per_kg_inr: Range;
  feed_protein_requirements: Record<string, number>;
  survival_rate_percent: Range;
}

export interface SystemData {
  name: string;
  description: Record<string, string>;
  water_type: WaterType;
  infrastructure_requirements: InfrastructureRequirement[];
  operational_parameters: OperationalParameters;
  compatible_species: string[];
  geographic_constraints: GeographicConstraint[];
}

export interface EconomicData {
  model_name: string;
  system_type: CultivationSystem;
  target_species?: string; // Links economic model explicitly to a specific species scientific_name
  capital_expenditure: CapitalExpenditure;
  operational_expenditure: OperationalExpenditure;
  revenue_projections: RevenueProjections;
  benefit_cost_ratio: Range;
  break_even_months: Range;
  pmmsy_subsidy_applicable: boolean;
  culture_period_months?: Range;
}

export interface GeographicData {
  zone_name: string;
  state_code: string;
  district_codes: string[];
  soil_texture: string;
  groundwater_salinity_us_cm: Range;
  tidal_influence: boolean;
  rainfall_mm: Range;
  temperature_range: Range;
  suitable_systems: CultivationSystem[];
  unsuitable_species: string[];
  recommended_species: string[];
}

export interface EquipmentData {
  name: string;
  category: string;
  specifications: Record<string, string | number>;
  cost_inr: number;
  lifespan_years: number;
  power_consumption_kw?: number;
  maintenance_cost_annual_inr: number;
  supplier_directory: SupplierInfo[];
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

export interface Range {
  min: number;
  max: number;
}

export interface MinThreshold {
  min: number;
}

export interface MaxThreshold {
  max: number;
}

export interface ProhibitedCondition {
  parameter: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'WARNING' | 'FATAL';
  message: Record<string, string>;
}

export interface InfrastructureRequirement {
  item: string;
  quantity_per_hectare: number;
  unit: string;
  essential: boolean;
}

export interface OperationalParameters {
  aeration_required: boolean;
  water_exchange_percent: Range;
  feeding_frequency_per_day: number;
  monitoring_frequency: string;
}

export interface GeographicConstraint {
  parameter: string;
  constraint_type: 'MAX' | 'MIN' | 'EXACT';
  value: number;
}

export interface CapitalExpenditure {
  land_preparation_inr_per_hectare: number;
  pond_construction_inr_per_hectare: number;
  equipment_costs: Record<string, number>;
  initial_stocking_cost_inr: number;
  contingency_percent: number;
}

export interface OperationalExpenditure {
  feed_cost_inr_per_kg_fish: number;
  electricity_cost_inr_per_month: number;
  labor_cost_inr_per_month: number;
  medicine_cost_inr_per_cycle: number;
  miscellaneous_percent: number;
}

export interface RevenueProjections {
  expected_yield_kg_per_hectare: Range;
  market_price_inr_per_kg: Range;
  harvest_cycles_per_year: number;
}

export interface SupplierInfo {
  name: string;
  location: string;
  contact: string;
  verified: boolean;
}

// ============================================================================
// ECONOMICS SIMULATOR
// ============================================================================

export interface EconomicsSimulatorInput {
  landSizeHectares: number;
  waterSourceSalinityUsCm: number;
  availableCapitalInr: number;
  riskTolerance: RiskTolerance;
  farmerCategory: FarmerCategory;
  stateCode: string;
  districtCode: string;
  preferredSpecies?: string[];
  systemType?: CultivationSystem;
  waterSourceType?: string;
}

export interface EconomicsSimulatorOutput {
  recommendationId: string;
  recommendedSpecies: SpeciesRecommendation[];
  recommendedSystem: CultivationSystem;
  projectedGrossRevenueInr: number;
  projectedNetProfitInr: number;
  breakevenTimelineMonths: number;
  totalCapitalExpenditureInr: number;
  subsidizedCapitalExpenditureInr: number;
  subsidyAmountInr: number;
  benefitCostRatio: number;
  firstCycleWorkingCapitalInr: number;
  totalProjectCostInr: number;
  availableCapitalInr: number;
  knowledgeInsights?: PMMSYSubsidyOutput['knowledgeContext'];
  riskAnalysisProfile: RiskAnalysisProfile;
  monthlyCashFlow: MonthlyCashFlow[];
  sensitivityAnalysis: SensitivityAnalysis;
}

export interface SpeciesRecommendation {
  speciesId: string;
  commonName: string;
  scientificName: string;
  compatibilityScore: number;
  expectedYieldKg: number;
  expectedRevenueInr: number;
  fcr?: number;
  netProfitInr?: number;
  benefitCostRatio?: number;
  compatibilityReasons: string[];
}

export interface RiskAnalysisProfile {
  overallRisk: RiskTolerance;
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  mortalityRiskPercent: number;
  marketPriceVolatility: number;
}

export interface RiskFactor {
  category: string;
  probability: number;
  impact: number;
  description: string;
}

export interface MonthlyCashFlow {
  month: number;
  revenue: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface SensitivityAnalysis {
  bestCase: ScenarioAnalysis;
  worstCase: ScenarioAnalysis;
  priceDrop10Percent: number;
  priceIncrease10Percent: number;
  yieldDrop15Percent: number;
  feedCostIncrease20Percent: number;
}

export interface ScenarioAnalysis {
  netProfit: number;
  breakEvenMonths: number;
  benefitCostRatio: number;
}

// ============================================================================
// PMMSY SUBSIDY CALCULATIONS
// ============================================================================

export interface PMMSYSubsidyInput {
  projectType: 'FRESHWATER' | 'BRACKISH' | 'INTEGRATED' | 'RAS';
  beneficiaryCategory: FarmerCategory;
  unitCostInr: number;
  landAreaHectares: number;
}

export interface PMMSYSubsidyOutput {
  eligibleSubsidyPercent: number;
  maximumSubsidyCapInr: number;
  calculatedSubsidyInr: number;
  beneficiaryContributionInr: number;
  effectiveCostInr: number;
  applicableSchemes: string[];
  knowledgeContext?: {
    beneficiarySubsidyPercent: number | null;
    beneficiaryRuleSource: string | null;
    regionGroup: string;
    fundingShare: {
      centralPercent: number | null;
      statePercent: number | null;
    };
    policyHighlights: Array<{
      idSlug: string;
      metricName: string;
      numericValue: number | null;
      unit: string | null;
      citationText: string | null;
      citationPage: number | null;
      notes: string | null;
      sourceLabel: string;
    }>;
    stateBenchmarks: Array<{
      idSlug: string;
      metricName: string;
      numericValue: number | null;
      unit: string | null;
      citationText: string | null;
      citationPage: number | null;
      notes: string | null;
      sourceLabel: string;
    }>;
    warningHighlights: Array<{
      idSlug: string;
      metricName: string;
      numericValue: number | null;
      unit: string | null;
      citationText: string | null;
      citationPage: number | null;
      notes: string | null;
      sourceLabel: string;
    }>;
    templateHighlights: Array<{
      idSlug: string;
      metricName: string;
      numericValue: number | null;
      unit: string | null;
      citationText: string | null;
      citationPage: number | null;
      notes: string | null;
      sourceLabel: string;
    }>;
    disclaimerHighlights: Array<{
      idSlug: string;
      metricName: string;
      numericValue: number | null;
      unit: string | null;
      citationText: string | null;
      citationPage: number | null;
      notes: string | null;
      sourceLabel: string;
    }>;
  };
}

// ============================================================================
// GEOGRAPHIC SUITABILITY
// ============================================================================

export interface GeoSuitabilityInput {
  latitude: number;
  longitude: number;
  stateCode: string;
  districtCode: string;
  waterSourceType: 'BOREWELL' | 'OPEN_WELL' | 'CANAL' | 'RIVER' | 'TANK';
  measuredSalinityUsCm?: number;
}

export interface GeoSuitabilityOutput {
  locationId: string;
  suitabilityScore: number;
  waterQualityClassification: WaterType;
  recommendedSystems: SystemSuitability[];
  restrictedSpecies: string[];
  soilAnalysis: SoilAnalysis;
  climateAnalysis: ClimateAnalysis;
  warnings: string[];
}

export interface SystemSuitability {
  system: CultivationSystem;
  suitabilityScore: number;
  confidence: number;
  limitingFactors: string[];
  advantages: string[];
}

export interface SoilAnalysis {
  texture: string;
  ph: Range;
  organicMatterPercent: Range;
  permeability: string;
  suitability: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

export interface ClimateAnalysis {
  temperatureSuitability: number;
  rainfallPattern: string;
  seasonalVariations: string[];
  extremeWeatherRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================================================
// MARKET DATA
// ============================================================================

export interface MarketPriceData {
  id: string;
  speciesId: string;
  speciesName: string;
  marketName: string;
  stateCode: string;
  priceInrPerKg: number;
  grade: string;
  date: Date;
  source: 'NFDB_FMPI' | 'AGMARKNET' | 'MANUAL_ENTRY';
  volumeKg?: number;
}

export interface MarketTrend {
  speciesId: string;
  timeRange: string;
  priceChangePercent: number;
  volumeChangePercent: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  seasonalityFactor: number;
}

// ============================================================================
// SYNC & OFFLINE
// ============================================================================

export interface SyncPayload {
  deviceId: string;
  userId: string;
  lastSyncTimestamp: Date;
  changes: SyncChange[];
}

export interface SyncChange {
  table: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface SyncResponse {
  serverTimestamp: Date;
  changes: SyncChange[];
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  table: string;
  recordId: string;
  serverVersion: Record<string, unknown>;
  clientVersion: Record<string, unknown>;
  resolution: 'SERVER_WINS' | 'CLIENT_WINS' | 'MANUAL';
}

// ============================================================================
// USER & AUTH
// ============================================================================

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  preferredLanguage: string;
  farmerCategory: FarmerCategory;
  stateCode: string;
  districtCode: string;
  village?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

// ============================================================================
// WATER QUALITY LOGGING
// ============================================================================

export interface WaterQualityLog {
  id: string;
  userId: string;
  pondId: string;
  timestamp: Date;
  parameters: WaterQualityParameters;
  alerts: WaterQualityAlert[];
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface WaterQualityParameters {
  temperature?: number;
  dissolvedOxygen?: number;
  ph?: number;
  salinity?: number;
  alkalinity?: number;
  ammonia?: number;
  nitrite?: number;
  turbidity?: number;
}

export interface WaterQualityAlert {
  parameter: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  recommendedAction: string;
}
