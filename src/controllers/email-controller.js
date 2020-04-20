import nodemailer from 'nodemailer';
import Trip from '../models/trip-model';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'doc.planner.18s@gmail.com',
    pass: process.env.EMAIL_PASSWORD,
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
        from: 'doc.planner.18s@gmail.com',
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

export default sendEmailToTrip;
