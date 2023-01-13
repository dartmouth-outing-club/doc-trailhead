<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/create-trip.css">
<script src="https://unpkg.com/htmx.org@1.8.4"></script>

{% include "common/site-nav.njs" %}

<main>
<a href="/my-trips" class=top-link>Back to trips page</a>
<form class=info-card action=/rest/trip method=post>
<h1>Create new trip</h1>
<h2>Basic Info</h2>
<label>Trip Title<input name=title type=text required></label>
<label>Subclub
  <select id="" name="">
  <option value=0>--None--
  {% for club in clubs %}<option value="{{ club.id }}">{{ club.name }}
  {% endfor %}
  </select>
</label>
<label>Cost (in USD)<input name=cost type=number min=0 value=0 required></label>
<label>Co-leaders
  <input list=user-emails type=text>
</label>
<datalist id=user-emails>
  {% for user in emails %}<option value="{{ user.id }}">{{ user.email }}
  {% endfor %}
</datalist>
<label>Give leaders edit access?<input name=edit_access type=checkbox></label>
<label>Prior experience required?<input name=experience_needed type=checkbox></label>
<label>Is this a private trip or gear request?<input name=is_private type=checkbox></label>

<h2>Date and Location</h2>
<label>Start Time (EST)<input min="{{ today }}" name=start_time type=datetime-local required></label>
<label>End Time (EST)<input name="{{ today }}" type=datetime-local required></label>
<label>Trip Location<input name=location type=text required></label>
<label>Pickup Location<input name=pickup type=text required></label>
<label>Dropoff Location<input name=dropoff type=text required></label>
<h2>Trip Description</h2>
<p>Things you must include:
<ul>
  <li>What you'll be doing on the trip
  <li>A short introduction of the leaders
  <li>Level of prior experience (if applicable) and what gear or clothing might be needed
  <li>Rough itinerary - this is your trip plan on file, so please include route plan details like
    where the vehicle will be parked, main and alternate routes, in case of emergency.
</ul>
<label class=block>Description<textarea name=description required></textarea></label>


<button class="action approve" type=submit>Create Trip</button>

</form>
</main>
