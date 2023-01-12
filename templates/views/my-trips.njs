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
  <a href="/" class=trip-card>
    <h2>Create a Trip</h2>
    <img src="/icons/createtrip.svg">
  </a>
</section>

</main>

