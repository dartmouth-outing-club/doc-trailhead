import CertApproval from '../models/cert_approval_model';
import User from '../models/user_model';

export const addCertRequest = (req, res, next) => {
  if (res.locals.certReq) {
    const certificationRequest = new CertApproval();
    const user = res.locals.userAndReq[0];
    const request = res.locals.userAndReq[1];
    certificationRequest.user = user;
    certificationRequest.driver_cert = request.driver_cert;
    certificationRequest.trailer_cert = request.trailer_cert;
    certificationRequest.status = 'pending';
    certificationRequest.save()
      .catch((error) => {
        console.log(error.message);
      });
  }
};

export const getApprovals = (req, res) => {
  CertApproval.find().populate('user')
    .then((approvals) => {
      res.json(approvals);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

export const respond = (req, res) => {
  console.log('here');
  CertApproval.findById(req.body.id)
    .then((approval) => {
      User.findById(approval.user._id)
        .then((user) => {
          if (req.body.status === 'approved') {
            const previousTrailerCert = user.trailer_cert;
            const previousDriverCert = user.driver_cert;

            user.trailer_cert = approval.trailer_cert;
            user.driver_cert = approval.driver_cert;
            user.has_pending_cert_change = false;
            user.save();

            // approval entry acts as log of previous user certifications if proposed changes are approved
            approval.trailer_cert = previousTrailerCert;
            approval.driver_cert = previousDriverCert;
            approval.status = 'approved';
            approval.save().then(getApprovals(req, res));
          } else {
            user.has_pending_cert_changes = false;
            user.save();
            approval.status = 'denied';
            approval.save().then(getApprovals(req, res));
          }
        })
        .catch((error) => {
          console.log(error);
          res.status(500).send(error)
        })
    })
}
