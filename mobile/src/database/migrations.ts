import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'ponds',
          columns: [
            { name: 'district_code', type: 'string', isOptional: true },
            { name: 'block_code', type: 'string', isOptional: true },
            { name: 'panchayat_code', type: 'string', isOptional: true },
            { name: 'district_name', type: 'string', isOptional: true },
            { name: 'block_name', type: 'string', isOptional: true },
            { name: 'panchayat_name', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'ponds',
          columns: [
            { name: 'fingerling_count', type: 'number', isOptional: true },
            { name: 'fingerling_avg_weight_g', type: 'number', isOptional: true },
            { name: 'fingerling_source', type: 'string', isOptional: true },
            { name: 'fingerling_transaction_ref', type: 'string', isOptional: true },
            { name: 'species_variant', type: 'string', isOptional: true },
            { name: 'expected_harvest_date', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'ponds',
          columns: [
            { name: 'ownership_type', type: 'string', isOptional: true },
            { name: 'water_availability', type: 'string', isOptional: true },
            { name: 'culture_system_category', type: 'string', isOptional: true },
            { name: 'pond_activity_type', type: 'string', isOptional: true },
            { name: 'wide_angle_photo_uri', type: 'string', isOptional: true },
            { name: 'embankment_photo_uri', type: 'string', isOptional: true },
            { name: 'close_view_photo_uri', type: 'string', isOptional: true },
            { name: 'farmer_with_pond_photo_uri', type: 'string', isOptional: true },
            { name: 'is_insured', type: 'boolean', isOptional: true },
            { name: 'flood_impact_3yrs', type: 'boolean', isOptional: true },
            { name: 'disease_occurrence', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
