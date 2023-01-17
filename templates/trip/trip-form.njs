<form
  class=info-card
  {% if trip.id %}
  action="/rest/trip/{{ trip.id }}"
  {% else %}
  action="/rest/trip"
  {% endif %}
  method=post
  >

{% if trip.id %}
<h1>Edit Trip #{{ trip.id }}</h1>
{% else %}
<h1>Create new trip</h1>
{% endif %}

<h2>Basic Info</h2>
<label>Trip Title<input name=title type=text value="{{ trip.title }}" required></label>
<label>Subclub
  <select name=club>
  <option value=0>--None--
  {% for club in clubs %}<option {% if trip.club == club.id %}selected {% endif %}value="{{ club.id }}">{{ club.name }}
  {% endfor %}
  </select>
</label>
<label>Cost (in USD)<input name=cost type=number min=0 value="{{ trip.cost or 0 }}" required></label>
<label>Co-leaders
  <input list=user-emails type=text>
</label>
<datalist id=user-emails>
  {% for user in emails %}<option value="{{ user.id }}">{{ user.email }}
  {% endfor %}
</datalist>
<label>Give leaders edit access?<input name=edit_access {% if trip.coleader_can_edit %}checked {% endif %}type=checkbox></label>
<label>Prior experience required?<input name=experience_needed {% if trip.experience_needed %}checked {% endif %}type=checkbox></label>
<label>Is this a private trip or gear request?<input name=is_private {% if trip.private %}checked {% endif %}type=checkbox></label>

<h2>Date and Location</h2>
<label>Start Time (EST)<input min="{{ today }}" name=start_time value="{{ trip.start_time }}"type=datetime-local required></label>
<label>End Time (EST)<input min="{{ today }}" name=end_time value="{{ trip.end_time }}"type=datetime-local required></label>
<label>Trip Location<input name=location value="{{ trip.location }}" type=text required></label>
<label>Pickup Location<input name=pickup value="{{ trip.pickup }}" type=text required></label>
<label>Dropoff Location<input name=dropoff value="{{ trip.dropoff }}"type=text required></label>
<h2>Trip Description</h2>
<p>Things you must include:
<ul>
  <li>What you'll be doing on the trip
  <li>A short introduction of the leaders
  <li>Level of prior experience (if applicable) and what gear or clothing might be needed
  <li>Rough itinerary - this is your trip plan on file, so please include route plan details like
    where the vehicle will be parked, main and alternate routes, in case of emergency.
</ul>
<label class=block>Description<textarea name=description required>{{ trip.description }}</textarea></label>

{% if trip.id %}
<button class="action approve" type=submit>Submit Changes</button>
{% else %}
<button class="action approve" type=submit>Create Trip</button>
{% endif %}

</form>

