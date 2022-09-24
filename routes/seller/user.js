const express      = require('express');
const {body}       = require('express-validator');

const userController = require('../../controllers/seller/user');

const isAuth         = require('../../meddlewere/seller/isAuth');


const router  = express.Router();

router.get('/myOrders',isAuth,userController.getMyOrders);

router.get('/single/order/details/:offer',isAuth,userController.getSingleOrderDetails);


router.post('/profile/edit/name',[
    body('name')
    .not().isEmpty(),
    body('imagePath')
    .not().isEmpty()
],isAuth,userController.postEditName);

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

//certificate     // banana
router.post('/profile/certificate',[
    body('StringAdress')
    .not().isEmpty(),
    body('expiresAt')
    .not().isEmpty(),
    body('long1')
    .not().isEmpty(),
    body('lat1')
    .not().isEmpty(),
    body('openFrom')
    .not().isEmpty(),
    body('openTo')
    .not().isEmpty(),
],isAuth,userController.postAddCertificate)

router.post('/profile/category/add',[
    body('name')
    .not().isEmpty(),
],isAuth,userController.postAddCCategory)

router.post('/profile/category/delete',[
    body('name')
    .not().isEmpty(),
],isAuth,userController.postDeleteCategory)

router.post('/profile/category/swapcategories',[
    body('name')
    .not().isEmpty(),
],isAuth,userController.postDeleteOldCategoryAndAddTheNewOne)

//notfication
router.post('/notfication/send',[
    body('all')
    .not().isEmpty()
    .isBoolean(),
    body('nearOrders')
    .not().isEmpty()
    .isBoolean(),
    body('issues')
    .not().isEmpty()
    .isBoolean(),
    body('orderStatus')
    .not().isEmpty()
    .isBoolean(),
    body('update')
    .not().isEmpty()
    .isBoolean()
],isAuth,userController.postManageSendNotfication);

router.get('/notfication/settings', isAuth, userController.getNotficationSettings);


//wallet
router.get('/wallet',isAuth,userController.getWallet);

//pull mony
router.post('/pullMony',[
    body('amount')
    .not().isEmpty()
    .isNumeric(),
    body('fullName')
    .not().isEmpty(),
    body('banckAccount')
    .not().isEmpty(),
    body('IBAN')
    .not().isEmpty(),
    body('banckName')
    .not().isEmpty(),
],isAuth,userController.postPullMony);


//notfications
router.get('/notfication',isAuth,userController.getNotfications);

router.post('/profile/edit/lang',[
    body('lang')
    .not().isEmpty(),
    body('FCM')
    .not().isEmpty()
],isAuth,userController.postEditLang);


module.exports = router;