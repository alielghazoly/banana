const mongoose = require('mongoose');

const schema = mongoose.Schema;

const paySchema = new schema({
    arriveIn: {
        type: Number,
        default: 0
    },
    offer: {
        type: schema.Types.ObjectId,
        ref: 'offer'
    },
    order: {
        type: schema.Types.ObjectId,
        ref: 'order'
    },
    client: {
        type: schema.Types.ObjectId,
        ref: 'client'
    },
    seller: {
        type: schema.Types.ObjectId,
        ref: 'seller'
    },
    payId:{
        type:String,
        required:true
    },
    deliver :{
        type:Boolean,
        default: false
    },
    pickedBy: {
        type: schema.Types.ObjectId,
        ref: 'delivery'
    },
    method:{
        type:String,
        default:'visa',
        enum:['visa','cash','wallet']
    },
    cancel:{
        type:Boolean,
        default:false
    },
    refund:{
        type:Boolean,
        default:false
    },
    refund_amount:Number
}, { timestamps: true });

module.exports = mongoose.model('pay', paySchema);
