<section class=info-card>
<header>Trip #{{ trip_id }}</header>
<h1>{{ title }}</h1>
<div class=status-row>
  <div class="club-tag">{{ club }}</div>
  {{ trip_status }}
</div>

<h2>Description</h2>
<p>{{ description }}</p>
{% if is_opo %}<a href="/trip/{{ trip_id }}">View trip signup</a>{% endif %}

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
<tr {% if member.leader === 1%}class="leader-row"{% endif %}>
  <td>{{ member.name }}
  <td>{{ member.attended }}
  <td>{{ member.allergies_dietary_restrictions }}
  <td>{{ member.medical_conditions }}
  <td><ul>{{ member.requested_gear }}</ul>
  <td>
    <button class="action edit" hx-put="/rest/trip/{{ trip_id }}/waitlist/{{ member.id }}">Un-admit</button>
    {% if member.leader === 1 %}
    <button class="action edit" hx-delete="/rest/trip/{{ trip_id }}/leader/{{ member.id }}">Make trippee</button>
    {% else %}
    <button class="action edit" hx-put="/rest/trip/{{ trip_id }}/leader/{{ member.id }}">Make leader</button>
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
    <button class="action edit" hx-put="/rest/trip/{{ trip_id }}/member/{{ member.id }}">Admit</button>
    <button class="action edit"
            hx-delete="/rest/trip/{{ trip_id }}/member/{{ member.id }}"
            hx-confirm="Are you sure you want to reject {{ member.name }}? Keep in mind that doing so will also remove their gear request."
            >Reject</button>
</tr>
{% endfor %}
</table>

<div class=dual-table-container>
<div>
  <div class=table-status-row><h2>Individual Gear</h2>{{ member_gear_status }}</div>
  <table class="detail-table gear">
    {% for item in member_requested_gear %}
    <tr><th>{{ item.name }}<td>{{ item.quantity }}
    {% endfor %}
  </table>
  {% if show_member_gear_approval_buttons %}
  <div class=button-row>
    <button class="action deny" hx-put="/rest/opo/member-gear/{{ trip_id }}/deny">Deny</button>
    {% if member_gear_approved === 1 %}
    <button class="action edit" hx-put="/rest/opo/member-gear/{{ trip_id }}/reset">Un-approve</button>
    {% else %}
    <button class="action approve" hx-put="/rest/opo/member-gear/{{ trip_id }}/approve">Approve</button>
    {% endif %}
  </div>
  {% endif %}
</div>
<div>
  <div class=table-status-row><h2>Group Gear</h2>{{ group_gear_status }}</div>
  <table class="detail-table gear">
    {% for item in group_gear %}
    <tr><th>{{ item.name }}<td>{{ item.quantity }}
    {% endfor %}
  </table>
  {% if show_group_gear_approval_buttons %}
  <div class=button-row>
    <button class="action deny" hx-put="/rest/opo/group-gear/{{ trip_id }}/deny">Deny</button>
    {% if group_gear_approved === 1 %}
    <button class="action edit" hx-put="/rest/opo/group-gear/{{ trip_id }}/reset">Un-approve</button>
    {% else %}
    <button class="action approve" hx-put="/rest/opo/group-gear/{{ trip_id }}/approve">Approve</button>
    {% endif %}
  </div>
  {% endif %}
  </div>
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
  {% if show_pcard_approval_buttons %}
  <div class=button-row>
    <button class="action deny" hx-put="/rest/opo/pcard/{{ trip_id }}/deny">Deny</button>
    {% if pcard_request.is_approved === 1 %}
    <button class="action edit" hx-put="/rest/opo/pcard/{{ trip_id }}/reset">Un-approve</button>
    {% else %}
    <button class="action approve" hx-put="/rest/opo/pcard/{{ trip_id }}/approve">Approve</button>
    {% endif %}
  </div>
  {% endif %}
</div>
{% endif %}

