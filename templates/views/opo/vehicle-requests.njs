<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/approvals.css">
<script src="https://unpkg.com/htmx.org@1.8.4"></script>

{% include "common/site-nav.njs" %}
{% include "common/opo-nav.njs" %}

<main>

<section class="pending info-card">
<h1>Pending Vehicle Requests</h1>
<table class=trip-table>
<thead><tr><th>Requester<th>Reason<th>Pickup<th>Return
<tbody hx-get="/rest/opo/vehicle-requests" hx-trigger="load" hx-swap="innerHTML">
</table>
</section>

<section class="reviewed info-card">
<h1>Reviewed Vehicle Requests</h1>
<table class=trip-table>
<thead><tr><th>Requester<th>Reason<th>Pickup<th>Return<th>Status
<tbody hx-get="/rest/opo/vehicle-requests?show_reviewed=true" hx-trigger="load" hx-swap="innerHTML">
</tr>
</table>
</section>

</main>

