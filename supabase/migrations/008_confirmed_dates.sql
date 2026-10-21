-- 008: insurance and accreditation dates only count once an admin has confirmed them.
-- A trade's new or renewed dates wait here until then:
--   { "pl": {"expiry": "2027-05-01", "cover": 5000000},
--     "el": {"expiry": "2027-05-01", "cover": 10000000},
--     "acc": {"chas": "2027-03-31"} }
alter table businesses add column if not exists pending_dates jsonb not null default '{}';
