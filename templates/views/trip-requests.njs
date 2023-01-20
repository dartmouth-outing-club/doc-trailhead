<!DOCTYPE html>
<html lang=en>
<title>Trip Requests - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/requests.css">
<script src="/htmx.js"></script>

{% include "common/site-nav.njs" %}
<main>
<a href="/leader/trip/{{trip_id}}" class=top-link>Back to trip #{{trip_id}}</a>

{% if vehiclerequest_locked %}
  <section class=info-card>
    <h1>Vehicle Request</h1>
    <p>Cannot edit vehicle request after OPO has reviewed it.
  </section>
{% else %}
  {% include "requests/vehicle-request-editable.njs" %}
{% endif %}

{% if individual_gear_locked %}
  <section class=info-card>
    <h1>Individual Gear</h1>
    <p>Cannot edit individual gear request after OPO has reviewed it.
  </section>
{% else %}
  {% include "requests/individual-gear.njs" %}
{% endif %}

{% if group_gear_locked %}
  <section class=info-card>
    <h1>Group Gear</h1>
    <p>Cannot edit group gear request after OPO has reviewed it.
  </section>
{% else %}
  {% include "requests/group-gear.njs" %}
{% endif %}

{% if pcard_locked %}
  <section class=info-card>
    <h1>P-Card Request</h1>
    <p>Cannot edit P-Card gear request after OPO has reviewed it.
  </section>
{% else %}
  {% include "requests/pcard-request.njs" %}
{% endif %}


</main>

