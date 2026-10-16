-- Reference schema for the independent Supabase database.
-- Applied as a hosted migration. No credentials or personal seed data are included.
create schema if not exists orchard_private;
revoke all on schema orchard_private from public, anon;
grant usage on schema orchard_private to authenticated;
create sequence orchard_private.tree_number_seq start 1;
grant usage on sequence orchard_private.tree_number_seq to authenticated, service_role;

create table public.orchard_settings (
 id boolean primary key default true check (id), name text not null default '',
 upper_rai numeric(8,2) not null default 5 check (upper_rai>=0),
 lower_rai numeric(8,2) not null default 3 check (lower_rai>=0),
 expected_trees integer not null default 400 check(expected_trees>=0),
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create table public.team_members (
 email text primary key check(email=lower(trim(email)) and email like '%@%'),
 display_name text not null default '', role text not null check(role in ('admin','editor')),
 active boolean not null default true, revision integer not null default 1,
 updated_at timestamptz not null default now()
);
-- Only resolves the current verified Supabase user's membership. No user-supplied JWT metadata.
create function orchard_private.orchard_role() returns text language sql stable security definer set search_path='' as $$
 select m.role from public.team_members m join auth.users u on lower(u.email)=m.email
 where u.id=(select auth.uid()) and u.email_confirmed_at is not null and m.active limit 1
$$;
revoke all on function orchard_private.orchard_role() from public,anon;
grant execute on function orchard_private.orchard_role() to authenticated;

create function orchard_private.valid_partial_date(v text) returns boolean language plpgsql immutable security invoker set search_path='' as $$
begin
 if v is null then return true; end if;
 if v ~ '^[0-9]{4}$' then return v::integer between 1900 and 2200; end if;
 if v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
 return v::date::text=v and substring(v,1,4)::integer between 1900 and 2200;
 exception when others then return false;
end $$;
revoke all on function orchard_private.valid_partial_date(text) from public;
grant execute on function orchard_private.valid_partial_date(text) to authenticated,anon,service_role;
create function orchard_private.next_tree_code() returns text language sql volatile security invoker set search_path='' as $$
 select 'D'||lpad(n::text,greatest(4,length(n::text)),'0') from (select nextval('orchard_private.tree_number_seq') as n) v
$$;
revoke all on function orchard_private.next_tree_code() from public,anon;
grant execute on function orchard_private.next_tree_code() to authenticated,service_role;
create table public.trees (
 code text primary key default orchard_private.next_tree_code() check(code ~ '^D[0-9]{4,}$'),
 variety text not null default '', zone text not null default 'unknown' check(zone in ('upper','lower','unknown')),
 planted text check(orchard_private.valid_partial_date(planted)),
 planted_precision text not null default 'unknown' check(planted_precision in ('unknown','exact','year','approx')),
 first_fruit_year integer check(first_fruit_year between 1900 and 2200),
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index trees_zone_idx on public.trees(zone);
create table public.fruits (
 id uuid primary key default gen_random_uuid(), tree_code text not null references public.trees(code) on delete restrict,
 season_year integer not null check(season_year between 1900 and 2200),
 set_date date, set_precision text not null default 'unknown' check(set_precision in ('unknown','exact','approx')),
 bloom_date date, harvest_date date, status text not null default 'growing' check(status in ('growing','harvested','fallen','removed')),
 weight_kg numeric(8,3) check(weight_kg between 0 and 100), quality text not null default '',
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(set_date is null or extract(year from set_date)=season_year)
);
create index fruits_tree_season_idx on public.fruits(tree_code,season_year);
create table public.seasons (
 tree_code text not null references public.trees(code) on delete restrict,
 season_year integer not null check(season_year between 1900 and 2200),
 kept integer check(kept between 0 and 10000), harvested integer check(harvested between 0 and 10000),
 revision integer not null default 1, updated_at timestamptz not null default now(), primary key(tree_code,season_year)
);
create table public.care_events (
 id uuid primary key default gen_random_uuid(), event_date date not null,
 kind text not null check(kind in ('water','fertilizer','prune','health','other')),
 scope text not null check(scope in ('all','upper','lower','trees')),
 product text not null default '', amount text not null default '', notes text not null default '',
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index care_events_date_idx on public.care_events(event_date desc);
create table public.care_event_trees (
 care_id uuid not null references public.care_events(id) on delete cascade,
 tree_code text not null references public.trees(code) on delete restrict,
 primary key(care_id,tree_code)
);
create index care_event_trees_tree_idx on public.care_event_trees(tree_code);
create table public.photos (
 id uuid primary key default gen_random_uuid(), tree_code text references public.trees(code) on delete restrict,
 fruit_id uuid references public.fruits(id) on delete restrict,
 taken_date text check(orchard_private.valid_partial_date(taken_date)), caption text not null default '',
 published boolean not null default false, storage_bucket text not null default 'orchard-photos', storage_key text not null unique,
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(num_nonnulls(tree_code,fruit_id)=1)
);
create index photos_tree_idx on public.photos(tree_code);
create index photos_fruit_idx on public.photos(fruit_id);
create table public.internal_notes (
 id uuid primary key default gen_random_uuid(), tree_code text references public.trees(code) on delete restrict,
 fruit_id uuid references public.fruits(id) on delete restrict, season_year integer check(season_year between 1900 and 2200),
 notes text not null default '', revision integer not null default 1, updated_at timestamptz not null default now(),
 check(num_nonnulls(tree_code,fruit_id)=1)
);
create index internal_notes_tree_idx on public.internal_notes(tree_code);
create index internal_notes_fruit_idx on public.internal_notes(fruit_id);
create table public.audit_log (
 id bigint generated always as identity primary key, actor_id uuid, action text not null,
 table_name text not null, record_key text not null, before_data jsonb, after_data jsonb,
 created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log(created_at desc);

-- Tables containing public tree/fruit facts contain no private notes, staff emails or identities.
do $$ declare t text; begin
 foreach t in array array['orchard_settings','team_members','trees','fruits','seasons','care_events','care_event_trees','photos','internal_notes','audit_log'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
 foreach t in array array['trees','fruits','seasons'] loop
  execute format('grant select on public.%I to anon, authenticated',t);
  execute format('grant insert,update,delete on public.%I to authenticated',t);
  execute format('create policy public_read on public.%I for select to anon,authenticated using(true)',t);
  execute format('create policy staff_insert on public.%I for insert to authenticated with check((select orchard_private.orchard_role()) in (''admin'',''editor''))',t);
  execute format('create policy staff_update on public.%I for update to authenticated using((select orchard_private.orchard_role()) in (''admin'',''editor'')) with check((select orchard_private.orchard_role()) in (''admin'',''editor''))',t);
  execute format('create policy staff_delete on public.%I for delete to authenticated using((select orchard_private.orchard_role()) in (''admin'',''editor''))',t);
 end loop;
 foreach t in array array['care_events','care_event_trees','internal_notes'] loop
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create policy staff_access on public.%I for all to authenticated using((select orchard_private.orchard_role()) in (''admin'',''editor'')) with check((select orchard_private.orchard_role()) in (''admin'',''editor''))',t);
 end loop;
end $$;
grant select on public.orchard_settings to anon,authenticated;
grant insert,update,delete on public.orchard_settings to authenticated;
create policy public_read on public.orchard_settings for select to anon,authenticated using(true);
create policy admin_insert on public.orchard_settings for insert to authenticated with check((select orchard_private.orchard_role())='admin');
create policy admin_update on public.orchard_settings for update to authenticated using((select orchard_private.orchard_role())='admin') with check((select orchard_private.orchard_role())='admin');
create policy admin_delete on public.orchard_settings for delete to authenticated using((select orchard_private.orchard_role())='admin');
grant select,insert,update,delete on public.team_members to authenticated;
create policy admin_access on public.team_members for all to authenticated using((select orchard_private.orchard_role())='admin') with check((select orchard_private.orchard_role())='admin');
grant select on public.photos to anon,authenticated;
grant insert,update,delete on public.photos to authenticated;
create policy customer_photos on public.photos for select to anon using(published);
create policy staff_or_published_photos on public.photos for select to authenticated using(published or (select orchard_private.orchard_role()) in ('admin','editor'));
create policy staff_photo_insert on public.photos for insert to authenticated with check((select orchard_private.orchard_role()) in ('admin','editor'));
create policy staff_photo_update on public.photos for update to authenticated using((select orchard_private.orchard_role()) in ('admin','editor')) with check((select orchard_private.orchard_role()) in ('admin','editor'));
create policy staff_photo_delete on public.photos for delete to authenticated using((select orchard_private.orchard_role()) in ('admin','editor'));
grant select on public.audit_log to authenticated;
create policy admin_read on public.audit_log for select to authenticated using((select orchard_private.orchard_role())='admin');
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

create function orchard_private.before_record_change() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if tg_table_name='trees' then if new.code<>old.code then raise exception 'Tree code is permanent'; end if; end if;
  new.revision:=old.revision+1; new.updated_at:=now();
 end if;
 return new;
end $$;
revoke all on function orchard_private.before_record_change() from public,anon,authenticated;
-- Trigger-only privileged audit writer. Never exposed as an RPC.
create function orchard_private.record_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); oldj jsonb; newj jsonb; k text;
begin
 if uid is not null and coalesce(orchard_private.orchard_role(),'') not in ('admin','editor') then raise exception 'Unauthorized audit actor'; end if;
 if tg_op<>'INSERT' then oldj:=to_jsonb(old); end if;
 if tg_op<>'DELETE' then newj:=to_jsonb(new); end if;
 k:=coalesce(newj->>'code',oldj->>'code',newj->>'id',oldj->>'id',newj->>'email',oldj->>'email',(coalesce(newj,oldj)->>'tree_code')||':'||(coalesce(newj,oldj)->>'season_year'),coalesce(newj,oldj)::text);
 insert into public.audit_log(actor_id,action,table_name,record_key,before_data,after_data) values(uid,tg_op,tg_table_name,k,oldj,newj);
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function orchard_private.record_audit() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['orchard_settings','team_members','trees','fruits','seasons','care_events','photos','internal_notes'] loop
  execute format('create trigger bump_revision before update on public.%I for each row execute function orchard_private.before_record_change()',t);
 end loop;
 foreach t in array array['orchard_settings','team_members','trees','fruits','seasons','care_events','care_event_trees','photos','internal_notes'] loop
  execute format('create trigger audit_record after insert or update or delete on public.%I for each row execute function orchard_private.record_audit()',t);
 end loop;
end $$;
create function orchard_private.check_team_limits() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(83190401);
 if tg_op<>'DELETE' and new.active and new.role='editor' and (select count(*) from public.team_members where active and role='editor' and (tg_op='INSERT' or email<>old.email))>=5 then raise exception 'Maximum 5 active team editors'; end if;
 if tg_op<>'INSERT' and old.active and old.role='admin' and (tg_op='DELETE' or not new.active or new.role<>'admin') and not exists(select 1 from public.team_members where active and role='admin' and email<>old.email) then raise exception 'At least one active admin must remain'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function orchard_private.check_team_limits() from public,anon,authenticated;
create trigger enforce_team_limits before insert or update or delete on public.team_members for each row execute function orchard_private.check_team_limits();
create view public.public_season_summary with(security_invoker=true) as
 select k.tree_code,k.season_year,s.kept,s.harvested,(select count(*) from public.fruits f where f.tree_code=k.tree_code and f.season_year=k.season_year) as registered
 from (select tree_code,season_year from public.seasons union select tree_code,season_year from public.fruits) k
 left join public.seasons s on s.tree_code=k.tree_code and s.season_year=k.season_year;
grant select on public.public_season_summary to anon,authenticated;
