-- =============================================
-- UPDATE SCHEMA FOR LOCATIONS & STAFF
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create Locations Table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'poli', -- 'poli', 'ruangan', 'gudang', etc.
    code TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Policies for Locations (Public Read, Admin Write)
CREATE POLICY "Public Read Locations" ON public.locations
    FOR SELECT USING (true);

CREATE POLICY "Admin All Locations" ON public.locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Insert Default Locations (Migrating from hardcoded)
INSERT INTO public.locations (name, type) VALUES
('Ruang Rawat Inap', 'ruangan'),
('Rekam Medis', 'gudang'),
('Poli Umum', 'poli'),
('Poli Gigi', 'poli'),
('Poli Anak', 'poli')
ON CONFLICT DO NOTHING;
-- Note: 'Casemix' is excluded as requested.

-- 2. Create Staff Table (Petugas Pengambil Berkas)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama TEXT NOT NULL,
    nip TEXT,
    role TEXT DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Policies for Staff
CREATE POLICY "Public Read Staff" ON public.staff
    FOR SELECT USING (true);

CREATE POLICY "Admin All Staff" ON public.staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 3. Update Tracer Table
-- Add column to track who TOOK the file (Staff)
ALTER TABLE public.tracer 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

-- 4. Fix Account Deletion RPC
-- Drop if exists to ensure clean update
DROP FUNCTION IF EXISTS delete_user_by_admin(uuid);

CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can delete users.';
  END IF;

  -- Delete the user from auth.users
  DELETE FROM auth.users
  WHERE id = target_user_id;
END;
$$;
