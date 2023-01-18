<section class=info-card hx-target=this hx-swap=outerHTML>
  <template id=additional-vehicle>
  <fieldset>
    <legend>Vehicle</legend>
    <button class="action remove" type=button onclick="this.parentElement.remove()">Remove Vehicle</button>
    <label>Type:
      <select name=id>
      {% for v in active_vehicles %}
        <option value="{{v.id}}">{{v.name}}</option>
      {% endfor %}
      </select>
    </label>
    <label>Notes: <input type=text name=notes></label>
    <label>Pickup: <input type=datetime-local name=pickup></label>
    <label>Return: <input type=datetime-local name=return></label>
  </fieldset>
  </template>

  <form class=vehicle-form hx-put="/rest/trip/{{ trip_id }}/vehiclerequest">
  <h1>Vehicle Requests</h1>

  <div id=add-vehicle class=button-row>
    <button class="action edit" type=button onclick="addVehicle()">Add Vehicle</button>
    <button class="action approve" type=submit>Save</button>
  </div>
  </form>

  <script>
    function addVehicle () {
      const template = document.querySelector('#additional-vehicle')
      const form = document.querySelector('form.vehicle-form')
      const vehicleButton = document.querySelector('#add-vehicle')
      const leaderInput = template.content.cloneNode(true)
      form.insertBefore(leaderInput, vehicleButton)
    }
  </script>
</section>


