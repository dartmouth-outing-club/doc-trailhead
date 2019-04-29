import Approval from '../models/approval_model';
import User from '../models/user_model';

export const reviewAccessRequest = (req, res) => {
  const approvalRequest = new Approval();
  const user = res.locals.userAndReq[0];
  const request = res.locals.userAndReq[1];
  approvalRequest.user = user;
  approvalRequest.clubs = request.leader_for;
  approvalRequest.status = 'pending';
  approvalRequest.save()
    .catch((error) => {
      console.log(error.message);
    });
};

export const getApprovals = (req, res) => {
  Approval.find().populate('user').populate('clubs')
    .then((approvals) => {
      res.json(approvals);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

export const respond = (req, res) => {
  Approval.findById(req.body.id, (ApprovErr, approval) => {
    if (ApprovErr) {
      console.log(`Could not find approval: ${ApprovErr}`);
    } else {
      User.findById(approval.user._id, (UserErr, user) => {
        if (UserErr) {
          console.log(`Could not find user: ${UserErr}`);
        } else {
          if (req.body.status === 'approved') {
            user.role = 'Leader';
            user.leader_for = approval.clubs;
            user.has_pending_changes = false;
            user.save();
            approval.status = 'approved';
            approval.save().then(getApprovals(req, res));
          } else {
            user.has_pending_changes = false;
            user.save();
            approval.status = 'denied';
            approval.save().then(getApprovals(req, res));
          }
        }
      });

    }
  });
}