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
<label>Subclub<input name=club type=text required></label> <!-- include none option-->
<label>Cost (in USD)<input name=cost type=number required></label>
<label>Co-leaders<input type=text></label>
<label>Give leaders edit access?<input name=edit_access type=checkbox></label>
<label>Prior experience required?<input name=experience_needed type=checkbox></label>
<label>Is this a private trip or gear request?<input name=is_private type=checkbox></label>

<h2>Date and Location</h2>
<label>Start Time (EST)<input name=start_time type=datetime-local required></label>
<label>End Time (EST)<input name=end_time type=datetime-local required></label>
<label>Trip Location<input name=location type=text required></label>
<label>Pickup Location<input name=pickup type=text required></label>
<label>Dropoff Location<input name=dropoff type=text required></label>
<label class=block>Description<textarea name=description required></textarea></label>
<p>Things you must include:
<ul>
  <li>What you'll be doing on the trip
  <li>A short introduction of the leaders
  <li>Level of prior experience (if applicable) and what gear or clothing might be needed
  <li>Rough itinerary - this is your trip plan on file, so please include route plan details like
    where the vehicle will be parked, main and alternate routes, in case of emergency.
</ul>


<button class="action approve" type=submit>Create Trip</button>

</form>
</main>
