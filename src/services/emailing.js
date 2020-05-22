import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ silent: true });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const send = (email) => {
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: email.address,
    subject: email.subject,
    text: email.message,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
};

export default { send };
