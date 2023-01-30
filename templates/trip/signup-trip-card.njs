<section class=info-card>
<header>Trip #{{ trip_id }}</header>
<h1>{{ title }}</h1>
<div class=status-row>
  <div class="club-tag">{{ club }}</div>
  {{ trip_status }}
</div>

<h2>Description</h2>
<p class=user-text>{{ description }}</p>
{% if is_opo %}<a href="/leader/trip/{{ trip_id }}">View trip as leader</a>{% endif %}

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

<h2>Signup</h2>
<form action="/rest/trip/{{ trip_id }}/signup" method=post hx-boost=true hx-push-url=false>
{% if required_gear.length %}
<p>Sign up for this trip here. Below is the required gear - only request what you need!
<table class=detail-table>
  {% for item in required_gear %}
  <tr>
    <th>{{ item.name }}</th>
    <td>
      <label>Request
        <input value="{{ item.id }}"
               name="{{ item.name }}"
               type=checkbox
               autocomplete=off
               {% if is_on_trip %}disabled{% endif %}
               {% if item.is_requested == 1%}checked{% endif %}
               >
      </label>
    </td>
  </tr>
  {% endfor %}
</table>
{% endif %}

<div class=button-row>
{% if is_on_trip %}
  <button class="action deny"
          type=button
          hx-delete="/rest/trip/{{ trip_id }}/signup"
          hx-confirm="Are you sure you want to remove yourself from the trip?"
          {% if is_owner %}disabled{% endif %}
          >Leave Trip</button>
  {% if required_gear.length %}
  <button class="action edit" type=button onclick="enableForm(this)">Edit Gear Request</button>
  {% endif %}
{% else %}
  <button class="action approve" type=submit>Sign Up</button>
{% endif %}
</div>
</form>

</section>

<script>
function enableForm(oldButton) {
  const checkboxes = document.querySelectorAll('form input[type=checkbox]')
  checkboxes.forEach(input => input.removeAttribute('disabled'))

  const newButton = document.createElement('button')
  newButton.classList.add('action', 'approve')
  newButton.innerText = 'Save'
  oldButton.replaceWith(newButton)
}
</script>
