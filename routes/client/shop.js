const express      = require('express');
const {body}       = require('express-validator');

const shopController = require('../../controllers/client/shop');
const isAuth         = require('../../meddlewere/client/isAuth');

const router  = express.Router();

//get products
router.get('/products/:catigoryId',isAuth,shopController.getProducts);

router.get('/search/products/:catigoryId',isAuth,shopController.getSearch);


//cart
router.post('/cart/add',[
    body('productId')
    .not().isEmpty(),
    body('unit')
    .not().isEmpty(),
    body('amount')
    .not().isEmpty()
    .isNumeric(),
],isAuth,shopController.postAddToCart);

router.post('/cart/add/food',[
    body('name')
    .not().isEmpty(),
    body('name_en')
    .not().isEmpty(),
    body('unit')
    .not().isEmpty(),
    body('amount')
    .not().isEmpty()
    .isNumeric(),
],isAuth,shopController.postAddToCartFood);

router.post('/cart/delete',[
    body('cartItemId')
    .not().isEmpty(),
],isAuth,shopController.deleteCart);

router.get('/cart',isAuth,shopController.getCart);

//fev products
router.post('/fev',[
    body('productId')
    .not().isEmpty(),
],isAuth,shopController.postAddFev);

router.post('/fev/list',[
    body('ListName')
    .not().isEmpty(),
],isAuth,shopController.postAddFevList);

router.post('/fev/delete',[
    body('productId')
    .not().isEmpty(),
],isAuth,shopController.deleteFev);

router.post('/fev/list/delete',[
    body('listId')
    .not().isEmpty(),
],isAuth,shopController.postDeleteFevList);

//order
router.post('/order',[
    body('locationId')
    .not().isEmpty(),
    body('arriveIn')
    .not().isEmpty(),
],isAuth,shopController.postAddOrder);

router.get('/order/single/:id',isAuth,shopController.getSingleOrder);

//offers
router.get('/offers',isAuth,shopController.getOffers);

router.post('/offers/cancel',[
    body('offerId')
    .not().isEmpty(),
],isAuth,shopController.postCancelOffer);

//offer pay

router.post('/offers/CreatePublicKey',[
    body('order_id').not().isEmpty(),
    body('access_code').not().isEmpty(),
],shopController.postCreatePublicKey);

router.post('/offers/onSuccessPayment' 
,shopController.onSuccessPayment);

router.get('/offers/cancelThePayment',shopController.cancelThePayment);

//cash
router.post('/offers/cashPay',[
    body('offerId')
    .not().isEmpty(),
],isAuth,shopController.cashPayment);

//wallet 
router.post('/wallet/onSuccessPaymentToWallet',shopController.postPayToWalletCreateCheckOut);


router.post('/wallet/cancelThePayment',[
],isAuth,shopController.cancelThePayment);


//pay from wallet
router.post('/offer/walletPay',[
    body('offerId')
    .not().isEmpty()
],isAuth,shopController.walletPayment);

//cancel coming order after pay
router.post('/order/comming/cancel',[
    body('orderId')
    .not().isEmpty(),
],isAuth,shopController.postCancelComingOrder);


//rate

router.post('/order/rating',[
    body('orderId')
    .not().isEmpty(),
    body('rate')
    .not().isEmpty(),
],isAuth,shopController.postRate);

module.exports = router;