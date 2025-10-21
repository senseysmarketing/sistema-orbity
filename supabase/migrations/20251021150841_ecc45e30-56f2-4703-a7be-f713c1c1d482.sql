-- Create campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal TEXT,
  budget NUMERIC,
  status TEXT NOT NULL DEFAULT 'planning',
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create social_media_posts table
CREATE TABLE social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMPTZ NOT NULL,
  post_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'medium',
  attachments JSONB DEFAULT '[]',
  hashtags TEXT[],
  mentions TEXT[],
  approval_history JSONB DEFAULT '[]',
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create social_media_assignments table
CREATE TABLE social_media_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create content_library table
CREATE TABLE content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  uploaded_by UUID NOT NULL,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create social_media_notifications table
CREATE TABLE social_media_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Agency members can view campaigns"
  ON campaigns FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update campaigns"
  ON campaigns FOR UPDATE
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can delete campaigns"
  ON campaigns FOR DELETE
  USING (is_agency_admin(agency_id));

-- RLS Policies for social_media_posts
CREATE POLICY "Agency members can view social media posts"
  ON social_media_posts FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create social media posts"
  ON social_media_posts FOR INSERT
  WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update social media posts"
  ON social_media_posts FOR UPDATE
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can delete social media posts"
  ON social_media_posts FOR DELETE
  USING (is_agency_admin(agency_id));

-- RLS Policies for social_media_assignments
CREATE POLICY "Agency members can view post assignments"
  ON social_media_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM social_media_posts
    WHERE social_media_posts.id = social_media_assignments.post_id
    AND user_belongs_to_agency(social_media_posts.agency_id)
  ));

CREATE POLICY "Agency members can create post assignments"
  ON social_media_assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM social_media_posts
    WHERE social_media_posts.id = social_media_assignments.post_id
    AND user_belongs_to_agency(social_media_posts.agency_id)
  ));

CREATE POLICY "Agency members can delete post assignments"
  ON social_media_assignments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM social_media_posts
    WHERE social_media_posts.id = social_media_assignments.post_id
    AND user_belongs_to_agency(social_media_posts.agency_id)
  ));

-- RLS Policies for content_library
CREATE POLICY "Agency members can view content library"
  ON content_library FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create content library items"
  ON content_library FOR INSERT
  WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update content library items"
  ON content_library FOR UPDATE
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can delete content library items"
  ON content_library FOR DELETE
  USING (is_agency_admin(agency_id));

-- RLS Policies for social_media_notifications
CREATE POLICY "Users can view their own notifications"
  ON social_media_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON social_media_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON social_media_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON social_media_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_social_media_posts_agency_id ON social_media_posts(agency_id);
CREATE INDEX idx_social_media_posts_client_id ON social_media_posts(client_id);
CREATE INDEX idx_social_media_posts_scheduled_date ON social_media_posts(scheduled_date);
CREATE INDEX idx_social_media_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_media_assignments_post_id ON social_media_assignments(post_id);
CREATE INDEX idx_social_media_assignments_user_id ON social_media_assignments(user_id);
CREATE INDEX idx_campaigns_agency_id ON campaigns(agency_id);
CREATE INDEX idx_content_library_agency_id ON content_library(agency_id);
CREATE INDEX idx_social_media_notifications_user_id ON social_media_notifications(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_posts_updated_at
  BEFORE UPDATE ON social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_library_updated_at
  BEFORE UPDATE ON content_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_assignments_updated_at
  BEFORE UPDATE ON social_media_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update subscription plans with social media limits
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_social_media_posts INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_content_storage_gb INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_campaigns INTEGER DEFAULT 3;

-- Update existing plans
UPDATE subscription_plans 
SET 
  max_social_media_posts = 100,
  max_content_storage_gb = 2,
  max_campaigns = 3
WHERE slug = 'basic';

UPDATE subscription_plans 
SET 
  max_social_media_posts = 500,
  max_content_storage_gb = 10,
  max_campaigns = 10
WHERE slug = 'professional';

UPDATE subscription_plans 
SET 
  max_social_media_posts = 999999,
  max_content_storage_gb = 50,
  max_campaigns = 999999
WHERE slug = 'enterprise';