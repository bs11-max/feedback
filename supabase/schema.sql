begin;

create table public.votes (
  id bigint generated always as identity primary key,
  rating text not null,
  created_at timestamptz not null default now(),
  constraint votes_rating_check
    check (rating in ('satisfied', 'neutral', 'dissatisfied'))
);

comment on table public.votes is
  'Anonymous class feedback votes with administrator-only reporting access.';
comment on column public.votes.rating is
  'One of satisfied, neutral, or dissatisfied.';

alter table public.votes enable row level security;
alter table public.votes force row level security;

revoke all on table public.votes from anon, authenticated;
revoke all on sequence public.votes_id_seq from anon, authenticated;

grant insert on table public.votes to anon;
grant usage on sequence public.votes_id_seq to anon;

grant select, insert, delete on table public.votes to authenticated;
grant usage on sequence public.votes_id_seq to authenticated;

create policy "Anonymous users can submit votes"
on public.votes
for insert
to anon
with check (rating in ('satisfied', 'neutral', 'dissatisfied'));

create policy "Authenticated administrators can read votes"
on public.votes
for select
to authenticated
using (
  (select auth.uid()) is not null
  and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
);

create policy "Authenticated administrators can submit votes"
on public.votes
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  and rating in ('satisfied', 'neutral', 'dissatisfied')
);

create policy "Authenticated administrators can delete votes"
on public.votes
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
);

commit;

