const express      = require('express');
const {body}       = require('express-validator');

const userController = require('../../controllers/admin/user');
const isAuth         = require('../../meddlewere/admin/isAuth');


const router  = express.Router();

//seller
router.get('/sellers',isAuth,userController.getSellers);

router.post('/seller/block/unblock',[
    body('sellerId')
    .not().isEmpty(),
],isAuth,userController.postBlock);

router.get('/seller/single/:id',isAuth,userController.getSingleSeller);


//seller Certificates
router.get('/seller/Certificates',isAuth,userController.getCertificate);

router.get('/seller/single/Certificates/:sellerId',isAuth,userController.getSingleUserCertificates);

router.post('/seller/Certificates/approve',[
    body('sellerId')
    .not().isEmpty(),
],isAuth,userController.postApproveCertificate);

router.post('/seller/Certificates/disapprove',[ 
    body('adminNote')
    .not().isEmpty(),
],isAuth,userController.postDisapproveCertificate);




//client
router.get('/clients',isAuth,userController.getClients);

router.post('/client/block/unblock',[
    body('clientId')
    .not().isEmpty(),
],isAuth,userController.postBlockClients);

router.get('/client/single/:id',isAuth,userController.getSingleClient);


router.post('/notfications/sendAll',[
    body('path')
    .not().isEmpty(),
    body('title_ar')
    .not().isEmpty(),
    body('title_en')
    .not().isEmpty(),
    body('body_ar')
    .not().isEmpty(),
    body('body_en')
    .not().isEmpty(),
    body('body_urdu')
    .not().isEmpty(),
    body('title_urdu')
    .not().isEmpty()

],isAuth,userController.sendNotfication);

router.post('/notfications/send/seller',[
    body('sellerId')
    .not().isEmpty(),
    body('title_ar')
    .not().isEmpty(),
    body('title_en')
    .not().isEmpty(),
    body('body_ar')
    .not().isEmpty(),
    body('body_en')
    .not().isEmpty(),
    body('body_urdu')
    .not().isEmpty(),
    body('title_urdu')
    .not().isEmpty()

],isAuth,userController.singleNotficationSeller);

router.post('/notfications/send/client',[
    body('clientId')
    .not().isEmpty(),
    body('title_ar')
    .not().isEmpty(),
    body('title_en')
    .not().isEmpty(),
    body('body_ar')
    .not().isEmpty(),
    body('body_en')
    .not().isEmpty(),
    body('body_urdu')
    .not().isEmpty(),
    body('title_urdu')
    .not().isEmpty()
],isAuth,userController.singleNotficationClient);

//search
router.get('/user/search',isAuth,userController.getSearch);


module.exports = router;