const mongoose = require('mongoose');

const schema   = mongoose.Schema;

const policySchema = new schema({
    EN:{
        type:String,
        required:true
    },
    AR:{
        type:String,
        required:true
    },
    urdu:{
        type:String,
        required:true
    }
},{timestamps:true});

module.exports = mongoose.model('policy',policySchema);