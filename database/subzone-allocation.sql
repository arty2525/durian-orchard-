-- Applied allocation for the existing orchard; does not create or renumber trees.
with assignments as (
 select 'D'||lpad(n::text,4,'0') as code,
 case when n<=100 then 'upper' else 'lower' end as zone,
 case when n<=15 then 1 when n<=30 then 2 when n<=44 then 3
 when n<=58 then 4 when n<=72 then 5 when n<=86 then 6
 when n<=100 then 7 else null end as subzone
 from generate_series(1,192) n
)
update public.trees t set zone=a.zone,subzone=a.subzone from assignments a
where t.code=a.code and (t.zone is distinct from a.zone or t.subzone is distinct from a.subzone);
