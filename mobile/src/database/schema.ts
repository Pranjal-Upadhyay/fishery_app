/**
 * WatermelonDB Schema Definition
 * Offline-first database for Fishing God mobile app
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 4,
  tables: [
    tableSchema({
      name: 'species',
      columns: [
        { name: 'species_id', type: 'string' },
        { name: 'scientific_name', type: 'string' },
        { name: 'common_names', type: 'string' }, // JSON
        { name: 'category', type: 'string' },
        { name: 'biological_parameters', type: 'string' }, // JSON
        { name: 'economic_parameters', type: 'string' }, // JSON
        { name: 'optimal_systems', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'knowledge_nodes',
      columns: [
        { name: 'node_id', type: 'string' },
        { name: 'parent_id', type: 'string', isOptional: true },
        { name: 'node_type', type: 'string' },
        { name: 'data', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'ponds',
      columns: [
        { name: 'pond_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'area_hectares', type: 'number' },
        { name: 'water_source_type', type: 'string' },
        { name: 'system_type', type: 'string' },
        { name: 'species_id', type: 'string', isOptional: true },
        { name: 'stocking_date', type: 'number', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'image_uri', type: 'string', isOptional: true },
        { name: 'district_code', type: 'string', isOptional: true },
        { name: 'block_code', type: 'string', isOptional: true },
        { name: 'panchayat_code', type: 'string', isOptional: true },
        { name: 'district_name', type: 'string', isOptional: true },
        { name: 'block_name', type: 'string', isOptional: true },
        { name: 'panchayat_name', type: 'string', isOptional: true },
        { name: 'fingerling_count', type: 'number', isOptional: true },
        { name: 'fingerling_avg_weight_g', type: 'number', isOptional: true },
        { name: 'fingerling_source', type: 'string', isOptional: true },
        { name: 'fingerling_transaction_ref', type: 'string', isOptional: true },
        { name: 'species_variant', type: 'string', isOptional: true },
        { name: 'expected_harvest_date', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'water_quality_logs',
      columns: [
        { name: 'log_id', type: 'string' },
        { name: 'pond_id', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'temperature', type: 'number', isOptional: true },
        { name: 'dissolved_oxygen', type: 'number', isOptional: true },
        { name: 'ph', type: 'number', isOptional: true },
        { name: 'salinity', type: 'number', isOptional: true },
        { name: 'alkalinity', type: 'number', isOptional: true },
        { name: 'ammonia', type: 'number', isOptional: true },
        { name: 'nitrite', type: 'number', isOptional: true },
        { name: 'turbidity', type: 'number', isOptional: true },
        { name: 'alerts', type: 'string', isOptional: true }, // JSON
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'economics_simulations',
      columns: [
        { name: 'simulation_id', type: 'string' },
        { name: 'input_params', type: 'string' }, // JSON
        { name: 'results', type: 'string' }, // JSON
        { name: 'recommended_species', type: 'string', isOptional: true },
        { name: 'recommended_system', type: 'string', isOptional: true },
        { name: 'projected_revenue', type: 'number', isOptional: true },
        { name: 'breakeven_months', type: 'number', isOptional: true },
        { name: 'benefit_cost_ratio', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'market_prices',
      columns: [
        { name: 'price_id', type: 'string' },
        { name: 'species_name', type: 'string' },
        { name: 'market_name', type: 'string' },
        { name: 'state_code', type: 'string' },
        { name: 'price_inr_per_kg', type: 'number' },
        { name: 'grade', type: 'string', isOptional: true },
        { name: 'date', type: 'number' },
        { name: 'source', type: 'string' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'queue_id', type: 'string' },
        { name: 'table_name', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'operation', type: 'string' },
        { name: 'data', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
      ]
    }),
  ]
});
