-- Encrypted, singleton Arduino integration settings. No credentials in source.
create or replace function public.orchard_arduino_save(settings jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare secret_id uuid;
begin
 if auth.uid() is null or orchard_private.orchard_role() is distinct from 'admin' then
  raise exception 'Admin required' using errcode='42501';
 end if;
 if settings is null or jsonb_typeof(settings) <> 'object'
 or length(coalesce(settings->>'clientId','')) not between 1 and 256
 or length(coalesce(settings->>'clientSecret','')) not between 1 and 1024
 or coalesce(settings->>'thingId','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
  raise exception 'Invalid settings';
 end if;
 perform pg_advisory_xact_lock(84629101);
 select id into secret_id from vault.secrets where name='orchard_arduino_cloud';
 if secret_id is null then
  perform vault.create_secret(settings::text,'orchard_arduino_cloud','Arduino Cloud read integration');
 else
  perform vault.update_secret(secret_id,settings::text);
 end if;
end $$;
revoke all on function public.orchard_arduino_save(jsonb) from public,anon,authenticated;
grant execute on function public.orchard_arduino_save(jsonb) to authenticated;

create or replace function public.orchard_arduino_read_private()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
 if auth.role() is distinct from 'service_role' then
  raise exception 'Server only' using errcode='42501';
 end if;
 return (select decrypted_secret::jsonb from vault.decrypted_secrets where name='orchard_arduino_cloud');
end $$;
revoke all on function public.orchard_arduino_read_private() from public,anon,authenticated;
grant execute on function public.orchard_arduino_read_private() to service_role;
