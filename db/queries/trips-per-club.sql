WITH trip_starts AS (
    SELECT
        id,
        club,
        datetime(trips.start_time / 1000, 'unixepoch') as start_date
    FROM trips
)
SELECT
    count(trip_starts.id) as num_trips,
    coalesce(clubs.name, '(none)') as club
FROM trip_starts
LEFT JOIN clubs ON clubs.id = trip_starts.club
WHERE start_date >= '2024-04-01' AND start_date < '2025-04-01'
GROUP BY club
ORDER BY count(trip_starts.id) desc;
