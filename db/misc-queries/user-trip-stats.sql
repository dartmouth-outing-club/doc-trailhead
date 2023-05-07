-- Get a list of the number of trips each user has signed up for
with signups as (
  select user as id, count(user) as trips
  from trip_members
  group by user
)
select
  cas_id,
  trips,
  email
from signups
left join users using (id)
order by trips desc;
