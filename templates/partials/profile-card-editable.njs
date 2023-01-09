<form class="profile-card"
      action=/rest/profile
      method=post
      hx-boost=true
      hx-target=this
      hx-swap=outerHTML
>
<div class=profile-overview>
  <div class=profile-photo></div>
  <div class=profile-name>
    <input type=text name=name value="{{ name }}" required>
    <input type=text name=email value="{{ email }}" required class=email-row>
  </div>
</div>
<dl>
  <dt>Pronouns<dd><input type=text name=pronouns value="{{ pronoun }}">
  <dt>DASH<dd><input type=text name="dash_number" value="{{ dash_number }}">
  <dt>Clothing Size<dd><input type=text name="clothe_size" value="{{ clothe_size }}">
  <dt>Shoe Size<dd><input type=text name="shoe_size" value="{{ shoe_size }}">
  <dt>Height<dd><input type=text name="height" value="{{ height }}">
  <dt>Allergies/Dietary Restrictions<dd><input type=text name="allergies_dietary_restrictions" value="{{ allergies_dietary_restrictions }}">
  <dt>Medical Conditions<dd><input type=text name="medical_conditions" value="{{ medical_conditions }}">
  <dt>Driver Certifications<dd><input type=text name="driver_certifications" value="{{ driver_certifications }}">
</dl>
<div class=button-row>
  <button class="action deny" hx-get="/rest/profile">Cancel</button>
  <button class="action approve" type=submit>Save</button>
</div>
</form>
