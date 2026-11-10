-- Admin logins: each admin has their own email and password, added from the admin Admins page.
-- The ADMIN_USERNAME / ADMIN_PASSWORD in Vercel still works as a master login.
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  password_hash text,
  invited_by text,
  token_hash text,
  token_expires_at timestamptz,
  last_login_at timestamptz,
  removed_at timestamptz
);
create unique index if not exists admin_users_email_key on admin_users (lower(email));

create table if not exists admin_sessions (
  token_hash text primary key,
  admin_id uuid references admin_users(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists admin_sessions_admin on admin_sessions (admin_id);

alter table admin_users enable row level security;
alter table admin_sessions enable row level security;

select count(*) as admins from admin_users;
