{% include "common/site-head.njs" %}
<title>Profile Approvals - DOC Trailhead</title>
<link rel="stylesheet" href="/static/css/approvals.css">

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

