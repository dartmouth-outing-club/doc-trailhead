{% include "common/site-head.njs" %}
<title>Manage Fleet - DOC Trailhead</title>
<link rel="stylesheet" href="/static/css/manage-fleet.css">

{% include "common/site-nav.njs" %}
<main>

<section class="add-vehicle info-card">
<h1>Add Vehicle</h1>
<form action="/rest/opo/manage-fleet"
      method=post
      hx-boost=true
      hx-target=tbody
      hx-swap=innerHTML
      hx-push-url=true>
  <label for=name>Vehicle Name</label>
  <input type=text id=name name=name placeholder="Van E">
  <label for=type>Vehicle Type</label>
  <select id=type name=type><option>Van<option>Microbus<option>Truck</select>
  <button class="action approve">Add</button>
</form>
</section>

<section class="fleet info-card">
<h1>Vehicle Fleet</h1>
<table class=trip-table>
<thead><tr><th>Name<th>Type<th>
<tbody hx-get="/rest/opo/manage-fleet" hx-trigger="load" hx-swap="innerHTML">
</table>
</section>

</main>

