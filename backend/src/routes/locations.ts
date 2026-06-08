/**
 * Location Hierarchy API
 * Cascading dropdowns: State → District → Block → Panchayat
 */

import { Router } from 'express';
import { query } from '../db';

const router = Router();

router.get('/states', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT code, name FROM loc_states ORDER BY name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/districts', async (req, res, next) => {
  try {
    const { stateCode } = req.query;
    if (!stateCode || typeof stateCode !== 'string') {
      return res.status(400).json({ success: false, error: 'stateCode is required' });
    }
    const result = await query(
      `SELECT code, name FROM loc_districts WHERE state_code = $1 ORDER BY name`,
      [stateCode.toUpperCase()]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

function normalizeLocationCode(code: string): string {
  let val = code.trim().toUpperCase();
  if (val && !val.startsWith('BR-')) {
    val = 'BR-' + val;
  }
  return val;
}

/** Extract just the block slug (last segment) from any code format.
 *  e.g. 'BR-PATNA-NAUBATPUR' | 'BR-NAUBATPUR' | 'naubatpur' → 'NAUBATPUR'
 */
function blockSuffix(code: string): string {
  const upper = code.trim().toUpperCase();
  const parts = upper.split('-');
  return parts[parts.length - 1];
}

router.get('/blocks', async (req, res, next) => {
  try {
    const { districtCode } = req.query;
    if (!districtCode || typeof districtCode !== 'string') {
      return res.status(400).json({ success: false, error: 'districtCode is required' });
    }
    const result = await query(
      `SELECT code, name FROM loc_blocks WHERE district_code = $1 ORDER BY name`,
      [normalizeLocationCode(districtCode)]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/panchayats', async (req, res, next) => {
  try {
    const { blockCode } = req.query;
    if (!blockCode || typeof blockCode !== 'string') {
      return res.status(400).json({ success: false, error: 'blockCode is required' });
    }

    // First try exact match with fully-qualified code
    const fullCode = normalizeLocationCode(blockCode);
    let result = await query(
      `SELECT code, name FROM loc_panchayats WHERE block_code = $1 ORDER BY name`,
      [fullCode]
    );

    // Fallback: suffix match — handles 'BR-NAUBATPUR' matching 'BR-PATNA-NAUBATPUR'
    if (result.rows.length === 0) {
      const suffix = blockSuffix(blockCode);
      result = await query(
        `SELECT code, name FROM loc_panchayats WHERE block_code LIKE '%-' || $1 ORDER BY name`,
        [suffix]
      );
    }

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

export { router as locationsRouter };
