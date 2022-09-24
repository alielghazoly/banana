const mongoose = require('mongoose');

const schema = mongoose.Schema;

const clientProductsSchema = new schema({
    category:{
        type:String,
        required:true,
        enum: ['F']
    },
    name:{
        type:String,
        required:true,
    },
    name_en:{
        type:String,
        required:true,
    },
    // name_urdu:{
    //     type:String,
    //     required:true,
    // },
    client:{
        type: schema.Types.ObjectId,
        ref: 'client'
    }
},{timestamps:true});

module.exports = mongoose.model('clientProducts', clientProductsSchema);