<section class=info-card hx-target=this hx-swap=outerHTML>
  <h1>P-Card Request</h1>
  {% if not pcard_request %}
  <div id=add-pcard-request class=button-row>
    <button class="action edit" type=button onclick="unhideForm(this)">Add P-Card Request</button>
  </div>
  {% endif %}

  <form class="pcard-form {% if not pcard_request %}hidden{% endif %}"
        hx-put="/rest/trip/{{ trip_id }}/pcard-request"
        >

  <label class=number-row>
    Expected # trippees: <input type=number name=people min=0 value={{pcard_request.num_people}}>
  </label>
  <label class=number-row>Snacks:
    <input type=number min=0 value={{pcard_request.snacks}} name=snacks>
  </label>
  <label class=number-row>Breakfast:
    <input type=number min=0 value={{pcard_request.breakfast}} name=breakfast>
  </label>
  <label class=number-row>Lunch:
    <input type=number min=0 value={{pcard_request.lunch}} name=lunch>
  </label>
  <label class=number-row>Dinner:
    <input type=number min=0 value={{pcard_request.dinner}} name=dinner>
  </label>

  <div class=button-row>
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

