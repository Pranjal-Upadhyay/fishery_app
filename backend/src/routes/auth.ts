import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, transaction } from '../db';
import { requireAuth, assertOwnership } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

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

const hatcherySignupSchema = z.object({
    role: z.literal('HATCHERY'),
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

const signupSchema = z.discriminatedUnion('role', [farmerSignupSchema, doctorSignupSchema, hatcherySignupSchema]);

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

    // ── New: Bucket 1 farmer profile / survey-form Section A fields ──
    fatherOrHusbandName:    z.string().max(120).optional().nullable(),
    aadhaarNumber:          z.string().regex(/^\d{12}$/).optional().nullable(),
    gender:                 z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable(),
    dateOfBirth:            z.string().date().optional().nullable(),
    educationLevel:         z.enum(['NONE','PRIMARY','SECONDARY','HIGHER_SECONDARY','GRADUATE','POSTGRADUATE'])
                                .optional().nullable(),
    householdSize:          z.number().int().positive().max(50).optional().nullable(),
    farmingExperienceYears: z.number().int().nonnegative().max(80).optional().nullable(),
    primaryOccupation:      z.enum(['FISH_FARMING','AGRICULTURE','DAIRY','LABOUR','BUSINESS','SERVICE','OTHER'])
                                .optional().nullable(),
    annualIncomeRange:      z.enum(['LT_50K','50K_1L','1L_3L','3L_5L','GT_5L']).optional().nullable(),
    kccHolder:              z.boolean().optional().nullable(),
    bplHolder:              z.boolean().optional().nullable(),
    consentGiven:           z.boolean().optional(),
});

// Module-level flag — schema alignment only needs to run once per process startup.
// This prevents lock contention and deadlocks under concurrent login/signup load.
let _authSchemaEnsured = false;

