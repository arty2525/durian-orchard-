-- Applied allocation for the existing orchard; does not create or renumber trees.
with assignments as (
 select 'D'||lpad(n::text,4,'0') as code,
 case when n<=35 then 1 when n<=70 then 2 when n<=104 then 3
 when n<=138 then 4 when n<=172 then 5 when n<=206 then 6 else 7 end as subzone
 from generate_series(1,240) n
)
update public.trees t set subzone=a.subzone from assignments a
where t.code=a.code and t.zone='upper' and t.subzone is distinct from a.subzone;
