import cron from 'node-cron';
import { query, transaction } from '../db';
import { startHatcheryCron, autoAdvanceBatchStages } from './hatcheryNotifications';

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn((pattern, fn) => {
    if (pattern === '0 0 6 * * *') {
      (global as any).cronCallback = fn;
    } else if (pattern === '0 * * * *') {
      (global as any).autoAdvanceCallback = fn;
    }
    return { start: jest.fn() };
  }),
}));

// Mock db query
jest.mock('../db', () => ({
  query: jest.fn(),
  transaction: jest.fn(async (cb) => {
    const client = { query: jest.fn() };
    return cb(client);
  }),
}));

describe('hatcheryNotifications cron job', () => {
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = query as unknown as jest.Mock;
  });

  it('schedules the cron job for 6:00 AM daily', () => {
    startHatcheryCron();
    expect(cron.schedule).toHaveBeenCalledWith('0 0 6 * * *', expect.any(Function));
  });

  const runCronTest = async (currentStage: string, startedDaysAgo: number) => {
    // Calculate started_at date
    const startedAt = new Date();
    startedAt.setDate(startedAt.getDate() - startedDaysAgo);

    // Mock the active batches query
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'batch-1',
          species_name: 'Rohu',
          current_stage: currentStage,
          stage_started_at: startedAt.toISOString(),
          hatchery_name: 'Test Hatchery',
          operator_id: 'operator-123',
        },
      ],
    });

    // Invoke the cron job callback
    const callback = (global as any).cronCallback;
    if (!callback) {
      throw new Error('Cron callback not scheduled. Call startHatcheryCron first.');
    }
    await callback();
  };

  it('sends no notification if days elapsed do not match milestones', async () => {
    await runCronTest('broodstock', 5);
    // Only the SELECT query should have been called, no INSERTs
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT b.*, sl.started_at');
  });

  it('sends feeding reminder on day 15 of broodstock stage', async () => {
    await runCronTest('broodstock', 15);
    // 1 SELECT, 1 INSERT for operator, 1 INSERT for admins
    expect(mockQuery).toHaveBeenCalledTimes(3);

    // Check operator notification query
    const opInsert = mockQuery.mock.calls[1];
    expect(opInsert[0]).toContain('INSERT INTO farmer_notifications');
    expect(opInsert[1][0]).toBe('operator-123');
    expect(opInsert[1][1]).toBe('Hatchery Alert (INFO)');
    expect(opInsert[1][2]).toContain('Conditioning reminder');

    // Check admin notification query
    const adminInsert = mockQuery.mock.calls[2];
    expect(adminInsert[0]).toContain('INSERT INTO farmer_notifications');
    expect(adminInsert[1][0]).toBe('Hatchery Alert — Test Hatchery');
    expect(adminInsert[1][1]).toContain('Conditioning reminder');
  });

  it('sends water check reminder on day 30 of broodstock stage', async () => {
    await runCronTest('broodstock', 30);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (WARNING)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Water check reminder');
  });

  it('sends injection warning on day 1 of spawning stage', async () => {
    await runCronTest('spawning', 1);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (WARNING)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('hormone injection is complete');
  });

  it('sends yolk-sac absorption warning on day 1 of hatching stage', async () => {
    await runCronTest('hatching', 1);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (WARNING)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Do NOT feed externally');
  });

  it('sends nursery transfer warning on day 3 of hatching stage', async () => {
    await runCronTest('hatching', 3);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (CRITICAL)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Transfer advanced spawn to prepared nursery ponds');
  });

  it('sends feeding reminder on day 5 of nursery stage', async () => {
    await runCronTest('nursery', 5);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (INFO)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Start supplemental feeding today');
  });

  it('sends water quality warning on day 10 of nursery stage', async () => {
    await runCronTest('nursery', 10);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (WARNING)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Water quality test reminder');
  });

  it('sends growth check reminder on day 15 of nursery stage', async () => {
    await runCronTest('nursery', 15);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (INFO)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Day 15 sampling check');
  });

  it('sends transfer warning on day 21 of nursery stage', async () => {
    await runCronTest('nursery', 21);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (WARNING)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Fry should be 25-35 mm and ready for transfer');
  });

  it('sends water quality warning on day 10 of rearing stage', async () => {
    await runCronTest('rearing', 10);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (WARNING)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Ensure DO > 5 mg/L and test ammonia');
  });

  it('sends progress check on day 30 of rearing stage', async () => {
    await runCronTest('rearing', 30);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (INFO)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Ensure twice daily feeding');
  });

  it('sends buyer search alert on day 45 of rearing stage', async () => {
    await runCronTest('rearing', 45);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (INFO)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Begin identifying buyers for fingerlings');
  });

  it('sends marketplace listing reminder on day 60 of rearing stage', async () => {
    await runCronTest('rearing', 60);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (WARNING)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('List available fingerlings on MatsyaMitra marketplace');
  });

  it('sends 10-day remaining urgent warning on day 65 of rearing stage', async () => {
    await runCronTest('rearing', 65);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (CRITICAL)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('URGENT: Batch Rohu is 10 days from fingerling readiness');
  });

  it('sends ready for sale reminder on day 75 of rearing stage', async () => {
    await runCronTest('rearing', 75);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (WARNING)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('completed rearing. Fingerlings are ready for sale');
  });

  it('sends record sale reminder on day 7 of fingerling ready stage', async () => {
    await runCronTest('fingerling_ready', 7);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[1][1][1]).toBe('Hatchery Alert (WARNING)');
    expect(mockQuery.mock.calls[1][1][2]).toContain('Record sale transactions to clear batch');
  });

  it('schedules the auto-advance cron job hourly', () => {
    startHatcheryCron();
    expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
  });

  describe('autoAdvanceBatchStages', () => {
    it('automatically transitions a broodstock batch after 120 days', async () => {
      const now = new Date();
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - 121); // well past 120 days

      // Mock batches query response
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'batch-120',
            species_name: 'Rohu',
            current_stage: 'broodstock',
            stage_started_at: startedAt.toISOString(),
            hatchery_name: 'Test Hatchery',
            operator_id: 'operator-1',
          },
        ],
      });

      const mockClient = {
        query: jest.fn().mockImplementation((q) => {
          if (q.includes('SELECT count_at_entry')) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        })
      };
      (transaction as jest.Mock).mockImplementationOnce(async (cb) => cb(mockClient));

      await autoAdvanceBatchStages(now);

      // Only the initial batches fetch is called on global query mock
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Check transaction query invocations
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hatchery_stage_logs'),
        [now, 'batch-120', 'broodstock']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hatchery_stage_logs'),
        ['batch-120', 'spawning', null, expect.any(String), now]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hatchery_batches'),
        ['spawning', now, 'batch-120']
      );
    });

    it('automatically transitions a spawning batch after 18 hours', async () => {
      const now = new Date();
      const startedAt = new Date();
      startedAt.setHours(startedAt.getHours() - 19); // well past 18 hours

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'batch-spawning',
            species_name: 'Rohu',
            current_stage: 'spawning',
            stage_started_at: startedAt.toISOString(),
            hatchery_name: 'Test Hatchery',
            operator_id: 'operator-1',
          },
        ],
      });

      const mockClient = {
        query: jest.fn().mockImplementation((q) => {
          if (q.includes('SELECT count_at_entry')) {
            return Promise.resolve({ rows: [{ count_at_entry: 50000 }] });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        })
      };
      (transaction as jest.Mock).mockImplementationOnce(async (cb) => cb(mockClient));

      await autoAdvanceBatchStages(now);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hatchery_stage_logs'),
        ['batch-spawning', 'hatching', 50000, expect.any(String), now]
      );
    });
  });
});
