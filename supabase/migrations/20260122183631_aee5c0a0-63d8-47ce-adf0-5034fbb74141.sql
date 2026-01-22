-- Add responsible manager to traffic controls
ALTER TABLE public.traffic_controls
ADD COLUMN IF NOT EXISTS responsible_user_id uuid NULL;

DO $$
BEGIN
  -- Add FK only if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'traffic_controls_responsible_user_id_fkey'
  ) THEN
    ALTER TABLE public.traffic_controls
    ADD CONSTRAINT traffic_controls_responsible_user_id_fkey
    FOREIGN KEY (responsible_user_id)
    REFERENCES public.profiles(user_id)
    ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_traffic_controls_responsible_user_id
  ON public.traffic_controls (responsible_user_id);

-- Comments (observation history)
CREATE TABLE IF NOT EXISTS public.traffic_control_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  ad_account_id text NOT NULL,
  author_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tcc_agency_ad_account_created_at
  ON public.traffic_control_comments (agency_id, ad_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tcc_author_user_id
  ON public.traffic_control_comments (author_user_id);

-- RLS
ALTER TABLE public.traffic_control_comments ENABLE ROW LEVEL SECURITY;

-- Policies: any agency member can read/insert; delete by author or agency admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'traffic_control_comments'
      AND policyname = 'Agency members can read traffic control comments'
  ) THEN
    CREATE POLICY "Agency members can read traffic control comments"
    ON public.traffic_control_comments
    FOR SELECT
    USING (public.user_belongs_to_agency(agency_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'traffic_control_comments'
      AND policyname = 'Agency members can create traffic control comments'
  ) THEN
    CREATE POLICY "Agency members can create traffic control comments"
    ON public.traffic_control_comments
    FOR INSERT
    WITH CHECK (
      public.user_belongs_to_agency(agency_id)
      AND author_user_id = auth.uid()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'traffic_control_comments'
      AND policyname = 'Authors or agency admins can delete traffic control comments'
  ) THEN
    CREATE POLICY "Authors or agency admins can delete traffic control comments"
    ON public.traffic_control_comments
    FOR DELETE
    USING (
      author_user_id = auth.uid()
      OR public.is_agency_admin(agency_id)
    );
  END IF;
END$$;