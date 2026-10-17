create unique index internal_notes_tree_unique on public.internal_notes(tree_code) where fruit_id is null and season_year is null;
create unique index internal_notes_fruit_unique on public.internal_notes(fruit_id) where tree_code is null;
create unique index internal_notes_season_unique on public.internal_notes(tree_code,season_year) where season_year is not null;
create table public.legacy_audit (id text primary key,actor text not null,action text not null,record_id text not null,before_data text,after_data text,created_at timestamptz not null);
alter table public.legacy_audit enable row level security;
revoke all on public.legacy_audit from anon,authenticated;
grant select on public.legacy_audit to authenticated;
grant all on public.legacy_audit to service_role;
create policy admin_read on public.legacy_audit for select to authenticated using((select orchard_private.orchard_role())='admin');
create function public.orchard_identity() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('role',orchard_private.orchard_role(),'uid',auth.uid()) $$;
revoke all on function public.orchard_identity() from public,anon;
grant execute on function public.orchard_identity() to authenticated;
create function public.orchard_mutate(p_type text,p_action text default 'save',p_id text default null,p_revision integer default null,p_data jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare r text:=orchard_private.orchard_role(); k text:=p_id; d jsonb:=coalesce(p_data,'{}'); rev integer; t text; yr integer; f uuid; noteid uuid; sk text; targets text[];
begin
 if auth.uid() is null or coalesce(r,'') not in ('admin','editor') then raise exception 'ไม่มีสิทธิ์แก้ไข' using errcode='42501'; end if;
 if p_type in ('settings','member') or p_action='initialize' then if r<>'admin' then raise exception 'เฉพาะแอดมิน' using errcode='42501'; end if; end if;
 if p_action='initialize' then
  perform pg_advisory_xact_lock(83190402);
  if exists(select 1 from public.trees) or exists(select 1 from public.audit_log where table_name='trees') or exists(select 1 from public.legacy_audit where record_id ~ '^D[0-9]+$' or action='initialize') then raise exception 'มีทะเบียนหรือประวัติรหัสต้นแล้ว ไม่สามารถสร้างซ้ำ'; end if;
  insert into public.trees(variety) select '' from generate_series(1,192);return jsonb_build_object('ok',true);
 end if;
 case p_type
 when 'tree' then if k is not null then select revision into rev from public.trees where code=k for update; end if;
 when 'fruit' then if k is not null then select revision into rev from public.fruits where id=k::uuid for update; end if;
 when 'season' then if k is not null then t:=split_part(k,':',1);yr:=split_part(k,':',2)::integer;select revision into rev from public.seasons where tree_code=t and season_year=yr for update; end if;
 when 'care' then if k is not null then select revision into rev from public.care_events where id=k::uuid for update; end if;
 when 'member' then if k is not null then select revision into rev from public.team_members where email=k for update; end if;
 when 'settings' then k:='settings';select revision into rev from public.orchard_settings where id for update;
 when 'photo' then if k is not null then select revision,storage_key into rev,sk from public.photos where id=k::uuid for update; end if;
 else raise exception 'ชนิดข้อมูลไม่ถูกต้อง'; end case;
 if p_id is not null and rev is null then raise exception 'ไม่พบข้อมูลที่จะแก้ไข'; end if;
 if rev is not null and rev is distinct from p_revision then raise exception 'ข้อมูลถูกแก้ไขจากเครื่องอื่น กรุณาโหลดใหม่' using errcode='40001'; end if;
 if p_action='delete' then
  if rev is null then raise exception 'ไม่พบข้อมูล'; end if;
  case p_type
   when 'tree' then delete from public.trees where code=k;
   when 'fruit' then delete from public.fruits where id=k::uuid;
   when 'season' then delete from public.internal_notes where tree_code=t and season_year=yr;delete from public.seasons where tree_code=t and season_year=yr;
   when 'care' then delete from public.care_events where id=k::uuid;
   when 'member' then delete from public.team_members where email=k;
   when 'photo' then delete from public.photos where id=k::uuid;
   else raise exception 'ไม่อนุญาตให้ลบ';end case;
  return jsonb_build_object('ok',true,'id',k,'storageKey',sk);
 end if;
 if p_action<>'save' then raise exception 'คำสั่งไม่ถูกต้อง'; end if;
 case p_type
 when 'tree' then
  if k is null then insert into public.trees(variety,zone,planted,planted_precision,first_fruit_year,subzone) values(coalesce(d->>'variety',''),coalesce(d->>'zone','unknown'),nullif(d->>'planted',''),coalesce(d->>'precision','unknown'),nullif(d->>'firstYear','')::integer,case when d->>'zone'='upper' then nullif(d->>'subzone','')::smallint else null end) returning code,revision into k,rev;
  else update public.trees set variety=coalesce(d->>'variety',''),zone=coalesce(d->>'zone','unknown'),planted=nullif(d->>'planted',''),planted_precision=coalesce(d->>'precision','unknown'),first_fruit_year=nullif(d->>'firstYear','')::integer,subzone=case when d->>'zone'<>'upper' then null when d ? 'subzone' then nullif(d->>'subzone','')::smallint else subzone end where code=k returning revision into rev; end if;
 when 'fruit' then
  if k is null then insert into public.fruits(tree_code,season_year,set_date,set_precision,bloom_date,harvest_date,status,weight_kg,quality) values(d->>'tree',(d->>'year')::integer,nullif(d->>'setDate','')::date,coalesce(d->>'precision','unknown'),nullif(d->>'bloom','')::date,nullif(d->>'harvest','')::date,coalesce(d->>'status','growing'),nullif(d->>'weight','')::numeric,coalesce(d->>'quality','')) returning id,revision into f,rev;k:=f::text;
  else update public.fruits set tree_code=d->>'tree',season_year=(d->>'year')::integer,set_date=nullif(d->>'setDate','')::date,set_precision=coalesce(d->>'precision','unknown'),bloom_date=nullif(d->>'bloom','')::date,harvest_date=nullif(d->>'harvest','')::date,status=coalesce(d->>'status','growing'),weight_kg=nullif(d->>'weight','')::numeric,quality=coalesce(d->>'quality','') where id=k::uuid returning revision into rev; end if;
 when 'season' then
  if k is null then t:=d->>'tree';yr:=(d->>'year')::integer;insert into public.seasons(tree_code,season_year,kept,harvested) values(t,yr,nullif(d->>'kept','')::integer,nullif(d->>'harvested','')::integer) returning revision into rev;k:=t||':'||yr;
  else if t<>d->>'tree' or yr<>(d->>'year')::integer then raise exception 'การเปลี่ยนต้นหรือฤดูกาลให้สร้างรายการใหม่'; end if;update public.seasons set kept=nullif(d->>'kept','')::integer,harvested=nullif(d->>'harvested','')::integer where tree_code=t and season_year=yr returning revision into rev;end if;
 when 'care' then
  if d->>'scope'='trees' then select array_agg(code) into targets from public.trees where not archived and code in (select jsonb_array_elements_text(d->'trees'));
  else select array_agg(code) into targets from public.trees where not archived and (d->>'scope'='all' or zone=d->>'scope'); end if;
  if coalesce(array_length(targets,1),0)=0 then raise exception 'ไม่พบต้นในพื้นที่หรือรหัสที่เลือก'; end if;
  if k is null then insert into public.care_events(event_date,kind,scope,product,amount,notes) values((d->>'date')::date,d->>'kind',d->>'scope',coalesce(d->>'name',''),coalesce(d->>'amount',''),coalesce(d->>'notes','')) returning id,revision into f,rev;k:=f::text;
  else update public.care_events set event_date=(d->>'date')::date,kind=d->>'kind',scope=d->>'scope',product=coalesce(d->>'name',''),amount=coalesce(d->>'amount',''),notes=coalesce(d->>'notes','') where id=k::uuid returning revision into rev;delete from public.care_event_trees where care_id=k::uuid;end if;
  insert into public.care_event_trees(care_id,tree_code) select k::uuid,unnest(targets);
 when 'member' then
  t:=lower(trim(d->>'email'));if t !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'อีเมลไม่ถูกต้อง';end if;
  if k is null then insert into public.team_members(email,display_name,role) values(t,coalesce(d->>'name',''),'editor') returning revision into rev;
  else update public.team_members set email=t,display_name=coalesce(d->>'name','') where email=k returning revision into rev;end if;k:=t;
 when 'settings' then update public.orchard_settings set name=coalesce(d->>'name','') where id returning revision into rev;
 when 'photo' then
  if k is not null then raise exception 'แก้ภาพโดยเพิ่มภาพใหม่';end if;
  if d->>'entity' ~ '^D[0-9]+$' then t:=d->>'entity';f:=null;else t:=null;f:=(d->>'entity')::uuid;end if;
  insert into public.photos(tree_code,fruit_id,taken_date,caption,published,storage_key,circumference_cm,height_m) values(t,f,nullif(d->>'date',''),coalesce(d->>'caption',''),coalesce((d->>'published')::boolean,false),d->>'key',nullif(d->>'circumference','')::numeric,nullif(d->>'height','')::numeric) returning id,revision into noteid,rev;k:=noteid::text;
 end case;
 if p_type in ('tree','fruit','season') then
  if p_type='fruit' then select id into noteid from public.internal_notes where fruit_id=k::uuid;
  elsif p_type='season' then select id into noteid from public.internal_notes where tree_code=t and season_year=yr;
  else select id into noteid from public.internal_notes where tree_code=k and season_year is null;end if;
  if nullif(d->>'notes','') is null then if noteid is not null then delete from public.internal_notes where id=noteid;end if;
  elsif noteid is not null then update public.internal_notes set notes=d->>'notes' where id=noteid;
  elsif p_type='fruit' then insert into public.internal_notes(fruit_id,notes) values(k::uuid,d->>'notes');
  elsif p_type='season' then insert into public.internal_notes(tree_code,season_year,notes) values(t,yr,d->>'notes');
  else insert into public.internal_notes(tree_code,notes) values(k,d->>'notes');end if;
 end if;
 return jsonb_build_object('ok',true,'id',k,'revision',rev);
end $$;
revoke all on function public.orchard_mutate(text,text,text,integer,jsonb) from public,anon;
grant execute on function public.orchard_mutate(text,text,text,integer,jsonb) to authenticated;
