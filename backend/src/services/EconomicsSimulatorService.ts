/**
 * Economics Simulator Service
 * Calculates financial projections, ROI, and viability for aquaculture projects
 * Implements PMMSY subsidy integration and sensitivity analysis
 */

import { v4 as uuidv4 } from 'uuid';
import {
  EconomicsSimulatorInput,
  EconomicsSimulatorOutput,
  SpeciesRecommendation,
  RiskAnalysisProfile,
  RiskFactor,
  MonthlyCashFlow,
  SensitivityAnalysis,
  CultivationSystem,
  FarmerCategory,
  RiskTolerance,
  WaterType,
  SpeciesData,
  EconomicData
} from '../types';
import { PMMSYSubsidyService } from './PMMSYSubsidyService';
import { KnowledgeRulesService } from './KnowledgeRulesService';
import { query } from '../db';
import { logger } from '../utils/logger';

// Equipment cost constants from environment
const EQUIPMENT_COSTS = {
  AERATOR_2HP: parseInt(process.env.AERATOR_2HP_INR || '28000'), // Fixed from 1600 (toy) to 28000 (standard paddlewheel)
  VORTEX_BLOWER_550W: parseInt(process.env.VORTEX_BLOWER_550W_INR || '13500'),
  BIOFLOC_TARPAULIN_650GSM: parseInt(process.env.BIOFLOC_TARPAULIN_650GSM_INR || '31000'),
  RAS_PUMP_1HP: parseInt(process.env.RAS_PUMP_1HP_INR || '8500'),
  UV_STERILIZER_40W: parseInt(process.env.UV_STERILIZER_40W_INR || '12000')
};

// Salinity thresholds (μS/cm)
const SALINITY_THRESHOLDS = {
  FRESHWATER_MAX: 1000,
  BRACKISH_MIN: 1000,
  BRACKISH_MAX: 3000,
  SALINE_MIN: 3000
};

// Biofloc fixed constants — Bihar govt scheme cost: ₹7.5L for 7-tank small unit
// (PMMSY 5-year data: small biofloc = ₹7.50L/7 tanks = ₹1.07L/tank, incl. tanks,
// aeration, plumbing, support structure, and electrical — not just the tarpaulin)
const BIOFLOC_CAPEX_PER_TANK = 107143; // Rs 1,07,143 — full setup cost per 10,000L tank

const BIOFLOC_WATER_PREP_PER_TANK = 500; // Salt + CaCO3 + Molasses + Probiotics per cycle

const BIOFLOC_SPECIES_CONSTANTS = {
  PANGASIUS: {
    stockingAvg:         1350,   // fish per 10,000-litre tank
    survivalRate:        0.80,
    harvestWeightKg:     0.50,   // 500 grams
    salePrice:           85,     // Rs/kg wholesale Bihar
    seedCostEach:        3,      // Rs per fingerling
    fcr:                 1.2,    // lower due to floc supplementation
    feedCostPerKg:       35,     // Rs/kg feed
    cycleMonths:         6,
    electricityPerMonth: 700,
    probioticsPerMonth:  400,
    carbonPerMonth:      200,
    miscPerCycle:        1000,
  },
  MANGUR: {
    stockingAvg:         4500,   // fish per 10,000-litre tank
    survivalRate:        0.75,
    harvestWeightKg:     0.25,   // 250 grams
    salePrice:           180,    // Rs/kg premium catfish
    seedCostEach:        5,      // Rs per fingerling
    fcr:                 1.5,
    feedCostPerKg:       40,     // Rs/kg feed
    cycleMonths:         5,
    electricityPerMonth: 700,
    probioticsPerMonth:  400,
    carbonPerMonth:      200,
    miscPerCycle:        1500,
  },
};

export class EconomicsSimulatorService {
  /**
   * Main simulation entry point
   * Calculates complete economics model based on input parameters
   */
  static async simulate(input: EconomicsSimulatorInput): Promise<EconomicsSimulatorOutput> {
    logger.info('Starting economics simulation', {
      landSize: input.landSizeHectares,
      salinity: input.waterSourceSalinityUsCm
    });

    // ── RAS uses a fixed-constant model — bypass the generic pond flow entirely ──
    if ((input as any).systemType === 'RAS') {
      return this.simulateRAS(input);
    }

    // ── Biofloc uses a tank-count model — bypass the generic pond flow entirely ──
    if ((input as any).systemType === 'BIOFLOC') {
      return this.simulateBiofloc(input);
    }

    // ── Cage uses a per-cage fixed-constant model (NFDB/ICAR-CIFRI specs) ──
    if ((input as any).systemType === 'CAGES') {
      return this.simulateCage(input);
    }

    const recommendationId = uuidv4();

    // Step 1: Determine water classification
    const waterType = this.classifyWater(input.waterSourceSalinityUsCm);

    // Step 2: Filter eligible species based on salinity
    const eligibleSpecies = await this.getEligibleSpecies(waterType, input.preferredSpecies);

    // Step 3: Determine optimal cultivation system (scaled per hectare)
    const capitalPerHectare = input.landSizeHectares > 0
      ? input.availableCapitalInr / input.landSizeHectares
      : 0;
    const recommendedSystem = input.systemType || this.determineOptimalSystem(
      waterType,
      input.riskTolerance,
      capitalPerHectare
    );

    // Step 4: Get economic model for recommended system
    const economicModel = await this.getEconomicModel(recommendedSystem, input.preferredSpecies);
    const mappedProjectType = this.mapSystemToProjectType(recommendedSystem, waterType);
    const templateDefaults = await KnowledgeRulesService.getEconomicTemplateDefaults(
      input.stateCode,
      KnowledgeRulesService.mapProjectTypeToKnowledgeProject(mappedProjectType),
      input.preferredSpecies
    );

    // Step 5: Calculate CAPEX with equipment costs
    const totalCapex = this.calculateTotalCapex(
      economicModel,
      input.landSizeHectares,
      recommendedSystem
    );

    // Step 6: Apply PMMSY subsidy (pass land area - Bug 3 fix)
    const { effectiveCapex, subsidyAmount, knowledgeContext } = await PMMSYSubsidyService.calculateEffectiveCapex(
      totalCapex,
      input.farmerCategory,
      mappedProjectType,
      input.landSizeHectares,
      input.stateCode,
      input.preferredSpecies
    );

    const cultureMonths = (economicModel as any).culture_period_months?.max || 12;

    // Step 7: Calculate base OPEX excluding feed
    const { monthlyOpex, totalOpexPerCycle, totalFeedCost } = this.calculateOpexWithFeed(
      economicModel,
      input.landSizeHectares,
      cultureMonths,
      templateDefaults
    );
    
    // Impact of Water Source on OPEX
    let sourceSurcharge = 0;
    if (input.waterSourceType === 'BOREWELL') {
      sourceSurcharge = 2500 * input.landSizeHectares; // Pumping cost
    } else if (input.waterSourceType === 'CANAL' || input.waterSourceType === 'RIVER') {
      sourceSurcharge = 1000 * input.landSizeHectares; // Filtering/Cleaning
    }

    const opexMinusFeed = (totalOpexPerCycle - totalFeedCost) + (sourceSurcharge * cultureMonths);
    const totalOpexWithSurcharge = totalOpexPerCycle + (sourceSurcharge * cultureMonths);

    // Step 8: Calculate potential yield (max potential for the system)
    let { expectedYield, projectedRevenue } = this.calculateRevenue(
      eligibleSpecies,
      economicModel,
      input.landSizeHectares,
      input.riskTolerance
    );

    // No capital efficiency multiplier — having more cash on hand does not automatically
    // increase biological yield. Working capital buffers reduce risk but are already
    // captured by the risk analysis and sensitivity bands.
    const efficiencyFactor = 1.0;

    // Step 10: Generate species recommendations (Calculates individual metrics - Bug FIX)
    const speciesRecommendations = this.generateSpeciesRecommendations(
      eligibleSpecies,
      input,
      economicModel,
      expectedYield,
      effectiveCapex,
      opexMinusFeed,
      templateDefaults
    );

    // Step 11: Base main summary metrics on THE BEST recommendation (Bug FIX)
    const bestRec = speciesRecommendations[0];
    const finalRevenue = bestRec ? (bestRec.expectedRevenueInr * efficiencyFactor) : projectedRevenue;
    const finalProfit = bestRec ? ((bestRec.netProfitInr || 0) * efficiencyFactor - (sourceSurcharge * cultureMonths)) : (finalRevenue - totalOpexWithSurcharge - effectiveCapex);
    const finalBcr = finalRevenue / (effectiveCapex + totalOpexWithSurcharge);

    const finalBreakEvenMonths = this.calculateBreakEven(
      effectiveCapex,
      (monthlyOpex + sourceSurcharge), // Base monthly opex
      finalRevenue,
      templateDefaults.cycleMonths || cultureMonths
    );

    // Step 12: Build risk analysis profile
    const riskProfile = this.buildRiskAnalysis(
      input,
      waterType,
      recommendedSystem,
      speciesRecommendations
    );

    // Step 13: Generate monthly cash flow
    const monthlyCashFlow = this.generateCashFlow(
      effectiveCapex,
      monthlyOpex,
      finalRevenue,
      finalBreakEvenMonths,
      cultureMonths
    );

    // Step 14: Perform sensitivity analysis
    const sensitivityAnalysis = this.performSensitivityAnalysis(
      effectiveCapex,
      totalOpexPerCycle,
      finalRevenue,
      monthlyCashFlow,
      finalBreakEvenMonths
    );

    return {
      recommendationId,
      recommendedSpecies: speciesRecommendations,
      recommendedSystem,
      projectedGrossRevenueInr: Math.round(finalRevenue),
      projectedNetProfitInr: Math.round(finalProfit),
      breakevenTimelineMonths: Math.round(finalBreakEvenMonths),
      totalCapitalExpenditureInr: Math.round(totalCapex),
      subsidizedCapitalExpenditureInr: Math.round(effectiveCapex),
      subsidyAmountInr: Math.round(subsidyAmount),
      benefitCostRatio: finalBcr,
      firstCycleWorkingCapitalInr: Math.round(totalOpexPerCycle),
      totalProjectCostInr: Math.round(effectiveCapex + totalOpexPerCycle),
      availableCapitalInr: input.availableCapitalInr,
      knowledgeInsights: knowledgeContext,
      riskAnalysisProfile: riskProfile,
      monthlyCashFlow,
      sensitivityAnalysis
    };
  }

