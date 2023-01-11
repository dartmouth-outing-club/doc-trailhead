{% include "admin-header.njs" %}
<main hx-target=this>
{% if leader %}
  {% include "trip/leader-trip-card.njs" %}
{% else %}
  {% include "trip/signup-trip-card.njs" %}
{% endif %}
</main>
