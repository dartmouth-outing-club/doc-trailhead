document.body.addEventListener('htmx:beforeSwap', function (event) {
  const status = event.detail.xhr.status
  if (status === 400 || status === 500) {
    console.log(event)
  }
})
