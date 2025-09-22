-- Security Fix Migration: Implement Role-Based Access Control
-- This migration fixes critical security vulnerabilities identified in the security review

-- 1. Create security definer function to safely check user roles
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- 2. Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT public.get_current_user_role() = 'administrador';
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- 3. Fix Profile Privacy - Users can only view their own profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

-- 4. Secure Financial Data - Only admins can access financial tables

-- Secure clients table
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

CREATE POLICY "Admins can manage clients" 
ON public.clients 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Secure client_payments table
DROP POLICY IF EXISTS "Authenticated users can view client payments" ON public.client_payments;
DROP POLICY IF EXISTS "Authenticated users can insert client payments" ON public.client_payments;
DROP POLICY IF EXISTS "Authenticated users can update client payments" ON public.client_payments;
DROP POLICY IF EXISTS "Authenticated users can delete client payments" ON public.client_payments;

CREATE POLICY "Admins can manage client payments" 
ON public.client_payments 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Secure expenses table
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;

CREATE POLICY "Admins can manage expenses" 
ON public.expenses 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Secure salaries table
DROP POLICY IF EXISTS "Authenticated users can view salaries" ON public.salaries;
DROP POLICY IF EXISTS "Authenticated users can insert salaries" ON public.salaries;
DROP POLICY IF EXISTS "Authenticated users can update salaries" ON public.salaries;
DROP POLICY IF EXISTS "Authenticated users can delete salaries" ON public.salaries;

CREATE POLICY "Admins can manage salaries" 
ON public.salaries 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. Secure admin_notes table (admin only)
DROP POLICY IF EXISTS "Authenticated users can view admin notes" ON public.admin_notes;
DROP POLICY IF EXISTS "Authenticated users can insert admin notes" ON public.admin_notes;
DROP POLICY IF EXISTS "Authenticated users can update admin notes" ON public.admin_notes;
DROP POLICY IF EXISTS "Authenticated users can delete admin notes" ON public.admin_notes;

CREATE POLICY "Admins can manage admin notes" 
ON public.admin_notes 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. Secure tasks table (keep existing authenticated access for now)
-- Tasks should be accessible to all authenticated users as they may be assigned to different roles

-- 7. Secure traffic_controls table
DROP POLICY IF EXISTS "Authenticated users can view traffic controls" ON public.traffic_controls;
DROP POLICY IF EXISTS "Authenticated users can insert traffic controls" ON public.traffic_controls;
DROP POLICY IF EXISTS "Authenticated users can update traffic controls" ON public.traffic_controls;
DROP POLICY IF EXISTS "Authenticated users can delete traffic controls" ON public.traffic_controls;

CREATE POLICY "Admins can manage traffic controls" 
ON public.traffic_controls 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());