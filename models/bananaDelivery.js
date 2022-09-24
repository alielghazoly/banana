const mongoose = require('mongoose');

const schema = mongoose.Schema;

const bananaDelivery = new schema({
    price: {//vehicle delivery price
        type: Number,
        required: true,
        default:0
    },
    motorcyclePrice:{//motorcycle delivery price
        type: Number,
        required: true,
        default:0
    }
});

module.exports = mongoose.model('bananaDlivry', bananaDelivery);
