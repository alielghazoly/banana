const mongoose = require('mongoose');

const schema = mongoose.Schema;

const deliverySchema = new schema({
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    image: {
        type: Number,
        default: 1
    },
    blocked: {
        type: Boolean,
        default: false
    },
    verfication: {
        type: Boolean,
        default: false
    },
    deliveryType: {
        type: Number,
        required: true,
        default:1,
        enum: [
            1,  //vehicle delivery
            2   //motorcycle delivery
        ]
    },
});

module.exports = mongoose.model('delivery', deliverySchema);