  private static classifyWater(salinityUsCm: number): WaterType {
    if (salinityUsCm <= SALINITY_THRESHOLDS.FRESHWATER_MAX) {
      return WaterType.FRESHWATER;
    } else if (salinityUsCm <= SALINITY_THRESHOLDS.BRACKISH_MAX) {
      return WaterType.BRACKISH;
    } else {
      return WaterType.SALINE;
    }
  }

  private static async getEligibleSpecies(
    waterType: WaterType,
    preferredSpecies?: string[]
  ): Promise<SpeciesData[]> {
    // Build the base query — salinity filter uses only hardcoded values, no user input
    let queryText = `
      SELECT data FROM knowledge_nodes 
      WHERE node_type = 'SPECIES'
    `;
    const params: unknown[] = [];

    // Map improved species names to standard ones for database query
    let mappedPreferred: string[] | undefined = undefined;
    if (preferredSpecies && preferredSpecies.length > 0) {
      mappedPreferred = preferredSpecies.map(sp => {
        if (sp === 'AhR Jayanti Rohu') return 'Labeo rohita';
        if (sp === 'CIFA-Amrit Catla') return 'Catla catla';
        return sp;
      });
    }

    if (waterType === WaterType.BRACKISH || waterType === WaterType.SALINE) {
      queryText += `
        AND (
          (data->'biological_parameters'->'salinity_tolerance_ppt'->>'max')::numeric > 5
          OR data->>'scientific_name' LIKE '%vannamei%'
          OR data->>'scientific_name' LIKE '%Macrobrachium%'
        )
      `;
    }

    // Fix #1: Use parameterized ANY($N) instead of string interpolation to prevent SQL injection
    if (mappedPreferred && mappedPreferred.length > 0) {
      params.push(mappedPreferred);
      queryText += ` AND data->>'scientific_name' = ANY($${params.length}::text[])`;
    }

    const result = await query<{ data: SpeciesData }>(queryText, params.length > 0 ? params : undefined);
    const baseSpecies = result.rows.map(r => r.data);

    // Dynamically expand to include improved species if the base species are eligible
    const rohuIndex = baseSpecies.findIndex(s => s.scientific_name === 'Labeo rohita');
    const catlaIndex = baseSpecies.findIndex(s => s.scientific_name === 'Catla catla');
    
    const finalSpecies = [...baseSpecies];

    if (rohuIndex !== -1 && (!preferredSpecies || preferredSpecies.includes('AhR Jayanti Rohu') || preferredSpecies.length === 0)) {
      const rohuBase = baseSpecies[rohuIndex];
      const rohuImproved: SpeciesData = {
        ...rohuBase,
        scientific_name: 'AhR Jayanti Rohu',
        common_names: { ...rohuBase.common_names, en: 'AhR Jayanti Rohu (Improved)' },
        description: 'Genetically improved, Aeromonas-resistant strain of Rohu developed by ICAR-CIFA. 58% higher survival rate under bacterial challenges.',
        economic_parameters: {
          ...rohuBase.economic_parameters,
          survival_rate_percent: { min: 80, max: 95 },
          feed_conversion_ratio: { min: 1.4, max: 1.8 }
        },
        culture_period_months: { min: 6, max: 10 }
      } as any;
      
      if (preferredSpecies && preferredSpecies.includes('AhR Jayanti Rohu') && !preferredSpecies.includes('Labeo rohita')) {
        const idx = finalSpecies.findIndex(s => s.scientific_name === 'Labeo rohita');
        if (idx !== -1) finalSpecies.splice(idx, 1);
      }
      finalSpecies.push(rohuImproved);
    }

    if (catlaIndex !== -1 && (!preferredSpecies || preferredSpecies.includes('CIFA-Amrit Catla') || preferredSpecies.length === 0)) {
      const catlaBase = baseSpecies[catlaIndex];
      const catlaImproved: SpeciesData = {
        ...catlaBase,
        scientific_name: 'CIFA-Amrit Catla',
        common_names: { ...catlaBase.common_names, en: 'CIFA-Amrit Catla (Improved)' },
        description: 'Genetically improved strain of Catla released by ICAR-CIFA in 2024, featuring a deeper body and smaller head for higher fillet yield.',
        economic_parameters: {
          ...catlaBase.economic_parameters,
          survival_rate_percent: { min: 75, max: 90 },
          market_price_per_kg_inr: { min: 145, max: 210 }
        },
        culture_period_months: { min: 6, max: 10 }
      } as any;

      if (preferredSpecies && preferredSpecies.includes('CIFA-Amrit Catla') && !preferredSpecies.includes('Catla catla')) {
        const idx = finalSpecies.findIndex(s => s.scientific_name === 'Catla catla');
        if (idx !== -1) finalSpecies.splice(idx, 1);
      }
      finalSpecies.push(catlaImproved);
    }

    return finalSpecies;
  }

  private static determineOptimalSystem(
    waterType: WaterType,
    riskTolerance: RiskTolerance,
    capitalPerHectare: number
  ): CultivationSystem {
    if (waterType === WaterType.SALINE || waterType === WaterType.BRACKISH) {
      return CultivationSystem.BRACKISH_POND;
    }

    if (capitalPerHectare < 150000) {
      return CultivationSystem.TRADITIONAL_POND;
    }

    if (riskTolerance === RiskTolerance.HIGH && capitalPerHectare > 1500000) {
      return CultivationSystem.RAS;
    }

    if (capitalPerHectare > 600000) {
      return CultivationSystem.BIOFLOC;
    }

    return CultivationSystem.TRADITIONAL_POND;
  }

  private static async getEconomicModel(
    system: CultivationSystem,
    preferredSpecies?: string[]
  ): Promise<EconomicData> {

    // First try: Find an exact species match for the given system
    if (preferredSpecies && preferredSpecies.length > 0) {
      for (const species of preferredSpecies) {
        const exactMatch = await query<{ data: EconomicData }>(`
          SELECT data FROM knowledge_nodes 
          WHERE node_type = 'ECONOMIC_MODEL' 
          AND data->>'system_type' = $1
          AND data->>'target_species' = $2
          LIMIT 1
        `, [system, species]);

        if (exactMatch.rows.length > 0) {
          logger.info(`Loaded exact economic model for species: ${species} using system: ${system}`);
          return exactMatch.rows[0].data;
        }
      }
    }

    // Second try: Find ANY model matching the target species regardless of system (if strongly preferred)
    if (preferredSpecies && preferredSpecies.length > 0) {
      for (const species of preferredSpecies) {
        const speciesMatch = await query<{ data: EconomicData }>(`
            SELECT data FROM knowledge_nodes 
            WHERE node_type = 'ECONOMIC_MODEL' 
            AND data->>'target_species' = $1
            LIMIT 1
          `, [species]);

        if (speciesMatch.rows.length > 0) {
          logger.info(`Loaded specific economic model for species: ${species} (ignoring preferred system)`);
          return speciesMatch.rows[0].data;
        }
      }
    }

    // Third try: Find a generic model for the target system without a specific species
    const result = await query<{ data: EconomicData }>(`
      SELECT data FROM knowledge_nodes 
      WHERE node_type = 'ECONOMIC_MODEL' 
      AND data->>'system_type' = $1
      AND data->>'target_species' IS NULL
      LIMIT 1
    `, [system]);

    if (result.rows.length > 0) {
      logger.info(`Loaded generic economic model for system: ${system}`);
      return result.rows[0].data;
    }

    // Fallback if nothing else works
    logger.warn(`No economic model found for system: ${system} or preferred species. Falling back to TRADITIONAL_POND.`);
    const fallback = await query<{ data: EconomicData }>(`
      SELECT data FROM knowledge_nodes 
      WHERE node_type = 'ECONOMIC_MODEL' 
      AND data->>'system_type' = 'TRADITIONAL_POND'
      LIMIT 1
    `);

    if (fallback.rows.length === 0) {
      throw new Error(`Critical: No economic models found in database.`);
    }
    return fallback.rows[0].data;
  }

