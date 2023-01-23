<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/static/icons/doc-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/css/common.css">
<link rel="stylesheet" href="/static/css/manage-fleet.css">
<script src="/htmx/htmx.js"></script>

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

