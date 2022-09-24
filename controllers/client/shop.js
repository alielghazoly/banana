const { validationResult } = require('express-validator');
var mongoose = require('mongoose');
const qs = require('querystring');
const ccav = require('../../helpers/ccavutil');
const request = require('request')
const nodeCCAvenue = require('node-ccavenue');

const Products = require('../../models/products');
const ClientProduct = require('../../models/clientProducts');
const Client = require('../../models/client');
const Order = require('../../models/order');
const Location = require('../../models/location');
const Offer = require('../../models/offer');
const Pay = require('../../models/pay');
const ClientWalet = require('../../models/clientWallet');
const Seller = require('../../models/seller');

const pay = require('../../helpers/pay');
const sendNotfication = require('../../helpers/send-notfication');
const order = require('../../models/order');
const {informDeliveryOfNewOrders} = require("../../helpers/SendNotification");


exports.getProducts = async (req, res, next) => {
    const catigory = req.params.catigoryId ;
    const page = req.query.page || 1;
    const productPerPage = 10;
    const filter = req.query.filter || false;
    const date = req.query.date || "0";
    const sold = req.query.sold || "0";
    let totalProducts;
    let products;
    let find = {};

    try {
        if (!filter) {
            find = { category: catigory }
        } else {
            find = { category: catigory, productType: { $in: filter } }
        }
        if (date == '1' && sold == '0') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .sort({ createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('category name_en name_ar name_urdu productType imageUrl');
        } else if (date == '1' && sold == '1') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .sort({ orders: -1, createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('category name_en name_ar name_urdu productType imageUrl');
        } else if (date == '0' && sold == '1') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .sort({ orders: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('category name_en name_ar name_urdu productType imageUrl');
        } else if (date == '0' && sold == '0') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('category name_en name_ar name_urdu productType imageUrl');
        }

        const client = await Client.findById(req.userId).select('cart');




        res.status(200).json({
            state: 1,
            data: products,
            total: totalProducts,
            cart: client.cart.length,
            message: `products in page ${page}, filter ${filter}, date ${date} and sold ${sold}`
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getSearch = async (req, res, next) => {

    const page = req.query.page || 1;
    const productPerPage = 10;
    const searchQ = req.query.searchQ;
    const category = req.params.catigoryId;

    try {

        const totalItems = await Products.find({
            category: category,
            $or: [
                { name_en: new RegExp(searchQ.trim(), 'i') },
                { name_ar: new RegExp(searchQ.trim(), 'i') },
                { name_urdu: new RegExp(searchQ.trim(), 'i') },
            ],
        }).countDocuments();
        const products = await Products.find({
            category: category,
            $or: [
                { name_en: new RegExp(searchQ.trim(), 'i') },
                { name_ar: new RegExp(searchQ.trim(), 'i') },
                { name_urdu: new RegExp(searchQ.trim(), 'i') },
            ],
        })
            .select('category name_en name_ar name_urdu productType imageUrl')
            .skip((page - 1) * productPerPage)
            .limit(productPerPage);

        const client = await Client.findById(req.userId).select('cart');

        res.status(200).json({
            state: 1,
            data: products,
            total: totalItems,
            cart: client.cart.length,
            message: `products with ur search (${searchQ})`
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postAddToCart = async (req, res, next) => {
    const productId = req.body.productId;
    const unit = req.body.unit;
    const amount = req.body.amount;
    const newProduct = req.body.newProduct || false;
    const errors = validationResult(req);
    let ref = 'product';
    let product;
    let productClientCart;

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        if (unit != 'kg' && unit != 'g' && unit != 'grain' && unit != 'Liter' && unit != 'Gallon' && unit != 'drzn' && unit != 'bag') {
            const error = new Error(`validation faild for unit not a key`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        } 
        if (newProduct) {
            product = await ClientProduct.findById(productId);
            ref = 'clientProducts';
        } else {
            product = await Products.findById(productId);
        }
        const client = await Client.findById(req.userId).populate('cart');
         
        if (!product) {
            const error = new Error(`product not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        if (client.cart.length == 0) {
            if (ref == 'product') {
                product.orders += 1; 
                await product.save();
            }
            const updatedUSer = await client.addToCart(productId, Number(amount), unit, ref);
    
            res.status(201).json({
                state: 1,
                cart: updatedUSer.cart.length,
                message: 'added to cart'
            });   
        } else {
            productClientCart = await Products.findById(client.cart[0].product);
            if ( productClientCart.category == product.category) {
                if (ref == 'product') {
                    product.orders += 1; 
                    await product.save();
                }
                const updatedUSer = await client.addToCart(productId, Number(amount), unit, ref);
        
                res.status(201).json({
                    state: 1,
                    cart: updatedUSer.cart.length,
                    message: 'added to cart'
                });
            } else {
                const error = new Error(`products must be the same category`);
                error.statusCode = 455;
                error.state = 54;
                throw error;
            }    
        }
       
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


exports.deleteCart = async (req, res, next) => {
    const cartItemId = req.body.cartItemId;
    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const client = await Client.findById(req.userId).select('cart')
            .populate({
                path: 'cart.product',
                select: 'category name_en name_ar name_urdu imageUrl name'
            });
        if (!client) {
            const error = new Error(`client not found`);
            error.statusCode = 404;
            error.state = 3;
            throw error;
        }
        const updatedClient = await client.removeFromCart(cartItemId);

        res.status(200).json({
            state: 1,
            data: updatedClient.cart,
            message: 'deleted form the cart'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getCart = async (req, res, next) => {


    try {
        const cart = await Client.findById(req.userId)
            .select('cart')
            .populate({
                path: 'cart.product',
                select: 'category name_en name_ar name_urdu imageUrl name'
            });
        if (!cart) {
            const error = new Error(`client not found`);
            error.statusCode = 404;
            error.state = 3;
            throw error;
        }

        const location = await Location.find({ client: req.userId }).select('Location name mobile stringAdress ');


        res.status(200).json({
            state: 1,
            data: cart.cart,
            location: location,
            message: `client's cart with location`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postAddToCartFood = async (req, res, next) => {
    const name = req.body.name;
    const name_en = req.body.name_en;
    const unit = req.body.unit;
    const amount = req.body.amount;
    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        if (unit != 'kg' && unit != 'g' && unit != 'grain' && unit != 'Liter' && unit != 'Gallon' && unit != 'drzn' && unit != 'bag') {
            const error = new Error(`validation faild for unit not a key`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const client = await Client.findById(req.userId).select('cart');

        if (!client) {
            const error = new Error(`client not found`);
            error.statusCode = 404;
            error.state = 3;
            throw error;
        }

        const newProduct = new ClientProduct({
            category: 'F',
            name: name,
            name_en:name_en,
            client: client._id
        });

        const product = await newProduct.save();

        const updatedUSer = await client.addToCart(product._id, Number(amount), unit, 'clientProducts');

        res.status(201).json({
            state: 1,
            cart: updatedUSer.cart.length,
            message: 'client product added to cart'
        })


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


exports.postAddFev = async (req, res, next) => {
    const productId = req.body.productId;
    const listId = req.body.listId;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const client = await Client.findById(req.userId);
        const product = await Products.findById(productId);
        if (!client) {
            const error = new Error(`client not found`);
            error.statusCode = 404;
            error.state = 3;
            throw error;
        }
        if (!product) {
            const error = new Error(`product not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        await client.addToFev(productId, listId);


        res.status(201).json({
            state: 1,
            message: 'added to fevourite'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postAddFevList = async (req, res, next) => {
    const ListName = req.body.ListName;
    const send = [];
    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const client = await Client.findById(req.userId);
        if (!client) {
            const error = new Error(`client not found`);
            error.statusCode = 404;
            error.state = 3;
            throw error;
        }
        const updatedUser = await client.addFevList(ListName);
        updatedUser.fevProducts.forEach(i => {
            send.push({
                _id: i._id,
                name: i.list.name
            });
        })
        res.status(201).json({
            state: 1,
            data: send,
            message: 'list Created'
        })

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


exports.deleteFev = async (req, res, next) => {
    const productId = req.body.productId;
    const listId = req.body.listId;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const client = await Client.findById(req.userId).select('fevProducts').populate('fevProducts.list.product');
        const updatedClient = await client.deleteFev(productId, listId);
        const ListProducts = updatedClient.fevProducts.filter(f => {
            return f._id.toString() === listId.toString();
        });

        const products = await Products.find({ _id: { $in: ListProducts[0].list.product } })
            .select('category name_en name_ar name_urdu productType imageUrl');

        res.status(200).json({
            state: 1,
            data: products,
            message: "deleted"
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postDeleteFevList = async (req, res, next) => {

    const listId = req.body.listId;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const client = await Client.findById(req.userId).select('fevProducts');

        const updatedClient = await client.deleteFevList(listId);

        res.status(200).json({
            state: 1,
            data: updatedClient.fevProducts,
            message: 'list deleted'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

//orders
exports.postAddOrder = async (req, res, next) => {
    const locationId = req.body.locationId;
    const arriveDate = req.body.arriveIn || 0;
    let category = [];
    let cart = [];
    let amount_count = 0;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const client = await Client.findById(req.userId).select('cart sendNotfication FCMJwt').populate('cart.product');
        if (!client) {
            const error = new Error(`client not found`);
            error.statusCode = 404;
            error.state = 3;
            throw error;
        }
        if (client.cart.length == 0) {
            const error = new Error(`validation faild cart in empty`);
            error.statusCode = 422;
            error.state = 10;
            throw error;
        }

        client.cart.forEach(i => {
            category.push(i.product.category);
            cart.push({
                product: i.product._id,
                amount: i.amount,
                unit: i.unit,
                path: i.path
            });
            amount_count += i.amount;
        });

        var uniqueCategory = category.filter((value, index, self) => {
            return self.indexOf(value) === index;
        });
        const location = await Location.findById(locationId);
        if (!location) {
            const error = new Error(`location not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        const newOrder = new Order({
            client: client._id,
            amount_count: amount_count,
            category: uniqueCategory,
            products: cart,
            location: {
                type: "Point",
                coordinates: [location.Location.coordinates[0], location.Location.coordinates[1]]
            },
            arriveDate: arriveDate,
            locationDetails: {
                name: location.name,
                stringAdress: location.stringAdress,
                mobile2: location.mobile
            }
        });
        const ord = await newOrder.save();

        //clear client cart
        client.cart = [];
        await client.save();

        if (client.sendNotfication.all == true) {
            const notification = {
                title_ar: 'تم أضافة طلبك',
                body_ar: "سوف تصلك العروض على طلبك في اسرع وقت ممكن",
                title_en: 'Your order has been added',
                body_en: 'You will receive offers on your order as soon as possible',
                title_urdu: 'آپ کا آرڈر شامل کردیا گیا ہے',
                body_urdu: 'آپ کو جلد سے جلد اپنے آرڈر پر آفرز ملیں گے'
            };
            const data = {
                id: ord._id.toString(),
                key: '3',
            };

            await sendNotfication.send(data, notification, [client], 'client');
        }

        res.status(201).json({
            state: 1,
            message: "order created"
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getSingleOrder = async (req, res, next) => {

    const orderId = req.params.id;

    try {
        const order = await Order.findById(orderId)
            .select('location locationDetails products arriveDate client')
            .populate({ path: 'products.product', select: 'name_en name_ar imageUrl name_urdu' });

        if (order.client.toString() !== req.userId) {
            const error = new Error(`not the order owner`);
            error.statusCode = 403;
            error.state = 18;
            throw error;
        }

        res.status(200).json({
            state: 1,
            data: order,
            message: `order with id = ${orderId}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

//offers
exports.getOffers = async (req, res, next) => {

    const page = req.query.page || 0;
    const filter = req.query.filter || 0;         //0=> default //1=>date //2=>price //3=>seller rating
    const maxDis = Number(req.query.maxDis) || 10; //default = 5 only used in sort with location
    const select = req.query.select || [0];         //0=>default //1=> rate > 4 //2=>all amount //3=>in 12 hours //4=>lacation in 5 km
    const offerPerPage = 10;
    let offer;
    let totalOffer;
    let find = {client: req.userId, status: 'started'};
    try {

        const location = await Location.findOne({ client: req.userId }).select('Location');
        
        select.forEach(i=>{
            if (i == 0) {
                find = { client: req.userId, status: 'started' }
            }
            else if (i == 1) {
                find = { ...find, sellerRate: { $gt: 3.9 } }
            } else if (i == 2) {
                find = { ...find, 'offerProducts.equals':  {$ne:false} }
            } else if (i == 3) {
                find = { ...find, createdAt: { $gt: Date.now() - 43200000 } }
            } else if (i == 4) {
                
                if (!location) {
                    const error = new Error(`you should provide location.. not found`);
                    error.statusCode = 404;
                    error.state = 53;
                    throw error;
                }

                find = {
                    ...find,
                    location: {
                        $near: {
                            $maxDistance: 1000 * maxDis,
                            $geometry: {
                                type: "Point",
                                coordinates: location.Location.coordinates
                            }
                        },
    
                    }
                }
        console.log("find before the quiry = " + find.location);

            }
        });



        if (filter == 1) {
            offer = await Offer.find(find)
                .select('seller banana_delivery deliveryType banana_delivery_price price createdAt offerProducts')
                .populate({ path: 'seller', select: 'rate certificate.avilable' })
                .populate({
                    path: 'offerProducts.product', select: 'name_en name_ar name_urdu name',
                })
                .sort({ createdAt: -1 })
                .skip((page - 1) * offerPerPage)
                .limit(offerPerPage);

                if( select.indexOf('4') != -1 ){
                    totalOffer = await Offer.find(find).count();
                }else{
                    totalOffer = await Offer.find(find).countDocuments();
                }
        } else if (filter == 2) {
            offer = await Offer.find(find)
                .select('seller banana_delivery price createdAt offerProducts deliveryType')
                .populate({ path: 'seller', select: 'rate certificate.avilable' })
                .populate({
                    path: 'offerProducts.product', select: 'name_en name_ar name_urdu name',
                })
                .sort({  createdAt: -1 })
                .skip((page - 1) * offerPerPage)
                .limit(offerPerPage);
                if( select.indexOf('4') != -1 ){
                    totalOffer = await Offer.find(find).count();
                }else{
                    totalOffer = await Offer.find(find).countDocuments();
                }

        } else if (filter == 0) {
            offer = await Offer.find(find)
                .select('seller banana_delivery price createdAt offerProducts deliveryType')
                .populate({ path: 'seller', select: 'rate certificate.avilable' })
                .populate({
                    path: 'offerProducts.product', select: 'name_en name_ar name_urdu name ',
                })
                .skip((page - 1) * offerPerPage)
                .limit(offerPerPage);

                if( select.indexOf('4') != -1 ){
                    totalOffer = await Offer.find(find).count();
                }else{
                    totalOffer = await Offer.find(find).countDocuments();
                }
        }                                                                                   //sort with rating
        else if (filter == 3) {
            offer = await Offer.find(find)
                .select('seller banana_delivery price createdAt offerProducts deliveryType')
                .populate({ path: 'seller', select: 'rate certificate.avilable' })
                .populate({
                    path: 'offerProducts.product', select: 'name_en name_ar name_urdu name',
                })
                .sort({ sellerRate: -1, createdAt : -1 })
                .skip((page - 1) * offerPerPage)
                .limit(offerPerPage);

                if( select.indexOf('4') != -1 ){
                    totalOffer = await Offer.find(find).count();
                }else{
                    totalOffer = await Offer.find(find).countDocuments();
                }
        }



        res.status(200).json({
            state: 1,
            data: offer,
            total: totalOffer,
            message: `offers in page ${page} and filter = ${filter}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postCancelOffer = async (req, res, next) => {

    const offerId = req.body.offerId;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const offer = await Offer.findById(offerId).select('client status ');
        if (!offer) {
            const error = new Error(`offer not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        if (offer.client.toString() !== req.userId) {
            const error = new Error(`not the order owner`);
            error.statusCode = 403;
            error.state = 18;
            throw error;
        }

        await offer.cancel();

        res.status(200).json({
            state: 1,
            message: 'offer canceled'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

//offer pay 

// exports.postCreateCheckOut = async (req, res, next) => {

//     const offerId = req.body.offerId;

//     const errors = validationResult(req);
//     try { 
//         if (!errors.isEmpty()) {
//             const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
//             error.statusCode = 422;
//             error.state = 5;
//             throw error;
//         }
//         const offer = await Offer.findById(offerId)
//             .select('order status price')
//             .populate({ path: 'order', select: 'status pay client' });
//         if (!offer) {
//             const error = new Error(`offer not found`);
//             error.statusCode = 404;
//             error.state = 9;
//             throw error;
//         }

//         if (offer.status !== 'started') {
//             const error = new Error(`offer is canceled or the offer is ended`);
//             error.statusCode = 409;
//             error.state = 19;
//             throw error;
//         }
//         if (offer.order.status !== 'started') {
//             const error = new Error(`order is canceled or the order is ended`);
//             error.statusCode = 409;
//             error.state = 19;
//             throw error;
//         }
//         if (offer.order.pay !== false) {
//             const error = new Error(`you already payed for the order`);
//             error.statusCode = 409;
//             error.state = 19;
//             throw error;
//         }

//         if (offer.order.client._id != req.userId) {
//             const error = new Error(`not the order owner`);
//             error.statusCode = 403;
//             error.state = 11;
//             throw error;
//         }

//         const { body, status } = await pay.createCheckOut(offer.price);


//         res.status(200).json({
//             state: 1,
//             status: status,
//             data: body,
//         });

//     } catch (err) {
//         if (!err.statusCode) {
//             err.statusCode = 500;
//         }
//         next(err);
//     } 
// }
exports.postCreatePublicKey = async (req, res, next) => {
   
    var data = [];
    var bodyData = '';

    data.push("access_code" + "=" + req.body.access_code);
    data.push("order_id" + "=" + req.body.order_id);
    bodyData = data.join('&'); 

    request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url: 'https://secure.ccavenue.ae/transaction/getRSAKey',
        body:    bodyData
      }, function(error, response, body){
         if (error) {
            next(error);
         }
         else {
            res.send(body)
         }
      });
       

}

// exports.postCreateCheckOut = async (req, res, next) => {

//     const order_id = req.body.order_id;
//     req.body.merchant_id =  process.env.MERCHANT_ID;
//     req.body.redirect_url = '/client/offers/onSuccessPayment';
//     req.body.cancel_url = '/client/offers/cancelThePayment';
//     req.body.language = 'EN';

//     const errors = validationResult(req);
//     console.log(order_id);
//     try { 
//         if (!errors.isEmpty()) {
//             const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
//             error.statusCode = 422;
//             error.state = 5;
//             throw error;
//         }
//         const offer = await Offer.findById(order_id)
//             .select('order status price')
//             .populate({ path: 'order', select: 'status pay client' });

//         if (!offer) {
//             const error = new Error(`offer not found`);
//             error.statusCode = 404;
//             error.state = 9;
//             throw error;
//         }

//         if (offer.status !== 'started') {
//             const error = new Error(`offer is canceled or the offer is ended`);
//             error.statusCode = 409;
//             error.state = 19;
//             throw error;
//         }
//         if (offer.order.status !== 'started') {
//             const error = new Error(`order is canceled or the order is ended`);
//             error.statusCode = 409;
//             error.state = 19;
//             throw error;
//         }
//         if (offer.order.pay !== false) {
//             const error = new Error(`you already payed for the order`);
//             error.statusCode = 409;
//             error.state = 19;
//             throw error;
//         }

//         if (offer.order.client._id != req.userId) {
//             const error = new Error(`not the order owner`);
//             error.statusCode = 403;
//             error.state = 11;
//             throw error;
//         }


//         let body = '',
//         workingKey =  process.env.WORKING_KEY,	//Put in the 32-Bit key shared by CCAvenues.
//         accessCode = process.env.ACCESS_CODE,			//Put in the Access Code shared by CCAvenues.
//         encRequest = '',
//         formbody = '',
//         reqBody = '' ;

//          console.log(process.env.WORKING_KEY,process.env.MERCHANT_ID,process.env.ACCESS_CODE);

//         for (const key in req.body) {	
//             reqBody += key+'='+req.body[key]+'&';
//         }
//         console.log(reqBody);
//         encRequest = ccav.encrypt(reqBody,workingKey); 
//         formbody = '<form id="nonseamless" method="post" name="redirect" action="https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction"/> <input type="hidden" id="encRequest" name="encRequest" value="' + encRequest + '"><input type="hidden" name="access_code" id="access_code" value="' + accessCode + '"><script language="javascript">document.redirect.submit();</script></form>';
       
//         res.writeHeader(200, {"Content-Type": "text/html"});
//         res.write(formbody);
//         res.end();

//     } catch (err) {
//         if (!err.statusCode) {
//             err.statusCode = 500;
//         }
//         next(err);
//     } 
// }
  //ERR
exports.onSuccessPayment = async  (req, res, next) => {
    let workingKey = process.env.WORKING_KEY
    const encResp = req.body.encResp;
    let  ccavResponse = ccav.decrypt(encResp,workingKey);
    let objData = JSON.parse(ccavResponse) 
    let  pData
    let htmlcode

    if (objData.order_status == 'Success') {
        try {    
            const offerId = objData.order_id 
            const offer = await Offer.findById(offerId)
            .populate({ path: 'seller', select: 'FCMJwt sendNotfication' })
    
            if (!offer) {
                const error = new Error(`offer not found`);
                error.statusCode = 404;
                error.state = 9;
                throw error;
            }
            offer.selected = true;
            const order = await Order.findById(offer.order);
            if (!order) {
                const error = new Error(`order not found`);
                error.statusCode = 404;
                error.state = 9;
                throw error;
            }
    

            await Offer.updateMany({ order: order._id }, { status: 'ended' });
            order.pay = true;
            const p = new Pay({
                offer: offer._id,
                order: order._id,
                client: offer.client,
                seller: offer.seller,
                payId: objData.tracking_id,
            });
    
    
            //saving
            await order.endOrder();
            await offer.save();
            await p.save();
    
    
            if (offer.seller.sendNotfication.all == true && offer.seller.sendNotfication.orderStatus == true) {
                const notification = {
                    title_ar: 'تم الموافقة',
                    body_ar: "وافق العميل على طلبك",
                    title_en: 'Been approved',
                    body_en: 'The customer accepted your offer',
                    title_urdu: 'منظور کر لیا گیا',
                    body_urdu: 'گاہک نے آپ کی پیش کش قبول کرلی'
    
                };
                const data = {
                    id: offer._id.toString(),
                    key: '1',
                };
    
                await sendNotfication.send(data, notification, [offer.seller], 'seller');

                pData = '<table border=1 cellspacing=2 cellpadding=2><tr><td>'	
                pData = pData + ccavResponse.replace(/=/gi,'</td><td>')
                pData = pData.replace(/&/gi,'</td></tr><tr><td>')
                pData = pData + '</td></tr></table>'
                htmlcode = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>finished</title></head><body><center><font size="4" color="blue"><b>Response Page</b></font><br>'+ pData +'</center><br></body></html>';
                res.writeHeader(200, {"Content-Type": "text/html"});
                res.write(htmlcode);
                res.end();
            }    
            } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
             next(err);
            }
        } else {
            pData = '<table border=1 cellspacing=2 cellpadding=2><tr><td>'	
            pData = pData + ccavResponse.replace(/=/gi,'</td><td>')
            pData = pData.replace(/&/gi,'</td></tr><tr><td>')
            pData = pData + '</td></tr></table>'
            htmlcode = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>finished</title></head><body><center><font size="4" color="blue"><b>Response Page</b></font><br>'+ pData +'</center><br></body></html>';
            res.writeHeader(200, {"Content-Type": "text/html"});
            res.write(htmlcode);
            res.end();
        }
               
            

}

exports.cashPayment = async (req, res, next) => {

    const offerId = req.body.offerId;
    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }


        const offer = await Offer.findById(offerId)
            .populate({ path: 'seller', select: 'FCMJwt sendNotfication deliveryType' })
            .select('order status price seller')
            .populate({ path: 'order', select: 'status pay client' });

        if (!offer) {
            const error = new Error(`offer not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        if (offer.status !== 'started') {
            const error = new Error(`offer is canceled or the offer is ended`);
            error.statusCode = 409;
            error.state = 19;
            throw error;
        }
        if (offer.order.status !== 'started') {
            const error = new Error(`order is canceled or the order is ended`);
            error.statusCode = 409;
            error.state = 19;
            throw error;
        }
        if (offer.order.pay !== false) {
            const error = new Error(`you already payed for the order`);
            error.statusCode = 409;
            error.state = 19;
            throw error;
        }

        if (offer.order.client._id != req.userId) {
            const error = new Error(`not the order owner`);
            error.statusCode = 403;
            error.state = 11;
            throw error;
        }
        offer.selected = true;
        const order = await Order.findById(offer.order);
        if (!order) {
            const error = new Error(`order not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        await Offer.updateMany({ order: order._id }, { status: 'ended' });
        order.price = offer.price
        order.pay = true;
        const p = new Pay({
            offer: offer._id,
            order: order._id,
            client: req.userId,
            seller: offer.seller._id,
            payId: 'cash',
            method: 'cash'
        });


        //saving
        await order.endOrder();
        await offer.save();
        await p.save();



        if (offer.seller.sendNotfication.all == true && offer.seller.sendNotfication.orderStatus == true) {
            const notification = {
                title_ar: 'تم الموافقة',
                body_ar: "وافق العميل على طلبك",
                title_en: 'Been approved',
                body_en: 'The customer accepted your offer',
                title_urdu: 'منظور کر لیا گیا',
                body_urdu: 'گاہک نے آپ کی پیش کش قبول کرلی'
            };
            const data = {
                id: offer._id.toString(),
                key: '1',
            };

            await sendNotfication.send(data, notification, [offer.seller], 'seller');
            await informDeliveryOfNewOrders(offer.deliveryType, order)

        }

        res.status(200).json({
            state: 1,
            message: 'cash Payment created'
        });

    } catch (err) {
        console.log(err);
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

//wallet 
exports.postPayToWalletCreateCheckOut =  (req, res, next) => {

        let workingKey = process.env.WORKING_KEY
        const encResp = req.body.encResp;
        let  ccavResponse = ccav.decrypt(encResp,workingKey);
        let objData = JSON.parse(ccavResponse) 
        let  pData
        let htmlcode
        let clientData

        if (objData.order_status == 'Success') {
            Client.findById(objData.order_id).select('wallet').then(client => {
                let price = Number(objData.amount) - (Number(objData.amount)*0.01)
                client.wallet += price;
                const walletTransaction = new ClientWalet({
                    client: objData.order_id,
                    action: 'deposit',
                    amount: price,
                    method: 'visa',
                    time: new Date().getTime().toString()
                });
                clientData = client
                return walletTransaction.save();
                }).then(() => {
                    return clientData.save();
                }).then(()=>{   
                    pData = '<table border=1 cellspacing=2 cellpadding=2><tr><td>'	
                    pData = pData + ccavResponse.replace(/=/gi,'</td><td>')
                    pData = pData.replace(/&/gi,'</td></tr><tr><td>')
                    pData = pData + '</td></tr></table>'
                    htmlcode = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>finished</title></head><body><center><font size="4" color="blue"><b>Response Page</b></font><br>'+ pData +'</center><br></body></html>';
                    res.writeHeader(200, {"Content-Type": "text/html"});
                    res.write(htmlcode);
                    res.end();
                }).catch(err => {
                    if (!err.statusCode) {
                        err.statusCode = 500;
                    }
                    next(err);
                })
            
        } else {
            pData = '<table border=1 cellspacing=2 cellpadding=2><tr><td>'	
            pData = pData + ccavResponse.replace(/=/gi,'</td><td>')
            pData = pData.replace(/&/gi,'</td></tr><tr><td>')
            pData = pData + '</td></tr></table>'
            htmlcode = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>finished</title></head><body><center><font size="4" color="blue"><b>Response Page</b></font><br>'+ pData +'</center><br></body></html>';
            res.writeHeader(200, {"Content-Type": "text/html"});
            res.write(htmlcode);
            res.end();
        }
    
      
            
        }

//pay from wallet

exports.walletPayment = async (req, res, next) => {

    const offerId = req.body.offerId;
    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const offer = await Offer.findById(offerId)
            .populate({ path: 'seller', select: 'FCMJwt sendNotfication' })
            .select('order status price seller deliveryType')
            .populate({ path: 'order', select: 'status pay client' });

        if (!offer) {
            const error = new Error(`offer not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        if (offer.status !== 'started') {
            const error = new Error(`offer is canceled or the offer is ended`);
            error.statusCode = 409;
            error.state = 19;
            throw error;
        }
        if (offer.order.status !== 'started') {
            const error = new Error(`order is canceled or the order is ended`);
            error.statusCode = 409;
            error.state = 19;
            throw error;
        }
        if (offer.order.pay !== false) {
            const error = new Error(`you already payed for the order`);
            error.statusCode = 409;
            error.state = 19;
            throw error;
        }

        if (offer.order.client._id != req.userId) {
            const error = new Error(`not the order owner`);
            error.statusCode = 403;
            error.state = 11;
            throw error;
        }
        offer.selected = true;
        const order = await Order.findById(offer.order);
        if (!order) {
            const error = new Error(`order not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        order.price = offer.price;

        const client = await Client.findById(req.userId).select('wallet');

        if (client.wallet < offer.price) {
            const error = new Error(`no enough mony in client wallet`);
            error.statusCode = 400;
            error.state = 39;
            throw error;
        }
        client.wallet = client.wallet - offer.price;

        await Offer.updateMany({ order: order._id }, { status: 'ended' });
        order.pay = true;
        const p = new Pay({
            offer: offer._id,
            order: order._id,
            client: req.userId,
            seller: offer.seller._id,
            payId: 'wallet',
            method: 'wallet'
        });


        const walletTransaction = new ClientWalet({
            client: req.userId,
            action: 'pay',
            amount: offer.price,
            method: 'visa',
            time: new Date().getTime().toString()
        });
 
        await walletTransaction.save();

        //saving
        await order.endOrder();
        await offer.save();
        await p.save();
        await client.save();

        if (offer.seller.sendNotfication.all == true && offer.seller.sendNotfication.orderStatus == true) {
            const notification = {
                title_ar: 'تم الموافقة',
                body_ar: "وافق العميل على طلبك",
                title_en: 'Been approved',
                body_en: 'The customer accepted your offer',
                title_urdu: 'منظور کر لیا گیا',
                body_urdu: 'گاہک نے آپ کی پیش کش قبول کرلی'
            };
            const data = {
                id: offer._id.toString(),
                key: '1',
            };

            await sendNotfication.send(data, notification, [offer.seller], 'seller');

            await informDeliveryOfNewOrders(offer.deliveryType, order)
        }

        res.status(200).json({
            state: 1,
            message: 'wallet Payment created'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.cancelThePayment =  (req, res, next) => {
    res.send({
        error:'offer canceled'
    });
}
//cancel coming order

exports.postCancelComingOrder = async (req, res, next) => {

    const orderId = req.body.orderId;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const order = await Order.findById(orderId);

        if (!order) {
            const error = new Error(`order not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        if (order.status !== 'ended') {
            const error = new Error(`order not ended (no offer sellected or allready canceld )`);
            error.statusCode = 409;
            error.state = 40;
            throw error;
        }
        if (order.pay === false) {
            const error = new Error(`payment required you didn't pay for the order`);
            error.statusCode = 400;
            error.state = 41;
            throw error;
        }

        if (order.client._id != req.userId) {
            const error = new Error(`not the order owner`);
            error.statusCode = 403;
            error.state = 11;
            throw error;
        }


        const offer = await Offer.findOne({ order: order._id, client: req.userId, selected: true });
        if (!offer) {
            const error = new Error(`offer not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        if (offer.status !== 'ended') {
            const error = new Error(`offer not ended `);
            error.statusCode = 409;
            error.state = 40;
            throw error;
        }

        const pay = await Pay.findOne({ offer: offer._id, order: order._id, client: req.userId });

        if (!pay) {
            const error = new Error(`payment required you didn't pay for the order..no payment information`);
            error.statusCode = 400;
            error.state = 41;
            throw error;
        }

        if (pay.deliver == true) {
            const error = new Error(`can't cancel order after deliver!!!`);
            error.statusCode = 409;
            error.state = 42;
            throw error;
        }

        if (pay.method != 'cash') {
            const client = await Client.findById(req.userId).select('wallet');

            if (new Date(pay.createdAt).getTime() + 600000 < Date.now()) {

                const minus = (offer.price * 5) / 100;

                client.wallet += (offer.price - minus);
                pay.refund = true;
                pay.refund_amount = (offer.price - minus);


                const walletTransaction = new ClientWalet({
                    client: client._id,
                    action: 'refund',
                    amount: (offer.price - minus),
                    method: 'visa',
                    time: new Date().getTime().toString()
                });
                await walletTransaction.save();

                await client.save();
            } else {

                client.wallet += offer.price;
                pay.refund = true;
                pay.refund_amount = offer.price;

                const walletTransaction = new ClientWalet({
                    client: client._id,
                    action: 'refund',
                    amount: offer.price,
                    method: 'visa',
                    time: new Date().getTime().toString()
                });
                await walletTransaction.save();

                await client.save();
            }
        }

        pay.cancel = true;



        await pay.save();
        await Offer.updateMany({ order: order._id }, { status: 'ended' });
        await order.cancelOrder();


        res.status(200).json({
            state: 1,
            message: 'order cancled and refund sent'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

//rate 

exports.postRate = async (req, res, next) => {

    const orderId = req.body.orderId;
    const rate = Number(req.body.rate);

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const order = await Order.findById(orderId);

        if (!order) {
            const error = new Error(`order not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        if (order.status !== 'ended') {
            const error = new Error(`order not ended (no offer sellected or allready canceld )`);
            error.statusCode = 409;
            error.state = 40;
            throw error;
        }
        if (order.pay === false) {
            const error = new Error(`payment required you didn't pay for the order`);
            error.statusCode = 400;
            error.state = 41;
            throw error;
        }

        if (order.client._id != req.userId) {
            const error = new Error(`not the order owner`);
            error.statusCode = 403;
            error.state = 11;
            throw error;
        }


        const offer = await Offer.findOne({ order: order._id, client: req.userId, selected: true });
        if (!offer) {
            const error = new Error(`offer not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        if (offer.status !== 'ended') {
            const error = new Error(`offer not ended `);
            error.statusCode = 409;
            error.state = 40;
            throw error;
        }

        const pay = await Pay.findOne({ offer: offer._id, order: order._id, client: req.userId, });

        if (!pay) {
            const error = new Error(`payment required you didn't pay for the order..no payment information`);
            error.statusCode = 400;
            error.state = 41;
            throw error;
        }

        if (pay.deliver == false) {
            const error = new Error(`order didn't delever`);
            error.statusCode = 409;
            error.state = 47;
            throw error;
        }

        order.reted = true;

        const seller = await Seller.findById(offer.seller._id).select('totalRate userRatre rate');

        seller.totalRate += rate;
        seller.userRatre += 1;
        seller.rate = seller.totalRate / seller.userRatre;


        await order.save();
        await seller.save();

        res.status(201).json({
            state: 1,
            message: 'rete added'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}
