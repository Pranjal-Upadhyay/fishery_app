import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, transaction } from '../db';

const router = Router();

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Set it in your production environment before deploying.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_fallback_not_for_production';

const farmerSignupSchema = z.object({
    role: z.literal('FARMER'),
    phone: z.string().min(10).max(20),
    password: z.string().min(8).max(128),
    name: z.string().min(2).max(100).trim(),
    farmerCategory: z.enum(['GENERAL', 'WOMEN', 'SC', 'ST']).default('GENERAL'),
    stateCode: z.string().length(2),
});

const doctorSignupSchema = z.object({
    role: z.literal('DOCTOR'),
    phone: z.string().min(10).max(20),
    password: z.string().min(8).max(128),
    name: z.string().min(2).max(100).trim(),
    stateCode: z.string().length(2),
    districtCode: z.string().min(2).max(120),
    districtName: z.string().min(2).max(120),
    blockCode: z.string().min(2).max(160),
    blockName: z.string().min(2).max(120),
    panchayatCode: z.string().min(2).max(200),
    panchayatName: z.string().min(2).max(120),
});

const signupSchema = z.discriminatedUnion('role', [farmerSignupSchema, doctorSignupSchema]);

const loginSchema = z.object({
    phone: z.string().min(10).max(20),
    password: z.string().min(1).max(128),
});

const profileUpdateSchema = z.object({
    name: z.string().min(2).max(100).trim(),
    farmerCategory: z.enum(['GENERAL', 'WOMEN', 'SC', 'ST']),
    stateCode: z.string().length(2),
    districtCode: z.string().min(2).max(120).optional().nullable(),
    blockCode: z.string().min(2).max(160).optional().nullable(),
    panchayatCode: z.string().min(2).max(200).optional().nullable(),
});

