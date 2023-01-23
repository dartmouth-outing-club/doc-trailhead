<!DOCTYPE html>
<html lang=en>
<title>{{ title }} - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/static/icons/doc-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/css/common.css">
<link rel="stylesheet" href="/static/css/trip.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}
<main hx-target=this>
{% include "trip/signup-trip-card.njs" %}
</main>
