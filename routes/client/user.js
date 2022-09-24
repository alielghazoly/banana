const express      = require('express');
const {body}       = require('express-validator');

const isAuth         = require('../../meddlewere/client/isAuth');
const userController = require('../../controllers/client/user');


const router  = express.Router();

//orders
router.get('/myOrders',isAuth,userController.getOrders); 

router.post('/order/cancel',[
    body('orderId')
    .not().isEmpty(),
],isAuth,userController.postCancelOrder);

//fev
router.get('/myFev/lists',isAuth,userController.getMyFevList);

router.get('/myFev/products/:id',isAuth,userController.getMyfevProducts);

//profile
router.post('/profile/edit/name',[
    body('name')
    .not().isEmpty()
    .trim(),
],isAuth,userController.postEditName);

router.post('/notfication/send',[
    body('all')
    .not().isEmpty()
    .isBoolean(),
    body('newOffer')
    .not().isEmpty()
    .isBoolean(),
    body('offerStatus')
    .not().isEmpty()
    .isBoolean(),
    body('update')
    .not().isEmpty()
    .isBoolean(),
],isAuth,userController.postManageSendNotfication);

router.get('/notfication/settings', isAuth, userController.getNotficationSettings);

 
router.post('/profile/edit/password',[
    body('oldPassword','enter a password with only number and text and at least 5 characters.')
    .not().isEmpty()
    .trim(),
    body('password','enter a password with only number and text and at least 5 characters.')
    .isLength({min:5})
    .trim()
    ,
    body('comfirmPassword')
    .trim()
    .custom((value,{req})=>{
        if(value!=req.body.password){
            return Promise.reject('password has to match');
        }
        return true ;
    })
],isAuth,userController.postEditPassword);

//mobile
router.post('/profile/edit/mobile',[
    body('mobile')
    .not().isEmpty()
    .trim().isMobilePhone(),
],isAuth,userController.postEditMobile);

router.post('/profile/edit/mobile/sendSMS',isAuth,userController.postSendSMS);

router.post('/profile/edit/mobile/checkCode',[
    body('code')
    .not().isEmpty()
],isAuth,userController.postCheckCode);


//my location
router.post('/profile/add/location',[
    body('lat1')
    .not().isEmpty()
    .isNumeric(),
    body('long1')
    .not().isEmpty()
    .isNumeric(),
    body('stringAdress')
    .not().isEmpty(),
    body('name')
    .not().isEmpty(),
    body('mobile')
    .not().isEmpty(),
],isAuth,userController.postAddLocation);

router.get('/profile/location',isAuth,userController.getLocations);

router.post('/profile/delete/location',[
    body('locationId')
    .not().isEmpty()
],isAuth,userController.deleteLocation);

router.get('/notfication',isAuth,userController.getNotfications);

//wallet get
router.get('/wallet',isAuth,userController.getWallet);

//single offer for selected order
router.get('/order/single/offer/:orderId',isAuth,userController.getSingleOrderOffer);

router.post('/profile/edit/lang',[
    body('lang')
    .not().isEmpty(),
    body('FCM')
    .not().isEmpty()
],isAuth,userController.postEditLang);

module.exports = router;