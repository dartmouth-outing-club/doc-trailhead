<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/all-trips.css">
<script src="https://unpkg.com/htmx.org@1.8.4"></script>

{% include "common/site-nav.njs" %}
<main>

<section class="info-card">
<img src="/icons/mountain-icon.svg">
<h1>Your Upcoming Trips</h1>
</section>

<section class="trips" hx-get="/rest/my-trips" hx-swap=beforeend hx-trigger=load>
  {% if can_create_trip %}
  <a href="/create-trip" class="trip-card new-trip">
    <h2>Create a Trip</h2>
    <img src="/icons/createtrip.svg">
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

