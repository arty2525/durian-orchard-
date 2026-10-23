create or replace function public.orchard_irrigation_intervals()
returns jsonb language sql stable security invoker set search_path='' as $$
with samples as (
 select thing_id,observed_at,p->>'name' channel,p->'value'='true'::jsonb is_on
 from public.irrigation_samples cross join lateral jsonb_array_elements(properties) p
 where observed_at>=now()-interval '30 days' and p->>'name' ~ '^relay[1-8]$' and p->'value' in ('true'::jsonb,'false'::jsonb)
), ordered as (
 select *,lag(is_on) over w prev_on,lag(observed_at) over w prev_at,
 lead(is_on) over w next_on,lead(observed_at) over w next_at
 from samples window w as(partition by thing_id,channel order by observed_at)
), marked as (
 select *,sum(case when prev_on is distinct from true or observed_at-prev_at>interval '150 seconds' then 1 else 0 end)
 over(partition by thing_id,channel order by observed_at) grp from ordered
), groups as (
 select thing_id,channel,grp,min(observed_at) first_at,max(observed_at) last_at,
 min(case when prev_on=false and observed_at-prev_at<=interval '150 seconds' then observed_at end) detected_open,
 max(case when next_on=false and next_at-observed_at<=interval '150 seconds' then next_at end) closed_at
 from marked where is_on group by thing_id,channel,grp
), result as (
 select channel,first_at,closed_at,
 round(extract(epoch from(coalesce(closed_at,last_at)-first_at))::numeric/60,1) minutes,
 detected_open is not null as start_detected,
 case when closed_at is not null then 'closed' when last_at>=now()-interval '150 seconds' then 'ongoing' else 'gap' end as state,
 last_at from groups order by first_at desc limit 100
)
select coalesce(jsonb_agg(to_jsonb(result)),'[]'::jsonb) from result;
$$;
revoke all on function public.orchard_irrigation_intervals() from public,anon;
grant execute on function public.orchard_irrigation_intervals() to authenticated;
