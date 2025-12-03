-- Migration: Add new features (Phone Login, FCM Token, Notifications)
-- Run this migration to add the necessary database changes

-- =============================================
-- 1. Add phone field to otps table
-- =============================================
ALTER TABLE otps 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Update OTP type constraint to include 'phone_login'
ALTER TABLE otps 
DROP CONSTRAINT IF EXISTS otps_type_check;

ALTER TABLE otps 
ADD CONSTRAINT otps_type_check 
CHECK (type IN ('password_reset', 'email_verification', 'phone_verification', 'phone_login'));

-- Add index on phone field
CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone);

-- =============================================
-- 2. Add fcm_token field to users table
-- =============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(500);

-- Add index on fcm_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token) WHERE fcm_token IS NOT NULL;

-- =============================================
-- 3. Create notifications table
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('order', 'system', 'offers', 'other')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created ON notifications(user_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- =============================================
-- Notes:
-- - The OTP table now supports phone-based OTPs
-- - Users can store FCM tokens for push notifications
-- - Notifications table supports pagination and filtering by type
-- =============================================

