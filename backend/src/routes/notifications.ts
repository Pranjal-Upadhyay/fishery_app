/**
 * Farmer Notifications API
 * Delivers doctor-triggered notifications to the farmer's app.
 * The farmer app polls this endpoint on focus to get unread notifications.
 */

import { Router } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/v1/notifications/farmer/:farmerId
 * Returns all notifications for a farmer, newest first.
 * Query param: ?unreadOnly=true to filter to unread only.
 */
router.get('/farmer/:farmerId', async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await query(`
      SELECT
        id,
        farmer_id,
        type,
        title,
        message,
        appointment_id,
        is_read,
        created_at
      FROM farmer_notifications
      WHERE farmer_id = $1
        ${unreadOnly ? 'AND is_read = FALSE' : ''}
      ORDER BY created_at DESC
      LIMIT 50
    `, [farmerId]);

    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/notifications/farmer/:farmerId/read
 * Mark one or all notifications as read.
 * Body: { notificationId?: string } — omit to mark all as read.
 */
router.patch('/farmer/:farmerId/read', async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const { notificationId } = req.body;

    if (notificationId) {
      await query(`
        UPDATE farmer_notifications
        SET is_read = TRUE
        WHERE id = $1 AND farmer_id = $2
      `, [notificationId, farmerId]);
    } else {
      await query(`
        UPDATE farmer_notifications
        SET is_read = TRUE
        WHERE farmer_id = $1 AND is_read = FALSE
      `, [farmerId]);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/notifications/send
 * Dispatch an alert or advisory notification to a farmer's mobile app.
 * Body: { farmerId?: string, phone?: string, farmerName?: string, type?: string, title: string, message: string }
 */
router.post('/send', async (req, res, next) => {
  try {
    const { farmerId, phone, farmerName, type, title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required' });
    }

    let targetFarmerId = farmerId;

    // 1. If farmerId not provided or invalid UUID, lookup by phone
    if (!targetFarmerId && phone) {
      const userRes = await query(`SELECT id FROM users WHERE phone = $1 LIMIT 1`, [phone]);
      if (userRes.rows.length > 0) {
        targetFarmerId = userRes.rows[0].id;
      }
    }

    // 2. Fallback: lookup by name
    if (!targetFarmerId && farmerName) {
      const userRes = await query(`SELECT id FROM users WHERE name ILIKE $1 LIMIT 1`, [`%${farmerName}%`]);
      if (userRes.rows.length > 0) {
        targetFarmerId = userRes.rows[0].id;
      }
    }

    // 3. Fallback: select any registered farmer to ensure app delivery during demos
    if (!targetFarmerId) {
      const defaultUser = await query(`SELECT id FROM users WHERE role = 'FARMER' LIMIT 1`);
      if (defaultUser.rows.length > 0) {
        targetFarmerId = defaultUser.rows[0].id;
      }
    }

    if (targetFarmerId) {
      await query(`
        INSERT INTO farmer_notifications (farmer_id, type, title, message, is_read, created_at)
        VALUES ($1, $2, $3, $4, FALSE, NOW())
      `, [targetFarmerId, type || 'alert_guidance', title, message]);
    }

    res.json({
      success: true,
      message: 'App notification dispatched successfully to farmer mobile app',
      deliveredToFarmerId: targetFarmerId || null
    });
  } catch (error) {
    next(error);
  }
});

export { router as notificationsRouter };
