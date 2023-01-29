<!DOCTYPE html>
<html lang=en>
<title>My Profile - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/static/icons/doc-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/css/common.css">
<script src="/htmx/htmx.js"></script>

<nav class=site-nav>
<ul><li><a href="#">New Profile</a></li></ul>
</nav>

<main>
<form class="profile-card" action=/rest/profile method=post>
<section>
<h1>Welcome to Trailhead!</h1>
<p>
Please fill out some info for your profile. You can go back and fill this out at any time in the
future from the "Profile" page.
</p>

<input type=hidden name=new_user value=true>
</section>
<section>
<dl>
  <dt>Name <dd><input type=text name=name value="{{ name }}" required>
  <dt>Email <dd><input type=text name=email value="{{ email }}" required>
  <dt>Pronouns<dd><input type=text name=pronouns value="{{ pronoun }}">
  <dt>DASH<dd><input type=text name="dash_number" value="{{ dash_number }}">
  <dt>Clothing Size<dd>
      <select name="clothe_size" value="{{ clothe_size }}" required>
        <option{% if clothe_size == 'Women-XS' %} selected{% endif %}>Women-XS
        <option{% if clothe_size == 'Women-S' %} selected{% endif %}>Women-S
        <option{% if clothe_size == 'Women-M' %} selected{% endif %}>Women-M
        <option{% if clothe_size == 'Women-L' %} selected{% endif %}>Women-L
        <option{% if clothe_size == 'Women-XL' %} selected{% endif %}>Women-XL
        <option{% if clothe_size == 'Men-XS' %} selected{% endif %}>Men-XS
        <option{% if clothe_size == 'Men-S' %} selected{% endif %}>Men-S
        <option{% if clothe_size == 'Men-M' %} selected{% endif %}>Men-M
        <option{% if clothe_size == 'Men-L' %} selected{% endif %}>Men-L
        <option{% if clothe_size == 'Men-XL' %} selected{% endif %}>Men-XL
      </select>
  <dt>Shoe Size<dd>
      <select name="shoe_size_sex" required>
        <option{% if shoe_size_sex == 'Men' %} selected{% endif %}>Men
        <option{% if shoe_size_sex == 'Women' %} selected{% endif %}>Women
      </select>
      <input type=number name="shoe_size_num" value="{{ shoe_size_num }}" required>
  <dt>Height<dd>
      <input type=number name="feet" value="{{ feet }}" required>ft.
      <input type=number name="inches" value="{{ inches }}" required>in.
  <dt>Allergies/Dietary Restrictions<dd><input type=text name="allergies_dietary_restrictions" value="{{ allergies_dietary_restrictions }}">
  <dt>Medical Conditions<dd><input type=text name="medical_conditions" value="{{ medical_conditions }}">
</dl>
<button class="action approve" type=submit>Save</button>
</section>
</form>
</main>

