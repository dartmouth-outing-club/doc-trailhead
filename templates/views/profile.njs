<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/all-trips.css">
<script src="https://unpkg.com/htmx.org@1.8.4"></script>

{% include "../common/header.njs" %}

<main>
<section class="info-card" hx-get="/rest/profile" hx-swap=outerHTML hx-trigger=load>
</section>

</main>

