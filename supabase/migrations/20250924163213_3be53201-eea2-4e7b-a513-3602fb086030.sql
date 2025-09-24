-- First migration: Add new enum values
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agency_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agency_user';