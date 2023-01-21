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
<h1>Trip Check-In</h1>
{% if not checked_out %}
<p>Your trip is not checked out, so there's no need to check it back in!
<p><a href="/trip/{{trip_id}}/check-out">Click here to go to the check-out page</a>
<p><a href="/trip/{{trip_id}}">Click here to go to the trip overview page</a>


{% else %}
{% endif %}

</section>
</main>


