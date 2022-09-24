const express = require('express');
const {body} = require('express-validator');

const shopController = require('../../controllers/delivery/shop');
const isAuth = require('../../meddlewere/delivery/isAuth');

const router = express.Router();

router.get('/home', isAuth, shopController.getHome);

router.get('/client/info/:offer', isAuth, shopController.getClientInfo);

router.get('/seller/info/:offer', isAuth, shopController.getSellerInfo);

router.post('/offer/delivered', isAuth, [body('orderId').not().isEmpty(),], shopController.postOrderArrived);

router.post('/offer/pickup', isAuth, [body('orderId').not().isEmpty(),], shopController.pickUpOrder);


module.exports = router;
