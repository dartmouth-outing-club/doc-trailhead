SELECT title, date(start_time / 1000, 'unixepoch')
FROM trips
WHERE
  start_time > 1696118400000 AND (
    title LIKE '%trail work%' or
    title LIKE '%trailwork%' or
    club == 10
  )
;
