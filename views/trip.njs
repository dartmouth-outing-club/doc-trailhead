<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/trip.css">
<script src="https://unpkg.com/htmx.org@1.8.4"></script>

<nav class=site-nav>
<ul>
  <li class="selected"><a href="/opo/trip-approvals.html">Approvals</a></li>
  <li><a href="/opo/calendar.html">Calendar</a>
  <li><a href="/opo/manage-fleet.html">Fleet</a>
  <li><a href="/all-trips.html">All Trips</a></li>
  <li><a href="/my-trips.html">My Trips</a></li>
  <li><a href="/profile.html">Profile</a></li>
</ul>
</nav>

<main>

<header>Trip #{{ id }}</header>
<h1>{{ title }}</h1>
<div style="display:inline">
  <div class="club-tag">{{ club }}</div>
  <img src="{{ icon_path }}">
</div>
<hr>
<h2>Description</h2>
<p>{{ description }}</p>

<h2>Details</h2>
<table>
  <tr><th>Start<td>{{ start_time }}
  <tr><th>End<td>{{ end_time }}
  <tr><th>Pickup<td>{{ pickup }}
  <tr><th>Dropoff<td>{{ dropoff }}
  <tr><th>Destination<td>{{ location }}
</table>
<table>
  <tr><th>Leader<td>{{ owner_name }}
  <tr><th>Co-Leader(s)<td>{{ leader_names }}
  <tr><th>Experience needed?<td>{{ experience_needed }}
  <tr><th>Subclub<td>{{ club }}
  <tr><th>Cost<td>{{ cost }}
</table>
<div></div>

</main>

