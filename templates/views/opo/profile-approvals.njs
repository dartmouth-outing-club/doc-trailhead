<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/static/css/common.css">
<link rel="stylesheet" href="/static/css/approvals.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}
{% include "common/opo-nav.njs" %}

<main>

<section class="leaders info-card">
<h1>Leadership requests</h1>
<table class=trip-table>
<thead><tr><th>Person<th>Request<th></tr></thead>
<tbody hx-get="/rest/opo/profile-approvals/leaders" hx-trigger="load" hx-swap="innerHTML">
</table>
</section>

<section class="certs info-card">
<h1>Vehicle certification requests</h1>
<table class=trip-table>
<thead><tr><th>Person<th>Request<th></tr></thead>
<tbody hx-get="/rest/opo/profile-approvals/certs" hx-trigger="load" hx-swap="innerHTML">
</table>
</section>

</main>

