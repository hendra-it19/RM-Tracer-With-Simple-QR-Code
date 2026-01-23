-- RM Tracer Database Schema
-- Run this in Supabase SQL Editor
-- IMPORTANT: Run this AFTER dropping existing tables or in a fresh project

-- =============================================
-- DROP EXISTING POLICIES (if re-running)
-- =============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "All authenticated users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can manage patients" ON public.patients;
DROP POLICY IF EXISTS "All authenticated users can view tracer" ON public.tracer;
DROP POLICY IF EXISTS "All authenticated users can insert tracer" ON public.tracer;
DROP POLICY IF EXISTS "All authenticated users can update tracer" ON public.tracer;
DROP POLICY IF EXISTS "All authenticated users can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "All authenticated users can insert activity logs" ON public.activity_logs;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'petugas' CHECK (role IN ('admin', 'petugas')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PATIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    no_rm VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    tanggal_lahir DATE,
    qr_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRACER TABLE (status lokasi berkas)
-- =============================================
CREATE TABLE IF NOT EXISTS public.tracer (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    status_lokasi VARCHAR(100) NOT NULL,
    keterangan TEXT,
    petugas_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ACTIVITY LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    aksi VARCHAR(100) NOT NULL,
    no_rm VARCHAR(50),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_patients_no_rm ON public.patients(no_rm);
CREATE INDEX IF NOT EXISTS idx_tracer_patient_id ON public.tracer(patient_id);
CREATE INDEX IF NOT EXISTS idx_tracer_petugas_id ON public.tracer(petugas_id);
CREATE INDEX IF NOT EXISTS idx_tracer_updated_at ON public.tracer(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_no_rm ON public.activity_logs(no_rm);

-- =============================================
-- ROW LEVEL SECURITY (FIXED - No recursion)
-- =============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES (FIXED - avoid recursion by using auth.uid() directly)
-- Allow users to view all profiles (needed for user lists)
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (true);

-- Allow users to update their own profile only
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow insert for new users (handled by trigger)
CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- PATIENTS POLICIES
CREATE POLICY "patients_select" ON public.patients
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "patients_insert" ON public.patients
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "patients_update" ON public.patients
    FOR UPDATE 
    TO authenticated
    USING (true);

CREATE POLICY "patients_delete" ON public.patients
    FOR DELETE 
    TO authenticated
    USING (true);

-- TRACER POLICIES
CREATE POLICY "tracer_select" ON public.tracer
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "tracer_insert" ON public.tracer
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "tracer_update" ON public.tracer
    FOR UPDATE 
    TO authenticated
    USING (true);

-- ACTIVITY LOGS POLICIES
CREATE POLICY "activity_logs_select" ON public.activity_logs
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "activity_logs_insert" ON public.activity_logs
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nama, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'petugas')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tracer_updated_at ON public.tracer;
CREATE TRIGGER update_tracer_updated_at
    BEFORE UPDATE ON public.tracer
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log activity (simplified - no recursion risk)
CREATE OR REPLACE FUNCTION public.log_activity(
    p_aksi VARCHAR,
    p_no_rm VARCHAR DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.activity_logs (user_id, aksi, no_rm, details)
    VALUES (auth.uid(), p_aksi, p_no_rm, p_details)
    RETURNING id INTO v_log_id;
    RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
    -- Silently fail if logging fails (non-critical)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- REALTIME
-- =============================================
DO $$
BEGIN
    -- Enable realtime for tables (ignore errors if already enabled)
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracer;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================
-- VERIFY SETUP
-- =============================================
-- Run this to check if everything is set up correctly:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
