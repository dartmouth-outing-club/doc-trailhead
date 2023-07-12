.mode csv

with trip_stats as (
  select trip, count(user) as member_count
  from trip_members
  group by trip
)
select title, member_count, clubs.name as club
from trips
left join clubs on trips.club = clubs.id
left join trip_stats on trips.id = trip_stats.trip
;

