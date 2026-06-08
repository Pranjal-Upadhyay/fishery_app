/**
 * PMMSY (Pradhan Mantri Matsya Sampada Yojana) Subsidy Calculator
 * Implements government subsidy calculations with precision
 */

import {
  FarmerCategory,
  PMMSYSubsidyInput,
  PMMSYSubsidyOutput
} from '../types';
import { KnowledgeRulesService } from './KnowledgeRulesService';

// PMMSY Configuration Constants
const PMMSY_CONFIG = {
  GENERAL_SUBSIDY_PERCENT: 40,
  SPECIAL_CATEGORY_SUBSIDY_PERCENT: 60,
  FRESHWATER_CAP: 400000, // ₹4 Lakhs
  BRACKISH_CAP: 600000,   // ₹6 Lakhs
  RAS_CAP: 800000,        // ₹8 Lakhs
  INTEGRATED_CAP: 500000  // ₹5 Lakhs
};

export class PMMSYSubsidyService {
  /**
   * Calculate PMMSY subsidy based on beneficiary category and project type
   * 
   * @param input - PMMSY subsidy calculation parameters
   * @returns Calculated subsidy details
   */
  static async calculateSubsidy(input: PMMSYSubsidyInput & { stateCode?: string; preferredSpecies?: string[] }): Promise<PMMSYSubsidyOutput> {
    const { projectType, beneficiaryCategory, unitCostInr, landAreaHectares, stateCode, preferredSpecies } = input;

    const knowledgeContext = stateCode
      ? await KnowledgeRulesService.getSubsidyKnowledgeContext(stateCode, beneficiaryCategory, projectType, preferredSpecies)
      : undefined;

    // Determine subsidy percentage based on category
    const eligibleSubsidyPercent =
      knowledgeContext?.beneficiarySubsidyPercent ?? this.getSubsidyPercentage(beneficiaryCategory);

    // Determine maximum subsidy cap based on project type
    // Scale by land area (Bug 3 fix)
    const maximumSubsidyCapInr = this.getSubsidyCap(projectType) * landAreaHectares;

    // Calculate raw subsidy amount
    const rawSubsidy = (unitCostInr * eligibleSubsidyPercent) / 100;

    // Apply cap if necessary
    const calculatedSubsidyInr = Math.min(rawSubsidy, maximumSubsidyCapInr);

    // Calculate beneficiary contribution
    const beneficiaryContributionInr = unitCostInr - calculatedSubsidyInr;

    // Effective cost after subsidy
    const effectiveCostInr = beneficiaryContributionInr;

    // Determine applicable schemes
    const applicableSchemes = this.getApplicableSchemes(projectType, beneficiaryCategory);

    return {
      eligibleSubsidyPercent,
      maximumSubsidyCapInr,
      calculatedSubsidyInr: Math.round(calculatedSubsidyInr),
      beneficiaryContributionInr: Math.round(beneficiaryContributionInr),
      effectiveCostInr: Math.round(effectiveCostInr),
      applicableSchemes,
      knowledgeContext,
    };
  }

  /**
   * Get subsidy percentage based on farmer category
   */
  private static getSubsidyPercentage(category: FarmerCategory): number {
    switch (category) {
      case FarmerCategory.WOMEN:
      case FarmerCategory.SC:
      case FarmerCategory.ST:
      case FarmerCategory.EBC:
        return PMMSY_CONFIG.SPECIAL_CATEGORY_SUBSIDY_PERCENT;
      case FarmerCategory.GENERAL:
      default:
        return PMMSY_CONFIG.GENERAL_SUBSIDY_PERCENT;
    }
  }

  /**
   * Get subsidy cap based on project type
   */
  private static getSubsidyCap(projectType: PMMSYSubsidyInput['projectType']): number {
    switch (projectType) {
      case 'FRESHWATER':
        return PMMSY_CONFIG.FRESHWATER_CAP;
      case 'BRACKISH':
        return PMMSY_CONFIG.BRACKISH_CAP;
      case 'RAS':
        return PMMSY_CONFIG.RAS_CAP;
      case 'INTEGRATED':
        return PMMSY_CONFIG.INTEGRATED_CAP;
      default:
        return PMMSY_CONFIG.FRESHWATER_CAP;
    }
  }

  /**
   * Get applicable schemes based on project type and category
   */
  private static getApplicableSchemes(
    projectType: PMMSYSubsidyInput['projectType'],
    category: FarmerCategory
  ): string[] {
    const schemes: string[] = ['PMMSY-2024'];

    if (projectType === 'RAS') {
      schemes.push('Blue-Revolution-RAS');
    }

    if (category === FarmerCategory.WOMEN) {
      schemes.push('Mahila-Sashaktikaran-Aquaculture');
    }

    if (category === FarmerCategory.SC || category === FarmerCategory.ST) {
      schemes.push('Scheduled-Caste-Tribe-Fisheries');
    }

    return schemes;
  }

  /**
   * Validate if a project qualifies for PMMSY subsidy
   */
  static validateEligibility(
    landAreaHectares: number,
    hasExistingPond: boolean
  ): { eligible: boolean; reason?: string } {
    // Minimum land area requirement
    if (landAreaHectares < 0.1) {
      return {
        eligible: false,
        reason: 'Minimum land area of 0.1 hectares required for PMMSY subsidy'
      };
    }

    // Maximum land area for individual beneficiaries
    if (landAreaHectares > 10) {
      return {
        eligible: false,
        reason: 'Individual beneficiaries cannot exceed 10 hectares under PMMSY'
      };
    }

    // Check for existing pond (new ponds get priority)
    if (hasExistingPond) {
      return {
        eligible: true,
        reason: 'Note: Renovation receives 20% lower subsidy than new construction'
      };
    }

    return { eligible: true };
  }

  /**
   * Calculate effective CAPEX after subsidy for economics simulator
   */
  static calculateEffectiveCapex(
    totalCapex: number,
    farmerCategory: FarmerCategory,
    projectType: PMMSYSubsidyInput['projectType'],
    landAreaHectares: number,
    stateCode?: string,
    preferredSpecies?: string[]
  ): Promise<{ effectiveCapex: number; subsidyAmount: number; knowledgeContext?: PMMSYSubsidyOutput['knowledgeContext'] }> {
    return this.calculateSubsidy({
      projectType,
      beneficiaryCategory: farmerCategory,
      unitCostInr: totalCapex,
      landAreaHectares: landAreaHectares,
      stateCode,
      preferredSpecies,
    }).then((result) => ({
      effectiveCapex: result.effectiveCostInr,
      subsidyAmount: result.calculatedSubsidyInr,
      knowledgeContext: result.knowledgeContext,
    }));
  }
}
