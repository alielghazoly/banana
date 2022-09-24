const mongoose = require('mongoose');

const schema = mongoose.Schema;

const issueSchema = new schema({
    client: {
        type: schema.Types.ObjectId,
        ref: 'client'
    },
    order:{
        type: schema.Types.ObjectId,
        ref: 'order'
    },
    seller:{
        type: schema.Types.ObjectId,
        ref: 'seller'
    }, 
    offer:{
        type: schema.Types.ObjectId,
        ref: 'offer'
    },
    reason:{
        type: schema.Types.ObjectId,
        ref: 'issueReason'
    },
    demands:{
        type: String,
        required:true
    },
    imageUrl:[{
        type:String,
    }],
    state:{
        type:String,
        default:'binding',
        enum:['binding','ok','cancel']
    },
    adminState:{
        type:String,
        default:'binding',
        enum:['binding','ok','cancel']
    },
    adminNotes:String
},{ timestamps: true });

module.exports = mongoose.model('issue', issueSchema);