-- Seeds the (previously empty) titles and challenges catalogs with the
-- game's initial content. Both tables are fixed/admin-seeded (see the RLS
-- migration: readable by any authenticated user, writable by neither anon
-- nor authenticated) — this is data, not schema, so a migration is the
-- right place for it per this repo's never-edit-an-applied-migration
-- convention (see 20260310000013 for precedent).
--
-- Titles: unlock_rule is interpreted client-side (apps/mobile/lib/titles.ts)
-- to derive a display icon and describe the requirement on a locked card —
-- generically, by rule "type", never by title name. There is not yet any
-- server-side code that evaluates these rules and inserts into
-- user_titles (see CLAUDE.md's "Current status and known gaps") — every
-- title below is genuinely locked for every player until that ships.
insert into public.titles (name, description, unlock_rule) values
  ('The Unbroken', 'Keep a streak alive for seven straight days.', '{"type": "streak", "days": 7}'),
  ('Centurion', 'Keep a streak alive for one hundred straight days.', '{"type": "streak", "days": 100}'),
  ('Iron Will', 'Raise Strength to 25.', '{"type": "stat", "stat": "STR", "value": 25}'),
  ('Swift Current', 'Raise Agility to 25.', '{"type": "stat", "stat": "AGI", "value": 25}'),
  ('Unshakeable', 'Raise Vitality to 25.', '{"type": "stat", "stat": "VIT", "value": 25}'),
  ('Scholar', 'Raise Intellect to 25.', '{"type": "stat", "stat": "INT", "value": 25}'),
  ('Clear Mind', 'Raise Focus to 25.', '{"type": "stat", "stat": "FOCUS", "value": 25}'),
  ('Rising Explorer', 'Reach Rank C.', '{"type": "rank", "value": "C"}'),
  ('Elite Explorer', 'Reach Rank B.', '{"type": "rank", "value": "B"}'),
  ('Apex Ascendant', 'Reach Rank S.', '{"type": "rank", "value": "S"}');

-- Challenges: starts_at/ends_at are relative to when this migration is
-- applied, not a fixed calendar date — there's no catalog-rotation tooling
-- yet (also a known gap), so this is this game's *first* run of challenges,
-- not an evergreen schedule. stat/target_value are read by apps/web's
-- GET /api/challenges, which computes each caller's own progress as a count
-- of their completed quests in [starts_at, ends_at] whose activity's
-- category stat matches `stat` (or any stat, if `stat` is null) — see that
-- route for the exact rule.
insert into public.challenges (name, description, stat, starts_at, ends_at, target_value, reward_xp) values
  ('The Relentless Seven', 'Complete seven quests before the week is up.', null, now(), now() + interval '7 days', 7, 600),
  ('Mind Over Matter', 'Complete twenty Focus quests this month.', 'FOCUS', now(), now() + interval '30 days', 20, 1200),
  ('Perfect Ascension', 'Complete fourteen quests once this challenge opens.', null, now() + interval '14 days', now() + interval '28 days', 14, 2000);
