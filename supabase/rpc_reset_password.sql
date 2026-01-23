-- Function to allow admins to reset other users' passwords
-- Run this in Supabase Dashboard > SQL Editor

create or replace function reset_user_password(target_user_id uuid, new_password text)
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
    raise exception 'Access denied: Only admins can reset passwords.';
  end if;

  -- Update the user's password in auth.users
  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf'))
  where id = target_user_id;
end;
$$;
