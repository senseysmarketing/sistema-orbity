UPDATE social_media_posts
SET status = 'draft'
WHERE status = 'published'
  AND scheduled_date > '2026-02-23';