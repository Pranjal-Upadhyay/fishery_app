import { Router } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/v1/baip-farmers
// Fetch all BAIP survey geotagged farmers
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        id, objectid, farmer_name, farmer_mobile, globalid, uniquerowid,
        state, district, subdistrict, gpname, village,
        age, gender, female_headed, total_number_family, social_category,
        education_level, income_control, annual_income, flood_impact,
        disease_occurrence, pond_insured, latitude, longitude, survey_date
      FROM baip_geotagged_farmers
      ORDER BY id
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

export { router as baipFarmersRouter };
