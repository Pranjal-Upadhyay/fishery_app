-- ============================================================================
-- Migration 033: Farmer Notifications
--
-- Creates a farmer_notifications table that stores push-style notifications
-- for farmers. Currently used for doctor appointment status updates.
-- The farmer app polls GET /api/v1/notifications/farmer/:farmerId to fetch
-- unread notifications.
-- ============================================================================

CREATE TABLE IF NOT EXISTS farmer_notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(60) NOT NULL,          -- 'doctor_accepted' | 'doctor_visiting' | 'appointment_completed'
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_notifications_farmer
    ON farmer_notifications(farmer_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_farmer_notifications_appointment
    ON farmer_notifications(appointment_id);
