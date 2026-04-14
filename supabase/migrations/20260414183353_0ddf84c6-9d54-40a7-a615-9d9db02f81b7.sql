
-- ============================================================
-- 1. PROFILES — Consolidar SELECT (3 → 1) + otimizar INSERT/UPDATE
-- ============================================================

-- DROP redundant SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their agencies" ON profiles;

-- CREATE consolidated SELECT with EXISTS optimization
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM agency_users au1
    JOIN agency_users au2 ON au1.agency_id = au2.agency_id
    WHERE au1.user_id = profiles.user_id 
    AND au2.user_id = (select auth.uid())
  )
  OR is_admin()
);

-- Optimize INSERT with (select auth.uid())
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- Optimize UPDATE with (select auth.uid())
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 2. AGENCIES — Consolidar SELECT (3 → 1)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their agencies" ON agencies;
DROP POLICY IF EXISTS "Master agency admins can view all agencies" ON agencies;
DROP POLICY IF EXISTS "Master users can view all agency data" ON agencies;

CREATE POLICY "agencies_select" ON agencies FOR SELECT USING (
  id IN (SELECT agency_id FROM agency_users WHERE user_id = (select auth.uid()))
  OR is_master_agency_admin()
  OR is_master_user()
);

-- ============================================================
-- 3. AGENCIES — Consolidar UPDATE (3 → 1)
-- ============================================================

DROP POLICY IF EXISTS "Agency admins can update their agency" ON agencies;
DROP POLICY IF EXISTS "Master agency admins can update all agencies" ON agencies;
DROP POLICY IF EXISTS "Master users can update all agencies" ON agencies;

CREATE POLICY "agencies_update" ON agencies FOR UPDATE
  USING (
    is_agency_admin(id) OR is_master_agency_admin() OR is_master_user()
  )
  WITH CHECK (
    is_agency_admin(id) OR is_master_agency_admin() OR is_master_user()
  );

-- ============================================================
-- 4. NOTIFICATIONS — Otimizar auth.uid() → (select auth.uid())
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 5. NOTIFICATION_PREFERENCES — Otimizar auth.uid()
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "notif_prefs_select" ON notification_preferences FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own preferences" ON notification_preferences;
CREATE POLICY "notif_prefs_insert" ON notification_preferences FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
CREATE POLICY "notif_prefs_update" ON notification_preferences FOR UPDATE
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 6. NOTIFICATION_EVENT_PREFERENCES — Otimizar auth.uid()
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own notification event prefs" ON notification_event_preferences;
CREATE POLICY "notif_event_prefs_select" ON notification_event_preferences FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own notification event prefs" ON notification_event_preferences;
CREATE POLICY "notif_event_prefs_insert" ON notification_event_preferences FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notification event prefs" ON notification_event_preferences;
CREATE POLICY "notif_event_prefs_update" ON notification_event_preferences FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own notification event prefs" ON notification_event_preferences;
CREATE POLICY "notif_event_prefs_delete" ON notification_event_preferences FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 7. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notification_preferences_agency_id
  ON notification_preferences(agency_id);

CREATE INDEX IF NOT EXISTS idx_notification_event_preferences_agency_id
  ON notification_event_preferences(agency_id);
