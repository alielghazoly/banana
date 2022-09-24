const express      = require('express');
const {body}       = require('express-validator');

const shopController = require('../../controllers/admin/shop');
const isAuth         = require('../../meddlewere/admin/isAuth');


const router  = express.Router();


router.get('/products/:catigoryId',isAuth,shopController.getProducts);                            
router.post('/product',[
    body('nameEn')
    .not().isEmpty(),
    body('nameAr')
    .not().isEmpty(),
    body('name_urdu')
    .not().isEmpty(),
    body('productType')
    .not().isEmpty(),
    body('category')
    .not().isEmpty(),
],isAuth,shopController.putProduct);  

router.post('/product/edit',[
    body('productId')
    .not().isEmpty(),
    body('nameEn')
    .not().isEmpty(),
    body('nameAr')
    .not().isEmpty(),
    body('productType')
    .not().isEmpty(),
    body('category')
    .not().isEmpty(),
],isAuth,shopController.postEditProduct);

// router.post('/product/delete',[
//     body('productId')
//     .not().isEmpty(),
// ],isAuth,shopController.deleteProduct);

router.get('/product/single/:id',isAuth,shopController.getSingleProduct);

//orders
router.get('/orders',isAuth,shopController.getOrders);

router.get('/order/single/:id',isAuth,shopController.getSingleOrder);

//editing
router.get('/home',isAuth,shopController.getHome);




module.exports = router;