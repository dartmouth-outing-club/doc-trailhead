<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<script src="/htmx/htmx.js"></script>
<script src='/fullcalendar-scheduler/index.global.js'></script>


{% include "common/site-nav.njs" %}

<main>

<section class="pending info-card">
<h1>Calendar</h1>
<div id='calendar'></div>
</section>

</main>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const calendarEl = document.getElementById('calendar')
  const calendar = new FullCalendar.Calendar(calendarEl, {
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
    },
    initialView: 'resourceTimelineWeek',
    resources: []
  })
  calendar.render()
})
</script>
