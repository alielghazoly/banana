const express      = require('express');
const {body}       = require('express-validator');

const authController = require('../../controllers/delivery/auth');

const router  = express.Router();


router.post('/login',[
    body('mobile')
    .not().isEmpty()
    .trim(),
    body('password')
    .not().isEmpty()
    .trim(),
],authController.postLogin);


module.exports = router;