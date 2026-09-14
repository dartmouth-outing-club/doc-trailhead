WITH trip_lengths as (
    SELECT
        title,
        location,
        datetime(trips.start_time / 1000, 'unixepoch') as start_date,
        datetime(trips.end_time / 1000, 'unixepoch') as end_date,
        julianday(trips.start_time /1000, 'unixepoch') as start_day,
        julianday(trips.end_time /1000, 'unixepoch')  as end_day
    FROM trips
)
SELECT
    substr(title, 0, 35) as title,
    location,
    start_date,
    end_date,
    ceil(end_day - start_day) as duration_days
FROM trip_lengths
WHERE start_date >= '2025-01-01' AND duration_days > 1
ORDER BY start_date
;
