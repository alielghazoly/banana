const express      = require('express');
const {body}       = require('express-validator');

const guestController = require('../../controllers/client/guest');


const router  = express.Router();

router.get('/products/:catigoryId',guestController.getProducts);

router.get('/search/products/:catigoryId',guestController.getSearch);

module.exports = router;