const mongoose = require('mongoose');

const schema = mongoose.Schema;

const sellerWallet = new schema({
    seller: {
        type: schema.Types.ObjectId,
        ref: 'seller'
    },
    action:{
        type:String,
        required:true,
        enum:['pay','deposit','refund']
    },
    amount:{
        type:Number,
        required:true,
    },
    method:{
        type:String,
        required:true,
        enum:['visa']
    },
    time:{
        type:String,
        required:true,
    },
    client: {
        type: schema.Types.ObjectId,
        ref: 'client'
    },
}, { timestamps: true });

module.exports = mongoose.model('sellerWallet', sellerWallet);