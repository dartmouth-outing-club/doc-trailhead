<section class=info-card>
<header>Trip #{{ trip_id }}</header>
<h1>{{ title }}</h1>
<div class=status-row>
  <div class="club-tag">{{ club }}</div>
  {{ trip_status }}
</div>

<h2>Description</h2>
<p>{{ description }}</p>
{% if is_opo %}<a href="/leader/trip/{{ trip_id }}">View trip as OPO staff</a>{% endif %}

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
<p>Sign up for this trip here. Below is the required gear - only request what you need!
<form action="/rest/trip/{{ trip_id }}/signup" method=post hx-boost=true hx-push-url=false>
<table class=detail-table>
  {% for item in group_gear %}
  <tr><th>{{ item.name }}<td><label>Request <input name="{{ item.name }}" type=checkbox></label>
  {% endfor %}
</table>

{% if is_on_trip %}
<button class="action deny"
        type=button
        hx-delete="/rest/trip/{{ trip_id }}/signup"
        hx-confirm="Are you sure you want to remove yourself from the trip?"
        >Leave Trip</button>
{% else %}
<button class="action approve" type=submit>Sign Up</button>
{% endif %}
</form>

</section>
