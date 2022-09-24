const express      = require('express');
const {body}       = require('express-validator');

const supportController = require('../../controllers/client/support');
const isAuth         = require('../../meddlewere/client/isAuth');

const router  = express.Router();

//issues
router.post('/support/issue',[
    body('orderId')
    .not().isEmpty(),
    body('reason')
    .not().isEmpty(),
    body('demands')
    .not().isEmpty(),
],isAuth,supportController.postIssue);

//single issue
router.get('/issue/single/:id',isAuth,supportController.getSingleIssue);

router.get('/support/issue/reasons',isAuth,supportController.getIssueReasons);

//contact us
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