<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/trip.css">
<script src="/htmx.js"></script>

{% include "common/site-nav.njs" %}
<main hx-target=this>
{% include "trip/leader-trip-card.njs" %}
</main>
