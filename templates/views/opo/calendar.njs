<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<script src="/htmx/htmx.js"></script>
<script src='/fullcalendar-scheduler/index.global.min.js'></script>


{% include "common/site-nav.njs" %}

<main>

<section class="pending info-card">
<h1>Calendar</h1>
<div id='calendar'></div>
</section>

</main>

<script>
document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/json/calendar')
  const body = await res.json()

  const calendarEl = document.getElementById('calendar')
  const calendar = new FullCalendar.Calendar(calendarEl, {
    headerToolbar: {
      left: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth',
      right: 'prev,next',
      center: 'title'
    },
    events: body.events,
    initialView: 'resourceTimelineWeek',
    resources: body.resources,
    // If you're some hotshot OPO staffer who's inspecting source to steal the fullcalendar license
    // key, first of all: why? Second of all, this is basically free software. You can use it for
    // non-commercial or open-source purposes for free. You're just supposed to pay for the license
    // in this kind of software. There's no way to use it in the frontend without exposing the key,
    // it's kind of just an honor system. Anyway don't steal the key for my calendar component.
    schedulerLicenseKey: '{{ LICENSE_KEY }}'
  })
  calendar.render()
})
</script>
