<div class="profile-card" hx-target=this hx-swap=outerHTML>
<section class="profile-overview">
  <div class=profile-photo></div>
  <div class=profile-name>
    <h1>{{ name }}</h1>
    <div class=email-row><img src="/icons/email-icon.svg">{{ email }}</div>
  </div>
</section>
<section>
  <dl>
    <dt>Pronouns<dd>{{ pronoun }}
    <dt>DASH<dd>{{ dash_number }}
    <dt>Clothing Size<dd>{{ clothe_size }}
    <dt>Shoe Size<dd>{{ shoe_size }}
    <dt>Height<dd>{{ height }}
    <dt>Allergies/Dietary Restrictions<dd>{{ allergies_dietary_restrictions }}
    <dt>Medical Conditions<dd>{{ medical_conditions }}
  </dl>
</section>
<section>
  <dl>
    <dt>Driver Certifications<dd>{{ driver_certifications }}
    <dt>Leader For<dd>{{ leader_for }}
  </dl>
  <div hx-swap=innerHTML hx-target="closest section" class=button-row>
    <button class="action edit" hx-get="/rest/profile/driver-cert">Request Driver Cert</button>
    <button class="action edit" hx-get="/rest/profile/club-leadership">Request Club Leadership</button>
  </div>
</section>
<section>
  <div class=button-row>
    <form method=post action="/logout"><button class="action deny">Logout</button></form>
    <button class="action edit" hx-get="/rest/profile/edit-profile">Edit profile</button>
  </div>
</section>
</div>
