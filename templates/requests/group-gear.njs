<section class=info-card hx-target=this hx-swap=outerHTML>
  <template id=additional-group-gear>
    <div class=gear-row>
      <input type=text name=item required>
      <input type=number name=quantity min=0 value=0 required>
      <button class=close-button type=button onclick="this.parentElement.remove()">
        <img alt="Close Icon" src="/static/icons/close-icon.svg">
      </button>
    </div>
  </template>

  <form class=group-gear-form hx-put="/rest/trip/{{ trip_id }}/group-gear">
  <h1>Group Gear</h1>

  <div class=gear-row>
    <ul>
      {% for gear in group_gear %}
      <li>{{ gear.name }} ({{ gear.quantity }})
        <button class=close-button
                type=button
                hx-delete="/rest/trip/{{trip_id}}/group-gear/{{gear.id}}"
                hx-confirm="Are you sure you want to delete {{gear.name}} from the list of required gear? This will remove it from all trippee gear requests as well." >
          <img alt="Close Icon" src="/static/icons/close-icon.svg">
        </button>
      </li>
      {% endfor %}
    </ul>
  </div>

  <div id=add-group-gear class=button-row>
    <button class="action edit" type=button onclick="addGroupGear()">Add Gear</button>
    <button class="action approve" type=submit>Save</button>
  </div>
  </form>
  <script>
    function addGroupGear () {
      const template = document.querySelector('#additional-group-gear')
      const form = document.querySelector('form.group-gear-form')
      const groupGearButton = document.querySelector('#add-group-gear')
      const newRow = template.content.cloneNode(true)
      form.insertBefore(newRow, groupGearButton)
      resetFormNumbers()
    }
  </script>
</section>