  private static calculateTotalCapex(
    model: EconomicData,
    landSizeHectares: number,
    system: CultivationSystem
  ): number {
    const capex = model.capital_expenditure;
    let total = 0;

    total += (capex.land_preparation_inr_per_hectare || 0) * landSizeHectares;
    total += (capex.pond_construction_inr_per_hectare || 0) * landSizeHectares;

    if (system === CultivationSystem.BIOFLOC) {
      const tanksNeeded = Math.ceil(landSizeHectares / 0.1);
      total += tanksNeeded * EQUIPMENT_COSTS.BIOFLOC_TARPAULIN_650GSM;
      total += tanksNeeded * EQUIPMENT_COSTS.VORTEX_BLOWER_550W;
    } else if (system === CultivationSystem.TRADITIONAL_POND || system === CultivationSystem.BRACKISH_POND) {
      const aeratorsNeeded = Math.ceil(landSizeHectares / 0.5);
      total += aeratorsNeeded * EQUIPMENT_COSTS.AERATOR_2HP;
    } else if (system === CultivationSystem.RAS) {
      total += (EQUIPMENT_COSTS.RAS_PUMP_1HP * 4) * landSizeHectares;
      total += (EQUIPMENT_COSTS.UV_STERILIZER_40W * 2) * landSizeHectares;
    }

    total += (capex.initial_stocking_cost_inr || 0) * landSizeHectares;
    total += total * ((capex.contingency_percent || 0) / 100);

    return total;
  }

  private static mapSystemToProjectType(
    system: CultivationSystem,
    waterType: WaterType
  ): 'FRESHWATER' | 'BRACKISH' | 'RAS' | 'INTEGRATED' {
    if (system === CultivationSystem.RAS) return 'RAS';
    if (waterType === WaterType.BRACKISH || waterType === WaterType.SALINE || system === CultivationSystem.BRACKISH_POND) return 'BRACKISH';
    return 'FRESHWATER';
  }

  private static calculateOpexWithFeed(
    model: EconomicData,
    landSizeHectares: number,
    months: number,
    templateDefaults?: {
      feedPriceInrPerKg: number | null;
      fcrAverage: number | null;
    }
  ): { monthlyOpex: number; totalOpexPerCycle: number; totalFeedCost: number } {
    const opex = model.operational_expenditure;
    const revenue = model.revenue_projections;

    // Average expected yield for calculations
    const avgYieldKg = ((revenue.expected_yield_kg_per_hectare.min + revenue.expected_yield_kg_per_hectare.max) / 2) * landSizeHectares;

    // Feed logic: 50% - 70% of cost is usually feed. 
    // We use the feed_cost_inr_per_kg_fish metric.
    const knowledgeFeedCostPerKgFish =
      templateDefaults?.feedPriceInrPerKg != null && templateDefaults?.fcrAverage != null
        ? templateDefaults.feedPriceInrPerKg * templateDefaults.fcrAverage
        : null;
    const totalFeedCost = avgYieldKg * (knowledgeFeedCostPerKgFish || opex.feed_cost_inr_per_kg_fish || 45);

    const laborElectricityMonthly = (
      (opex.electricity_cost_inr_per_month || 0) +
      (opex.labor_cost_inr_per_month || 0)
    ) * landSizeHectares;

    const totalMedicine = (opex.medicine_cost_inr_per_cycle || 0) * landSizeHectares;

    const subTotal = (laborElectricityMonthly * months) + totalFeedCost + totalMedicine;
    const totalOpexPerCycle = subTotal + (subTotal * ((opex.miscellaneous_percent || 0) / 100));

    // Monthly average including feed amortized
    const monthlyOpex = totalOpexPerCycle / months;

    return { monthlyOpex, totalOpexPerCycle, totalFeedCost };
  }

  private static calculateRevenue(
    species: SpeciesData[],
    model: EconomicData,
    landSizeHectares: number,
    riskTolerance: RiskTolerance
  ): { projectedRevenue: number; expectedYield: number } {
    const revenue = model.revenue_projections;
    
    // Dynamically adjust percentiles based on risk tolerance
    let yieldPercentile = 0.35;
    let pricePercentile = 0.40;
    
    if (riskTolerance === RiskTolerance.LOW) {
      yieldPercentile = 0.20;
      pricePercentile = 0.30;
    } else if (riskTolerance === RiskTolerance.HIGH) {
      yieldPercentile = 0.50;
      pricePercentile = 0.50;
    }

    const yieldRange = revenue.expected_yield_kg_per_hectare.max - revenue.expected_yield_kg_per_hectare.min;
    const conservativeYield = revenue.expected_yield_kg_per_hectare.min + yieldRange * yieldPercentile;
    
    const priceRange = revenue.market_price_inr_per_kg.max - revenue.market_price_inr_per_kg.min;
    const conservativePrice = revenue.market_price_inr_per_kg.min + priceRange * pricePercentile;

    const totalYield = conservativeYield * landSizeHectares;
    const totalRevenue = totalYield * conservativePrice;

    return { projectedRevenue: totalRevenue, expectedYield: totalYield };
  }

  private static calculateBreakEven(
    effectiveCapex: number,
    monthlyOpex: number,
    projectedRevenue: number,
    cultureMonths: number
  ): number {
    // Correct logic: Payback usually happens in cycles.
    // Fixed recovery = Single cycle revenue - single cycle opex
    const profitPerCycle = projectedRevenue - (monthlyOpex * cultureMonths);

    if (profitPerCycle <= 0) return 999; // Never breaks even

    const cyclesToRecover = effectiveCapex / profitPerCycle;
    return Math.ceil(cyclesToRecover * cultureMonths);
  }

