const mongoose = require('mongoose');

const schema = mongoose.Schema;

const pullRequestsSchema = new schema({
    seller: {
        type: schema.Types.ObjectId,
        ref: 'seller'
    },
    amount:{
        type:Number,
        required:true
    },
    state:{
        type:String,
        default:'binding',
        enum:['binding','ok','cancel']
    },
    fullName:{
        type:String,
        required:true
    },
    banckAccount:{
        type:String,
        required:true
    },
    IBAN:{ 
        type:String,
        required:true
    },
    banckName:{
        type:String,
        required:true
    },
    adminNotes:String
}, { timestamps: true });

module.exports = mongoose.model('pullRequest', pullRequestsSchema);