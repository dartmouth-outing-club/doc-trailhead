import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import Trip from '../models/trip-model';

dotenv.config({ silent: true });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'no.reply.dartmouth.outing.club@gmail.com',
    pass: 'DALI20SDOC',
  },
});

const sendEmailToTrip = (req, res) => {
  Trip.findById(req.body.id).populate('leaders').populate('members')
    .then((trip) => {
      if (!trip) {
        res.status(422).send('Trip doesn\'t exist');
      } else {
        const emails = [];
        trip.members.forEach((member, index) => {
          emails.push(member.email);
        });
        trip.leaders.forEach((leader, index) => {
          emails.push(leader.email);
        });
        return emails;
      }
    })
    .then((emails) => {
      const mailOptions = {
        from: 'no.reply.dartmouth.outing.club@gmail.com',
        to: emails,
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
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
};

const sendEmail = (email, subject, message) => {
  console.log(email);
  const mailOptions = {
    from: 'no.reply.dartmouth.outing.club@gmail.com',
    to: email,
    subject,
    text: message,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
};

export { sendEmailToTrip, sendEmail };
