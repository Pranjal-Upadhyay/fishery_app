import cron from 'node-cron';
import { query, transaction } from '../db';
import { logger } from '../utils/logger';

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

function hoursBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60));
}

export function startHatcheryCron() {
  // 1. Run notifications cron job daily at 6:00 AM IST
  cron.schedule('0 0 6 * * *', async () => {
    logger.info('Running Hatchery Stage-by-Stage Notifications cron job');
    try {
      const now = new Date();

      // Find all active batches (current stage not 'sold')
      const { rows: batches } = await query(`
        SELECT b.*, sl.started_at as stage_started_at,
               h.name as hatchery_name, h.operator_id
        FROM hatchery_batches b
        JOIN hatcheries h ON b.hatchery_id = h.id
        JOIN hatchery_stage_logs sl ON sl.batch_id = b.id
        WHERE b.current_stage = sl.stage
          AND sl.ended_at IS NULL
          AND b.current_stage != 'sold'
      `);

      for (const batch of batches) {
        const daysInStage = daysBetween(new Date(batch.stage_started_at), now);
        let message: string | null = null;
        let severity: 'info' | 'warning' | 'critical' = 'info';

        switch (batch.current_stage) {
          case 'broodstock':
            if (daysInStage > 0 && daysInStage % 30 === 0) {
              message = `Batch ${batch.species_name} (Broodstock): Water check reminder. Keep water temperature optimal (26-32°C) for induced spawning readiness.`;
              severity = 'warning';
            } else if (daysInStage > 0 && daysInStage % 15 === 0) {
              message = `Batch ${batch.species_name} (Broodstock): Conditioning reminder. Ensure high-protein feed (30-35% protein) at 1-2% body weight daily. Target sex ratio is 1:1.`;
            }
            break;

          case 'spawning':
            if (daysInStage === 1) {
              message = `Batch ${batch.species_name} has been in Spawning stage for 24 hours. Ensure hormone injection is complete, and eggs/milt are released. Advance to Hatching stage.`;
              severity = 'warning';
            }
            break;

          case 'hatching':
            if (daysInStage === 1) {
              message = `Batch ${batch.species_name} (Hatching): Larvae (sac fry) yolk-sac absorption period. Do NOT feed externally for next 48-72 hours. Maintain DO and water circulation.`;
              severity = 'warning';
            } else if (daysInStage === 3) {
              message = `Batch ${batch.species_name} (Hatching): Yolk-sac absorption is complete. Transfer advanced spawn to prepared nursery ponds immediately.`;
              severity = 'critical';
            }
            break;

          case 'nursery':
            if (daysInStage === 5) {
              message = `Batch ${batch.species_name} (Nursery): Start supplemental feeding today (rice bran + mustard cake at 1:1 ratio, twice daily).`;
            } else if (daysInStage === 10) {
              message = `Batch ${batch.species_name} (Nursery): Water quality test reminder. Ensure DO > 5 mg/L and pH is 7.5-8.5.`;
              severity = 'warning';
            } else if (daysInStage === 15) {
              message = `Batch ${batch.species_name} (Nursery): Day 15 sampling check. Measure fry growth (should be 15-20 mm).`;
            } else if (daysInStage === 21) {
              message = `Batch ${batch.species_name} (Nursery): Day 21. Fry should be 25-35 mm and ready for transfer. Prepare rearing ponds.`;
              severity = 'warning';
            }
            break;

          case 'rearing':
            if (daysInStage === 10) {
              message = `Batch ${batch.species_name} (Rearing): Water quality check. Ensure DO > 5 mg/L and test ammonia levels.`;
              severity = 'warning';
            } else if (daysInStage === 30) {
              message = `Batch ${batch.species_name} (Rearing): Rearing progress check. Ensure twice daily feeding.`;
            } else if (daysInStage === 45) {
              message = `Batch ${batch.species_name} (Rearing): 50% completed (Day 45). Begin identifying buyers for fingerlings.`;
            } else if (daysInStage === 60) {
              message = `Batch ${batch.species_name} (Rearing): 80% completed (Day 60). List available fingerlings on MatsyaMitra marketplace now.`;
              severity = 'warning';
            } else if (daysInStage === 75 - 10) {
              message = `URGENT: Batch ${batch.species_name} is 10 days from fingerling readiness. Sample-weigh fingerlings (target 8-15g) and confirm buyer delivery.`;
              severity = 'critical';
            } else if (daysInStage === 75) {
              message = `Batch ${batch.species_name} has completed rearing. Fingerlings are ready for sale. Record fingerling sales.`;
              severity = 'warning';
            }
            break;

          case 'fingerling_ready':
            if (daysInStage > 0 && daysInStage % 7 === 0) {
              message = `Batch ${batch.species_name} (Fingerling Ready): Record sale transactions to clear batch and generate farmer grow-out QR code.`;
              severity = 'warning';
            }
            break;
        }

        if (message) {
          // Insert notification for the operator
          await query(`
            INSERT INTO farmer_notifications (farmer_id, type, title, message, is_read, created_at)
            VALUES ($1, 'hatchery_alert', $2, $3, FALSE, NOW())
          `, [batch.operator_id, `Hatchery Alert (${severity.toUpperCase()})`, message]);

          // Notify Admin users
          await query(`
            INSERT INTO farmer_notifications (farmer_id, type, title, message, is_read, created_at)
            SELECT id, 'hatchery_alert', $1, $2, FALSE, NOW()
            FROM users WHERE role = 'ADMIN'
          `, [`Hatchery Alert — ${batch.hatchery_name}`, message]);
        }
      }
    } catch (error: any) {
      logger.error('Hatchery Notifications cron job error', { error: error.message });
    }
  });

  // 2. Run automatic stage transitions cron job hourly
  cron.schedule('0 * * * *', async () => {
    logger.info('Running Hatchery Auto-Advance stages cron job');
    try {
      const now = new Date();
      await autoAdvanceBatchStages(now);
    } catch (error: any) {
      logger.error('Hatchery Auto-Advance stages cron job error', { error: error.message });
    }
  });
}

