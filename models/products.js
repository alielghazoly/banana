const mongoose = require('mongoose');

const schema = mongoose.Schema;

const productSchema = new schema({
    category:{
        type:String,
        required:true, 
        enum: ['F-V', 'B', 'F-M','F'] 
    },
    name_en:{
        type:String,
        required:true,
    },
    name_ar:{
        type:String,
        required:true,
    },
    name_urdu:{
        type:String,
        required:true,
    },
    productType:{
        type:String,
        required:true,
        enum: ['1', '2', '3','4','5', '6', '7','8','9', '10', '11','12','13'] 
    },
    orders:{
        type:Number,
        default:0
    },
    imageUrl:{
        type:String,
        required:true
    }
},{timestamps:true});

module.exports = mongoose.model('product', productSchema);