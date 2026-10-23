create table public.tree_locations (
 tree_code text primary key references public.trees(code) on delete cascade,
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 accuracy_m double precision check(accuracy_m>=0 and accuracy_m<'Infinity'::double precision),
 updated_at timestamptz not null default now()
);
alter table public.tree_locations enable row level security;
revoke all on public.tree_locations from public,anon,authenticated;
grant select,insert,update,delete on public.tree_locations to authenticated;
grant all on public.tree_locations to service_role;
create policy staff_locations on public.tree_locations for all to authenticated
 using((select orchard_private.orchard_role()) in ('admin','editor'))
 with check((select orchard_private.orchard_role()) in ('admin','editor'));
do $patch$
declare definition text; anchor text:=' return jsonb_build_object(''ok'',true,''id'',k,''revision'',rev);';
begin
 select pg_get_functiondef('public.orchard_mutate(text,text,text,integer,jsonb)'::regprocedure) into definition;
 if position(anchor in definition)=0 then raise exception 'Cannot locate orchard_mutate return'; end if;
 definition:=replace(definition,anchor,$gps$
 if p_type='tree' and (d ? 'latitude' or d ? 'longitude') then
  if nullif(d->>'latitude','') is null and nullif(d->>'longitude','') is null then
   delete from public.tree_locations where tree_code=k;
  else
   insert into public.tree_locations(tree_code,latitude,longitude,accuracy_m)
   values(k,nullif(d->>'latitude','')::double precision,nullif(d->>'longitude','')::double precision,nullif(d->>'gpsAccuracy','')::double precision)
   on conflict(tree_code) do update set latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,updated_at=now();
  end if;
 end if;
 return jsonb_build_object('ok',true,'id',k,'revision',rev);
$gps$);
 execute definition;
end $patch$;
notify pgrst,'reload schema';
