-- 016: free member websites at <slug>.tlgb.co.uk, built from the listing.

create table if not exists member_sites (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  business_id   uuid not null unique references businesses(id) on delete cascade,
  slug          text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'),
  status        text not null default 'draft' check (status in ('draft', 'live', 'off')),
  theme         text not null default 'forest',
  headline      text,
  intro         text,
  about         text,
  services      jsonb not null default '[]'::jsonb,
  reasons       jsonb not null default '[]'::jsonb,
  areas         text,
  hero_photo    text,
  show_phone    boolean not null default true,
  show_email    boolean not null default true,
  written_by    text,
  published_at  timestamptz,
  views         int not null default 0,
  enquiries     int not null default 0
);
alter table member_sites enable row level security;

create table if not exists site_enquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  site_id     uuid not null references member_sites(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  company     text,
  email       text not null,
  phone       text,
  postcode    text,
  kind        text,
  message     text not null,
  ip_hash     text
);
create index if not exists site_enquiries_site_idx on site_enquiries (site_id, created_at desc);
create index if not exists site_enquiries_ip_idx on site_enquiries (ip_hash, created_at desc);
alter table site_enquiries enable row level security;

create or replace function bump_site_counter(p_site uuid, p_field text) returns void language plpgsql security definer as $$
begin
  if p_field = 'views' then update member_sites set views = views + 1 where id = p_site;
  elsif p_field = 'enquiries' then update member_sites set enquiries = enquiries + 1 where id = p_site;
  end if;
end $$;
