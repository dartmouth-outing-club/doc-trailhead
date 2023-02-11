<section class=info-card>
  <template id=additional-vehicle>
  <fieldset>
    <legend>Vehicle</legend>
    <button class="action remove" type=button onclick="removeSelf(this)">Remove Vehicle</button>
    <label class=block>Type:
      <select name=type>
        <option>Van
        <option>Microbus
        <option>Truck
        <option>PersonalVehicle
      </select>
    </label>
    <label class=block>
      Pickup:
      <input type=datetime-local name=pickup value="{{ default_pickup_time }}"required>
    </label>
    <label class=block>
      Return:
      <input type=datetime-local name=return value="{{ default_return_time }}"required>
    </label>
    <label class=block>Need a trailer hitch?
      <input type=checkbox name=trailer_needed autocomplete=off>
    </label>
    <label class=block>Need a WMNF pass?
      <input type=checkbox name=pass_needed autocomplete=off>
    </label>
  </fieldset>
  </template>

  <form class=vehicle-form
        hx-put="/rest/trip/{{ trip_id }}/vehiclerequest"
        hx-swap=outerHTML
        hx-target="find button[type=submit]"
        >
  <h1>Vehicle Requests</h1>

  <label id=notes-label
         for=notes-input
         {% if not requested_vehicles %}class="hidden"{% endif %}
         >Notes:</label>
  <textarea type=text id=notes-inpit name=notes>{{ request_details }}</textarea>
  {# Copying this from the template above is a bit of a shame but we're on a deadline here #}
  {% for vehicle in requested_vehicles %}
  <fieldset>
    <legend>Vehicle</legend>
    <button class="action remove" type=button onclick="removeSelf(this)">Remove Vehicle</button>
    <label class=block>Type:
      <select name=type>
        <option {% if vehicle.type == 'Van' %}selected{% endif %}>Van
        <option {% if vehicle.type == 'Microbus' %}selected{% endif %}>Microbus
        <option {% if vehicle.type == 'Truck' %}selected{% endif %}>Truck
        <option {% if vehicle.type == 'PersonalVehicle' %}selected{% endif %}>PersonalVehicle
      </select>
    </label>
    <label class=block>Pickup: <input value="{{ vehicle.pickup }}" type=datetime-local name=pickup required></label>
    <label class=block>Return: <input value="{{ vehicle.return }}" type=datetime-local name=return required></label>
    <label>
      Need a trailer hitch?
      <input type=checkbox
             name=trailer_needed
             autocomplete=off
             {% if vehicle.trailer_needed %}checked{% endif %}>
    </label>
    <label>
      Need a WMNF pass?
      <input type=checkbox
             name=pass_needed
             autocomplete=off
             {% if vehicle.pass_needed %}checked{% endif %}>
    </label>
  </fieldset>
  {% endfor %}

  <div id=add-vehicle class=button-row>
    <button class="action edit" type=button onclick="addVehicle()">Add Vehicle</button>
    <button class="action approve" type=submit>Save</button>
  </div>
  </form>

  <script>
    function resetFormNumbers () {
      // Hide or unhide notes based on how many fieldsets there are
      const fieldsets = document.querySelectorAll('fieldset')
      const notes = document.querySelector('#notes-label')
      if (fieldsets.length === 0) {
        notes.classList.add('hidden')
      } else {
        notes.classList.remove('hidden')
      }

      fieldsets.forEach((fieldset, index) => {
        const vehicleNum = index + 1
        // Add a number to the fieldset
        fieldset.setAttribute('id', `fieldset-${vehicleNum}`)
        // Add that number to all of the fieldset's children that have a name attribute
        // The name attributes are the ones that will get sent as form data
        const fields = document.querySelectorAll(`#fieldset-${vehicleNum} *[name]`)
        fields.forEach(field => {
          // Remove the previous "-", if one exists
          const stub = field.name.split('-')[0]
          field.setAttribute('name', `${stub}-${vehicleNum}`)
        })
      })
    }

    function addVehicle () {
      const template = document.querySelector('#additional-vehicle')
      const form = document.querySelector('form.vehicle-form')
      const vehicleButton = document.querySelector('#add-vehicle')
      const newRow = template.content.cloneNode(true)
      form.insertBefore(newRow, vehicleButton)
      resetFormNumbers()
    }

    function removeSelf(item) {
      item.parentElement.remove()
      resetFormNumbers()
    }

    // Run once every time this bit is loaded
    resetFormNumbers()
  </script>

</section>

