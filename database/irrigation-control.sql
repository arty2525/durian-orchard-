create table public.irrigation_commands (
 id uuid primary key,
 thing_id uuid not null,
 actor uuid not null,
 target text not null check(target ~ '^relay[1-7]$' or target in ('all','stop')),
 desired boolean not null,
 status text not null default 'sending' check(status in ('sending','sent','failed','partial')),
 published text[] not null default '{}',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index irrigation_commands_time_idx on public.irrigation_commands(created_at desc);
alter table public.irrigation_commands enable row level security;
revoke all on public.irrigation_commands from anon,authenticated;
grant select on public.irrigation_commands to authenticated;
grant all on public.irrigation_commands to service_role;
create policy irrigation_command_staff_read on public.irrigation_commands for select to authenticated
 using ((select orchard_private.orchard_role()) in ('admin','editor'));
create or replace function public.orchard_command_begin(command_id uuid,thing uuid,actor_id uuid,command_target text,command_value boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare old public.irrigation_commands;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(thing::text,0));
 select * into old from public.irrigation_commands where id=command_id;
 if found then return jsonb_build_object('duplicate',true,'status',old.status,'published',old.published); end if;
 if exists(select 1 from public.irrigation_commands where thing_id=thing and status='sending' and created_at>now()-interval '2 minutes') then
  return jsonb_build_object('busy',true);
 end if;
 insert into public.irrigation_commands(id,thing_id,actor,target,desired) values(command_id,thing,actor_id,command_target,command_value);
 return jsonb_build_object('accepted',true);
end $$;
revoke all on function public.orchard_command_begin(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.orchard_command_begin(uuid,uuid,uuid,text,boolean) to service_role;
