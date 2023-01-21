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
<h1>Trip Check-In ({{ title }})</h1>
<p><a href="/trip/{{trip_id}}">Return to the trip overview page</a>
{% if not checked_out %}
<p>Your trip is not checked out, so there's no need to check it back in!
<p><a href="/trip/{{trip_id}}/check-out">Go to the check-out page</a>
<p><a href="/trip/{{trip_id}}">Return to the trip overview page</a>
{% elseif not checked_in %}
<div><button class="action approve"
             hx-put="/rest/trip/{{trip_id}}/check-in"
             hx-confirm="Are you sure you want to check in?"
             >We have returned safely
</button></div>
<p>
If you had an incident or a near-miss on your trip,
<a href="https://docs.google.com/forms/u/1/d/e/1FAIpQLSeo9jIcTGNstZ1uADtovDjJT8kkPtS-YpRwzJC2MZkVkbH0hw/viewform">
  click here to file an incident report.</a>
{% else %}
<div><button class="action deny"
             hx-delete="/rest/trip/{{trip_id}}/check-in"
             hx-confirm="Are you sure you want to undo your check in?"
             >Undo Check-In
</button></div>
<p>
If you had an incident or a near-miss on your trip,
<a href="https://docs.google.com/forms/u/1/d/e/1FAIpQLSeo9jIcTGNstZ1uADtovDjJT8kkPtS-YpRwzJC2MZkVkbH0hw/viewform"
   target=_blank
   >click here to file an incident report</a> (opens in a new tab).
{% endif %}

</section>
</main>


