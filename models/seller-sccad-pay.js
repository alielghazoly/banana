const mongoose = require('mongoose');

const schema = mongoose.Schema;

const scadPaySchema = new schema({
    seller: {
        type: schema.Types.ObjectId,
        ref: 'seller'
    },
    fireIn:{
        type:Number,
        required:true
    },
    order:{
        type: schema.Types.ObjectId,
        ref: 'order'
    },
    price:{
        type:Number,
        required:true
    },
    delever:{
        type:Boolean,
        default:false
    }
}); 

module.exports = mongoose.model('ScadPay', scadPaySchema);