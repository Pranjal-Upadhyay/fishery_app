/**
 * Economics API Routes
 * Handles economics simulation requests
 */

import { Router } from 'express';
import { z } from 'zod';
import { EconomicsSimulatorService } from '../services/EconomicsSimulatorService';
import { PMMSYSubsidyService } from '../services/PMMSYSubsidyService';
import { KnowledgeRulesService } from '../services/KnowledgeRulesService';
import { logger } from '../utils/logger';
import { FarmerCategory, RiskTolerance } from '../types';

const router = Router();

// Validation schema for simulation request
const simulationSchema = z.object({
  landSizeHectares: z.number().positive().max(1000).optional(),
  waterSourceSalinityUsCm: z.number().min(0).max(50000).optional(),
  availableCapitalInr: z.number().positive(),
  riskTolerance: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  farmerCategory: z.enum(['GENERAL', 'WOMEN', 'SC', 'ST', 'EBC']),
  stateCode: z.string().length(2),
  districtCode: z.string().min(2).max(50),
  preferredSpecies: z.array(z.string()).optional(),
  systemType: z.enum(['EARTHEN', 'BIOFLOC', 'RAS', 'CAGES']).optional(),
  waterSourceType: z.string().optional(),
  projectType: z.string().optional(),
  numberOfRasUnits: z.number().int().positive().max(100).optional(),
  numberOfBioflocTanks: z.number().int().positive().max(500).optional(),
  bioflocSpecies: z.enum(['PANGASIUS', 'MANGUR']).optional(),
}).refine(
  data =>
    data.systemType === 'RAS' ||
    data.systemType === 'BIOFLOC' ||
    (data.landSizeHectares != null && data.waterSourceSalinityUsCm != null),
  { message: 'landSizeHectares and waterSourceSalinityUsCm are required for non-RAS/Biofloc systems' }
);

// Validation schema for subsidy calculation
const subsidySchema = z.object({
  projectType: z.enum(['FRESHWATER', 'BRACKISH', 'INTEGRATED', 'RAS']),
  beneficiaryCategory: z.enum(['GENERAL', 'WOMEN', 'SC', 'ST']),
  unitCostInr: z.number().positive(),
  landAreaHectares: z.number().positive(),
  stateCode: z.string().length(2).optional()
});

const advisorySchema = z.object({
  stateCode: z.string().length(2),
  farmerCategory: z.enum(['GENERAL', 'WOMEN', 'SC', 'ST', 'EBC']),
  projectType: z.enum(['FRESHWATER', 'BRACKISH', 'INTEGRATED', 'RAS']).optional(),
  systemType: z.enum(['EARTHEN', 'BIOFLOC', 'RAS', 'CAGES']).optional(),
});

/**
 * POST /api/v1/economics/simulate
 * Run economics simulation
 */
router.post('/simulate', async (req, res, next) => {
  try {
    const validated = simulationSchema.parse(req.body);

    logger.info('Economics simulation request', {
      landSize: validated.landSizeHectares,
      category: validated.farmerCategory
    });

    const result = await EconomicsSimulatorService.simulate({
      landSizeHectares: validated.landSizeHectares ?? 0,
      waterSourceSalinityUsCm: validated.waterSourceSalinityUsCm ?? 200,
      availableCapitalInr: validated.availableCapitalInr,
      riskTolerance: validated.riskTolerance as RiskTolerance,
      farmerCategory: validated.farmerCategory as FarmerCategory,
      stateCode: validated.stateCode,
      districtCode: validated.districtCode,
      preferredSpecies: validated.preferredSpecies,
      systemType: validated.systemType as any,
      waterSourceType: validated.waterSourceType,
      numberOfRasUnits: validated.numberOfRasUnits,
      numberOfBioflocTanks: validated.numberOfBioflocTanks,
      bioflocSpecies: validated.bioflocSpecies,
    } as any);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.errors) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/v1/economics/subsidy
 * Calculate PMMSY subsidy
 */
router.post('/subsidy', async (req, res, next) => {
  try {
    const validated = subsidySchema.parse(req.body);

    logger.info('Subsidy calculation request', {
      category: validated.beneficiaryCategory,
      projectType: validated.projectType
    });

    const result = await PMMSYSubsidyService.calculateSubsidy({
      projectType: validated.projectType,
      beneficiaryCategory: validated.beneficiaryCategory as FarmerCategory,
      unitCostInr: validated.unitCostInr,
      landAreaHectares: validated.landAreaHectares,
      stateCode: validated.stateCode,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.errors) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/v1/economics/advisory
 * Get knowledge-backed subsidy and economics guidance for the selected state/profile
 */
router.get('/advisory', async (req, res, next) => {
  try {
    const validated = advisorySchema.parse(req.query);

    const projectType = validated.projectType ?? 'FRESHWATER';
    const knowledgeInsights = await KnowledgeRulesService.getSubsidyKnowledgeContext(
      validated.stateCode,
      validated.farmerCategory as FarmerCategory,
      projectType,
      undefined,
      validated.systemType
    );

    res.json({
      success: true,
      data: {
        stateCode: validated.stateCode,
        farmerCategory: validated.farmerCategory,
        projectType,
        knowledgeInsights,
      },
    });
  } catch (error: any) {
    if (error.errors) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors,
      });
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/v1/economics/equipment
 * Get equipment catalog
 */
router.get('/equipment', async (req, res, next) => {
  try {
    const { query } = await import('../db');
    const result = await query(`
      SELECT * FROM equipment_catalog 
      WHERE is_active = true
      ORDER BY category, name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/economics/feed
 * Get feed catalog
 */
router.get('/feed', async (req, res, next) => {
  try {
    const { query } = await import('../db');
    const result = await query(`
      SELECT * FROM feed_catalog 
      WHERE is_active = true
      ORDER BY cost_per_kg_inr ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export { router as economicsRouter };
