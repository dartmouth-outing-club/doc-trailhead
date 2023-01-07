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
<section class=info-card>
<header>Trip #{{ trip_id }}</header>
<h1>{{ title }}</h1>
<div class=status-row>
  <div class="club-tag">{{ club }}</div>
  {{ trip_status }}
</div>

<h2>Description</h2>
<p>{{ description }}</p>

<h2>Details</h2>
<div class=dual-table-container>
<table class=detail-table>
  <tr><th>Start<td>{{ start_time }}
  <tr><th>End<td>{{ end_time }}
  <tr><th>Pickup<td>{{ pickup }}
  <tr><th>Dropoff<td>{{ dropoff }}
  <tr><th>Destination<td>{{ location }}
</table>
<table class=detail-table>
  <tr><th>Leader<td>{{ owner_name }}
  <tr><th>Co-Leader(s)<td>{{ leader_names }}
  <tr><th>Experience needed?<td>{{ experience_needed }}
  <tr><th>Subclub<td>{{ club }}
  <tr><th>Cost<td>{{ cost }}
</table>
</div>

<h2>Approved trippes ({{ attending.length }})</h2>
<table class=trip-table>
<thead>
<tr>
  <th>Name
  <th>Attended
  <th>Allergies/Dietary Restrictions
  <th>Medical Conditions
  <th>Gear Requests
  <th>
</tr>
<tbody>
{% for member in attending %}
<tr>
  <td>{{ member.name }}
  <td>{{ member.attended }}
  <td>{{ member.allergies_dietary_restrictions }}
  <td>{{ member.medical_conditions }}
  <td><ul>{{ member.requested_gear }}</ul>
  <td>
    <button>Un-admit</button>
    {% if member.leader === 1 %}
    <button>Make trippee</button>
    {% else %}
    <button>Make leader</button>
    {% endif %}
</tr>
{% endfor %}
</table>

<h2>Pending trippes ({{ pending.length }})</h2>
<table class=trip-table>
<thead>
<tr>
  <th>Name
  <th>Attended
  <th>Allergies/Dietary Restrictions
  <th>Medical Conditions
  <th>Gear Requests
  <th>
</tr>
<tbody>
{% for member in pending %}
<tr>
  <td>{{ member.name }}
  <td>{{ member.attended }}
  <td>{{ member.allergies_dietary_restrictions }}
  <td>{{ member.medical_conditions }}
  <td><ul>{{ member.requested_gear }}</ul>
  <td>
    <button>Admit</button>
    <button>Reject</button>
</tr>
{% endfor %}
</table>

<div class=dual-table-container>
<div>
  <div class=table-status-row><h2>Individual Gear</h2>{{ individual_gear_status }}</div>
  <table class="detail-table gear">
    {% for item in individual_gear %}
    <tr><th>{{ item.name }}<td>{{ item.quantity }}
    {% endfor %}
  </table>
</div>
<div>
  <div class=table-status-row><h2>Group Gear</h2>{{ group_gear_status }}</div>
  <table class="detail-table gear">
    {% for item in group_gear %}
    <tr><th>{{ item.name }}<td>{{ item.quantity }}
    {% endfor %}
  </table>
</div>
</div>

{%if pcard_request %}
<div>
  <div class=table-status-row><h2>P-Card Request</h2>{{ pcard_request.status }}</div>
  <table class="detail-table gear">
    <tr><th>Snacks<td>{{ pcard_request.snacks }}
    <tr><th>Breakfast<td>{{ pcard_request.breakfast }}
    <tr><th>Lunch<td>{{ pcard_request.lunch }}
    <tr><th>Dinner<td>{{ pcard_request.dinner }}
  </table>
</div>
{% endif %}

{%if vehiclerequest_id %}
<div>
  <div class=table-status-row><h2>Vehicle Request (#{{ vehiclerequest_id }})</h2>{{
    vehiclerequest_status }}</div>

  {% for vehicle in requested_vehicles %}
  <h3>Vehicle #{{ loop.index }}</h3>
  <div class=dual-table-container>
  <dl class=vehicle-table>
    <dt>Vehicle Type<dd>{{ vehicle.type }}
    <dt>Details<dd>{{ vehicle.details }}
    <dt>Pickup Time<dd>{{ vehicle.pickup_time }}
    <dt>Return Time<dd>{{ vehicle.return_time }}
    <dt>WMNF Pass<dd>{{ vehicle.trailer_needed }}
    <dt>Trailer Hitch<dd>{{ vehicle.pass_needed }}
  </dl>
  <dl class=vehicle-table>
    <dt>Assigned Vehicle<dd>{{ vehicle.name }}
    <dt>Vehicle Key #<dd>{{ vehicle.vehicle_key }}
    <dt>Assigned Pickup<dd>{{ vehicle.pickup_time }}
    <dt>Assigned Return<dd>{{ vehicle.return_time }}
  </dl>
  </div>
  {% endfor %}
</div>
{% endif %}


</section>
</main>

