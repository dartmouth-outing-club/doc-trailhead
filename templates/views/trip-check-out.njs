<!DOCTYPE html>
<html lang=en>
<title>Trip Requests - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/trip.css">
<script src="/htmx.js"></script>

{% include "common/site-nav.njs" %}
<main>
<section class=info-card>
<h1>Trip Attendance</h1>
<p>Check-out your trippees before leaving. You MUST accurately mark which trippees are present on
the day of the trip.
{% include "trip/attendance-table.njs" %}
</section>
</main>

