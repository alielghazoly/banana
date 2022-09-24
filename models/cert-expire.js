const mongoose = require('mongoose');

const schema = mongoose.Schema;

const scadSchema = new schema({
    seller: {
        type: schema.Types.ObjectId,
        ref: 'client'
    },
    expiresin:{
        type:Number,
        required:true
    }
}); 

module.exports = mongoose.model('scheduleCert', scadSchema);