-- Upgrade existing databases only. Fresh installations use schema.sql and connect.sql.
alter table public.photos add column circumference_cm numeric;
alter table public.photos add column height_m numeric;
alter table public.photos add constraint photo_circumference_valid check (circumference_cm is null or (circumference_cm>=0 and circumference_cm<=10000));
alter table public.photos add constraint photo_height_valid check (height_m is null or (height_m>=0 and height_m<=100));
alter table public.photos add constraint photo_tree_measurements_only check (tree_code is not null or (circumference_cm is null and height_m is null));
do $migration$
declare original text;revised text;
begin
 select pg_get_functiondef('public.orchard_mutate(text,text,text,integer,jsonb)'::regprocedure) into original;
 revised:=replace(original,'insert into public.photos(tree_code,fruit_id,taken_date,caption,published,storage_key) values(', 'insert into public.photos(tree_code,fruit_id,taken_date,caption,published,storage_key,circumference_cm,height_m) values(');
 revised:=replace(revised, 'd->>''key'') returning id,revision into noteid,rev', 'd->>''key'',nullif(d->>''circumference'','''')::numeric,nullif(d->>''height'','''')::numeric) returning id,revision into noteid,rev');
 if revised=original or position('storage_key,circumference_cm,height_m' in revised)=0 then raise exception 'Unexpected RPC definition';end if;
 execute revised;
end $migration$;
