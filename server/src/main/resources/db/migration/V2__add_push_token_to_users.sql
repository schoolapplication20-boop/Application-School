-- Mobile push notifications: stores the Expo push token registered by the mobile app.
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token VARCHAR(255);