async function ensureAuthRuntimeSchema(): Promise<void> {
    await query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
    `);

    await query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(20)
    `);

    await query(`
        UPDATE users
        SET role = COALESCE(role, 'FARMER')
    `);

    await query(`
        ALTER TABLE users
        ALTER COLUMN role SET DEFAULT 'FARMER'
    `);

    await query(`
        ALTER TABLE users
        ALTER COLUMN district_code DROP NOT NULL
    `);

    await query(`
        ALTER TABLE users
        ALTER COLUMN state_code TYPE VARCHAR(100)
    `);

    await query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS block_code VARCHAR(160),
        ADD COLUMN IF NOT EXISTS panchayat_code VARCHAR(200)
    `);

    await query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'users_role_check'
            ) THEN
                ALTER TABLE users
                ADD CONSTRAINT users_role_check CHECK (role IN ('FARMER', 'DOCTOR', 'ADMIN'));
            END IF;
        END $$;
    `);

    await query(`
        ALTER TABLE doctors
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS district_code VARCHAR(120),
        ADD COLUMN IF NOT EXISTS district_name VARCHAR(120),
        ADD COLUMN IF NOT EXISTS block_code VARCHAR(160),
        ADD COLUMN IF NOT EXISTS block_name VARCHAR(120),
        ADD COLUMN IF NOT EXISTS panchayat_code VARCHAR(200),
        ADD COLUMN IF NOT EXISTS panchayat_name VARCHAR(120)
    `);

    await query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_user_id_unique
        ON doctors(user_id)
        WHERE user_id IS NOT NULL
    `);
}

async function fetchAuthenticatedUserByColumn(column: 'u.phone_number' | 'u.id', value: string) {
    const result = await query(`
      SELECT
        u.id,
        u.phone_number AS phone,
        u.password_hash,
        u.name,
        u.role,
        u.farmer_category AS "farmerCategory",
        u.state_code AS "stateCode",
        u.district_code AS "districtCode",
        u.block_code AS "blockCode",
        u.panchayat_code AS "panchayatCode",
        d.id AS "doctorId",
        d.specialization[1] AS "doctorSpecialization",
        COALESCE(d.district_name, ud.name) AS "districtName",
        COALESCE(d.block_name, ub.name) AS "blockName",
        COALESCE(d.panchayat_name, up.name) AS "panchayatName"
      FROM users u
      LEFT JOIN doctors d ON d.user_id = u.id
      LEFT JOIN loc_districts ud ON ud.code = u.district_code
      LEFT JOIN loc_blocks ub ON ub.code = u.block_code
      LEFT JOIN loc_panchayats up ON up.code = u.panchayat_code
      WHERE ${column} = $1
      LIMIT 1
    `, [value]);

    return result.rows[0];
}

async function fetchAuthenticatedUser(phone: string) {
    return fetchAuthenticatedUserByColumn('u.phone_number', phone);
}

async function fetchAuthenticatedUserById(userId: string) {
    return fetchAuthenticatedUserByColumn('u.id', userId);
}

router.post('/signup', async (req, res) => {
    try {
        await ensureAuthRuntimeSchema();
        const data = signupSchema.parse(req.body);

        const existing = await query('SELECT id FROM users WHERE phone_number = $1', [data.phone]);
        if ((existing.rowCount ?? 0) > 0) {
            return res.status(400).json({ success: false, error: 'Phone number already registered' });
        }

        const hashed = await bcrypt.hash(data.password, 10);

        const createdPhone = await transaction(async (client) => {
            if (data.role === 'DOCTOR') {
                const userResult = await client.query(`
                    INSERT INTO users (
                        phone_number,
                        password_hash,
                        name,
                        role,
                        farmer_category,
                        state_code,
                        district_code,
                        block_code,
                        panchayat_code
                    )
                    VALUES ($1, $2, $3, 'DOCTOR', 'GENERAL', $4, $5, $6, $7)
                    RETURNING id
                `, [
                    data.phone,
                    hashed,
                    data.name,
                    data.stateCode,
                    data.districtCode,
                    data.blockCode,
                    data.panchayatCode,
                ]);

                const userId = userResult.rows[0].id;

                await client.query(`
                    INSERT INTO doctors (
                        user_id,
                        name,
                        phone,
                        district_code,
                        district_name,
                        block_code,
                        block_name,
                        panchayat_code,
                        panchayat_name,
                        assigned_panchayats,
                        specialization,
                        availability_schedule,
                        is_active
                    )
                    VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9,
                        ARRAY[$10]::text[],
                        ARRAY['Aquaculture Field Visit', 'Disease Triage']::text[],
                        jsonb_build_object('slot', '48_hour_response'),
                        true
                    )
                `, [
                    userId,
                    data.name,
                    data.phone,
                    data.districtCode,
                    data.districtName,
                    data.blockCode,
                    data.blockName,
                    data.panchayatCode,
                    data.panchayatName,
                    data.panchayatCode,
                ]);

                return data.phone;
            }

            await client.query(`
                INSERT INTO users (
                    phone_number,
                    password_hash,
                    name,
                    role,
                    farmer_category,
                    state_code
                )
                VALUES ($1, $2, $3, 'FARMER', $4, $5)
            `, [data.phone, hashed, data.name, data.farmerCategory, data.stateCode]);

            return data.phone;
        });

        const resolvedUser = await fetchAuthenticatedUser(createdPhone);
        const token = jwt.sign({ userId: resolvedUser?.id, role: resolvedUser?.role }, JWT_SECRET, { expiresIn: '30d' });

        res.json({ success: true, token, user: resolvedUser });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.issues });
        }
        console.error('Signup error', error);
        res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        await ensureAuthRuntimeSchema();
        const data = loginSchema.parse(req.body);

        const user = await fetchAuthenticatedUser(data.phone);
        if (!user || !user.password_hash) {
            return res.status(401).json({ success: false, error: 'Invalid phone or password' });
        }

        const valid = await bcrypt.compare(data.password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid phone or password' });
        }

        delete user.password_hash;
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

        res.json({ success: true, token, user });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.issues });
        }
        res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
        });
    }
});

router.patch('/profile/:userId', async (req, res) => {
    try {
        await ensureAuthRuntimeSchema();
        const payload = profileUpdateSchema.parse(req.body);

        const result = await query(`
            UPDATE users
            SET name = $2,
                farmer_category = $3,
                state_code = $4,
                district_code = $5,
                block_code = $6,
                panchayat_code = $7
            WHERE id = $1
            RETURNING id
        `, [
            req.params.userId,
            payload.name,
            payload.farmerCategory,
            payload.stateCode,
            payload.districtCode || null,
            payload.blockCode || null,
            payload.panchayatCode || null,
        ]);

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const user = await fetchAuthenticatedUserById(req.params.userId);
        res.json({ success: true, user });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.issues });
        }
        res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
        });
    }
});

export { router as authRouter };
