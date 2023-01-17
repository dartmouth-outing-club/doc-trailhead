<template id=leader-input>
<label>Co-leader
  <div class="additional-leader-row">
    <input name=leader list=user-emails type=text>
    <button type=button onclick="this.parentElement.parentElement.remove()">
      <img alt="Close Icon" src="/icons/close-icon.svg">
    </button>
  </div>
</label>
</template>

<form
  class=info-card
  {% if trip.id %}
  hx-put="/rest/trip/{{ trip.id }}"
  {% else %}
  action="/rest/trip"
  method=post
  {% endif %}
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

{% if trip.leaders %}
<div class=existing-leaders>
  <div>Existing leaders</div>
  <div>{{ trip.leaders }}</div>
</div>
{% endif %}
<button id="add-leader" type=button onclick="addLeader()">Add New Co-Leader</button>

<label>Give leaders edit access?<input name=edit_access {% if trip.coleader_can_edit %}checked {% endif %}type=checkbox></label>
<label>Prior experience required?<input name=experience_needed {% if trip.experience_needed %}checked {% endif %}type=checkbox></label>
<label>Is this a private trip or gear request?<input name=is_private {% if trip.private %}checked {% endif %}type=checkbox></label>

<h2>Date and Location</h2>
<label>Start Time (EST)<input min="{{ today }}" name=start_time value="{{ trip.start_time }}" type=datetime-local required></label>
<label>End Time (EST)<input min="{{ today }}" name=end_time value="{{ trip.end_time }}" type=datetime-local required></label>
<label>Trip Location<input name=location value="{{ trip.location }}" type=text required></label>
<label>Pickup Location<input name=pickup value="{{ trip.pickup }}" type=text required></label>
<label>Dropoff Location<input name=dropoff value="{{ trip.dropoff }}" type=text required></label>
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
<script>
const template = document.querySelector('#leader-input')
const form = document.querySelector('form')
const addLeaderButton = document.querySelector('#add-leader')
function addLeader () {
  console.log('appending')
  const leaderInput = template.content.cloneNode(true)
  console.log(leaderInput)
  form.insertBefore(leaderInput, addLeaderButton)
}
</script>

<datalist id=user-emails>
  {% for user in emails %}<option>{{ user.email }}
  {% endfor %}
</datalist>

