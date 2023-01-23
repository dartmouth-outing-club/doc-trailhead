<!DOCTYPE html>
<html lang=en>
<title>Trip Requests - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/trip.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}
<main>
<section class=info-card>
{% include "requests/vehicle-request-table.njs" %}
</section>
</main>

