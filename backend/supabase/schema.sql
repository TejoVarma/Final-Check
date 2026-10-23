-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create table if not exists public.feature_requests (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  description text,
  category    text not null check (category in ('UI', 'Performance', 'Integration', 'Other')),
  votes       integer not null default 0 check (votes >= 0),
  status      text not null default 'Under Review'
              check (status in ('Under Review', 'Planned', 'In Progress', 'Done')),
  created_at  timestamptz not null default now()
);

create index if not exists feature_requests_votes_idx on public.feature_requests (votes desc, created_at desc);
create index if not exists feature_requests_created_idx on public.feature_requests (created_at desc);

-- Only the backend (secret key) talks to this table; RLS with no policies blocks the public anon key.
alter table public.feature_requests enable row level security;

-- Atomic upvote so concurrent clicks never lose a vote.
create or replace function public.increment_votes(request_id uuid)
returns setof public.feature_requests
language sql
as $$
  update public.feature_requests
     set votes = votes + 1
   where id = request_id
  returning *;
$$;

revoke execute on function public.increment_votes(uuid) from public, anon, authenticated;
