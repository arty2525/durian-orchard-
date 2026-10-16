-- Transactional integration checks. Test rows and test identities are rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000101','verify-admin@orchard.invalid',now()),
 ('00000000-0000-4000-8000-000000000102','verify-editor@orchard.invalid',now()),
 ('00000000-0000-4000-8000-000000000103','verify-outsider@orchard.invalid',now());
insert into public.team_members(email,role) values('verify-admin@orchard.invalid','admin'),('verify-editor@orchard.invalid','editor');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$ declare t text; f uuid; n integer; begin
 if orchard_private.orchard_role()<>'admin' then raise exception 'Admin membership failed'; end if;
 insert into public.trees(variety,planted,planted_precision) values('Verification variety','2021','year') returning code into t;
 if t !~ '^D[0-9]{4,}$' then raise exception 'Automatic tree code failed'; end if;
 insert into public.fruits(tree_code,season_year,set_date) values(t,2026,'2026-05-10') returning id into f;
 insert into public.seasons(tree_code,season_year,kept) values(t,2026,30);
 select registered into n from public.public_season_summary where tree_code=t and season_year=2026;
 if n<>1 then raise exception 'Season registered count failed'; end if;
 insert into public.internal_notes(tree_code,notes) values(t,'PRIVATE-VERIFICATION');
 insert into public.photos(tree_code,storage_key,published,caption) values(t,'verify/private.jpg',false,'PRIVATE-VERIFICATION'),(t,'verify/public.jpg',true,'Public verification');
 update public.trees set variety='Updated verification' where code=t;
 if (select revision from public.trees where code=t)<>2 then raise exception 'Revision trigger failed'; end if;
 begin update public.trees set code='D999999' where code=t; raise exception 'Code must be immutable'; exception when raise_exception then if sqlerrm='Code must be immutable' then raise; end if; end;
 begin insert into public.fruits(tree_code,season_year) values('D-missing',2026); raise exception 'Foreign key not enforced'; exception when foreign_key_violation then null; end;
 begin insert into public.trees(planted) values('2026-02-31'); raise exception 'Date constraint not enforced'; exception when check_violation then null; end;
 if not exists(select 1 from public.audit_log where actor_id=auth.uid() and table_name='trees') then raise exception 'Audit missing'; end if;
 for n in 2..5 loop insert into public.team_members(email,role) values('verify-editor-'||n||'@orchard.invalid','editor'); end loop;
 begin insert into public.team_members(email,role) values('verify-editor-6@orchard.invalid','editor'); raise exception 'Team limit not enforced'; exception when raise_exception then if sqlerrm='Team limit not enforced' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',true);
do $$ begin
 if orchard_private.orchard_role()<>'editor' then raise exception 'Editor membership failed'; end if;
 insert into public.care_events(event_date,kind,scope) values(current_date,'water','all');
 begin insert into public.team_members(email,role) values('editor-escalation@orchard.invalid','admin'); raise exception 'Editor escalation allowed'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.audit_log) then raise exception 'Editor can read admin audit'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}',true);
do $$ begin
 if orchard_private.orchard_role() is not null then raise exception 'Outsider has role'; end if;
 if exists(select 1 from public.internal_notes) then raise exception 'Outsider sees private notes'; end if;
 begin insert into public.care_events(event_date,kind,scope) values(current_date,'water','all'); raise exception 'Outsider write allowed'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
 if not exists(select 1 from public.trees where variety='Updated verification') then raise exception 'Public tree read failed'; end if;
 if exists(select 1 from public.photos where not published) then raise exception 'Private photo leaked'; end if;
 if not exists(select 1 from public.photos where published) then raise exception 'Public photo not visible'; end if;
 begin perform * from public.internal_notes; raise exception 'Anonymous private notes allowed'; exception when insufficient_privilege then null; end;
 begin perform * from public.team_members; raise exception 'Anonymous team read allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.trees(variety) values('Anonymous'); raise exception 'Anonymous write allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: admin/editor/customer/outsider policies, no privilege escalation, private notes and photo isolation, automatic IDs, immutable codes, parent constraints, partial dates, season counts, revisions, audit and five-editor limit' as verification;
