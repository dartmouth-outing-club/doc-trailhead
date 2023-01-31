{% include "common/site-head.njs" %}
<title>{{ user_name }} - DOC Trailhead</title>
<link rel="stylesheet" href="/static/css/profile.css">

{% include "common/site-nav.njs" %}

<main>
<section class="info-card" hx-get="/rest/trip/{{trip_id}}/user/{{user_id}}" hx-swap=outerHTML hx-trigger=load>
</section>

</main>

