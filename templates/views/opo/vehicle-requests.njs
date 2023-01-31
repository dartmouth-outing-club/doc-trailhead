{% include "common/site-head.njs" %}
<title>Vehicle Requests - DOC Trailhead</title>
<link rel="stylesheet" href="/static/css/approvals.css">

{% include "common/site-nav.njs" %}
{% include "common/opo-nav.njs" %}

<main>

<section class="pending info-card">
<h1>Pending Vehicle Requests</h1>
<table class=trip-table>
<thead><tr><th>Title<th>Requester<th>Pickup<th>Return
<tbody hx-get="/rest/opo/vehicle-requests" hx-trigger="load" hx-swap="innerHTML">
</table>
</section>

<section class="reviewed info-card">
<h1>Reviewed Vehicle Requests</h1>
<table class=trip-table>
<thead><tr><th>Title<th>Requester<th>Pickup<th>Return<th>Status
<tbody hx-get="/rest/opo/vehicle-requests?show_reviewed=true" hx-trigger="load" hx-swap="innerHTML">
</tr>
</table>
</section>

</main>

