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

export { router as notificationsRouter };
