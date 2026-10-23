create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create table if not exists public.irrigation_samples (
 id bigint generated always as identity primary key,
 thing_id uuid not null,
 observed_at timestamptz not null default now(),
 minute timestamptz not null default date_trunc('minute',now()),
 properties jsonb not null,
 unique(thing_id,minute)
);
create index if not exists irrigation_samples_observed_idx on public.irrigation_samples(observed_at);
alter table public.irrigation_samples enable row level security;
revoke all on public.irrigation_samples from anon,authenticated;
grant select on public.irrigation_samples to authenticated;
grant all on public.irrigation_samples to service_role;
grant usage,select on sequence public.irrigation_samples_id_seq to service_role;
create policy irrigation_staff_read on public.irrigation_samples for select to authenticated
 using ((select orchard_private.orchard_role()) in ('admin','editor'));

-- Only a boolean check is exposed, and only to the server role.
do $$ begin
 if not exists(select 1 from vault.secrets where name='orchard_collector_token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'orchard_collector_token');
 end if;
end $$;
create or replace function public.orchard_collector_authorized(candidate text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then return false; end if;
 return length(candidate)=64 and exists(select 1 from vault.decrypted_secrets where name='orchard_collector_token' and decrypted_secret=candidate);
end $$;
revoke all on function public.orchard_collector_authorized(text) from public,anon,authenticated;
grant execute on function public.orchard_collector_authorized(text) to service_role;
select cron.schedule('orchard-irrigation-minute','* * * * *',$job$
 select net.http_get(
  url:='https://wusuaisvzsmyamkptnnq.supabase.co/functions/v1/arduino-read',
  headers:=jsonb_build_object('x-collector-token',(select decrypted_secret from vault.decrypted_secrets where name='orchard_collector_token')),
  timeout_milliseconds:=30000
 );
$job$);
