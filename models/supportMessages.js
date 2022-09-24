const mongoose = require('mongoose');

const schema = mongoose.Schema;

const supportMessagesSchema = new schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    user:{
        type: schema.Types.Mixed,
        refPath: 'user_type'
    },
    user_type:{
        type:String,
        required:true,
        enum:['client','seller']
    }
},{timestamps:true});

module.exports = mongoose.model('supportMessages', supportMessagesSchema);