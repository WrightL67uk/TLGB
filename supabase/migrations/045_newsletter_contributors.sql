-- People who also tick the box to say they would like to write an article for the newsletter.
alter table newsletter_subscribers add column if not exists wants_to_write boolean not null default false;
alter table newsletter_subscribers add column if not exists contributor_business text;
alter table newsletter_subscribers add column if not exists contributor_website text;
alter table newsletter_subscribers add column if not exists contributor_text text;

select count(*) filter (where wants_to_write) as would_like_to_write from newsletter_subscribers;
