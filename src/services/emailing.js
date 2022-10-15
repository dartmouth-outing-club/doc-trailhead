import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config({ silent: true })

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD
  }
})

const send = (email) => {
  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: 'doc.signup.no.reply@dartmouth.edu',
      to: email.address,
      subject: `${email.subject}${process.env.NODE_ENV === 'development' ? ' | DEV' : ''}`,
      bcc: ['ziray.hao@dali.dartmouth.edu'],
      text: email.message
    }
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error)
        reject(error)
      } else {
        console.log(`Email sent: ${info.response}`)
        resolve()
      }
    })
  })
}

export default { send }
