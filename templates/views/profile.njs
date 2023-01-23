<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}

<main>
<section class="info-card" hx-get="/rest/profile" hx-swap=outerHTML hx-trigger=load>
</section>

</main>

