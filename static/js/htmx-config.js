document.addEventListener('DOMContentLoaded', function () {
  document.body.addEventListener('htmx:beforeSwap', function (evt) {
    const status = evt.detail.xhr.status
    if (status === 400 || status === 500) {
      // Stops the error from logging in the console
      evt.detail.isError = false
      console.log(evt)

      // Create an error dialog box
      const errorDialog = document.createElement('div')
      errorDialog.classList.add('error-message')
      errorDialog.innerText = evt.detail.serverResponse
      errorDialog.setAttribute('onclick', 'this.remove()')

      // Get the nav and place the element after it
      const nav = document.querySelector('.site-nav')
      nav.insertAdjacentElement('afterend', errorDialog)
      errorDialog.scrollIntoView()
    }
  })
})
