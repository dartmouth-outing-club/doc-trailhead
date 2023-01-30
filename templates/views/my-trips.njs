<!DOCTYPE html>
<html lang=en>
<title>My Trips - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/static/icons/doc-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/css/common.css">
<link rel="stylesheet" href="/static/css/all-trips.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}
<main>

<section class="info-card">
<img src="/static/icons/mountain-icon.svg">
<h1>Your Upcoming Trips</h1>
</section>

<section class="trips">
  {% if can_create_trip %}
  <a href="/create-trip" class="trip-card new-trip">
    <h2>Create a Trip</h2>
    <img src="/static/icons/createtrip.svg">
  </a>
  {% endif %}
  {% for trip in trips %}
  <a href=/trip/{{trip.id}} class=trip-card>
    <img class=club-logo src="{{trip.iconPath}}">
    <header>Trip #{{ trip.id }}</header>
    <h2>{{ trip.title }}</h2>
    <div>
      {{ trip.start_time }}
      {{ trip.end_time }}
    </div>
    <div class="club-tag">{{ trip.club }}</div>
    <p>{{ trip.description }}</p>
  </a>
  {% endfor %}
</section>

</main>

