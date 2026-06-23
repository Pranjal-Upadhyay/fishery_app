ALTER TABLE hatchery_batches
  ADD COLUMN IF NOT EXISTS actual_fingerling_count BIGINT,
  ADD COLUMN IF NOT EXISTS actual_survival_rate_pct NUMERIC
    GENERATED ALWAYS AS (
      CASE
        WHEN estimated_spawn_count > 0 AND actual_fingerling_count IS NOT NULL
        THEN ROUND((actual_fingerling_count::NUMERIC / estimated_spawn_count) * 100, 1)
      END
    ) STORED;