async function ensureAuthRuntimeSchema(): Promise<void> {
    if (_authSchemaEnsured) return;

    // Wrap all DDL in a single transaction so partial failures don't leave the
    // schema in an inconsistent state.
    await transaction(async (client) => {
        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
        `);

        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role VARCHAR(20)
        `);

        await client.query(`
            UPDATE users
            SET role = COALESCE(role, 'FARMER')
        `);

        await client.query(`
            ALTER TABLE users
            ALTER COLUMN role SET DEFAULT 'FARMER'
        `);

        await client.query(`
            ALTER TABLE users
            ALTER COLUMN district_code DROP NOT NULL
        `);

        await client.query(`
            ALTER TABLE users
            ALTER COLUMN state_code TYPE VARCHAR(100)
        `);

        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS block_code VARCHAR(160),
            ADD COLUMN IF NOT EXISTS panchayat_code VARCHAR(200)
        `);

        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'users_role_check'
                ) THEN
                    ALTER TABLE users
                    ADD CONSTRAINT users_role_check CHECK (role IN ('FARMER', 'DOCTOR', 'ADMIN', 'HATCHERY'));
                END IF;
            END $$;
        `);

        await client.query(`
            ALTER TABLE doctors
            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS district_code VARCHAR(120),
            ADD COLUMN IF NOT EXISTS district_name VARCHAR(120),
            ADD COLUMN IF NOT EXISTS block_code VARCHAR(160),
            ADD COLUMN IF NOT EXISTS block_name VARCHAR(120),
            ADD COLUMN IF NOT EXISTS panchayat_code VARCHAR(200),
            ADD COLUMN IF NOT EXISTS panchayat_name VARCHAR(120)
        `);

        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_user_id_unique
            ON doctors(user_id)
            WHERE user_id IS NOT NULL
        `);
    });

    _authSchemaEnsured = true;
}

/**
 * Safely fetches an authenticated user by a whitelisted column.
 * Uses a strict column map to prevent SQL injection — the column
 * parameter is never interpolated directly from user input.
 */
const SAFE_USER_COLUMNS: Record<string, string> = {
    phone: 'u.phone_number',
    id: 'u.id',
};

async function fetchAuthenticatedUserByColumn(columnKey: 'phone' | 'id', value: string) {
    const column = SAFE_USER_COLUMNS[columnKey];
    if (!column) {
        throw new Error(`Invalid column key: ${columnKey}`);
    }

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
        u.father_or_husband_name   AS "fatherOrHusbandName",
        u.aadhaar_number           AS "aadhaarNumber",
        u.gender                   AS "gender",
        TO_CHAR(u.date_of_birth, 'YYYY-MM-DD') AS "dateOfBirth",
        u.education_level          AS "educationLevel",
        u.household_size           AS "householdSize",
        u.farming_experience_years AS "farmingExperienceYears",
        u.primary_occupation       AS "primaryOccupation",
        u.annual_income_range      AS "annualIncomeRange",
        u.kcc_holder               AS "kccHolder",
        u.bpl_holder               AS "bplHolder",
        u.consent_given            AS "consentGiven",
        u.consent_given_at         AS "consentGivenAt",
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
    return fetchAuthenticatedUserByColumn('phone', phone);
}

async function fetchAuthenticatedUserById(userId: string) {
    return fetchAuthenticatedUserByColumn('id', userId);
}

router.post('/signup', async (req, res) => {
    try {
        await ensureAuthRuntimeSchema();
        const data = signupSchema.parse(req.body);

        const existing = await query('SELECT id FROM users WHERE phone_number = $1', [data.phone]);
        if ((existing.rowCount ?? 0) > 0) {
            return res.status(400).json({ success: false, error: 'Phone number already registered' });
        }

        // Cost 12 — matches admin auth, harder to brute-force from a leaked DB.
        // Existing cost-10 hashes still validate (bcrypt encodes cost in the hash).
        const hashed = await bcrypt.hash(data.password, 12);

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

            if (data.role === 'HATCHERY') {
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
                    VALUES ($1, $2, $3, 'HATCHERY', 'GENERAL', $4, $5, $6, $7)
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
                    INSERT INTO hatcheries (
                        name,
                        operator_id,
                        district,
                        block,
                        panchayat,
                        capacity_kg
                    )
                    VALUES ($1, $2, $3, $4, $5, 0)
                `, [
                    `${data.name}'s Hatchery`,
                    userId,
                    data.districtName || data.districtCode,
                    data.blockName || data.blockCode,
                    data.panchayatName || data.panchayatCode,
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
        // Strip password_hash before sending — must use destructuring (not delete)
        // to guarantee the field is absent from the serialized response object.
        const { password_hash: _pw, ...safeResolvedUser } = resolvedUser ?? {};
        const token = jwt.sign({ userId: safeResolvedUser?.id, role: safeResolvedUser?.role }, JWT_SECRET, { expiresIn: '30d' });

        auditLog({
            action: 'AUTH_SIGNUP',
            userId: safeResolvedUser?.id,
            ip: req.ip || req.socket.remoteAddress,
            details: { role: data.role, stateCode: data.stateCode },
            outcome: 'success',
        });

        res.json({ success: true, token, user: safeResolvedUser });
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
            auditLog({
                action: 'AUTH_LOGIN_FAILED',
                ip: req.ip || req.socket.remoteAddress,
                details: { phone: data.phone, reason: 'user_not_found' },
                outcome: 'failure',
            });
            return res.status(401).json({ success: false, error: 'Invalid phone or password' });
        }

        const valid = await bcrypt.compare(data.password, user.password_hash);
        if (!valid) {
            auditLog({
                action: 'AUTH_LOGIN_FAILED',
                userId: user.id,
                ip: req.ip || req.socket.remoteAddress,
                details: { phone: data.phone, reason: 'wrong_password' },
                outcome: 'failure',
            });
            return res.status(401).json({ success: false, error: 'Invalid phone or password' });
        }

        // Remove password_hash before sending — must be done before building the response object
        const { password_hash: _removed, ...safeUser } = user;
        const token = jwt.sign({ userId: safeUser.id, role: safeUser.role }, JWT_SECRET, { expiresIn: '30d' });

        auditLog({
            action: 'AUTH_LOGIN_SUCCESS',
            userId: safeUser.id,
            ip: req.ip || req.socket.remoteAddress,
            details: { role: safeUser.role },
            outcome: 'success',
        });

        res.json({ success: true, token, user: safeUser });
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

router.patch('/profile/:userId', requireAuth, async (req, res) => {
    try {
        // Ensure the requester owns this profile (or is admin)
        if (!assertOwnership(req, res, req.params.userId)) return;

        await ensureAuthRuntimeSchema();
        const payload = profileUpdateSchema.parse(req.body);

        // Consent-timestamp logic is inline in the UPDATE statement — if
        // consentGiven flips to true and no prior timestamp exists, NOW() is
        // recorded. Otherwise the prior timestamp is preserved.

        const result = await query(`
            UPDATE users
            SET name = $2,
                farmer_category = $3,
                state_code = $4,
                district_code = $5,
                block_code = $6,
                panchayat_code = $7,
                father_or_husband_name   = COALESCE($8,  father_or_husband_name),
                aadhaar_number           = COALESCE($9,  aadhaar_number),
                gender                   = COALESCE($10, gender),
                date_of_birth            = COALESCE($11::date, date_of_birth),
                education_level          = COALESCE($12, education_level),
                household_size           = COALESCE($13, household_size),
                farming_experience_years = COALESCE($14, farming_experience_years),
                primary_occupation       = COALESCE($15, primary_occupation),
                annual_income_range      = COALESCE($16, annual_income_range),
                kcc_holder               = COALESCE($17, kcc_holder),
                bpl_holder               = COALESCE($18, bpl_holder),
                consent_given            = COALESCE($19, consent_given),
                consent_given_at         = CASE
                    WHEN $19 = TRUE AND consent_given_at IS NULL THEN NOW()
                    ELSE consent_given_at
                END
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
            payload.fatherOrHusbandName ?? null,
            payload.aadhaarNumber ?? null,
            payload.gender ?? null,
            payload.dateOfBirth ?? null,
            payload.educationLevel ?? null,
            payload.householdSize ?? null,
            payload.farmingExperienceYears ?? null,
            payload.primaryOccupation ?? null,
            payload.annualIncomeRange ?? null,
            payload.kccHolder ?? null,
            payload.bplHolder ?? null,
            payload.consentGiven ?? null,
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
