
-- 1) Eğer bir VIEW varsa düşür
drop view if exists public.clinics_public cascade;

-- 2) Kamusal alanları içeren tabloyu oluştur
create table if not exists public.clinics_public (
  id uuid primary key,
  city_id uuid,
  rating numeric,
  review_count integer,
  is_verified boolean,
  is_featured boolean,
  created_at timestamptz,
  experience_years integer,
  patient_count integer,
  latitude numeric,
  longitude numeric,
  trustpilot_rating numeric,
  website text,
  name text,
  description text,
  address text
);

-- 3) RLS’i etkinleştir ve kamusal SELECT izni ver
alter table public.clinics_public enable row level security;

-- Herkese okunabilir hale getiren politika
drop policy if exists "Public read access for clinics_public" on public.clinics_public;
create policy "Public read access for clinics_public"
  on public.clinics_public
  for select
  using (true);

-- Rollere SELECT yetkisi (RLS ile birlikte gereklidir)
grant select on table public.clinics_public to anon, authenticated;

-- 4) clinics → clinics_public senkronizasyon fonksiyonu ve tetikleyicileri
create or replace function public.sync_clinics_public()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.clinics_public where id = old.id;
    return old;
  end if;

  insert into public.clinics_public (
    id, city_id, rating, review_count, is_verified, is_featured, created_at,
    experience_years, patient_count, latitude, longitude, trustpilot_rating,
    website, name, description, address
  )
  values (
    new.id, new.city_id, new.rating, new.review_count, new.is_verified, new.is_featured, new.created_at,
    new.experience_years, new.patient_count, new.latitude, new.longitude, new.trustpilot_rating,
    new.website, new.name, new.description, new.address
  )
  on conflict (id) do update set
    city_id          = excluded.city_id,
    rating           = excluded.rating,
    review_count     = excluded.review_count,
    is_verified      = excluded.is_verified,
    is_featured      = excluded.is_featured,
    created_at       = excluded.created_at,
    experience_years = excluded.experience_years,
    patient_count    = excluded.patient_count,
    latitude         = excluded.latitude,
    longitude        = excluded.longitude,
    trustpilot_rating= excluded.trustpilot_rating,
    website          = excluded.website,
    name             = excluded.name,
    description      = excluded.description,
    address          = excluded.address;

  return new;
end;
$$;

-- Tetikleyiciler
drop trigger if exists trg_sync_clinics_public_ins_upd on public.clinics;
create trigger trg_sync_clinics_public_ins_upd
after insert or update on public.clinics
for each row execute function public.sync_clinics_public();

drop trigger if exists trg_sync_clinics_public_del on public.clinics;
create trigger trg_sync_clinics_public_del
after delete on public.clinics
for each row execute function public.sync_clinics_public();

-- 5) İlk veri aktarımı (backfill)
insert into public.clinics_public (
  id, city_id, rating, review_count, is_verified, is_featured, created_at,
  experience_years, patient_count, latitude, longitude, trustpilot_rating,
  website, name, description, address
)
select
  c.id, c.city_id, c.rating, c.review_count, c.is_verified, c.is_featured, c.created_at,
  c.experience_years, c.patient_count, c.latitude, c.longitude, c.trustpilot_rating,
  c.website, c.name, c.description, c.address
from public.clinics c
on conflict (id) do update set
  city_id          = excluded.city_id,
  rating           = excluded.rating,
  review_count     = excluded.review_count,
  is_verified      = excluded.is_verified,
  is_featured      = excluded.is_featured,
  created_at       = excluded.created_at,
  experience_years = excluded.experience_years,
  patient_count    = excluded.patient_count,
  latitude         = excluded.latitude,
  longitude        = excluded.longitude,
  trustpilot_rating= excluded.trustpilot_rating,
  website          = excluded.website,
  name             = excluded.name,
  description      = excluded.description,
  address          = excluded.address;
