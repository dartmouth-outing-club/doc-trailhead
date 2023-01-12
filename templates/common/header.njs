<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/trip.css">
<script src="https://unpkg.com/htmx.org@1.8.4"></script>

<nav class=site-nav>
<ul>
  {% if is_opo %}
  <li><a href="/opo/trip-approvals.html">Approvals</a></li>
  <li><a href="/opo/calendar.html">Calendar</a>
  <li><a href="/opo/manage-fleet.html">Fleet</a>
  {% endif %}
  <li><a href="/all-trips.html">All Trips</a></li>
  <li><a href="/my-trips.html">My Trips</a></li>
  <li><a href="/profile.html">Profile</a></li>
</ul>
</nav>
