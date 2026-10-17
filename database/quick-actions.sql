-- Upgrade an existing orchard database; run after schema.sql and connect.sql on a fresh installation.
alter table public.fruits add column expected_harvest_date date;
alter table public.fruits add column estimated_weight_kg numeric check(estimated_weight_kg>=0 and estimated_weight_kg<=100);
alter table public.fruits add column estimated_size_label text not null default '' check(estimated_size_label in ('','small','medium','large'));
alter table public.fruits add column size_label text not null default '' check(size_label in ('','small','medium','large'));
alter table public.care_events add column is_planned boolean not null default false;
create table public.orchard_defaults(id text primary key check(id='quick'),data jsonb not null default '{}' check(jsonb_typeof(data)='object'),revision integer not null default 1,updated_at timestamptz not null default now());
alter table public.orchard_defaults enable row level security;
revoke all on public.orchard_defaults from anon,authenticated;
grant select,insert,update on public.orchard_defaults to authenticated;
grant all on public.orchard_defaults to service_role;
create policy staff_defaults on public.orchard_defaults for all to authenticated using((select orchard_private.orchard_role()) in ('admin','editor')) with check((select orchard_private.orchard_role()) in ('admin','editor'));
create trigger audit_record after insert or update or delete on public.orchard_defaults for each row execute function orchard_private.record_audit();
create trigger bump_revision before update on public.orchard_defaults for each row execute function orchard_private.before_record_change();

create function public.orchard_bulk(p_kind text,p_ids text[],p_data jsonb default '{}',p_save_defaults boolean default false,p_apply boolean default true) returns jsonb language plpgsql security invoker set search_path='' as $$
declare role_name text:=orchard_private.orchard_role();ids text[];requested integer;matched integer;changed integer:=0;event_id uuid;d jsonb:=coalesce(p_data,'{}');clean_data jsonb;yr integer;day date;weight numeric;size text;product text;amount text;planned boolean;overwrite_values boolean:=coalesce((p_data->>'overwrite')::boolean,false);
begin
 if auth.uid() is null or coalesce(role_name,'') not in ('admin','editor') then raise exception 'ไม่มีสิทธิ์แก้ไข' using errcode='42501';end if;
 if p_kind not in ('fertilizer','fruit_defaults','harvest') then raise exception 'คำสั่งไม่ถูกต้อง';end if;
 if not p_apply and not p_save_defaults then raise exception 'ไม่ได้เลือกการบันทึก';end if;
 select array_agg(distinct x) into ids from unnest(coalesce(p_ids,'{}')) x;
 requested:=coalesce(cardinality(ids),0);
 if requested>10000 or (p_apply and requested=0) then raise exception 'กรุณาเลือกรายการที่จะปรับข้อมูล';end if;
 if p_kind='fertilizer' then
  product:=left(trim(coalesce(d->>'name','')),150);amount:=left(trim(coalesce(d->>'amount','')),100);day:=nullif(d->>'date','')::date;planned:=coalesce((d->>'isPlanned')::boolean,true);
  if product='' or amount='' or day is null then raise exception 'ระบุปุ๋ย ปริมาณ และวันที่ให้ครบ';end if;
  clean_data:=jsonb_build_object('name',product,'amount',amount,'date',day,'isPlanned',planned);
 else
  yr:=nullif(d->>'year','')::integer;if yr is null or yr<1900 or yr>2200 then raise exception 'เลือกฤดูกาลให้ถูกต้อง';end if;
  if p_kind='fruit_defaults' then
   day:=nullif(d->>'expectedHarvest','')::date;weight:=nullif(d->>'weight','')::numeric;size:=coalesce(d->>'size','');
   if weight is not null and not(weight>=0 and weight<=100) then raise exception 'น้ำหนักต้องอยู่ระหว่าง 0–100 กก.';end if;
   if size not in ('','small','medium','large') then raise exception 'ขนาดผลไม่ถูกต้อง';end if;
   if day is null and weight is null and size='' then raise exception 'ระบุค่าเริ่มต้นอย่างน้อยหนึ่งช่อง';end if;
   clean_data:=jsonb_build_object('year',yr,'expectedHarvest',day,'weight',weight,'size',size);
  else
   if p_save_defaults then raise exception 'วันเก็บเกี่ยวจริงใช้เป็นค่าเริ่มต้นไม่ได้';end if;
   day:=nullif(d->>'date','')::date;
   if day is null or day>(now() at time zone 'Asia/Bangkok')::date then raise exception 'วันเก็บเกี่ยวจริงต้องไม่เป็นวันในอนาคต';end if;
  end if;
 end if;
 if day is not null and extract(year from day) not between 1900 and 2200 then raise exception 'วันที่ไม่ถูกต้อง';end if;
 if p_apply then
  if p_kind='fertilizer' then
   perform 1 from public.trees where code=any(ids) order by code for update;
   select count(*) into matched from public.trees where not archived and code=any(ids);if matched<>requested then raise exception 'ทะเบียนต้นเปลี่ยนไป กรุณาโหลดข้อมูลใหม่';end if;
   insert into public.care_events(event_date,kind,scope,product,amount,notes,is_planned) values(day,'fertilizer','trees',product,amount,left(coalesce(d->>'notes',''),1000),planned) returning id into event_id;
   insert into public.care_event_trees(care_id,tree_code) select event_id,unnest(ids);changed:=requested;
  else
   perform 1 from public.fruits where id::text=any(ids) order by id for update;
   select count(*) into matched from public.fruits where id::text=any(ids) and season_year=yr;if matched<>requested then raise exception 'รายการผลหรือฤดูกาลเปลี่ยนไป กรุณาโหลดข้อมูลใหม่';end if;
   if p_kind='fruit_defaults' then
    with proposed as (select f.id,
     case when day is not null and (overwrite_values or f.expected_harvest_date is null) then day else f.expected_harvest_date end as expected,
     case when weight is not null and (overwrite_values or f.estimated_weight_kg is null) then weight else f.estimated_weight_kg end as estimated,
     case when size<>'' and (overwrite_values or f.estimated_size_label='') then size else f.estimated_size_label end as estimated_size
     from public.fruits f where f.id::text=any(ids) and f.season_year=yr)
    update public.fruits f set expected_harvest_date=p.expected,estimated_weight_kg=p.estimated,estimated_size_label=p.estimated_size from proposed p where f.id=p.id and (f.expected_harvest_date,f.estimated_weight_kg,f.estimated_size_label) is distinct from (p.expected,p.estimated,p.estimated_size);
   else
    if exists(select 1 from public.fruits where id::text=any(ids) and set_date>day) then raise exception 'วันเก็บเกี่ยวต้องไม่ก่อนวันติดผล';end if;
    update public.fruits set harvest_date=day,status='harvested' where id::text=any(ids) and season_year=yr and harvest_date is null and status='growing';
   end if;
   get diagnostics changed=row_count;
  end if;
 end if;
 if p_save_defaults then
  insert into public.orchard_defaults(id,data) values('quick',jsonb_build_object(p_kind,clean_data)) on conflict(id) do update set data=public.orchard_defaults.data||excluded.data;
 end if;
 return jsonb_build_object('ok',true,'applied',changed,'targeted',case when p_apply then requested else 0 end,'savedDefaults',p_save_defaults,'eventId',event_id);
