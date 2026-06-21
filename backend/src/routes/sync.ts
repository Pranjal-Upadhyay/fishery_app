/**
 * Sync API Routes
 * Offline-first data synchronization using WatermelonDB sync protocol
 */

import { Router } from 'express';
import { query } from '../db';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';

const router = Router();

function toClientTimestamp(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  return new Date(value).getTime();
}

function fromClientTimestamp(value: number | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(normalized);
}

/**
 * GET /api/v1/sync/changes
 * Pull changes from server since a given timestamp.
 * Returns data in WatermelonDB synchronize() pull format.
 * Requires authentication — userId is taken from the JWT, not query params.
 */
router.get('/changes', requireAuth, async (req, res, next) => {
  try {
    const { since } = req.query;
    const userId = req.auth!.userId; // Secure: from JWT, not user-supplied query

    if (!since) {
      return res.status(400).json({
        success: false,
        error: 'since parameter is required'
      });
    }

    const sinceDate = new Date(since as string);

    // Pull updated knowledge_nodes (species data, economic models etc.)
    const speciesResult = await query(`
      SELECT id, parent_id, node_type, data, created_at, updated_at
      FROM knowledge_nodes
      WHERE updated_at > $1
      ORDER BY updated_at ASC
    `, [sinceDate]);

    // Pull updated market prices
    const marketResult = await query(`
      SELECT id, species_id, species_name, market_name, state_code,
             price_inr_per_kg, grade, date, source, created_at
      FROM market_prices
      WHERE created_at > $1
      ORDER BY created_at ASC
    `, [sinceDate]);

    // Pull user's pond updates (safe: ignore if ponds table has no user_id column yet)
    let pondRows: any[] = [];
    try {
      const pondsResult = await query(`
        SELECT id, name, area_hectares, water_source_type, system_type,
               species_id, stocking_date, status,
               ST_Y(location::geometry) AS latitude,
               ST_X(location::geometry) AS longitude,
               district_code, block_code, panchayat_code,
               district_name, block_name, panchayat_name,
               fingerling_count, fingerling_avg_weight_g, fingerling_source,
               fingerling_transaction_ref, species_variant, expected_harvest_date,
               ownership_type, water_availability, culture_system_category,
               pond_activity_type, wide_angle_photo_uri, embankment_photo_uri,
               close_view_photo_uri, farmer_with_pond_photo_uri, is_insured,
               flood_impact_3yrs, disease_occurrence, image_uri,
               created_at, updated_at
        FROM ponds
        WHERE user_id = $1 AND updated_at > $2
        ORDER BY updated_at ASC
      `, [userId, sinceDate]);
      pondRows = pondsResult.rows;
    } catch (_) { }

    let waterQualityRows: any[] = [];
    try {
      const waterQualityResult = await query(`
        SELECT id, pond_id, timestamp, temperature, dissolved_oxygen, ph,
               salinity, alkalinity, ammonia, nitrite, turbidity, created_at
        FROM water_quality_logs
        WHERE user_id = $1 AND created_at > $2
        ORDER BY created_at ASC
      `, [userId, sinceDate]);
      waterQualityRows = waterQualityResult.rows;
    } catch (_) { }

    // Format into WatermelonDB pull format
    const changes: Record<string, { created: any[], updated: any[], deleted: string[] }> = {
      knowledge_nodes: {
        created: [],
        updated: speciesResult.rows.map(row => ({
          id: row.id,
          node_id: row.id,
          parent_id: row.parent_id || null,
          node_type: row.node_type,
          data: typeof row.data === 'string' ? row.data : JSON.stringify(row.data),
          created_at: new Date(row.created_at).getTime(),
          updated_at: new Date(row.updated_at).getTime(),
        })),
        deleted: [],
      },
      market_prices: {
        created: [],
        updated: marketResult.rows.map(row => ({
          id: row.id,
          price_id: row.id,
          species_name: row.species_name,
          market_name: row.market_name,
          state_code: row.state_code,
          price_inr_per_kg: parseFloat(row.price_inr_per_kg),
          grade: row.grade || '',
          date: new Date(row.date).getTime(),
          source: row.source,
          created_at: new Date(row.created_at).getTime(),
        })),
        deleted: [],
      },
      ponds: {
        created: [],
        updated: pondRows.map(row => ({
          id: row.id,
          pond_id: row.id,
          name: row.name,
          area_hectares: parseFloat(row.area_hectares),
          water_source_type: row.water_source_type || '',
          system_type: row.system_type || '',
          species_id: row.species_id || '',
          stocking_date: toClientTimestamp(row.stocking_date),
          status: row.status || 'ACTIVE',
          latitude: row.latitude || 0,
          longitude: row.longitude || 0,
          district_code: row.district_code || null,
          block_code: row.block_code || null,
          panchayat_code: row.panchayat_code || null,
          district_name: row.district_name || null,
          block_name: row.block_name || null,
          panchayat_name: row.panchayat_name || null,
          fingerling_count: row.fingerling_count != null ? parseInt(row.fingerling_count, 10) : null,
          fingerling_avg_weight_g: row.fingerling_avg_weight_g != null ? parseFloat(row.fingerling_avg_weight_g) : null,
          fingerling_source: row.fingerling_source || null,
          fingerling_transaction_ref: row.fingerling_transaction_ref || null,
          species_variant: row.species_variant || null,
          expected_harvest_date: toClientTimestamp(row.expected_harvest_date),
          ownership_type: row.ownership_type || null,
          water_availability: row.water_availability || null,
          culture_system_category: row.culture_system_category || null,
          pond_activity_type: row.pond_activity_type || null,
          wide_angle_photo_uri: row.wide_angle_photo_uri || null,
          embankment_photo_uri: row.embankment_photo_uri || null,
          close_view_photo_uri: row.close_view_photo_uri || null,
          farmer_with_pond_photo_uri: row.farmer_with_pond_photo_uri || null,
          is_insured: row.is_insured,
          flood_impact_3yrs: row.flood_impact_3yrs,
          disease_occurrence: row.disease_occurrence || null,
          image_uri: row.image_uri || null,
          sync_status: 'SYNCED',
          created_at: new Date(row.created_at).getTime(),
          updated_at: new Date(row.updated_at).getTime(),
        })),
        deleted: [],
      },
      water_quality_logs: {
        created: [],
        updated: waterQualityRows.map(row => ({
          id: row.id,
          log_id: row.id,
          pond_id: row.pond_id,
          timestamp: toClientTimestamp(row.timestamp),
          temperature: row.temperature != null ? parseFloat(row.temperature) : null,
          dissolved_oxygen: row.dissolved_oxygen != null ? parseFloat(row.dissolved_oxygen) : null,
          ph: row.ph != null ? parseFloat(row.ph) : null,
          salinity: row.salinity != null ? parseFloat(row.salinity) : null,
          alkalinity: row.alkalinity != null ? parseFloat(row.alkalinity) : null,
          ammonia: row.ammonia != null ? parseFloat(row.ammonia) : null,
          nitrite: row.nitrite != null ? parseFloat(row.nitrite) : null,
          turbidity: row.turbidity != null ? parseFloat(row.turbidity) : null,
          alerts: JSON.stringify([]),
          sync_status: 'SYNCED',
          created_at: new Date(row.created_at).getTime(),
        })),
        deleted: [],
      }
    };

    logger.info('Sync pull changes', {
      userId,
      since: sinceDate.toISOString(),
      knowledgeNodes: speciesResult.rows.length,
      marketPrices: marketResult.rows.length,
      ponds: pondRows.length,
      waterQualityLogs: waterQualityRows.length,
    });

    res.json({
      success: true,
      data: {
        changes,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/sync
 * Push local changes to server (ponds, water quality logs).
 * Accepts WatermelonDB synchronize() push format.
 * Requires authentication — userId is taken from the JWT.
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { changes } = req.body;
    const userId = req.auth!.userId; // Secure: from JWT

    if (!changes) {
      return res.status(400).json({ success: false, error: 'changes object is required' });
    }

    const conflicts: any[] = [];
    let pushedCount = 0;

    // Process pond changes
    if (changes?.ponds) {
      const pondChanges = [...(changes.ponds.created || []), ...(changes.ponds.updated || [])];
      for (const pond of pondChanges) {
        try {
          await query(`
            INSERT INTO ponds (id, user_id, name, area_hectares, water_source_type,
                               system_type, species_id, stocking_date, status, location,
                               district_code, block_code, panchayat_code,
                               district_name, block_name, panchayat_name,
                               fingerling_count, fingerling_avg_weight_g, fingerling_source,
                               fingerling_transaction_ref, species_variant, expected_harvest_date,
                               ownership_type, water_availability, culture_system_category,
                               pond_activity_type, wide_angle_photo_uri, embankment_photo_uri,
                               close_view_photo_uri, farmer_with_pond_photo_uri, is_insured,
                               flood_impact_3yrs, disease_occurrence, image_uri,
                               created_at, updated_at)
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              CASE
                WHEN $10::double precision IS NOT NULL AND $11::double precision IS NOT NULL
                  THEN ST_SetSRID(ST_MakePoint($11, $10), 4326)::geography
                ELSE NULL
              END,
              $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
              $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35,
              NOW(), NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              area_hectares = EXCLUDED.area_hectares,
              water_source_type = EXCLUDED.water_source_type,
              system_type = EXCLUDED.system_type,
              species_id = EXCLUDED.species_id,
              stocking_date = EXCLUDED.stocking_date,
              status = EXCLUDED.status,
              location = EXCLUDED.location,
              district_code = EXCLUDED.district_code,
              block_code = EXCLUDED.block_code,
              panchayat_code = EXCLUDED.panchayat_code,
              district_name = EXCLUDED.district_name,
              block_name = EXCLUDED.block_name,
              panchayat_name = EXCLUDED.panchayat_name,
              fingerling_count = EXCLUDED.fingerling_count,
              fingerling_avg_weight_g = EXCLUDED.fingerling_avg_weight_g,
              fingerling_source = EXCLUDED.fingerling_source,
              fingerling_transaction_ref = EXCLUDED.fingerling_transaction_ref,
              species_variant = EXCLUDED.species_variant,
              expected_harvest_date = EXCLUDED.expected_harvest_date,
              ownership_type = EXCLUDED.ownership_type,
              water_availability = EXCLUDED.water_availability,
              culture_system_category = EXCLUDED.culture_system_category,
              pond_activity_type = EXCLUDED.pond_activity_type,
              wide_angle_photo_uri = EXCLUDED.wide_angle_photo_uri,
              embankment_photo_uri = EXCLUDED.embankment_photo_uri,
              close_view_photo_uri = EXCLUDED.close_view_photo_uri,
              farmer_with_pond_photo_uri = EXCLUDED.farmer_with_pond_photo_uri,
              is_insured = EXCLUDED.is_insured,
              flood_impact_3yrs = EXCLUDED.flood_impact_3yrs,
              disease_occurrence = EXCLUDED.disease_occurrence,
              image_uri = EXCLUDED.image_uri,
              updated_at = NOW()
          `, [
            pond.id, userId, pond.name, pond.area_hectares,
            pond.water_source_type || '', pond.system_type || '',
            pond.species_id || null, fromClientTimestamp(pond.stocking_date),
            pond.status || 'ACTIVE', pond.latitude || null, pond.longitude || null,
            pond.district_code || null, pond.block_code || null, pond.panchayat_code || null,
            pond.district_name || null, pond.block_name || null, pond.panchayat_name || null,
            pond.fingerling_count != null ? parseInt(pond.fingerling_count, 10) : null,
            pond.fingerling_avg_weight_g != null ? parseFloat(pond.fingerling_avg_weight_g) : null,
            pond.fingerling_source || null, pond.fingerling_transaction_ref || null,
            pond.species_variant || null, fromClientTimestamp(pond.expected_harvest_date),
            pond.ownership_type || null, pond.water_availability || null,
            pond.culture_system_category || null, pond.pond_activity_type || null,
            pond.wide_angle_photo_uri || null, pond.embankment_photo_uri || null,
            pond.close_view_photo_uri || null, pond.farmer_with_pond_photo_uri || null,
            pond.is_insured ?? null, pond.flood_impact_3yrs ?? null,
            pond.disease_occurrence || null, pond.image_uri || null
          ]);
          pushedCount++;
        } catch (err: any) {
          conflicts.push({ table: 'ponds', id: pond.id, error: err.message });
        }
      }

      for (const deletedPondId of changes.ponds.deleted || []) {
        try {
          await query(`
            DELETE FROM ponds
            WHERE id = $1 AND user_id = $2
          `, [deletedPondId, userId]);
          pushedCount++;
        } catch (err: any) {
          conflicts.push({ table: 'ponds', id: deletedPondId, error: err.message });
        }
      }
    }

    // Process water quality log changes
    if (changes?.water_quality_logs) {
      const logChanges = [...(changes.water_quality_logs.created || []), ...(changes.water_quality_logs.updated || [])];
      for (const log of logChanges) {
        try {
          await query(`
            INSERT INTO water_quality_logs (
              id, user_id, pond_id, timestamp, temperature, dissolved_oxygen,
              ph, salinity, alkalinity, ammonia, nitrite, turbidity, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (id) DO UPDATE SET
              timestamp = EXCLUDED.timestamp,
              temperature = EXCLUDED.temperature,
              dissolved_oxygen = EXCLUDED.dissolved_oxygen,
              ph = EXCLUDED.ph,
              salinity = EXCLUDED.salinity,
              alkalinity = EXCLUDED.alkalinity,
              ammonia = EXCLUDED.ammonia,
              nitrite = EXCLUDED.nitrite,
              turbidity = EXCLUDED.turbidity
          `, [
            log.id,
            userId,
            log.pond_id,
            fromClientTimestamp(log.timestamp) || new Date(),
            log.temperature ?? null,
            log.dissolved_oxygen ?? null,
            log.ph ?? null,
            log.salinity ?? null,
            log.alkalinity ?? null,
            log.ammonia ?? null,
            log.nitrite ?? null,
            log.turbidity ?? null
          ]);
          pushedCount++;
        } catch (err: any) {
          conflicts.push({ table: 'water_quality_logs', id: log.id, error: err.message });
        }
      }
    }

    logger.info('Sync push complete', { userId, pushed: pushedCount, conflicts: conflicts.length });

    res.json({
      success: true,
      data: {
        pushed: pushedCount,
        conflicts,
        serverTimestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as syncRouter };