{%if vehiclerequest_id %}
<form hx-put="/rest/opo/vehiclerequest/{{ trip_id }}/approve">
  <div class=table-status-row>
    <h2>Vehicle Request (#{{ vehiclerequest_id }})</h2>
    {{ vehiclerequest_badge }}
  </div>

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
  {%if is_opo %}
    <dt><label for="vehicle-{{ loop.index }}">Assigned Vehicle</label></dt>
    <dd>
      <select id="vehicle-{{ loop.index }}"
              name="vehicle-{{ loop.index }}"
              {% if vehiclerequest_status != null %}disabled{% endif %}
              autocomplete=off
              required
              >
        {% for v in available_vehicles %}
        <option {% if v.id === vehicle.id %}selected {% endif %}value="{{v.id}}">{{v.name}}</option>
        {% endfor %}
      </select>
    </dd>
    <dt><label for="key-{{ loop.index }}">Assigned Key #</label></dt>
    <dd><input id="key-{{ loop.index }}"
               name="key-{{ loop.index }}"
               type=text
               value="{{ vehicle.vehicle_key }}"
               {% if vehiclerequest_status != null %}disabled{% endif %}
               autocomplete=off
               required></dd>
    <dt><label for="pickup-{{ loop.index }}">Assigned Pickup</label></dt>
    <dd>
      <input min="{{ today }}"
             id="pickup-{{ loop.index }}"
             name="pickup-{{ loop.index }}"
             value="{{ vehicle.assigned_pickup_time }}"
             type=datetime-local
             {% if vehiclerequest_status != null %}disabled{% endif %}
             autocomplete=off
             required
             >
    </dd>
    <dt>Assigned Return</dt>
    <dd><input min="{{ today }}"
               id="return-{{ loop.index }}"
               name="return-{{ loop.index }}"
               value="{{ vehicle.assigned_return_time }}"
               type=datetime-local
               {% if vehiclerequest_status != null %}disabled{% endif %}
               autocomplete=off
               required
               >
    </dd>
  {% else %}
    <dt>Assigned Vehicle<dd>{{ vehicle.name }}
    <dt>Assigned Key #<dd>{{ vehicle.vehicle_key }}
    <dt>Assigned Pickup<dd>{{ vehicle.pickup_time }}
    <dt>Assigned Return<dd>{{ vehicle.return_time }}
  {% endif %}
  </dl>
  </div>
  {% endfor %}

  {% if is_opo %}
  <div class=button-row>
    <button class="action deny" type=button hx-put="/rest/opo/vehiclerequest/{{ trip_id }}/deny">Deny</button>
    {% if vehiclerequest_status === 1 %}
    <button class="action edit" type=button hx-put="/rest/opo/vehiclerequest/{{ trip_id }}/reset">Un-approve</button>
    {% else %}
    <button class="action approve" type=submit>Assign Vehicles</button>
    {% endif %}
  </div>
  {% endif %}
</form>
{% endif %}

{% if can_delete %}
<h2>Modify Trip</h2>
<div class="edit-row">
  <a class="action edit" href="/trip/{{ trip_id }}/edit">Edit Trip</a>
  <a class="action edit" href="/trip/{{ trip_id }}/requests">Edit Requests</a>
</div>
{% endif %}

<h2>Delete Trip</h2>
<p>Click this checkbox to enable the delete button:
<input type=checkbox autocomplete=off onchange="toggleDeleteButton(this)">
<div class="edit-row">
<button
    class="action deny delete-trip"
    disabled
    autocomplete=off
    hx-delete="/rest/trip/{{ trip_id }}"
    hx-confirm="Are you sure you want to delete trip {{ title }}? Keep in mind that this will delete the associated vehicle request. This action cannot be reversed."
    >Delete Trip
</button>
</div>

</section>

<script>
function toggleDeleteButton(checkbox) {
  const button = document.querySelector('.delete-trip')
  button.disabled = !checkbox.checked
}
</script>
