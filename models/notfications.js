const mongoose = require('mongoose');

const schema = mongoose.Schema;

const notficationSchema = new schema({
    path:{
        type:String,
        required:true,
        enum:['client','seller']
    },
    user: {
        type: schema.Types.Mixed,
        refPath: 'path'
    },
    data: {
        id: String,
        key: String,
    },
    notification: {
        title_ar: String,
        body_ar: String,
        title_en: String,
        body_en: String,
        body_urdu: String,
        title_urdu: String,
    },
    date: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('notfication', notficationSchema);