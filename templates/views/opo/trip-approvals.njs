<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/approvals.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}
{% include "common/opo-nav.njs" %}

<main>

<section class="pending info-card">
<h1>Pending Trips</h1>
<table class=trip-table>
<thead><tr>
  <th>Trip</th>
  <th>Start Time</th>
  <th>Subclub</th>
  <th>Owner</th>
  <th>Group Gear</th>
  <th>Vehicles</th>
  <th>P-Card</th>
</tr></thead>
<tbody hx-get="/rest/opo/trip-approvals" hx-trigger="load" hx-swap="innerHTML">
</table>
</section>

<section class="past info-card">
<h1>Reviewed & Past Trips</h1>
<table class=trip-table>
<thead><tr>
  <th>Trip</th>
  <th>Start Time</th>
  <th>Subclub</th>
  <th>Owner</th>
  <th>Group Gear</th>
  <th>Vehicles</th>
  <th>P-Card</th>
</tr></thead>
<tbody hx-get="/rest/opo/trip-approvals?show_past=true" hx-trigger="load" hx-swap="innerHTML">
</table>
</section>

</main>

