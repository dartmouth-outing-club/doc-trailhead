<section class=info-card hx-target=this hx-swap=outerHTML>
  <template id=additional-individual-gear>
    <div class=gear-row>
      <input type=text name=item required>
      <select name=measurement>
        <option value=none>No measurement
        <option value=Shoe>Shoe
        <option value=Clothe>Clothing
        <option value=Height>Height
      </select>
      <button class=close-button type=button onclick="this.parentElement.remove()">
        <img alt="Close Icon" src="/static/icons/close-icon.svg">
      </button>
    </div>
  </template>

  <form class=individual-gear-form hx-put="/rest/trip/{{ trip_id }}/individual-gear">
  <h1>Individual Gear</h1>

  <div class=gear-row>
    <ul>
      {% for gear in individual_gear %}
      <li>{{ gear.name }}
        <button class=close-button
                type=button
                hx-delete="/rest/trip/{{trip_id}}/individual-gear/{{gear.id}}"
                hx-confirm="Are you sure you want to delete {{gear.name}} from the list of required gear? This will remove it from all trippee gear requests as well." >
          <img alt="Close Icon" src="/static/icons/close-icon.svg">
        </button>
      </li>
      {% endfor %}
    </ul>
  </div>

  <div id=add-individual-gear class=button-row>
    <button class="action edit" type=button onclick="addIndividualGear()">Add Gear</button>
    <button class="action approve" type=submit>Save</button>
  </div>
  </form>
  <script>
    function addIndividualGear () {
      const template = document.querySelector('#additional-individual-gear')
      const form = document.querySelector('form.individual-gear-form')
      const individualGearButton = document.querySelector('#add-individual-gear')
      const newRow = template.content.cloneNode(true)
      form.insertBefore(newRow, individualGearButton)
      resetFormNumbers()
    }
  </script>
</section>
