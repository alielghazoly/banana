const express      = require('express');
const {body}       = require('express-validator');

const supportController = require('../../controllers/seller/support');

const isAuth         = require('../../meddlewere/seller/isAuth');


const router  = express.Router();

//issues
router.get('/issues',isAuth,supportController.getIssues);

router.get('/issue/single/:id',isAuth,supportController.getSingleIssue);

router.post('/issue/accept',[
    body('issueId')
    .not().isEmpty()
],isAuth,supportController.postIssueAccept);

router.post('/issue/refuse',[
    body('issueId')
    .not().isEmpty()
],isAuth,supportController.postIssueRefuse);


//constact us
router.post('/support/contactUs',[
    body('name')
    .not().isEmpty(),
    body('email')
    .not().isEmpty(),
    body('message')
    .not().isEmpty(),
],isAuth,supportController.postContactUs);

//policy
router.get('/support/policy',supportController.getPolicy);

//conditions
router.get('/support/conditions',supportController.getConditions);

module.exports = router;