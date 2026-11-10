-- Email and password logins. Emailed login links stay as the "forgot password" route.
-- Only a scrypt hash is stored, never the password.
create table if not exists login_passwords (
  email text primary key,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
create table if not exists login_attempts (
  id bigserial primary key,
  email text not null,
  ip text,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_email_time on login_attempts (email, created_at desc);
create index if not exists login_attempts_ip_time on login_attempts (ip, created_at desc);
alter table login_passwords enable row level security;
alter table login_attempts enable row level security;
