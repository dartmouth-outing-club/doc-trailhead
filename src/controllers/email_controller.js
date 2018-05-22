import nodemailer from 'nodemailer';
/* import Trip from '../models/trip_model';
import User from '../models/user_model'; */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'doc.planner.18s@gmail.com',
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = (req, res) => {
  const mailOptions = {
    from: 'doc.planner.18s@gmail.com',
    to: req.body.emails,
    subject: req.body.subject,
    text: req.body.text,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.send(error);
    } else {
      console.log(`Email sent: ${info.response}`);
      res.send('success');
    }
  });
};

export const sendEmailHTML = (req, res) => {


};
