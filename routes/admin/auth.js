const express      = require('express');
const {body}       = require('express-validator');

const authController = require('../../controllers/admin/auth');


const router  = express.Router();

//auth
router.post('/login',[
    body('email')
    .not().isEmpty()
    .trim(),
    body('password')
    .not().isEmpty()
  ],authController.postLogin);                                   

module.exports = router;