  private static generateSpeciesRecommendations(
    species: SpeciesData[],
    input: EconomicsSimulatorInput,
    model: EconomicData,
    expectedYield: number,
    effectiveCapex: number,
    opexMinusFeed: number,
    templateDefaults?: {
      feedPriceInrPerKg: number | null;
      fcrAverage: number | null;
      survivalPercent: number | null;
    }
  ): SpeciesRecommendation[] {
    return species.map(s => {
      const speciesFcr =
        s.economic_parameters.feed_conversion_ratio?.min != null &&
        s.economic_parameters.feed_conversion_ratio?.max != null
          ? (s.economic_parameters.feed_conversion_ratio.min +
            s.economic_parameters.feed_conversion_ratio.max) / 2
          : null;
      const avgFcr = templateDefaults?.fcrAverage ?? speciesFcr ?? 1.8;
      const avgPrice = (s.economic_parameters.market_price_per_kg_inr?.min +
        s.economic_parameters.market_price_per_kg_inr?.max) / 2 || 120;

      // Use the minimum (pessimistic) survival rate — disease, water quality events,
      // and handling losses mean first-cycle farmers rarely achieve peak survival.
      let survivalPercent = templateDefaults?.survivalPercent ?? (s.economic_parameters.survival_rate_percent?.min || 70);
      
      // Adjust survival rate based on risk tolerance
      if (input.riskTolerance === RiskTolerance.LOW) {
        survivalPercent = Math.min(95, survivalPercent + 3);
      } else if (input.riskTolerance === RiskTolerance.HIGH) {
        survivalPercent = Math.max(50, survivalPercent - 5);
      }

      const speciesYield = expectedYield * (survivalPercent / 100);
      const estRevenue = speciesYield * avgPrice;

      // Calculate specific OPEX for this species (Feed cost varies by species FCR)
      const feedPrice = templateDefaults?.feedPriceInrPerKg ?? 60;
      const feedCost = speciesYield * avgFcr * feedPrice;

      // Shorter crop duration savings:
      const systemCultureMonths = model.culture_period_months?.max || 12;
      const speciesCultureMonths = s.culture_period_months?.max || 12;
      const scaledOpexMinusFeed = opexMinusFeed * (speciesCultureMonths / systemCultureMonths);

      const totalOpexMatch = scaledOpexMinusFeed + feedCost;
      const netProfit = estRevenue - totalOpexMatch - effectiveCapex;
      const totalInvest = effectiveCapex + totalOpexMatch;
      const bcr = totalInvest > 0 ? (estRevenue / totalInvest) : 0;

      // Start with a lower base score
      let score = 55;

      // 1. Capital Alignment — guard against landSizeHectares = 0
      const capitalPerHa = input.landSizeHectares > 0
        ? input.availableCapitalInr / input.landSizeHectares
        : 0;
      if (capitalPerHa < 120000 && (avgFcr < 1.3 || s.scientific_name.includes('vannamei'))) {
        score -= 20;
      } else if (capitalPerHa > 500000) {
        score += 10;
      }

      // 2. Risk Tolerance Alignment
      const isHighValue = avgPrice > 300;
      if (input.riskTolerance === RiskTolerance.LOW && (isHighValue || avgFcr < 1.2)) {
        score -= 20;
      } else if (input.riskTolerance === RiskTolerance.HIGH && isHighValue) {
        score += 15;
      }

      // 3. Efficiency (FCR) Score
      if (avgFcr < 1.4) score += 15;
      else if (avgFcr > 2.2) score -= 15;

      // 4. Profitability
      if (bcr > 2.5) score += 20;
      else if (bcr > 1.8) score += 10;
      else if (bcr < 1.0) score -= 25;

      // 5. Genetically Improved Bonus
      if (s.scientific_name === 'AhR Jayanti Rohu' || s.scientific_name === 'CIFA-Amrit Catla') {
        score += 15;
      }

      const compatibilityReasons = [
        `FCR: ${avgFcr.toFixed(2)} (${avgFcr < 1.5 ? 'Very Efficient' : 'Standard'})`,
        `BCR: ${bcr.toFixed(2)}:1`,
        `Est. Survival: ${survivalPercent}%`
      ];

      if (s.scientific_name === 'AhR Jayanti Rohu') {
        compatibilityReasons.push("Disease resistant: 58% higher survival under bacterial challenge");
        compatibilityReasons.push("Faster growth: Reaches market weight in 10-14 months (saves 2 months of feed)");
      } else if (s.scientific_name === 'CIFA-Amrit Catla') {
        compatibilityReasons.push("Faster growth: Reaches 1.5-2.5 kg in 10-12 months (20-30% faster)");
        compatibilityReasons.push("Higher value: smaller head & deeper body means more meat and 10% price premium");
      }

      return {
        speciesId: s.scientific_name,
        commonName: s.common_names?.en || 'Unknown',
        scientificName: s.scientific_name,
        compatibilityScore: Math.min(100, Math.max(10, Math.round(score))),
        expectedYieldKg: Math.round(speciesYield),
        expectedRevenueInr: Math.round(estRevenue),
        netProfitInr: Math.round(netProfit),
        benefitCostRatio: Math.round(bcr * 100) / 100,
        fcr: avgFcr,
        compatibilityReasons
      };
    }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  private static buildRiskAnalysis(
    input: EconomicsSimulatorInput,
    waterType: WaterType,
    system: CultivationSystem,
    speciesRecs: SpeciesRecommendation[]
  ): RiskAnalysisProfile {
    const riskFactors: RiskFactor[] = [];
    let overallRisk = input.riskTolerance;

    if (waterType === WaterType.SALINE) {
      riskFactors.push({
        category: 'Water Quality',
        probability: 0.3,
        impact: 0.8,
        description: 'High salinity limits species options'
      });
    }

    if (input.availableCapitalInr < 100000) {
      riskFactors.push({
        category: 'Financial',
        probability: 0.4,
        impact: 0.6,
        description: 'Limited capital may constrain emergency responses'
      });
    }

    if (system === CultivationSystem.RAS) {
      riskFactors.push({
        category: 'Technical',
        probability: 0.35,
        impact: 0.9,
        description: 'RAS requires continuous power and technical expertise'
      });
      overallRisk = RiskTolerance.HIGH;
    }

    if (system === CultivationSystem.BIOFLOC) {
      riskFactors.push({
        category: 'Operational',
        probability: 0.25,
        impact: 0.5,
        description: 'Biofloc requires consistent aeration and monitoring'
      });
    }

    let mortalityRiskPercent = 15;
    let marketPriceVolatility = 0.15;
    
    if (input.riskTolerance === RiskTolerance.LOW) {
      mortalityRiskPercent = 10;
      marketPriceVolatility = 0.08;
    } else if (input.riskTolerance === RiskTolerance.HIGH) {
      mortalityRiskPercent = 25;
      marketPriceVolatility = 0.25;
    }

    return {
      overallRisk,
      riskFactors,
      mitigationStrategies: this.getMitigationStrategies(riskFactors),
      mortalityRiskPercent,
      marketPriceVolatility
    };
  }

  private static getMitigationStrategies(risks: RiskFactor[]): string[] {
    const strategies: string[] = [];
    const riskCategories = new Set(risks.map(r => r.category));

    if (riskCategories.has('Water Quality')) {
      strategies.push('Install water quality monitoring system');
      strategies.push('Maintain emergency water exchange capability');
    }

    if (riskCategories.has('Financial')) {
      strategies.push('Apply for PMMSY subsidy to reduce capital burden');
      strategies.push('Consider cooperative farming to share costs');
    }

    if (riskCategories.has('Technical')) {
      strategies.push('Arrange backup power supply (generator)');
      strategies.push('Receive training on system management');
    }

    if (riskCategories.has('Operational')) {
      strategies.push('Implement daily monitoring protocol');
      strategies.push('Maintain relationship with technical expert');
    }

    return strategies;
  }

  private static generateCashFlow(
    capex: number,
    monthlyOpex: number,
    projectedRevenue: number,
    breakEvenMonths: number,
    cultureMonths: number
  ): MonthlyCashFlow[] {
    const cashFlow: MonthlyCashFlow[] = [];
    // Fix #13: Start cumulative at 0 (not -capex). Month 1 expenses include capex,
    // so the cumulative correctly becomes -(capex) after month 1 is processed.
    // The old code started at -capex AND subtracted capex again in month 1,
    // producing -2×capex which made the chart look twice as bad as reality.
    let cumulativeCashFlow = 0;

    for (let month = 1; month <= cultureMonths; month++) {
      const revenue = month === cultureMonths ? projectedRevenue : 0;
      const staticExpenses = month === 1 ? capex : monthlyOpex;
      const netCashFlow = revenue - staticExpenses;
      cumulativeCashFlow += netCashFlow;

      cashFlow.push({
        month,
        revenue: Math.round(revenue),
        expenses: Math.round(staticExpenses),
        netCashFlow: Math.round(netCashFlow),
        cumulativeCashFlow: Math.round(cumulativeCashFlow)
      });
    }

    return cashFlow;
  }

  private static performSensitivityAnalysis(
    capex: number,
    opex: number,
    revenue: number,
    cashFlow: MonthlyCashFlow[],
    breakEvenMonths: number
  ): SensitivityAnalysis {
    const baseProfit = revenue - capex - opex;
    const baseBcRatio = revenue / (capex + opex);

    return {
      bestCase: {
        netProfit: Math.round(baseProfit * 1.25),
        breakEvenMonths: Math.max(1, Math.round(breakEvenMonths * 0.8)),
        benefitCostRatio: Math.round(baseBcRatio * 1.2 * 100) / 100
      },
      worstCase: {
        netProfit: Math.round(baseProfit * 0.6),
        breakEvenMonths: Math.round(breakEvenMonths * 1.4),
        benefitCostRatio: Math.round(baseBcRatio * 0.7 * 100) / 100
      },
      priceDrop10Percent: Math.round(revenue * 0.9 - capex - opex),
      priceIncrease10Percent: Math.round(revenue * 1.1 - capex - opex),
      yieldDrop15Percent: Math.round(revenue * 0.85 - capex - opex),
      feedCostIncrease20Percent: Math.round(revenue - capex - (opex * 1.2))
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RAS SIMULATION — Fixed-constant backyard unit model
  // Standard unit: 90,000-litre tank, 100 sqm footprint, 3 floating cages
  // Source: ICAR/NFDB backyard RAS unit specifications
  // ─────────────────────────────────────────────────────────────────────────────

  private static async simulateRAS(input: any): Promise<EconomicsSimulatorOutput> {
    const units: number = (input as any).numberOfRasUnits || 1;
    const recommendationId = uuidv4();

    // ── Fixed constants per unit ──────────────────────────────────────────────
    const CAPEX_PER_UNIT          = 750000;    // Rs 7,50,000 (Small RAS 100m³ — PMMSY scheme unit cost)
    const OPEX_PER_CYCLE          = 140000;    // Rs 1,40,000 per cycle
    const CYCLES_PER_YEAR         = 2;
    const FINGERLINGS_PER_UNIT    = 4500;
    
    // Scale survival rate and sale price by risk tolerance
    let SURVIVAL_RATE             = 0.80;      // 80% default
    let SALE_PRICE_PER_KG         = 150;       // Rs 150/kg default
    if (input.riskTolerance === 'LOW') {
      SURVIVAL_RATE               = 0.83;
      SALE_PRICE_PER_KG           = 140;       // lower conservative price
    } else if (input.riskTolerance === 'HIGH') {
      SURVIVAL_RATE               = 0.75;
      SALE_PRICE_PER_KG           = 160;       // higher optimistic price
    }

    const HARVEST_WEIGHT_KG       = 0.45;      // 450 grams per fish
    const YIELD_PER_CYCLE_KG      = FINGERLINGS_PER_UNIT * SURVIVAL_RATE * HARVEST_WEIGHT_KG; // 1,620 kg
    const CYCLE_MONTHS            = 6;         // 6-month culture period
    const LAND_SQM_PER_UNIT       = 100;       // 100 square meters per unit

    // ── Scale to N units ──────────────────────────────────────────────────────
    const totalCapex              = CAPEX_PER_UNIT * units;
    const opexPerCycle            = OPEX_PER_CYCLE * units;
    const annualOpex              = opexPerCycle * CYCLES_PER_YEAR;               // Rs 2,80,000 × N
    const yieldPerCycleKg         = YIELD_PER_CYCLE_KG * units;                  // 1,620 × N kg
    const annualYieldKg           = yieldPerCycleKg * CYCLES_PER_YEAR;           // 3,240 × N kg
    const annualRevenue           = annualYieldKg * SALE_PRICE_PER_KG;           // Rs 4,86,000 × N
    const annualGrossProfit       = annualRevenue - annualOpex;                   // Rs 2,06,000 × N
    const firstCycleWorkingCap    = opexPerCycle;                                 // Rs 1,40,000 × N
    const landRequiredSqm         = units * LAND_SQM_PER_UNIT;

    // ── Apply PMMSY subsidy on CAPEX ──────────────────────────────────────────
    // RAS cap is ₹8L per hectare. With 100 sqm/unit the real land is ~0.01 ha,
    // capping subsidy to ₹8,000 — near zero. Use scheme units as ha equivalent
    // so 1 unit = 1 ha in the cap formula (cap = ₹8L × units, which is generous).
    const landHectaresForCap = units; // 1 RAS unit = 1 ha equivalent for cap
    const { effectiveCapex, subsidyAmount, knowledgeContext } =
      await PMMSYSubsidyService.calculateEffectiveCapex(
        totalCapex,
        input.farmerCategory,
        'RAS',
        landHectaresForCap,
        input.stateCode,
        undefined
      );

    // ── Derived metrics ───────────────────────────────────────────────────────
    const totalProjectCost  = effectiveCapex + firstCycleWorkingCap;
    // Operational BCR: how many rupees of revenue per rupee of running cost
    const bcr               = annualOpex > 0 ? annualRevenue / annualOpex : 0;
    // Break-even: months to recover subsidised CAPEX from annual gross profit
    const breakEvenMonths   = annualGrossProfit > 0
      ? Math.ceil((effectiveCapex / annualGrossProfit) * 12)
      : 999;

    // ── Species recommendations — RAS-specific ────────────────────────────────
    const rasSpecies: SpeciesRecommendation[] = [
      {
        speciesId: 'Oreochromis niloticus',
        commonName: 'Monosex GIFT Tilapia',
        scientificName: 'Oreochromis niloticus',
        compatibilityScore: 95,
        expectedYieldKg: Math.round(annualYieldKg),
        expectedRevenueInr: Math.round(annualRevenue),
        netProfitInr: Math.round(annualGrossProfit - effectiveCapex),
        benefitCostRatio: Math.round(bcr * 100) / 100,
        fcr: 1.4,
        compatibilityReasons: [
          'Primary recommended species for RAS in India',
          'FCR 1.4 — excellent feed efficiency',
          'Monosex culture gives uniform growth across all 3 floating cages',
          '80% survival rate in controlled recirculating environment',
          `Standard yield: ${YIELD_PER_CYCLE_KG} kg/cycle × 2 = ${YIELD_PER_CYCLE_KG * 2} kg/year per unit`,
        ],
      },
      {
        speciesId: 'Pangasianodon hypophthalmus',
        commonName: 'Pangasius',
        scientificName: 'Pangasianodon hypophthalmus',
        compatibilityScore: 80,
        expectedYieldKg: Math.round(annualYieldKg * 0.88),
        expectedRevenueInr: Math.round(annualYieldKg * 0.88 * 130),
        netProfitInr: Math.round(annualYieldKg * 0.88 * 130 - annualOpex - effectiveCapex),
        benefitCostRatio: Math.round(((annualYieldKg * 0.88 * 130) / annualOpex) * 100) / 100,
        fcr: 1.6,
        compatibilityReasons: [
          'High tolerance for elevated stocking density in RAS tanks',
          'FCR 1.6 — efficient',
          'Fast-growing with consistent wholesale market demand',
          'Slightly lower yield than Tilapia in the same RAS setup',
        ],
      },
      {
        // Pearlspot (Etroplus suratensis) REMOVED — coastal estuarine species
        // native to southern India; cannot survive North Indian winters; no
        // seed hatcheries in Bihar/UP. Replaced with Pabda (Ompok pabda),
        // a high-value freshwater catfish native to the Gangetic plains.
        speciesId: 'Ompok pabda',
        commonName: 'Pabda / Butter Catfish',
        scientificName: 'Ompok pabda',
        compatibilityScore: 72,
        expectedYieldKg: Math.round(annualYieldKg * 0.68),
        expectedRevenueInr: Math.round(annualYieldKg * 0.68 * 280),
        netProfitInr: Math.round(annualYieldKg * 0.68 * 280 - annualOpex - effectiveCapex),
        benefitCostRatio: Math.round(((annualYieldKg * 0.68 * 280) / annualOpex) * 100) / 100,
        fcr: 1.75,
        compatibilityReasons: [
          'High-value Gangetic plains catfish — Rs 200–400/kg farm gate in Bihar/UP',
          'FCR 1.5–2.0 in RAS — moderate feed efficiency',
          'Air-breathing capability gives tolerance to brief DO fluctuations',
          'Strong local demand; prized as a delicacy in Bihar and Bengal',
          'Seed available from ICAR-CIFA and state fisheries hatcheries',
        ],
      },
    ];

    // ── Monthly cash flow — 2 full cycles (12 months shown) ──────────────────
    const monthlyCashFlow = this.generateRASCashFlow(
      effectiveCapex,
      opexPerCycle,
      yieldPerCycleKg * SALE_PRICE_PER_KG,
      CYCLE_MONTHS
    );

    return {
      recommendationId,
      recommendedSpecies: rasSpecies,
      recommendedSystem: CultivationSystem.RAS,
      projectedGrossRevenueInr:       Math.round(annualRevenue),
      projectedNetProfitInr:          Math.round(annualGrossProfit),
      breakevenTimelineMonths:        breakEvenMonths,
      totalCapitalExpenditureInr:     Math.round(totalCapex),
      subsidizedCapitalExpenditureInr: Math.round(effectiveCapex),
      subsidyAmountInr:               Math.round(subsidyAmount),
      benefitCostRatio:               Math.round(bcr * 100) / 100,
      firstCycleWorkingCapitalInr:    Math.round(firstCycleWorkingCap),
      totalProjectCostInr:            Math.round(totalProjectCost),
      availableCapitalInr:            input.availableCapitalInr,
      knowledgeInsights:              knowledgeContext,
      riskAnalysisProfile: {
        overallRisk: RiskTolerance.HIGH,
        riskFactors: [
          {
            category: 'Technical',
            probability: 0.35,
            impact: 0.9,
            description: 'RAS requires uninterrupted power supply — fish can die within hours of aeration failure',
          },
          {
            category: 'Financial',
            probability: 0.20,
            impact: 0.70,
            description: `High upfront CAPEX of Rs ${totalCapex.toLocaleString('en-IN')} — apply for PMMSY/Bihar Yojana subsidy (50–80% for eligible categories)`,
          },
          {
            category: 'Operational',
            probability: 0.25,
            impact: 0.60,
            description: 'Bio-filter management and ammonia control require daily monitoring expertise',
          },
        ],
        mitigationStrategies: [
          'Install backup generator — power failure is the #1 risk in RAS',
          'Apply for Bihar Yojana/PMMSY subsidy: 50% for General, 70% for SC/ST/EBC, 80% for solar pump',
          'Complete NFDB or KVK-certified RAS management training before stocking',
          'Maintain 2-week emergency feed stock at all times',
          'Daily water quality checks: DO > 4 ppm, pH 7–8, Ammonia < 0.05 ppm',
          'Keep spare pump and aerator parts on hand',
        ],
        mortalityRiskPercent: input.riskTolerance === 'LOW' ? 15 : input.riskTolerance === 'HIGH' ? 30 : 20,
        marketPriceVolatility: input.riskTolerance === 'LOW' ? 0.05 : input.riskTolerance === 'HIGH' ? 0.15 : 0.10,
      },
      monthlyCashFlow,
      sensitivityAnalysis: {
        bestCase: {
          netProfit:          Math.round(annualGrossProfit * 1.20),
          breakEvenMonths:    Math.max(6, Math.round(breakEvenMonths * 0.80)),
          benefitCostRatio:   Math.round(bcr * 1.15 * 100) / 100,
        },
        worstCase: {
          netProfit:          Math.round(annualGrossProfit * 0.65),
          breakEvenMonths:    Math.round(breakEvenMonths * 1.35),
          benefitCostRatio:   Math.round(bcr * 0.78 * 100) / 100,
        },
        priceDrop10Percent:         Math.round(annualRevenue * 0.90 - annualOpex),
        priceIncrease10Percent:     Math.round(annualRevenue * 1.10 - annualOpex),
        yieldDrop15Percent:         Math.round(annualRevenue * 0.85 - annualOpex),
        feedCostIncrease20Percent:  Math.round(annualRevenue - annualOpex * 1.14), // feed ~70% of opex
      },
    };
  }

  private static generateRASCashFlow(
    capex: number,
    opexPerCycle: number,
    cycleRevenue: number,
    cycleMonths: number
  ): MonthlyCashFlow[] {
    // Show 2 complete cycles = 1 full year of operation
    const totalMonths = cycleMonths * 2;
    const cashFlow: MonthlyCashFlow[] = [];
    let cumulativeCashFlow = 0;

    for (let month = 1; month <= totalMonths; month++) {
      const isCycleEnd   = month % cycleMonths === 0;
      const isFirstMonth = month === 1;
      const isCycleStart = !isFirstMonth && (month - 1) % cycleMonths === 0;

      // Revenue arrives at end of each 6-month cycle on harvest day
      const revenue = isCycleEnd ? cycleRevenue : 0;
      // CAPEX is a one-time hit on month 1 combined with first cycle OPEX
      // Each subsequent cycle start triggers its OPEX spend
      const expenses = isFirstMonth
        ? capex + opexPerCycle
        : isCycleStart
          ? opexPerCycle
          : 0;

      const netCashFlow = revenue - expenses;
      cumulativeCashFlow += netCashFlow;

      cashFlow.push({
        month,
        revenue:            Math.round(revenue),
        expenses:           Math.round(expenses),
        netCashFlow:        Math.round(netCashFlow),
        cumulativeCashFlow: Math.round(cumulativeCashFlow),
      });
    }
    return cashFlow;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BIOFLOC SIMULATION — Tank-count model
  // Unit: 10,000-litre circular tarpaulin tank
  // Species: Pangasius (1,350 fish/tank) or Desi Mangur/Singhi (4,500 fish/tank)
  // Source: Bihar Government Biofloc Technology Guidelines
  // ─────────────────────────────────────────────────────────────────────────────

  private static async simulateBiofloc(input: any): Promise<EconomicsSimulatorOutput> {
    const tanks: number    = (input as any).numberOfBioflocTanks || 1;
    const speciesKey       = (((input as any).bioflocSpecies as 'PANGASIUS' | 'MANGUR') || 'PANGASIUS');
    const sc               = { ...BIOFLOC_SPECIES_CONSTANTS[speciesKey] };
    
    // Scale survival rate and sale price by risk tolerance
    if (input.riskTolerance === 'LOW') {
      sc.survivalRate      = Math.min(0.95, sc.survivalRate + 0.03);
      sc.salePrice         = sc.salePrice - 5;
    } else if (input.riskTolerance === 'HIGH') {
      sc.survivalRate      = Math.max(0.50, sc.survivalRate - 0.05);
      sc.salePrice         = sc.salePrice + 10;
    }
    
    const recommendationId = uuidv4();

    // ── Per-tank production ───────────────────────────────────────────────────
    const fishStocked        = sc.stockingAvg;
    const fishSurviving      = Math.round(fishStocked * sc.survivalRate);
    const yieldPerCycleKg    = fishSurviving * sc.harvestWeightKg;           // kg per tank per cycle

    // ── Per-tank OPEX per cycle ───────────────────────────────────────────────
    const seedCost           = fishStocked * sc.seedCostEach;
    const feedCost           = yieldPerCycleKg * sc.fcr * sc.feedCostPerKg;
    const electricityCost    = sc.electricityPerMonth * sc.cycleMonths;
    const probioticsCost     = sc.probioticsPerMonth * sc.cycleMonths;
    const carbonCost         = sc.carbonPerMonth * sc.cycleMonths;
    const opexPerTankPerCycle = seedCost + feedCost + electricityCost +
                                probioticsCost + carbonCost +
                                BIOFLOC_WATER_PREP_PER_TANK + sc.miscPerCycle;

    // ── Scale to T tanks ──────────────────────────────────────────────────────
    const CYCLES_PER_YEAR      = 2;
    const totalCapex           = BIOFLOC_CAPEX_PER_TANK * tanks;
    const opexPerCycleTotal    = opexPerTankPerCycle * tanks;
    const annualOpex           = opexPerCycleTotal * CYCLES_PER_YEAR;
    const annualYieldKg        = yieldPerCycleKg * CYCLES_PER_YEAR * tanks;
    const annualRevenue        = annualYieldKg * sc.salePrice;
    const annualGrossProfit    = annualRevenue - annualOpex;
    const firstCycleWorkingCap = opexPerCycleTotal;

    // ── PMMSY subsidy on CAPEX ────────────────────────────────────────────────
    // The land-based subsidy cap formula (₹4L × ha) breaks for intensive systems
    // where physical footprint is tiny. Instead, express tank count in terms of
    // PMMSY scheme units (1 unit = 7 tanks = ~1 ha equivalent for cap purposes).
    // Only apply subsidy when tank count meets the govt scheme minimum of 7 tanks.
    const schemeUnits = tanks >= 7 ? Math.max(1, tanks / 7) : 0;
    const landHectaresForCap = schemeUnits; // 1 scheme unit = 1 ha in cap formula
    const { effectiveCapex, subsidyAmount, knowledgeContext } =
      await PMMSYSubsidyService.calculateEffectiveCapex(
        totalCapex,
        input.farmerCategory,
        'FRESHWATER',
        landHectaresForCap,
        input.stateCode,
        undefined
      );

    // ── Derived metrics ───────────────────────────────────────────────────────
    const totalProjectCost = effectiveCapex + firstCycleWorkingCap;
    const bcr              = annualOpex > 0 ? annualRevenue / annualOpex : 0;
    const breakEvenMonths  = annualGrossProfit > 0
      ? Math.ceil((effectiveCapex / annualGrossProfit) * 12)
      : 999;

    // ── Species recommendation cards ──────────────────────────────────────────
    const primarySpecies: SpeciesRecommendation = speciesKey === 'PANGASIUS'
      ? {
          speciesId:          'Pangasianodon hypophthalmus',
          commonName:         'Pangasius',
          scientificName:     'Pangasianodon hypophthalmus',
          compatibilityScore: 90,
          expectedYieldKg:    Math.round(annualYieldKg),
          expectedRevenueInr: Math.round(annualRevenue),
          netProfitInr:       Math.round(annualGrossProfit - effectiveCapex),
          benefitCostRatio:   Math.round(bcr * 100) / 100,
          fcr:                sc.fcr,
          compatibilityReasons: [
            `Stocking: ${sc.stockingAvg} fish per tank (avg), 80% survival`,
            `FCR ${sc.fcr} in Biofloc — lower feed cost vs conventional (floc supplements diet)`,
            `Yield: ${yieldPerCycleKg} kg/tank/cycle × 2 cycles = ${yieldPerCycleKg * 2} kg/tank/year`,
            `Sale price Rs ${sc.salePrice}/kg wholesale Bihar farm-gate`,
            'Fast-growing, tolerates high-density Biofloc environment well',
          ],
        }
      : {
          speciesId:          'Clarias batrachus',
          commonName:         'Desi Mangur / Singhi (Catfish)',
          scientificName:     'Clarias batrachus / Heteropneustes fossilis',
          compatibilityScore: 88,
          expectedYieldKg:    Math.round(annualYieldKg),
          expectedRevenueInr: Math.round(annualRevenue),
          netProfitInr:       Math.round(annualGrossProfit - effectiveCapex),
          benefitCostRatio:   Math.round(bcr * 100) / 100,
          fcr:                sc.fcr,
          compatibilityReasons: [
            `Stocking: ${sc.stockingAvg} fish per tank (avg), 75% survival`,
            `FCR ${sc.fcr} in Biofloc — catfish actively consume floc`,
            `Yield: ${yieldPerCycleKg} kg/tank/cycle × 2 cycles = ${yieldPerCycleKg * 2} kg/tank/year`,
            `Premium sale price Rs ${sc.salePrice}/kg — significantly higher value than Pangasius`,
            'Desi Mangur commands strong local market demand in Bihar',
            'Higher seed cost (Rs 5/seed) and higher stocking density than Pangasius',
          ],
        };

    // Show the other species as a secondary recommendation with a note
    const secondarySpecies: SpeciesRecommendation = speciesKey === 'PANGASIUS'
      ? {
          speciesId:          'Clarias batrachus',
          commonName:         'Desi Mangur / Singhi (alternative)',
          scientificName:     'Clarias batrachus',
          compatibilityScore: 72,
          expectedYieldKg:    0,
          expectedRevenueInr: 0,
          netProfitInr:       0,
          benefitCostRatio:   0,
          fcr:                1.5,
          compatibilityReasons: [
            'You selected Pangasius — switch to Mangur for premium Rs 180/kg price',
            'Mangur needs 4,500 fish/tank — higher seed investment upfront',
            'Suitable for Biofloc if you have access to quality Mangur fingerlings',
          ],
        }
      : {
          speciesId:          'Pangasianodon hypophthalmus',
          commonName:         'Pangasius (alternative)',
          scientificName:     'Pangasianodon hypophthalmus',
          compatibilityScore: 70,
          expectedYieldKg:    0,
          expectedRevenueInr: 0,
          netProfitInr:       0,
          benefitCostRatio:   0,
          fcr:                1.2,
          compatibilityReasons: [
            'You selected Mangur — Pangasius has lower seed cost (Rs 3/seed vs Rs 5)',
            'Pangasius is lower risk for first-time Biofloc farmers',
            'Lower revenue per kg (Rs 85) but also lower total OPEX',
          ],
        };

    // ── Monthly cash flow — 2 full cycles ────────────────────────────────────
    const monthlyCashFlow = this.generateBioflocCashFlow(
      effectiveCapex,
      opexPerCycleTotal,
      yieldPerCycleKg * tanks * sc.salePrice,
      sc.cycleMonths
    );

    return {
      recommendationId,
      recommendedSpecies:              [primarySpecies, secondarySpecies],
      recommendedSystem:               CultivationSystem.BIOFLOC,
      projectedGrossRevenueInr:        Math.round(annualRevenue),
      projectedNetProfitInr:           Math.round(annualGrossProfit),
      breakevenTimelineMonths:         breakEvenMonths,
      totalCapitalExpenditureInr:      Math.round(totalCapex),
      subsidizedCapitalExpenditureInr: Math.round(effectiveCapex),
      subsidyAmountInr:                Math.round(subsidyAmount),
      benefitCostRatio:                Math.round(bcr * 100) / 100,
      firstCycleWorkingCapitalInr:     Math.round(firstCycleWorkingCap),
      totalProjectCostInr:             Math.round(totalProjectCost),
      availableCapitalInr:             input.availableCapitalInr,
      knowledgeInsights:               knowledgeContext,
      riskAnalysisProfile: {
        overallRisk: RiskTolerance.MEDIUM,
        riskFactors: [
          {
            category: 'Technical',
            probability: 0.40,
            impact: 0.95,
            description: 'Power failure stops aeration — total fish mortality can occur within hours without backup inverter',
          },
          {
            category: 'Operational',
            probability: 0.30,
            impact: 0.60,
            description: 'Floc management requires daily monitoring — ammonia spikes if carbon:nitrogen balance is off',
          },
          {
            category: 'Financial',
            probability: 0.15,
            impact: 0.40,
            description: speciesKey === 'MANGUR'
              ? 'High seed cost (Rs 5/fish × 4,500 = Rs 22,500/tank) — source fingerlings before committing capital'
              : 'Low profit margin per tank — scale to minimum 5 tanks for viable income',
          },
        ],
        mitigationStrategies: [
          '⚠️ Power failure emergency: remove 50% tank water and add 50% fresh water immediately',
          'Install inverter and battery — non-negotiable for 24/7 aeration',
          'Check DO every morning — target above 6.0 ppm',
          'Add molasses when ammonia exceeds 0.5 ppm to feed heterotrophic bacteria',
          'Apply for Bihar Yojana/PMMSY subsidy: 50% for General, 70% for SC/ST/EBC, 80% for solar pump',
          'Start with 3–5 tanks to learn system before scaling up',
        ],
        mortalityRiskPercent: input.riskTolerance === 'LOW' ? 20 : input.riskTolerance === 'HIGH' ? 35 : 25,
        marketPriceVolatility: input.riskTolerance === 'LOW' ? 0.06 : input.riskTolerance === 'HIGH' ? 0.20 : 0.12,
      },
      monthlyCashFlow,
      sensitivityAnalysis: {
        bestCase: {
          netProfit:        Math.round(annualGrossProfit * 1.20),
          breakEvenMonths:  Math.max(3, Math.round(breakEvenMonths * 0.82)),
          benefitCostRatio: Math.round(bcr * 1.15 * 100) / 100,
        },
        worstCase: {
          netProfit:        Math.round(annualGrossProfit * 0.60),
          breakEvenMonths:  Math.round(breakEvenMonths * 1.40),
          benefitCostRatio: Math.round(bcr * 0.75 * 100) / 100,
        },
        priceDrop10Percent:        Math.round(annualRevenue * 0.90 - annualOpex),
        priceIncrease10Percent:    Math.round(annualRevenue * 1.10 - annualOpex),
        yieldDrop15Percent:        Math.round(annualRevenue * 0.85 - annualOpex),
        feedCostIncrease20Percent: Math.round(annualRevenue - (annualOpex * 1.16)), // feed ~80% of opex
      },
    };
  }

  private static generateBioflocCashFlow(
    capex: number,
    opexPerCycle: number,
    cycleRevenue: number,
    cycleMonths: number
  ): MonthlyCashFlow[] {
    // Show 2 full cycles
    const totalMonths = cycleMonths * 2;
    const cashFlow: MonthlyCashFlow[] = [];
    let cumulativeCashFlow = 0;

    for (let month = 1; month <= totalMonths; month++) {
      const isCycleEnd   = month % cycleMonths === 0;
      const isFirstMonth = month === 1;
      const isCycleStart = !isFirstMonth && (month - 1) % cycleMonths === 0;

      const revenue  = isCycleEnd ? cycleRevenue : 0;
      const expenses = isFirstMonth
        ? capex + opexPerCycle   // Month 1: CAPEX + first cycle OPEX
        : isCycleStart
          ? opexPerCycle         // Each new cycle: OPEX only
          : 0;

      const netCashFlow = revenue - expenses;
      cumulativeCashFlow += netCashFlow;

      cashFlow.push({
        month,
        revenue:            Math.round(revenue),
        expenses:           Math.round(expenses),
        netCashFlow:        Math.round(netCashFlow),
        cumulativeCashFlow: Math.round(cumulativeCashFlow),
      });
    }
    return cashFlow;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CAGE SIMULATION — NFDB/ICAR-CIFRI inland cage culture model
  //
  // Source: "Cage Culture in Inland Open Water Bodies" — NFDB/ICAR-CIFRI
  //
  // Standard cage unit: 6m × 4m × 4m = 96 m³ (rectangular floating cage)
  // Battery: 6, 12, or 24 cages per battery with catwalks + floating hut
  // Target species: Pangasius (primary), GIFT Tilapia (secondary)
  // Site requirement: Reservoir ≥ 1,000 ha, depth ≥ 10 m year-round
  //
  // Economics per cage (NFDB official figures):
  //   Setup cost (GI cage + inputs): Rs 3,00,000
  //   Yield: 4.608 tonne / 8 months (7,680 fish × 0.6 kg)
  //   Revenue @ Rs 90/kg: Rs 4,14,720
  //   Net return: Rs 1,14,720 / cage / 8 months
  // ─────────────────────────────────────────────────────────────────────────────

  private static async simulateCage(input: any): Promise<EconomicsSimulatorOutput> {
    const numberOfCages: number = Math.max(1, parseInt((input as any).numberOfCages || '1'));
    const cageSpecies: 'PANGASIUS' | 'TILAPIA' = (input as any).cageSpecies || 'PANGASIUS';
    const recommendationId = uuidv4();

    // ── Fixed constants per cage (96 m³ standard unit) ────────────────────────
    // Source: NFDB "Estimated Project Costs & Returns Per Cage" table
    const CAGE_SETUP_COST         = 100000;   // Rs 1,00,000 — GI cage frame + net + accessories
    const CAGE_INPUTS_COST        = 200000;   // Rs 2,00,000 — seed, feed, labour per cycle
    const CAPEX_PER_CAGE          = CAGE_SETUP_COST;   // One-time setup
    const OPEX_PER_CAGE_PER_CYCLE = CAGE_INPUTS_COST;  // Per 8-month cycle

    // Species-specific constants
    const CAGE_SPECIES_CONSTANTS = {
      PANGASIUS: {
        // Grow-out stocking: 60–100 fingerlings/m³ × 96 m³ = 5,760–9,600; NFDB uses 9,600
        stockingPerCage:    9600,
        survivalRate:       0.80,    // 80% → 7,680 fish
        harvestWeightKg:    0.60,    // 600g average in 7–8 months
        salePricePerKg:     90,      // Rs 90/kg (NFDB official)
        cycleMonths:        8,       // 7–8 months; use 8 for conservative estimate
        cyclesPerYear:      1,       // 1 full cycle per year (8 months + 4 months fallow/prep)
        feedingSchedule:    'Rearing: 10% BW 4–5x/day; Grow-out: 5% (mo 1–2), 3% (mo 3–5), 2% (mo 6+) 2x/day',
        fcr:                1.8,
        label:              'Pangasius (Basa)',
      },
      TILAPIA: {
        stockingPerCage:    9600,
        survivalRate:       0.82,
        harvestWeightKg:    0.50,    // 500g in 6–7 months
        salePricePerKg:     100,     // Rs 100/kg monosex Tilapia
        cycleMonths:        7,
        cyclesPerYear:      1,
        feedingSchedule:    '5% BW (mo 1–2), 3% (mo 3–5), 2% (mo 6+), 2x/day',
        fcr:                1.6,
        label:              'GIFT Tilapia (Monosex)',
      },
    };

    const spec = { ...CAGE_SPECIES_CONSTANTS[cageSpecies] };

    // Scale survival rate and sale price by risk tolerance
    if (input.riskTolerance === 'LOW') {
      spec.survivalRate      = Math.min(0.95, spec.survivalRate + 0.03);
      spec.salePricePerKg    = spec.salePricePerKg - 5;
    } else if (input.riskTolerance === 'HIGH') {
      spec.survivalRate      = Math.max(0.50, spec.survivalRate - 0.05);
      spec.salePricePerKg    = spec.salePricePerKg + 10;
    }

    // ── Scale to N cages ──────────────────────────────────────────────────────
    const totalCapex              = CAPEX_PER_CAGE * numberOfCages;
    const opexPerCycle            = OPEX_PER_CAGE_PER_CYCLE * numberOfCages;

    // Yield calculation (NFDB formula)
    const survivingFishPerCage    = spec.stockingPerCage * spec.survivalRate;
    const yieldPerCageKg          = survivingFishPerCage * spec.harvestWeightKg;
    const totalYieldKg            = yieldPerCageKg * numberOfCages;
    const cycleRevenue            = totalYieldKg * spec.salePricePerKg;
    const annualRevenue           = cycleRevenue * spec.cyclesPerYear;
    const annualOpex              = opexPerCycle * spec.cyclesPerYear;
    const annualGrossProfit       = annualRevenue - annualOpex;

    // ── Apply NFDB/PMMSY subsidy ──────────────────────────────────────────────
    // Cage culture under Blue Revolution scheme — treated as FRESHWATER project
    // NFDB provides financial assistance; training cost borne wholly by NFDB
    const landHectares = numberOfCages * 0.0024; // 96 m³ cage ≈ 24 m² surface footprint
    const { effectiveCapex, subsidyAmount, knowledgeContext } =
      await PMMSYSubsidyService.calculateEffectiveCapex(
        totalCapex,
        input.farmerCategory,
        'FRESHWATER',
        landHectares,
        input.stateCode,
        undefined
      );

    // ── Derived metrics ───────────────────────────────────────────────────────
    const totalProjectCost  = effectiveCapex + opexPerCycle;
    const bcr               = annualOpex > 0 ? annualRevenue / annualOpex : 0;
    const breakEvenMonths   = annualGrossProfit > 0
      ? Math.ceil((effectiveCapex / annualGrossProfit) * 12)
      : 999;

    // ── Species recommendations ───────────────────────────────────────────────
    const speciesRecs: SpeciesRecommendation[] = [
      {
        speciesId:           'Pangasianodon hypophthalmus',
        commonName:          'Pangasius / Basa',
        scientificName:      'Pangasianodon hypophthalmus',
        compatibilityScore:  cageSpecies === 'PANGASIUS' ? 92 : 72,
        expectedYieldKg:     Math.round(yieldPerCageKg * numberOfCages * (cageSpecies === 'PANGASIUS' ? 1 : 0.85)),
        expectedRevenueInr:  Math.round(cycleRevenue * (cageSpecies === 'PANGASIUS' ? 1 : 0.85)),
        netProfitInr:        Math.round((cycleRevenue - opexPerCycle) * (cageSpecies === 'PANGASIUS' ? 1 : 0.85)),
        benefitCostRatio:    Math.round(bcr * 100) / 100,
        fcr:                 CAGE_SPECIES_CONSTANTS.PANGASIUS.fcr,
        compatibilityReasons: [
          'Primary NFDB-recommended species for inland cage culture',
          `Yield: ${yieldPerCageKg.toFixed(0)} kg/cage/cycle (7,680 fish × 0.6 kg)`,
          'FCR 1.8 — efficient feed conversion in cage environment',
          '80% survival rate in floating cage systems',
          'Harvest before October — cold below 15°C causes distress',
          `Feeding: ${CAGE_SPECIES_CONSTANTS.PANGASIUS.feedingSchedule}`,
        ],
      },
      {
        speciesId:           'Oreochromis niloticus',
        commonName:          'GIFT Tilapia (Monosex)',
        scientificName:      'Oreochromis niloticus',
        compatibilityScore:  cageSpecies === 'TILAPIA' ? 88 : 68,
        expectedYieldKg:     Math.round(CAGE_SPECIES_CONSTANTS.TILAPIA.stockingPerCage * CAGE_SPECIES_CONSTANTS.TILAPIA.survivalRate * CAGE_SPECIES_CONSTANTS.TILAPIA.harvestWeightKg * numberOfCages),
        expectedRevenueInr:  Math.round(CAGE_SPECIES_CONSTANTS.TILAPIA.stockingPerCage * CAGE_SPECIES_CONSTANTS.TILAPIA.survivalRate * CAGE_SPECIES_CONSTANTS.TILAPIA.harvestWeightKg * numberOfCages * CAGE_SPECIES_CONSTANTS.TILAPIA.salePricePerKg),
        netProfitInr:        Math.round((CAGE_SPECIES_CONSTANTS.TILAPIA.stockingPerCage * CAGE_SPECIES_CONSTANTS.TILAPIA.survivalRate * CAGE_SPECIES_CONSTANTS.TILAPIA.harvestWeightKg * numberOfCages * CAGE_SPECIES_CONSTANTS.TILAPIA.salePricePerKg) - opexPerCycle),
        benefitCostRatio:    Math.round(((CAGE_SPECIES_CONSTANTS.TILAPIA.stockingPerCage * CAGE_SPECIES_CONSTANTS.TILAPIA.survivalRate * CAGE_SPECIES_CONSTANTS.TILAPIA.harvestWeightKg * numberOfCages * CAGE_SPECIES_CONSTANTS.TILAPIA.salePricePerKg) / opexPerCycle) * 100) / 100,
        fcr:                 CAGE_SPECIES_CONSTANTS.TILAPIA.fcr,
        compatibilityReasons: [
          'NFDB-recommended species for inland cage culture',
          'Use ONLY monosex (all-male) seed — prevents uncontrolled breeding in cages',
          'FCR 1.6 — slightly better feed efficiency than Pangasius',
          '82% survival rate in cage environment',
          `Feeding: ${CAGE_SPECIES_CONSTANTS.TILAPIA.feedingSchedule}`,
        ],
      },
    ].sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // ── Monthly cash flow ─────────────────────────────────────────────────────
    const cashFlow: MonthlyCashFlow[] = [];
    let cumulative = 0;
    for (let month = 1; month <= spec.cycleMonths; month++) {
      const revenue  = month === spec.cycleMonths ? cycleRevenue : 0;
      const expenses = month === 1 ? (effectiveCapex + opexPerCycle) : 0;
      const net      = revenue - expenses;
      cumulative    += net;
      cashFlow.push({
        month,
        revenue:            Math.round(revenue),
        expenses:           Math.round(expenses),
        netCashFlow:        Math.round(net),
        cumulativeCashFlow: Math.round(cumulative),
      });
    }

    // ── Sensitivity analysis ──────────────────────────────────────────────────
    const baseProfit = cycleRevenue - effectiveCapex - opexPerCycle;
    const sensitivityAnalysis: SensitivityAnalysis = {
      bestCase:               { netProfit: Math.round(baseProfit * 1.25), breakEvenMonths: Math.max(1, Math.round(breakEvenMonths * 0.8)), benefitCostRatio: Math.round(bcr * 1.2 * 100) / 100 },
      worstCase:              { netProfit: Math.round(baseProfit * 0.6),  breakEvenMonths: Math.round(breakEvenMonths * 1.4),              benefitCostRatio: Math.round(bcr * 0.7 * 100) / 100 },
      priceDrop10Percent:     Math.round(cycleRevenue * 0.9 - effectiveCapex - opexPerCycle),
      priceIncrease10Percent: Math.round(cycleRevenue * 1.1 - effectiveCapex - opexPerCycle),
      yieldDrop15Percent:     Math.round(cycleRevenue * 0.85 - effectiveCapex - opexPerCycle),
      feedCostIncrease20Percent: Math.round(cycleRevenue - effectiveCapex - (opexPerCycle * 1.2)),
    };

    return {
      recommendationId,
      recommendedSpecies:              speciesRecs,
      recommendedSystem:               'CAGE' as any,
      projectedGrossRevenueInr:        Math.round(annualRevenue),
      projectedNetProfitInr:           Math.round(annualGrossProfit),
      breakevenTimelineMonths:         breakEvenMonths,
      totalCapitalExpenditureInr:      Math.round(totalCapex),
      subsidizedCapitalExpenditureInr: Math.round(effectiveCapex),
      subsidyAmountInr:                Math.round(subsidyAmount),
      benefitCostRatio:                Math.round(bcr * 100) / 100,
      firstCycleWorkingCapitalInr:     Math.round(opexPerCycle),
      totalProjectCostInr:             Math.round(totalProjectCost),
      availableCapitalInr:             input.availableCapitalInr,
      knowledgeInsights:               knowledgeContext,
      riskAnalysisProfile: {
        overallRisk: 'MEDIUM' as any,
        riskFactors: [
          { category: 'Site', probability: 0.2, impact: 0.8, description: 'Requires reservoir ≥ 1,000 ha with ≥ 10 m depth year-round' },
          { category: 'Weather', probability: 0.3, impact: 0.7, description: 'Pangasius: harvest before October — cold below 15°C causes distress and mortality' },
          { category: 'Regulatory', probability: 0.15, impact: 0.6, description: 'NFDB/State Fisheries Dept approval required for cage installation in reservoirs' },
          { category: 'Market', probability: 0.25, impact: 0.5, description: 'Pangasius price volatile — Rs 80–130/kg range in Bihar/UP markets' },
        ],
        mitigationStrategies: [
          'Harvest Pangasius before October to avoid cold-weather mortality',
          'Use HDPE/PVC floating frames — more durable than bamboo in reservoirs',
          'Install in caterpillar battery design for better water exchange and DO',
          'Anchor cages at 4+ corners to prevent drifting during monsoon floods',
          'Apply for NFDB Blue Revolution subsidy — training cost borne by NFDB',
          'Engage local fishermen cooperative (SHG/Coop) for cage management',
        ],
        mortalityRiskPercent: input.riskTolerance === 'LOW' ? 15 : input.riskTolerance === 'HIGH' ? 30 : 20,
        marketPriceVolatility: input.riskTolerance === 'LOW' ? 0.10 : input.riskTolerance === 'HIGH' ? 0.25 : 0.18,
      },
      monthlyCashFlow:    cashFlow,
      sensitivityAnalysis,
    };
  }
}
