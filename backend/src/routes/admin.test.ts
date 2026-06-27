const mockQuery = jest.fn();
const mockConnectQuery = jest.fn();
const mockRelease = jest.fn();
const mockClient = {
  query: mockConnectQuery,
  release: mockRelease,
};
const mockConnect = jest.fn(() => Promise.resolve(mockClient));

jest.mock('../db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: {
    connect: () => mockConnect(),
  },
}));

import { adminRouter } from './admin';

function getHandler(router: any, path: string, method: 'get' | 'post' | 'patch') {
  const layer = router.stack.find((entry: any) => {
    return entry.route?.path === path && entry.route?.methods?.[method];
  });

  if (!layer) {
    throw new Error(`${method.toUpperCase()} handler not found for ${path}`);
  }

  // Return the main handler (the last layer in the route stack)
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

describe('Admin Router Ingestion Tests', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockConnectQuery.mockReset();
    mockRelease.mockClear();
    mockConnect.mockClear();
  });

  describe('POST /import/hatcheries', () => {
    it('fails if user is not authenticated or not superadmin (handled by middleware)', () => {
      // The auth middleware requireAdmin and requireAdminRole('superadmin') handle role checks.
      // We will test the main route handler directly assuming middleware passed.
    });

    it('rejects invalid payloads with 400', async () => {
      const handler = getHandler(adminRouter, '/import/hatcheries', 'post');
      const req = {
        admin: { role: 'superadmin', adminId: 'admin-1' },
        body: [
          {
            hatchery_name: '', // Empty name (invalid)
            owner_name: 'Owner',
            owner_mobile: '123', // Invalid phone length
            district: 'Banka',
            block: 'Bounsi',
          },
        ],
        ip: '127.0.0.1',
        get: () => 'Jest',
      };
      
      const res = {
        statusCode: 200,
        body: undefined as any,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: unknown) {
          this.body = payload;
          return this;
        },
      };
      const next = jest.fn();

      await handler(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('resolves district/block and inserts hatchery successfully', async () => {
      // Setup district and block lookup results
      mockConnectQuery.mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('loc_districts')) {
          return Promise.resolve({
            rows: [{ code: 'BR-BANKA', name: 'Banka' }],
            rowCount: 1,
          });
        }
        if (sql.includes('loc_blocks')) {
          return Promise.resolve({
            rows: [{ code: 'BR-BANKA-BOUNSI', name: 'Bounsi', district_code: 'BR-BANKA' }],
            rowCount: 1,
          });
        }
        if (sql.includes('users WHERE phone_number')) {
          return Promise.resolve({ rows: [], rowCount: 0 }); // New user
        }
        if (sql.includes('INSERT INTO users')) {
          return Promise.resolve({ rows: [{ id: 'user-1' }], rowCount: 1 });
        }
        if (sql.includes('hatcheries WHERE operator_id')) {
          return Promise.resolve({ rows: [], rowCount: 0 }); // New hatchery
        }
        if (sql.includes('INSERT INTO hatcheries')) {
          return Promise.resolve({ rows: [{ id: 'hatchery-1' }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const handler = getHandler(adminRouter, '/import/hatcheries', 'post');
      const req = {
        admin: { role: 'superadmin', adminId: 'admin-1' },
        body: [
          {
            hatchery_name: 'Test Ingested Hatchery',
            owner_name: 'Ilyash',
            owner_mobile: '8809490575',
            district: 'Banka',
            block: 'Bounsi',
            capacity_kg: 800,
            area_acres: 5,
            year_completed: 2014,
          },
        ],
        ip: '127.0.0.1',
        get: () => 'Jest',
      };

      const res = {
        statusCode: 200,
        body: undefined as any,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: unknown) {
          this.body = payload;
          return this;
        },
      };
      const next = jest.fn();

      await handler(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('processed 1 hatcheries');
      expect(mockConnectQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockConnectQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('rolls back and fails if location is invalid', async () => {
      mockConnectQuery.mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('loc_districts')) {
          return Promise.resolve({
            rows: [{ code: 'BR-BANKA', name: 'Banka' }],
            rowCount: 1,
          });
        }
        if (sql.includes('loc_blocks')) {
          return Promise.resolve({
            rows: [], // No block found
            rowCount: 0,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const handler = getHandler(adminRouter, '/import/hatcheries', 'post');
      const req = {
        admin: { role: 'superadmin', adminId: 'admin-1' },
        body: [
          {
            hatchery_name: 'Test Hatchery',
            owner_name: 'Owner',
            owner_mobile: '9999999999',
            district: 'Banka',
            block: 'WrongBlock',
          },
        ],
        ip: '127.0.0.1',
        get: () => 'Jest',
      };

      const res = {
        statusCode: 200,
        body: undefined as any,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: unknown) {
          this.body = payload;
          return this;
        },
      };
      const next = jest.fn();

      await handler(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Block "WrongBlock" not found');
      expect(mockConnectQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });
  });
});
