const mongoose = require('mongoose');

const schema = mongoose.Schema;

const reasonSchema = new schema({
    reason_ar:{
        type:String,
        required:true,
    },
    reason_en:{
        type:String,
        required:true,
    },
    reason_urdu:{
        type:String,
        required:true,
    },

},{ timestamps: true });

module.exports = mongoose.model('issueReason', reasonSchema);