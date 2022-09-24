const mongoose = require('mongoose');

const schema = mongoose.Schema;

const clientSchema = new schema({
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    image: {
        type: Number,
        default: 1
    },
    verfication: {
        type: Boolean,
        default: false
    },
    blocked: {
        type: Boolean,
        default: false
    },
    cart: [{
        product: {
            type: schema.Types.Mixed,
            refPath: 'cart.path'
        },
        amount: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            enum: ['kg', 'g', 'grain', 'Liter', 'Gallon', 'drzn', 'bag'],
            required: true
        },
        path: {
            type: String,
            default: 'product'
        }
    }],
    fevProducts: [{
        list: {
            name: {
                type: String
            },
            product: [{
                type: schema.Types.ObjectId,
                refPath: 'product'
            }],
        },
    }],
    wallet: {
        type: Number,
        default: 0
    },
    FCMJwt: [{
        token: String,
        lang: String
    }],
    lang: {
        type: String,
        default: 'en'
    },
    sendNotfication: {
        all: {
            type: Boolean,
            default: true
        },
        newOffer: {
            type: Boolean,
            default: true
        },
        offerStatus: {
            type: Boolean,
            default: true
        },
        update: {
            type: Boolean,
            default: true
        },
    },
    updated: {
        type: String,
        required: true
    },
    verficationCode: String,
    codeExpireDate: Date,
    tempMobile: String,
    tempCode:String
});

clientSchema.methods.addToCart = function (prodductId, amount, unit, ref) {
    const CreatedBerore = this.cart.findIndex(val => {
        return val.product.toString() === prodductId.toString() && unit === val.unit;
    });
    

    let newAmount = 1;
    const updatedCartItems = [...this.cart];

    if (CreatedBerore >= 0) {
        newAmount = this.cart[CreatedBerore].amount + amount;
        updatedCartItems[CreatedBerore].amount = newAmount;
    } else {
        updatedCartItems.push({
            product: prodductId,
            amount: amount,
            unit: unit,
            path: ref
        });
    }
    this.cart = updatedCartItems;
    return this.save();
}

clientSchema.methods.removeFromCart = function (cartItemId) {
    const updatedCartItems = this.cart.filter(item => {
        return item._id.toString() !== cartItemId.toString();
    });
    this.cart = updatedCartItems;
    return this.save();
};

clientSchema.methods.initFev = function () {
    if (this.fevProducts.length == 0) {
        const newList = {
            list: {
                product: []
            }
        };
        this.fevProducts.push(newList);
        return this.save();
    }
};

clientSchema.methods.addToFev = function (productId, listId = 'general') {
    if (listId == 'general') {
        this.fevProducts.forEach(item => {
            if (item.list.name == null) {
                const CreatedBerore = item.list.product.findIndex(val => {
                    return val.toString() === productId.toString();
                });
                if (CreatedBerore >= 0) {
                    const error = new Error(`already existed`);
                    error.statusCode = 409;
                    error.state = 13;
                    throw error;
                } else {
                    item.list.product.push(productId);
                }
            }
        });
    } else {
        this.fevProducts.forEach(item => {
            if (item._id == listId) {
                const CreatedBerore = item.list.product.findIndex(val => {
                    return val.toString() === productId.toString();
                });
                if (CreatedBerore >= 0) {
                    const error = new Error(`already existed`);
                    error.statusCode = 409;
                    error.state = 13;
                    throw error;
                } else {
                    item.list.product.push(productId);
                }
            }
        });
    }
    return this.save();
};

clientSchema.methods.addFevList = function (listName) {
    const updatedFev = this.fevProducts;
    updatedFev.push({
        list: {
            name: listName,
            product: []
        }
    });
    this.fevProducts = updatedFev;
    return this.save()
};

clientSchema.methods.deleteFev = function (productId, listId = 'general') {
    if (listId == 'general') {
        const index = this.fevProducts.findIndex(val => {
            return val.list.neme == null;
        });

        const updatedFevItems = this.fevProducts[index].list.product.filter(item => {
            return item.toString() !== productId.toString();
        });
        this.fevProducts[index].list.product = updatedFevItems;
        return this.save();
    } else {
        const index = this.fevProducts.findIndex(val => {
            return val._id.toString() === listId.toString();
        });
        if (index == -1) {
            const error = new Error(`list not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        const updatedFevItems = this.fevProducts[index].list.product.filter(item => {
            return item.toString() !== productId.toString();
        });
        this.fevProducts[index].list.product = updatedFevItems;
        return this.save();
    }

};

clientSchema.methods.deleteFevList = function (listId) {

    const updatedFev = this.fevProducts.filter(f => {
        if (f._id.toString() === listId.toString()) {
            if (!f.list.name) {
                const error = new Error(`not allowed to delete general list`);
                error.statusCode = 403;
                error.state = 38;
                throw error;
            }
        }
        return f._id.toString() !== listId.toString();
    });

    this.fevProducts = updatedFev;
    return this.save();

};

module.exports = mongoose.model('client', clientSchema);
