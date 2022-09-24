const mongoose = require('mongoose');

const schema = mongoose.Schema;

const locationSchema = new schema({
    client: {
        type: schema.Types.ObjectId,
        ref: 'client'
    },
    Location: {
        type: { type: String },
        coordinates: [Number]
    },
    name: {
        type: String,
        required: true
    },
    stringAdress: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    }
}, { timestamps: true });

locationSchema.index({ Location: "2dsphere" });

module.exports = mongoose.model('location', locationSchema);