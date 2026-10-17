-- Applied allocation for the existing orchard; does not create or renumber trees.
with assignments as (
 select 'D'||lpad(n::text,4,'0') as code,
 case when n<=320 then 'upper' else 'lower' end as zone,
 case when n<=46 then 1 when n<=92 then 2 when n<=138 then 3
 when n<=184 then 4 when n<=230 then 5 when n<=275 then 6
 when n<=320 then 7 else null end as subzone
 from generate_series(1,400) n
)
update public.trees t set zone=a.zone,subzone=a.subzone from assignments a
where t.code=a.code and (t.zone is distinct from a.zone or t.subzone is distinct from a.subzone);
