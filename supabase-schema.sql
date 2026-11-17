-- JECFLIX database setup
-- Run this in Supabase SQL Editor.
-- This schema deliberately separates family read access from administrator write access.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'family' check (role in ('admin','family')),
  created_at timestamptz not null default now()
);

create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Movie' check (type in ('Movie','Series')),
  year integer,
  genre text,
  description text,
  poster_url text,
  backdrop_url text,
  source_type text not null check (source_type in ('youtube','mp4','hls','embed','magnet')),
  source_url text not null,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.titles enable row level security;

-- Users can read their own profile. Role changes must be made by the project owner
-- through the Supabase dashboard or SQL editor, never by a normal client.
create policy "Users read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

-- Authenticated family members can view the catalog.
create policy "Family can read titles"
on public.titles for select
to authenticated
using (true);

-- Only a user whose profile role is admin can add, edit, or delete catalog entries.
create policy "Admins insert titles"
on public.titles for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "Admins update titles"
on public.titles for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "Admins delete titles"
on public.titles for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Create a profile automatically for every new account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 'family');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- IMPORTANT: After creating your own account, promote ONLY that account:
-- update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';
-- Find the UUID in Supabase > Authentication > Users.