end $$;
revoke all on function public.orchard_bulk(text,text[],jsonb,boolean,boolean) from public,anon;
grant execute on function public.orchard_bulk(text,text[],jsonb,boolean,boolean) to authenticated;

create function orchard_private.apply_fruit_defaults() returns trigger language plpgsql security invoker set search_path='' as $$
declare d jsonb;
begin
 select data->'fruit_defaults' into d from public.orchard_defaults where id='quick';
 if (d->>'year')::integer=new.season_year then
  new.expected_harvest_date:=coalesce(new.expected_harvest_date,nullif(d->>'expectedHarvest','')::date);
  new.estimated_weight_kg:=coalesce(new.estimated_weight_kg,nullif(d->>'weight','')::numeric);
  if new.estimated_size_label='' then new.estimated_size_label:=coalesce(d->>'size','');end if;
 end if;return new;
end $$;
revoke all on function orchard_private.apply_fruit_defaults() from public,anon;
grant execute on function orchard_private.apply_fruit_defaults() to authenticated,service_role;
create trigger apply_fruit_defaults before insert on public.fruits for each row execute function orchard_private.apply_fruit_defaults();

do $migration$
declare original text;revised text;
begin
 select pg_get_functiondef('public.orchard_mutate(text,text,text,integer,jsonb)'::regprocedure) into original;
 revised:=replace(original,'nullif(d->>''weight'','''')::numeric,coalesce(d->>''quality'','''')) returning id,revision into f,rev', 'nullif(d->>''weight'','''')::numeric,coalesce(d->>''quality'',''''),coalesce(d->>''size'',''''),nullif(d->>''expectedHarvest'','''')::date,nullif(d->>''estimatedWeight'','''')::numeric,coalesce(d->>''estimatedSize'','''')) returning id,revision into f,rev');
 revised:=replace(revised,'status,weight_kg,quality) values(', 'status,weight_kg,quality,size_label,expected_harvest_date,estimated_weight_kg,estimated_size_label) values(');
 revised:=replace(revised,'quality=coalesce(d->>''quality'','''') where id=k::uuid', 'quality=coalesce(d->>''quality'',''''),size_label=case when d ? ''size'' then coalesce(d->>''size'','''') else size_label end,expected_harvest_date=case when d ? ''expectedHarvest'' then nullif(d->>''expectedHarvest'','''')::date else expected_harvest_date end,estimated_weight_kg=case when d ? ''estimatedWeight'' then nullif(d->>''estimatedWeight'','''')::numeric else estimated_weight_kg end,estimated_size_label=case when d ? ''estimatedSize'' then coalesce(d->>''estimatedSize'','''') else estimated_size_label end where id=k::uuid');
 revised:=replace(revised,'scope,product,amount,notes) values(', 'scope,product,amount,notes,is_planned) values(');
 revised:=replace(revised,'coalesce(d->>''amount'',''''),coalesce(d->>''notes'','''')) returning id,revision', 'coalesce(d->>''amount'',''''),coalesce(d->>''notes'',''''),coalesce((d->>''isPlanned'')::boolean,false)) returning id,revision');
 revised:=replace(revised,'notes=coalesce(d->>''notes'','''') where id=k::uuid returning revision into rev;delete from public.care_event_trees', 'notes=coalesce(d->>''notes'',''''),is_planned=case when d ? ''isPlanned'' then coalesce((d->>''isPlanned'')::boolean,false) else is_planned end where id=k::uuid returning revision into rev;delete from public.care_event_trees');
 if position('estimated_size_label) values(' in revised)=0 or position('is_planned=case' in revised)=0 then raise exception 'Unexpected RPC definition';end if;
 execute revised;
end $migration$;
