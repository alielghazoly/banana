const {validationResult} = require('express-validator');

const Seller = require('../../models/seller');
const SellerWallet = require('../../models/sellerWallet');
const Order = require('../../models/order');
const Offer = require('../../models/offer');
const Pay = require('../../models/pay');
const ScadPay = require('../../models/seller-sccad-pay');
const BananaDelevry = require('../../models/bananaDelivery');

const schedule = require('node-schedule');

const distance = require('../../helpers/distance');

const sendNotfication = require('../../helpers/send-notfication');


exports.getHome = async (req, res, next) => {

    try {

        const seller = await Seller.findById(req.userId).select('category');

        res.status(200).json({
            state: 1,
            data: seller.category,
            message: 'seller categories'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}

exports.getOrders = async (req, res, next) => {

    const page = req.query.page || 1;
    const filter = req.query.filter || 0;    //0=>default //1=>amount //2=>created at date //3=>arrive Date
    const select = req.query.select || [0];    //0=>default //1=>near   //2=>newest 12h //3=>arriveAt = 0


    const productPerPage = 10;
    let finalOrders = [];
    let orders;
    const cat = [];
    let des = 0;
    let find = {
        category: {$in: req.sellerCat},
        status: 'started'
    };
    let banana_delivery_price = 0;
    let banana_delivery_price_motorcycle = 0;
    try {
        select.forEach(i => {
            if (i == 0) {
                find = {
                    category: {$in: req.sellerCat},
                    status: 'started'
                };
            } else if (i == 1) {
                if (req.sellerCert.location.coordinates.length == 0) {
                    const error = new Error(`you should provide certifecate`);
                    error.statusCode = 403;
                    error.state = 27;
                    throw error;
                }
                find = {
                    ...find,
                    location: {
                        $near: {
                            $maxDistance: 1000 * 5,
                            $geometry: {
                                type: "Point",
                                coordinates: req.sellerCert.location.coordinates
                            }
                        },

                    },
                };
            } else if (i == 2) {
                find = {
                    ...find,
                    createdAt: {$gt: Date.now() - 43200000}
                };
            } else if (i == 3) {
                find = {
                    ...find,
                    arriveDate: 0
                };
            }
        });

        console.log(find);


        if (filter == 0) {
            orders = await Order.find(find)
                .select('location category createdAt client products amount_count stringAdress arriveDate')
                .populate({path: 'products.product', select: 'category name name_en name_ar name_urdu'})
        } else if (filter == 2) {
            orders = await Order.find(find)
                .select('location createdAt category client products amount_count stringAdress arriveDate')
                .populate({path: 'products.product', select: 'category name name_en name_ar name_urdu'})
                .sort({createdAt: -1});
        } else if (filter == 1) {
            orders = await Order.find(find)
                .select('location category client products amount_count stringAdress arriveDate createdAt')
                .populate({path: 'products.product', select: 'category name name_en name_ar name_urdu'})
                .sort({amount_count: -1});
        } else if (filter == 3) {
            orders = await Order.find(find)
                .select('location category createdAt client products amount_count stringAdress arriveDate')
                .populate({path: 'products.product', select: 'category name name_en name_ar name_urdu'})
                .sort({arriveDate: -1});
        }


        for (let element of orders) {
            if (element.category.every(v => req.sellerCat.includes(v))) {
                const total_client_orders = await Order.find({client: element.client._id}).countDocuments();
                const ended_client_orders = await Order.find({
                    client: element.client._id,
                    status: 'ended'
                }).countDocuments();
                const sellerOffered = await Offer.findOne({seller: req.userId, order: element._id});

                if (req.sellerCert.location.coordinates.length > 0) {
                    des = await distance(req.sellerCert.location.coordinates[0], req.sellerCert.location.coordinates[1], element.location.coordinates[0], element.location.coordinates[1])
                } else {
                    des = 0;
                }

                finalOrders.push({
                    order: element,
                    client: {
                        total_client_orders: total_client_orders,
                        ended_client_orders: ended_client_orders
                    },
                    distance: des,
                    sellerOffered: Boolean(sellerOffered)
                });
            }
        }

        const bana = await BananaDelevry.findOne({}).select('price motorcyclePrice');

        if (bana) {
            banana_delivery_price = bana.price;
            banana_delivery_price_motorcycle = bana.motorcyclePrice;
        }


        res.status(200).json({
            state: 1,
            data: finalOrders.slice((page - 1) * productPerPage, productPerPage + 1),
            total: finalOrders.length,
            banana_delivery_price: banana_delivery_price,
            banana_delivery_price_motorcycle: banana_delivery_price_motorcycle,
            message: `orders in ${page} and filter ${filter}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}

exports.putOffer = async (req, res, next) => {
    const orderId = req.body.orderId;
    const price = req.body.price;
    const amount = req.body.amountArray;
    const banana_delivery = req.body.banana_delivery;
    const deliveryType = req.body.deliveryType;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        if(deliveryType != 1 && deliveryType != 2 && banana_delivery ){
            const error = new Error(`delivery type not specified`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const order = await Order.findById(orderId).populate({path: 'client', select: 'FCMJwt sendNotfication'});
        if (!order) {
            const error = new Error(`order not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        if (amount.length != order.products.length) {
            const error = new Error(`validation failed for amount ..not equal order products length`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }


        if ((!req.sellerCert.image) || (req.sellerCert.image.length == 0)) {
            const error = new Error(`you should provide certificate for order category`);
            error.statusCode = 403;
            error.state = 27;
            throw error;
        }
        if (req.sellerCert.review == false || req.sellerCert.state != 'approve') {
            const error = new Error(`one or more of the order category is under review or disapproved`);
            error.statusCode = 403;
            error.state = 28;
            throw error;
        }
        if ((req.sellerCert.expiresAt != 0 && req.sellerCert.state == 'approve' && req.sellerCert.activated == false)
            || new Date(req.sellerCert.expiresAt).getTime() < new Date().getTime()) {
            const error = new Error(`certificate expired`);
            error.statusCode = 403;
            error.state = 29;
            throw error;
        }

        if (order.status == 'endeed' || order.status == 'cancel') {
            const error = new Error(`order ended or canceled`);
            error.statusCode = 404;
            error.state = 12;
            throw error;
        }
        const ifOffer = await Offer.findOne({seller: req.userId, order: order._id});

        if (ifOffer) {
            const error = new Error(`seller can't add more than offer for the same order`);
            error.statusCode = 409;
            error.state = 23;
            throw error;
        }
        let offerProducts = [];

        amount.forEach((element, index) => {
            const f = order.products.find(i => i._id.toString() === element.cartItem.toString());
            if (!f) {
                const error = new Error(`cart item id not found for index ${index}`);
                error.statusCode = 404;
                error.state = 9;
                throw error;
            }
            let equals = true;
            if (f.amount > element.amount) {
                equals = false;
            }
            offerProducts.push({
                cartItem: element.cartItem,
                amount: element.amount,
                unit: f.unit,
                equals: equals,
                product: '',
                product: f.product._id,
                path: f.path
            });
        });
        const seller = await Seller.findById(req.userId).select('rate');
        let bananaPrice;

        const d = await BananaDelevry.findOne({});
        if (!d) {
            bananaPrice = 0;
        } else {
            if (banana_delivery) {
                if (Number(price) <= d.price) {
                    const error = new Error(`price less than banana delivery price`);
                    error.statusCode = 422;
                    error.state = 51;
                    throw error;
                }
            }

            if (deliveryType == 1){
                bananaPrice =  d.price
            }

            if(deliveryType == 2){
                bananaPrice =  d.motorcyclePrice
            }


        }

        const offer = new Offer({
            order: order._id,
            client: order.client,
            seller: req.userId,
            banana_delivery: banana_delivery,
            price: Number(price),
            offerProducts: offerProducts,
            location: req.sellerCert.location,
            sellerRate: seller.rate,
            banana_delivery_price: bananaPrice,
            deliveryType
        });

        const newOffer = await offer.save();

        if (order.client.sendNotfication.all == true && order.client.sendNotfication.newOffer == true) {
            const notification = {
                title_ar: 'عرض جديد',
                body_ar: "قم بتفحص العروض الجديدة",
                title_en: 'new offer',
                body_en: 'Check out new offers',
                title_urdu: 'نئی پیش کش',
                body_urdu: 'نئی پیش کش چیک کریں',
            };
            const data = {
                id: newOffer._id.toString(),
                key: '1',
            }; 
 
            await sendNotfication.send(data, notification, [order.client], 'client');
        }

 
        res.status(201).json({
            state: 1,
            message: 'offer created'
        });

    } catch (err) {

        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}


//order arrive

exports.postOrderArrived = async (req, res, next) => {
    const orderId = req.body.orderId;


    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const order = await Order.findById(orderId)
            .populate({path: 'client', select: 'sendNotfication FCMJwt'});
        if (!order) {
            const error = new Error(`order not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        if (order.status != 'ended') {
            const error = new Error(`order canceld or client haven't sellect yet `);
            error.statusCode = 403;
            error.state = 43;
            throw error;
        }
        const offer = await Offer.findOne({seller: req.userId, order: order._id, selected: true});

        if (!offer) {
            const error = new Error(`no offer founded for the seller`);
            error.statusCode = 403;
            error.state = 44;
            throw error;
        }
        const pay = await Pay.findOne({offer: offer._id, order: order._id, seller: req.userId})

        if (!pay) {
            const error = new Error(`payment required client didn't pay`);
            error.statusCode = 400;
            error.state = 41;
            throw error;
        }
        if (pay.deliver == true) {
            const error = new Error(`order already delivered`);
            error.statusCode = 409;
            error.state = 45;
            throw error;
        }
        if (pay.cancel == true) {
            const error = new Error(`order canceled by the user`);
            error.statusCode = 409;
            error.state = 46;
            throw error;
        }
        let trans;
        pay.deliver = true;
        pay.arriveIn = Date.now();

        if (pay.method != 'cash') {
            const seller = await Seller.findById(req.userId).select('bindingWallet');
            let finalPrice;
            let arrivePrice = 0;
            let minus;
            if (offer.banana_delivery) {
                let priceAfterSubDeliveryPrice = offer.price - offer.banana_delivery_price;
                minus = (priceAfterSubDeliveryPrice * 5) / 100;
                finalPrice = priceAfterSubDeliveryPrice - minus - 1;

                seller.bindingWallet += finalPrice;
                arrivePrice = finalPrice;
            } else {
                minus = (offer.price * 5) / 100;
                finalPrice = offer.price - minus - 1;

                seller.bindingWallet += finalPrice;
                arrivePrice = finalPrice;

            }


            // const minus = (offer.price * 5) / 100;
            // let arrivePrice = 0;

            // if (offer.banana_delivery) {
            //     seller.bindingWallet += (offer.price - (offer.banana_delivery_price + minus));
            //     arrivePrice = (offer.price - (offer.banana_delivery_price + minus));
            // } else {
            //     seller.bindingWallet += (offer.price - minus);
            //     arrivePrice = (offer.price - minus);

            // }

            await seller.save();


            const newScad = new ScadPay({
                seller: req.userId,
                fireIn: new Date().getTime() + 259200000,
                order: order._id,
                price: arrivePrice
            });

            const s = await newScad.save();

            trans = new SellerWallet({
                seller: req.userId,
                action: 'deposit',
                amount: arrivePrice,
                method: 'visa',
                time: new Date().getTime().toString(),
                client: order.client._id
            });

            await trans.save();

            schedule.scheduleJob(s._id.toString(), new Date().getTime() + 259200000, async function () {
                const seller = await Seller.findById(req.userId).select('wallet bindingWallet');
                if (seller.bindingWallet >= s.price) {
                    seller.bindingWallet = seller.bindingWallet - s.price;
                    seller.wallet += s.price;
                    await seller.save();
                    const sss = await ScadPay.findById(s._id)
                    sss.delever = true;
                    await sss.save();
                }

            });

        } else {
            const seller = await Seller.findById(req.userId).select('wallet');
            let minus;
            if (offer.banana_delivery) {
                let priceAfterSubDeliveryPrice = offer.price - offer.banana_delivery_price;
                minus = (priceAfterSubDeliveryPrice * 5) / 100;
                seller.wallet -= minus;
            } else {
                minus = (offer.price * 5) / 100;
                seller.wallet -= minus;
            }

            await seller.save();
            trans = new SellerWallet({
                seller: req.userId,
                action: 'pay',
                amount: minus,
                method: 'visa',
                time: new Date().getTime().toString(),
                client: order.client._id
            });
            await trans.save();
        }

        //saving

        await pay.save();

        if (order.client.sendNotfication.all == true) {
            const notification = {
                title_ar: 'قم بتقييم الطلب',
                body_ar: "قم بتقييم طلبك السابق",
                title_en: 'Rate your order',
                body_en: 'Rate your previous order',
                title_urdu: 'اپنے آرڈر کی درجہ بندی کریں',
                body_urdu: 'اپنے پچھلے آرڈر کی درجہ بندی کریں',
            };
            const data = {
                id: order._id.toString(),
                key: '4',
            };

            await sendNotfication.send(data, notification, [order.client], 'client');
        }

        res.status(201).json({
            state: 1,
            message: 'order arrived mony will be in wallet after 3 days'
        });

    } catch (err) {

        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}

//single order
exports.getSingleOrder = async (req, res, next) => {

    const orderId = req.params.id;

    try {

        const order = await Order.findById(orderId)
            .select('products location locationDetails')
            .populate({path: 'products.product', select: 'category name name_en name_ar name_urdu'});

        res.status(200).json({
            state: 1,
            data: order
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}
