<!DOCTYPE html>
<html lang=en>
<title>Trip Requests - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/requests.css">
<script src="https://unpkg.com/htmx.org@1.8.4"></script>

{% include "common/site-nav.njs" %}
<main>
<a href="/leader/trip/{{trip_id}}" class=top-link>Back to trip #{{trip_id}}</a>
{% include "requests/vehicle-request.njs" %}
{% include "requests/individual-gear.njs" %}
{% include "requests/group-gear.njs" %}
{% include "requests/pcard-request.njs" %}

</main>

