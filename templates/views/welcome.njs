<!DOCTYPE html>
<html lang=en>
<title>DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/index.css">

<section id=login>
<div class=login-card>
<div><img src="/icons/tree-icon.svg" alt="Vector image of a few trees"></div>
<h2>Hello {{ name }}!</h2>
<p>Welcome to Trailhead, the Dartmouth Outing Club and Outdoor Programs Office's digital platform.
Come and find some upcoming hikes to Balch Hill or visits to the Norwich farmer's market. On
Trailhead you can browse trips, sort by date, activity, or required experience, and create and
publish your own trips as a leader. See you in the out o’ doors!
<form action="/signin-cas"><button>Enter Trailhead via SSO</button></form>
</div>
</section>

<section id=up-next>
<h1>Up Next</h1>
</section>

<script>
fetch('/public-trips')
  .then(res => res.text())
  .then(html => { document.getElementById('up-next').insertAdjacentHTML('beforeend', html) })
</script>
