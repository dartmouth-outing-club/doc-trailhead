<section class=info-card hx-target=this hx-swap=outerHTML>
  <h1>P-Card Request</h1>
  {% if not pcard_request %}
  <div id=add-group-gear class=button-row>
    <button class="action edit" type=button onclick="unhideForm(this)">Add P-Card Request</button>
  </div>
  {% endif %}

  <form class="pcard-form {% if not pcard_request %}hidden{% endif %}"
        hx-put="/rest/trip/{{ trip_id }}/group-gear"
        >

  <label class=number-row>Expected # trippees: <input type=number min=0 value=0></label>
  <label class=number-row>Snacks: <input type=number min=0 value=0></label>
  <label class=number-row>Breakfast: <input type=number min=0 value=0></label>
  <label class=number-row>Lunch: <input type=number min=0 value=0></label>
  <label class=number-row>Dinner: <input type=number min=0 value=0></label>

  <div id=add-group-gear class=button-row>
    <button class="action deny"
            type=button
            hx-confirm="Are you sure you want to delete your trip's P-Card request?"
            hx-delete="/rest/trip/{{ trip_id }}/pcard-request"
            >Delete</button>
    <button class="action approve" type=submit>Save</button>
  </div>
  </form>

  <script>
  function unhideForm (buttonRow) {
    const form = document.querySelector('form.pcard-form')
    form.classList.remove('hidden')
    buttonRow.parentElement.remove()
  }
  </script>
</section>

