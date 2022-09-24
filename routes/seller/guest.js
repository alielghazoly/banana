const express      = require('express');

const guestController = require('../../controllers/seller/guest');


const router  = express.Router();

router.get('/guest/orders',guestController.getOrders);


module.exports = router;