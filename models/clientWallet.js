const mongoose = require('mongoose');

const schema = mongoose.Schema;

const ClientWallet = new schema({
    client: {
        type: schema.Types.ObjectId,
        ref: 'client'
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
    }
}, { timestamps: true });

module.exports = mongoose.model('ClientWallet', ClientWallet);