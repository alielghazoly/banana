const express      = require('express');
const {body}       = require('express-validator');

const supportController = require('../../controllers/admin/support');
const isAuth         = require('../../meddlewere/admin/isAuth');


const router  = express.Router();

//policy
router.get('/support/policy',isAuth,supportController.getPolicy);                              

router.post('/support/policy',[
    body('EN')
    .not().isEmpty(),
    body('AR')
    .not().isEmpty(),
    body('urdu')
    .not().isEmpty()
], isAuth,supportController.postAddPolicy);

//conditions
router.get('/support/conditions', isAuth,supportController.getConditions);                              

router.post('/support/conditions',[
    body('EN')
    .not().isEmpty(),
    body('AR')
    .not().isEmpty(),
    body('urdu')
    .not().isEmpty()
], isAuth,supportController.postConditions);

//support messages
router.get('/support/supportMessages', isAuth,supportController.getSupportMessages);

//issues
router.get('/support/issues', isAuth,supportController.getIssues);

//issue approve disapprove
router.post('/support/issues/approve',[
    body('issueId')
    .not().isEmpty(),
    body('refund')
    .not().isEmpty(),
], isAuth,supportController.postIssueApprove);

router.post('/support/issues/Disapprove',[
    body('issueId')
    .not().isEmpty(),
    body('reason')
    .not().isEmpty(),
], isAuth,supportController.postIssueDisApprove);

//single issue
router.get('/support/issues/single/:id', isAuth,supportController.getSingleIssue);

//reasons
router.post('/support/issues/reasons',[
    body('EN')
    .not().isEmpty(),
    body('AR')
    .not().isEmpty(),
    body('urdu')
    .not().isEmpty()
] ,isAuth,supportController.postIssueReasons);

router.get('/support/issues/reasons' ,isAuth,supportController.getIssueReasons);

//issue search

router.get('/support/issues/search' ,isAuth,supportController.getSearch);

//issue search
 
router.post('/support/issues/delete/:id' ,isAuth,supportController.deleteIssue);



module.exports = router;