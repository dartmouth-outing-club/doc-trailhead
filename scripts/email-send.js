import * as mailer from '../src/services/mailer.js'

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const email = {
  address: "",
  subject: "Test Email",
  message: "This is a test email from Alex Petros"
}

await mailer.sendBuiltEmail(email)
console.log('Queued email, wait for response...')

await sleep(1000000)
