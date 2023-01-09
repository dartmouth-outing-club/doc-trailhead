<div class="profile-card" hx-target=this hx-swap=outerHTML>
<div class=profile-overview>
  <div class=profile-photo></div>
  <div class=profile-name>
    <h1>{{ name }}</h1>
    <div class=email-row><img src="/icons/email-icon.svg">{{ email }}</div>
  </div>
</div>
<dl>
  <dt>Pronouns<dd>{{ pronoun }}
  <dt>DASH<dd>{{ dash_number }}
  <dt>Clothing Size<dd>{{ clothe_size }}
  <dt>Shoe Size<dd>{{ shoe_size }}
  <dt>Height<dd>{{ height }}
  <dt>Allergies/Dietary Restrictions<dd>{{ allergies_dietary_restrictions }}
  <dt>Medical Conditions<dd>{{ medical_conditions }}
  <dt>Driver Certifications<dd>{{ driver_certifications }}
</dl>
<div class=button-row>
  <button class="action deny" hx-post="/logout">Logout</button>
  <button class="action edit" hx-get="/rest/edit-profile">Edit profile</button>
</div>
</div>
