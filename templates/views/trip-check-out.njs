<!DOCTYPE html>
<html lang=en>
<title>Trip Check-Out - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/static/icons/doc-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/css/common.css">
<link rel="stylesheet" href="/static/css/trip.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}

<main>
<section class=info-card>
  <h1>Trip Check-Out ({{ title }})</h1>
<p><a href="/trip/{{trip_id}}">Return to the trip overview page</a>
{% if checked_out %}
<p>Your trip is all checked out and you are good to go!


<p>If you checked out by mistake or your need to make changes to your attendance list, you can undo
your check-out.
<div><button class="action deny"
        hx-delete="/rest/trip/{{trip_id}}/check-out"
        hx-confirm="Are you sure you want to undo your check-out?"
        >Undo Check-Out
</button></div>
{% else %}
<p>Check-out your trippees before leaving. You MUST accurately mark which trippees are present on
the day of the trip.

{% include "trip/attendance-table.njs" %}

<p>
When you are ready to leave, click the check-out button to get started on your trip.

<div>
<button class="action approve"
        hx-put="/rest/trip/{{trip_id}}/check-out"
        hx-confirm="Are you sure you want to check out?"
        >Check-Out Trip
</button>
</div>
{% endif %}

</section>
</main>

