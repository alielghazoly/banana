const express      = require('express');
const {body}       = require('express-validator');

const shopController = require('../../controllers/seller/shop');

const isAuth         = require('../../meddlewere/seller/isAuth');


const router  = express.Router();

router.get('/home',isAuth,shopController.getHome);

router.get('/orders',isAuth,shopController.getOrders);

router.put('/offer',[
    body('orderId')
    .not().isEmpty(),
    body('price')
    .not().isEmpty()
    .isNumeric(),
    body('banana_delivery')
    .not().isEmpty()
    .isBoolean(),
    body('deliveryType')
    .not().isEmpty()
    .isNumeric().optional(),
    body('amountArray')
    .not().isEmpty()
    .isArray()
],isAuth,shopController.putOffer);


router.post('/order/delevered',[
    body('orderId')
    .not().isEmpty(),
],isAuth,shopController.postOrderArrived);

router.get('/order/single/:id',isAuth,shopController.getSingleOrder);


module.exports = router;
