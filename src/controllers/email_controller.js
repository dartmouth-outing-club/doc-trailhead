import nodemailer from 'nodemailer';
import Trip from '../models/trip_model';
import User from '../models/user_model';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'doc.planner.18s@gmail.com',
    pass: process.env.EMAIL_PASSWORD,
  },
});

const mailOptions = {
  from: 'youremail@gmail.com',
  to: 'myfriend@yahoo.com',
  subject: 'Sending Email using Node.js',
  text: 'That was easy!',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log(error);
  } else {
    console.log(`Email sent: ${info.response}`);
  }
});
