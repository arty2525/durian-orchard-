create or replace function public.orchard_irrigation_report()
returns jsonb language sql stable security invoker set search_path='' as $$
with bounds as (
 select ((now() at time zone 'Asia/Bangkok')::date-29)::timestamp at time zone 'Asia/Bangkok' as start_at, now() as end_at
), samples as (
 select s.thing_id,s.observed_at,p->>'name' as channel,
 case when p->'value'='true'::jsonb then true when p->'value'='false'::jsonb then false else null end as is_on
 from public.irrigation_samples s cross join bounds b cross join lateral jsonb_array_elements(s.properties) p
 where s.observed_at>=b.start_at-interval '1 day' and s.observed_at<=b.end_at and p->>'name' ~ '^relay[1-8]$'
), ordered as (
 select *,lead(observed_at) over(partition by thing_id,channel order by observed_at) as next_at,
 lag(is_on) over(partition by thing_id,channel order by observed_at) as previous_on from samples
), changes as (
 select * from ordered,bounds where observed_at>=start_at and previous_on is not null and is_on is distinct from previous_on and is_on is not null
), days as (
 select d::date as day,d at time zone 'Asia/Bangkok' as a,(d+interval '1 day') at time zone 'Asia/Bangkok' as z
 from bounds,generate_series((start_at at time zone 'Asia/Bangkok')::timestamp,(end_at at time zone 'Asia/Bangkok')::date::timestamp,interval '1 day') d
), channels as (select 'relay'||n as channel from generate_series(1,8) n),
 daily as (
 select d.day,c.channel,
 coalesce(sum(extract(epoch from (least(o.next_at,d.z)-greatest(o.observed_at,d.a)))) filter(where o.is_on),0)/60 as on_minutes,
 coalesce(sum(extract(epoch from (least(o.next_at,d.z)-greatest(o.observed_at,d.a)))),0)/60 as coverage_minutes
 from days d cross join channels c left join ordered o on o.channel=c.channel and o.is_on is not null
 and o.next_at> d.a and o.observed_at<d.z and o.next_at-o.observed_at<=interval '150 seconds'
 group by d.day,c.channel
), output as (
 select day,channel,round(on_minutes::numeric,1) as on_minutes,round(coverage_minutes::numeric,1) as coverage_minutes,
 (select count(*) from changes e where e.channel=d.channel and (e.observed_at at time zone 'Asia/Bangkok')::date=d.day and e.is_on) as opens,
 (select count(*) from changes e where e.channel=d.channel and (e.observed_at at time zone 'Asia/Bangkok')::date=d.day and not e.is_on) as closes from daily d
)
select jsonb_build_object('from',(select start_at from bounds),'to',(select end_at from bounds),
 'firstSample',(select min(observed_at) from public.irrigation_samples),
 'latestSample',(select max(observed_at) from public.irrigation_samples),
 'days',(select jsonb_agg(to_jsonb(o) order by day,channel) from output o),
 'events',coalesce((select jsonb_agg(to_jsonb(e)) from (select observed_at,channel,is_on from changes order by observed_at desc limit 100) e),'[]'::jsonb));
$$;
revoke all on function public.orchard_irrigation_report() from public,anon;
grant execute on function public.orchard_irrigation_report() to authenticated;
