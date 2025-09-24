-- Create a super_admin user 
-- First, let's see what users exist and update one to super_admin
-- You should change this email to your actual email after the migration
UPDATE public.profiles 
SET role = 'super_admin'
WHERE email = (
  SELECT email 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Alternative: If you know your email, you can run this instead:
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'your-email@domain.com';