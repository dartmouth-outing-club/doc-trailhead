{% include "common/site-head.njs" %}
<title>Trip Approvals - DOC Trailhead</title>
<link rel="stylesheet" href="/static/css/approvals.css">

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