function getStageCompletionDetail(stage: string): string {
  switch (stage) {
    case 'spawning':
      return 'Induced spawning protocol is starting. Spawning takes 12 to 18 hours.';
    case 'hatching':
      return 'Hatching takes 0 to 1 day. Keep circular troughs circulating. Larvae yolk-sac absorption is starting.';
    case 'nursery':
      return 'Nursery stage takes 21 to 30 days. Spawn will grow into fry. Fry is created at the end of this stage.';
    case 'rearing':
      return 'Rearing stage takes 60 to 90 days. Fry will grow into fingerlings. Fingerlings are created at the end of this stage.';
    case 'fingerling_ready':
      return 'Fingerlings are now created and ready for sale!';
    default:
      return '';
  }
}

export async function autoAdvanceBatchStages(now: Date) {
  // Find all active batches (current stage not 'sold')
  const { rows: batches } = await query(`
    SELECT b.*, sl.started_at as stage_started_at,
           h.name as hatchery_name, h.operator_id
    FROM hatchery_batches b
    JOIN hatcheries h ON b.hatchery_id = h.id
    JOIN hatchery_stage_logs sl ON sl.batch_id = b.id
    WHERE b.current_stage = sl.stage
      AND sl.ended_at IS NULL
      AND b.current_stage != 'sold'
  `);

  for (const batch of batches) {
    const startedAt = new Date(batch.stage_started_at);
    const msElapsed = now.getTime() - startedAt.getTime();
    const hoursElapsed = msElapsed / (1000 * 60 * 60);
    const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);

    let nextStage: string | null = null;
    let reason = '';
    let durationText = '';

    switch (batch.current_stage) {
      case 'broodstock':
        if (daysElapsed >= 120) {
          nextStage = 'spawning';
          reason = 'completed 120 days of broodstock conditioning';
          durationText = '120 days';
        }
        break;
      case 'spawning':
        if (hoursElapsed >= 18) {
          nextStage = 'hatching';
          reason = 'completed 18 hours of spawning stage';
          durationText = '18 hours';
        }
        break;
      case 'hatching':
        if (hoursElapsed >= 24) {
          nextStage = 'nursery';
          reason = 'completed 1 day of hatching stage';
          durationText = '1 day';
        }
        break;
      case 'nursery':
        if (daysElapsed >= 30) {
          nextStage = 'rearing';
          reason = 'completed 30 days of nursery stage';
          durationText = '30 days';
        }
        break;
      case 'rearing':
        if (daysElapsed >= 90) {
          nextStage = 'fingerling_ready';
          reason = 'completed 90 days of rearing stage';
          durationText = '90 days';
        }
        break;
    }

    if (nextStage) {
      logger.info(`Auto-advancing batch ${batch.id} from ${batch.current_stage} to ${nextStage} (${reason})`);

      await transaction(async (client) => {
        // 1. Update previous active log ended_at
        await client.query(`
          UPDATE hatchery_stage_logs
          SET ended_at = $1
          WHERE batch_id = $2 AND stage = $3 AND ended_at IS NULL
        `, [now, batch.id, batch.current_stage]);

        // 2. Fetch count_at_entry of previous log to carry over
        let countAtEntry: number | null = null;
        const prevLog = await client.query(`
          SELECT count_at_entry FROM hatchery_stage_logs
          WHERE batch_id = $1 AND stage = $2
          ORDER BY created_at DESC LIMIT 1
        `, [batch.id, batch.current_stage]);
        if (prevLog.rows.length > 0) {
          countAtEntry = prevLog.rows[0].count_at_entry;
        }

        // 3. Insert new stage log
        const observations = `Batch advanced automatically to ${nextStage} after ${reason}.`;
        await client.query(`
          INSERT INTO hatchery_stage_logs (
            batch_id, stage, count_at_entry, observations, started_at
          ) VALUES ($1, $2, $3, $4, $5)
        `, [batch.id, nextStage, countAtEntry, observations, now]);

        // 4. Update the batch table
        await client.query(`
          UPDATE hatchery_batches
          SET current_stage = $1, updated_at = $2
          WHERE id = $3
        `, [nextStage, now, batch.id]);

        // 5. Create farmer notification
        const stageNameDisplay = nextStage.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        const details = getStageCompletionDetail(nextStage);
        const message = `Batch ${batch.species_name} has automatically advanced to ${stageNameDisplay} stage after ${durationText} of ${batch.current_stage.replace('_', ' ')}. ${details}`;

        await client.query(`
          INSERT INTO farmer_notifications (farmer_id, type, title, message, is_read, created_at)
          VALUES ($1, 'hatchery_alert', $2, $3, FALSE, $4)
        `, [batch.operator_id, `Hatchery Stage Advanced (AUTO)`, message, now]);

        // 6. Create admin notification
        await client.query(`
          INSERT INTO farmer_notifications (farmer_id, type, title, message, is_read, created_at)
          SELECT id, 'hatchery_alert', $1, $2, FALSE, $3
          FROM users WHERE role = 'ADMIN'
        `, [`Hatchery Alert — ${batch.hatchery_name}`, message, now]);
      });
    }
  }
}
