const express = require('express');
const {body} = require('express-validator');

const authController = require('../../controllers/admin/delivery');
const isAuth = require('../../meddlewere/admin/isAuth');


const router = express.Router();


//auth
router.put('/delivery/create', [
    body('email')
        .isEmail()
        .withMessage('please enter a valid email.')
        .normalizeEmail(),
    body('password', 'enter a password with only number and text and at least 5 characters.')
        .isLength({min: 5})
        .trim(),
    body('comfirmPassword')
        .trim()
        .custom((value, {req}) => {
            if (value != req.body.password) {
                return Promise.reject('password has to match');
            }
            return true;
        }),
    body('name').not().isEmpty().trim(),
    body('mobile')
        .not().isEmpty()
        .trim().isMobilePhone(),
    body('code')
        .not().isEmpty()
        .trim(),
    body('deliveryType')
        .not().isEmpty()
        .trim(),
], isAuth, authController.putCreate);

router.put('/delivery/update', [
    body('email')
        .isEmail()
        .withMessage('please enter a valid email.')
        .normalizeEmail(),
    body('name').not().isEmpty().trim(),
    body('mobile')
        .not().isEmpty()
        .trim().isMobilePhone(),
    body('deliveryType')
        .not().isEmpty()
        .trim(),
    body('code')
        .not().isEmpty()
        .trim(),
], isAuth, authController.putUpdate);

router.get('/delivery/get', isAuth, authController.getDelivery);


router.post('/delivery/block', [
    body('deliveryId')
        .not().isEmpty()
], isAuth, authController.postBlock);



module.exports = router;
