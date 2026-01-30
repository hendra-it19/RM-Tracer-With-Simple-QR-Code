-- =============================================
-- FIX ACCOUNT DELETION & CONSTRAINTS
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Modify Foreign Key Constraints to ON DELETE SET NULL
-- This ensures that when a user is deleted, their history remains but user_id becomes NULL

-- Fix Tracer Table
ALTER TABLE public.tracer
DROP CONSTRAINT IF EXISTS tracer_petugas_id_fkey;

ALTER TABLE public.tracer
ADD CONSTRAINT tracer_petugas_id_fkey
FOREIGN KEY (petugas_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Fix Activity Logs Table
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 2. Create RPC to Delete User (admin only)
-- This function allows an admin to delete a user from auth.users

create or replace function delete_user_by_admin(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the executing user is an admin
  if not exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'admin'
  ) then
    raise exception 'Access denied: Only admins can delete users.';
  end if;

  -- Delete the user from auth.users
  -- specific trigger 'on_auth_user_created' handles profile creation, 
  -- cascading delete on profiles table handles profile deletion.
  delete from auth.users
  where id = target_user_id;
end;
$$;
