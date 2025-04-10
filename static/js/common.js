document.addEventListener('DOMContentLoaded', function () {
  document.body.addEventListener('htmx:beforeSwap', function (evt) {
    const status = evt.detail.xhr.status
    if (status === 400 || status === 500) {
      // Stops the error from logging in the console
      evt.detail.isError = false

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

class CopyButton extends HTMLElement {
  static DEFAULT_CONFIRMATION_TEXT = 'Copied!'

  connectedCallback() {
    this.isClicked = false
    this.displayText = this.innerText

    this.innerHTML = ''

    this.content = this.getAttribute('content')
    this.confirmText = this.getAttribute('confirmtext') || CopyButton.DEFAULT_CONFIRMATION_TEXT

    const button = document.createElement('button')
    button.innerText = this.displayText
    button.className = this.className

    button.onclick = () => {
      this.isClicked = true
      button.innerText = this.confirmText
      button.disabled = true
      navigator.clipboard.writeText(this.content)

      setTimeout(() => {
        button.innerText = this.displayText
        button.disabled = false
      }, 1000)
    }

    this.appendChild(button)
  }
}

customElements.define('copy-button', CopyButton)
