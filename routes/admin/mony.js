const express = require('express');
const { body } = require('express-validator');

const monyCountroller = require('../../controllers/admin/mony');


const router = express.Router();

const isAuth = require('../../meddlewere/admin/isAuth');

//pull
router.get('/pull/requests', isAuth, monyCountroller.getPullRequests);

router.post('/pull/requests/accept', [
    body('requestId')
    .not().isEmpty(),
], isAuth, monyCountroller.postAccept);

router.post('/pull/requests/refuse', [
    body('requestId')
    .not().isEmpty(),
    body('adminNotes')
    .not().isEmpty(),
], isAuth, monyCountroller.postRefuse);


//banana delivery

router.get('/bananaDelivery', isAuth, monyCountroller.getBananaDeliveryPrice);

router.post('/bananaDelivery/update',[
    body('price')
    .not().isEmpty(),
    body('motorcyclePrice')
    .not().isEmpty(),
], isAuth, monyCountroller.postEditBananaDelivery);


router.get('/pay/report/:id', isAuth, monyCountroller.getReport);

module.exports = router;
