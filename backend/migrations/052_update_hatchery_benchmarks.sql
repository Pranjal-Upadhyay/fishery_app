-- Migration 052: Update Hatchery Benchmarks
-- Updates stage durations and descriptions to be exact and detailed.

UPDATE hatchery_stage_benchmarks
SET min_days = 120, max_days = 120, typical_days = 120, description = 'Broodstock conditioning before spawning (takes total 120 days).'
WHERE stage = 'broodstock';

UPDATE hatchery_stage_benchmarks
SET min_days = 0, max_days = 1, typical_days = 0, description = 'Hormone injection to egg release (takes 12–18 hours).'
WHERE stage = 'spawning';

UPDATE hatchery_stage_benchmarks
SET min_days = 0, max_days = 1, typical_days = 1, description = 'Fertilization to hatch (takes 0–1 day).'
WHERE stage = 'hatching';

UPDATE hatchery_stage_benchmarks
SET min_days = 21, max_days = 30, typical_days = 25, description = 'Spawn to fry in nursery pond (takes 21–30 days). Fry is created at the end of this stage.'
WHERE stage = 'nursery';

UPDATE hatchery_stage_benchmarks
SET min_days = 60, max_days = 90, typical_days = 75, description = 'Fry to fingerling in rearing pond (takes 60–90 days). Fingerlings are created at the end of this stage.'
WHERE stage = 'rearing';
