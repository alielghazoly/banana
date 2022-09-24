const { validationResult } = require("express-validator");
const schedule = require('node-schedule');
const path = require("path");

const Seller = require("../../models/seller");
const Client = require("../../models/client");
const Offer = require("../../models/offer");
const Order = require("../../models/order");
const Pay = require("../../models/pay");
const Scad = require("../../models/cert-expire");
const ClientWallet = require("../../models/clientWallet");

const sendNotfication = require('../../helpers/send-notfication');

//seller
exports.getSellers = async (req, res, next) => {

    const page = req.query.page || 1;
    const productPerPage = 10;
    const filter = req.query.filter || 0;  //0=>no filter // 1=>blocked // 2=>not blocked // 3=>verfied // 4=> not verfied
    let seller;
    let total;
    try {
        if (filter == 0) {
            seller = await Seller.find({})
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email category blocked verfication code certificate');
                .select('name mobile email category blocked verfication certificate');

            total = await Seller.find({}).countDocuments();
        } else if (filter == 1) {
            seller = await Seller.find({ blocked: true })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email category blocked verfication code certificate');
                .select('name mobile email category blocked verfication certificate');

            total = await Seller.find({ blocked: true }).countDocuments();
        } else if (filter == 2) {
            seller = await Seller.find({ blocked: false })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email category blocked verfication code certificate');
                .select('name mobile email category blocked verfication certificate');

            total = await Seller.find({ blocked: false }).countDocuments();
        } else if (filter == 3) {
            seller = await Seller.find({ verfication: true })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email category blocked verfication code certificate');
                .select('name mobile email category blocked verfication certificate');

            total = await Seller.find({ verfication: true }).countDocuments();
        } else if (filter == 4) {
            seller = await Seller.find({ verfication: false })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email category blocked verfication code certificate');
                .select('name mobile email category blocked verfication certificate');

            total = await Seller.find({ verfication: false }).countDocuments();
        }


        res.status(200).json({
            state: 1,
            data: seller,
            total: total,
            message: 'sellers'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postBlock = async (req, res, next) => {

    const sellerId = req.body.sellerId;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }

        const seller = await Seller.findById(sellerId).select('blocked');
        if (!seller) {
            const error = new Error('seller not found');
            error.statusCode = 404;
            throw error;
        }
        seller.blocked = (!seller.blocked);

        await seller.save();

        res.status(200).json({
            state: 1,
            message: 'seller blocked/unblocked'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


//get single seller
exports.getSingleSeller = async (req, res, next) => {

    const sellerId = req.params.id;
    let offerIds = [];
    try {

        const seller = await Seller.findById(sellerId)
            // .select('name mobile email code category certificate verfication blocked wallet bindingWallet rate');
            .select('name mobile email category certificate verfication blocked wallet bindingWallet rate');
        if (!seller) {
            const error = new Error('seller not found');
            error.statusCode = 404;
            throw error;
        }

        const payArrived = await Pay.find({ seller: seller._id, deliver: true })
            .select('offer method')
            .sort({ createdAt: -1 });

        payArrived.forEach(item => {
            offerIds.push(item.offer._id)
        });

        const arrivedOffers = await Offer.find({ seller: seller._id, _id: { $in: offerIds }, status: 'ended', selected: true })
            .select('order client banana_delivery price offerProducts')
            .populate({
                path: 'order',
                select: 'category products location locationDetails',
                populate: {
                    path: 'products.product',
                    select: 'category name_en name_ar productType'
                }
            });

        res.status(200).json({
            state: 1,
            seller: seller,
            arrivedOffers: arrivedOffers,
            payMethods: payArrived,
            message: 'all seller data'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


//seller certificates
exports.getCertificate = async (req, res, next) => {

    const page = req.query.page || 1;
    const productPerPage = 10;

    try {
        const seller = await Seller.find({ 'certificate.review': false })
            .skip((page - 1) * productPerPage)
            .limit(productPerPage)
            .select('name mobile email category certificate');

        const total = await Seller.find({ 'certificate.review': false }).countDocuments();

        res.status(200).json({
            state: 1,
            data: seller,
            total: total,
            message: 'Certificates need approve'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getSingleUserCertificates = async (req, res, next) => {

    const sellerId = req.params.sellerId;

    try {

        const seller = await Seller.findById(sellerId)
            .select('name mobile email category certificate');
        if (!seller) {
            const error = new Error('seller not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            state: 1,
            data: seller,
            message: 'all seller certificates'
        })


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};



exports.postApproveCertificate = async (req, res, next) => {

    const sellerId = req.body.sellerId;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }

        const seller = await Seller.findById(sellerId).select('category certificate');
        if (!seller) {
            const error = new Error('seller not found');
            error.statusCode = 404;
            throw error;
        }
        const updatedSeller = await seller.certApprove();

        schedule.scheduleJob(new Date(updatedSeller.certificate.expiresAt).getTime(), async (fireDate) => {
            await updatedSeller.certExpired();
        });

        await Scad.deleteOne({ seller: seller._id });

        const newSchedule = new Scad({
            seller: updatedSeller._id,
            expiresin: updatedSeller.certificate.expiresAt
        });
        await newSchedule.save();

        res.status(200).json({
            state: 1,
            message: `certificate approved`,
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.postDisapproveCertificate = async (req, res, next) => {

    const sellerId = req.body.sellerId;
    const adminNote = req.body.adminNote;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }

        const seller = await Seller.findById(sellerId).select('category certificate');
        if (!seller) {
            const error = new Error('seller not found');
            error.statusCode = 404;
            throw error;
        }
        const updatedSeller = await seller.certDisapprove(adminNote);


        res.status(200).json({
            state: 1,
            message: `certificate disapproved`,
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


//client
exports.getClients = async (req, res, next) => {

    const page = req.query.page || 1;
    const productPerPage = 10;
    const filter = req.query.filter || 0;  //0=>no filter // 1=>blocked // 2=>not blocked // 3=>verfied // 4=> not verfied
    let seller;
    let total;
    try { 
        if (filter == 0) {
            seller = await Client.find({})
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email blocked verfication code');
                .select('name mobile email blocked verfication');

            total = await Client.find({}).countDocuments();
        } else if (filter == 1) {
            seller = await Client.find({ blocked: true })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email blocked verfication code');
                .select('name mobile email blocked verfication');

            total = await Client.find({ blocked: true }).countDocuments();
        } else if (filter == 2) {
            seller = await Client.find({ blocked: false })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email blocked verfication code');
                .select('name mobile email blocked verfication');

            total = await Client.find({ blocked: false }).countDocuments();
        } else if (filter == 3) {
            seller = await Client.find({ verfication: true })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email blocked verfication code');
                .select('name mobile email blocked verfication');

            total = await Client.find({ verfication: true }).countDocuments();
        } else if (filter == 4) {
            seller = await Client.find({ verfication: false })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                // .select('name mobile email blocked verfication code');
                .select('name mobile email blocked verfication');

            total = await Client.find({ verfication: false }).countDocuments();
        }


        res.status(200).json({
            state: 1,
            data: seller,
            total: total,
            message: 'clients'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

// exports.getClients = async (req, res, next) => {

//     // const page = req.query.page || 1;
//     // const productPerPage = 10;
//     const filter = req.query.filter || 0;  //0=>no filter // 1=>blocked // 2=>not blocked // 3=>verfied // 4=> not verfied
//     let seller;
//     let total;
//     try { 
//         if (filter == 0) {
//             seller = await Client.find({})
//                .select('name mobile email blocked verfication');

//             total = await Client.find({}).countDocuments();
//         } else if (filter == 1) {
//             seller = await Client.find({ blocked: true })
//                  .select('name mobile email blocked verfication');

//             total = await Client.find({ blocked: true }).countDocuments();
//         } else if (filter == 2) {
//             seller = await Client.find({ blocked: false })
//                  .select('name mobile email blocked verfication');

//             total = await Client.find({ blocked: false }).countDocuments();
//         } else if (filter == 3) {
//             seller = await Client.find({ verfication: true })
//                  .select('name mobile email blocked verfication');

//             total = await Client.find({ verfication: true }).countDocuments();
//         } else if (filter == 4) {
//             seller = await Client.find({ verfication: false })
//                  .select('name mobile email blocked verfication');
//             total = await Client.find({ verfication: false }).countDocuments();
//         }


//         res.status(200).json({
//             state: 1,
//             data: seller,
//             total: total,
//             message: 'clients'
//         });
//     } catch (err) {
//         if (!err.statusCode) {
//             err.statusCode = 500;
//         }
//         next(err);
//     }
// };


exports.postBlockClients = async (req, res, next) => {

    const clientId = req.body.clientId;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }

        const client = await Client.findById(clientId).select('blocked');
        if (!client) {
            const error = new Error('client not found');
            error.statusCode = 404;
            throw error;
        }
        client.blocked = (!client.blocked);

        await client.save();

        res.status(200).json({
            state: 1,
            message: 'client blocked/unblocked'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


//get single seller
exports.getSingleClient = async (req, res, next) => {

    const clientId = req.params.id;
    try {

        const client = await Client.findById(clientId)
            // .select('name mobile email code verfication blocked wallet');
            .select('name mobile email verfication blocked wallet');
        if (!client) {
            const error = new Error('seller not found');
            error.statusCode = 404;
            throw error;
        }

        const clientWallet = await ClientWallet.find({ client: client._id });

        const commingPay = await Pay.find({ client: client._id, cancel: false, deliver: false }).select('order offer');
        let ComOrderIdS = [];
        commingPay.forEach(item => {
            ComOrderIdS.push(item.order._id);
        });

        const ComOrders = await Offer.find({ client: client._id, order: { $in: ComOrderIdS }, selected: true })
            .select('order seller banana_delivery price offerProducts location')
            .populate({
                path: 'order',
                select: 'location stringAdress arriveDate products locationDetails pay',
                populate: {
                    path: 'products.product',
                    select: 'name name_en name_ar imageUrl'
                }
            })
            .populate({
                path: 'seller',
                select: 'name'
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            state: 1,
            client: client,
            clientWalletTransActions: clientWallet,
            CommingOrders: ComOrders,
            message: 'all client data'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.sendNotfication = async (req, res, next) => {

    const path = req.body.path;
    const title_ar = req.body.title_ar;
    const title_en = req.body.title_en;
    const title_urdu = req.body.title_urdu;
    const body_ar = req.body.body_ar;
    const body_en = req.body.body_en;
    const body_urdu = req.body.body_urdu;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }
        if (path != 'client' && path != 'seller') {
            const error = new Error(`validation faild for path.. must be "client" or "seller"`);
            error.statusCode = 422;
            throw error;
        }
        const notification = {
            title_ar: title_ar,
            body_ar: body_ar,
            title_en: title_en,
            body_en: body_en,
            body_urdu:body_urdu,
            title_urdu:title_urdu
        };
        const data = {
            id: 'none',
            key: '0',
        };

        await sendNotfication.sendAll(data, notification, path);


        res.status(200).json({
            state: 1,
            message: `notfication sent to ${path}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.singleNotficationSeller = async (req, res, next) => {

    const sellerId = req.body.sellerId;
    const title_ar = req.body.title_ar;
    const title_en = req.body.title_en;
    const body_ar = req.body.body_ar;
    const body_en = req.body.body_en;

    //urdu
    const body_urdu  = req.body.body_urdu;
    const title_urdu = req.body.title_urdu;


    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }

        const seller = await Seller.findById(sellerId).select('FCMJwt sendNotfication');
        if (!seller) {
            const error = new Error('seller not found');
            error.statusCode = 404;
            throw error;
        }
        if (seller.sendNotfication.all == true) {
            const notification = {
                title_ar: title_ar,
                body_ar: body_ar,
                title_en: title_en,
                body_en: body_en,
                body_urdu:body_urdu,
                title_urdu:title_urdu
            };
            const data = {
                id: 'none',
                key: '0',
            };

            await sendNotfication.send(data, notification, [seller], 'seller');
        }



        res.status(200).json({
            state: 1,
            message: `notfication sent to ${sellerId}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.singleNotficationClient = async (req, res, next) => {

    const clientId = req.body.clientId;
    const title_ar = req.body.title_ar;
    const title_en = req.body.title_en;
    const body_ar = req.body.body_ar;
    const body_en = req.body.body_en;

    //urdu
    const body_urdu  = req.body.body_urdu;
    const title_urdu = req.body.title_urdu;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }

        const client = await Client.findById(clientId).select('FCMJwt sendNotfication');
        if (!client) {
            const error = new Error('client not found');
            error.statusCode = 404;
            throw error;
        }


        if (client.sendNotfication.all == true) {

            const notification = {
                title_ar: title_ar,
                body_ar: body_ar,
                title_en: title_en,
                body_en: body_en,
                body_urdu:body_urdu,
                title_urdu:title_urdu
            };
            const data = {
                id: 'none',
                key: '0',
            };
            await sendNotfication.send(data, notification, [client], 'client');

        }



        res.status(200).json({
            state: 1,
            message: `notfication sent to ${clientId}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

//client and seller search

exports.getSingleClient = async (req, res, next) => {

    const clientId = req.params.id;
    try {

        const client = await Client.findById(clientId)
            // .select('name mobile email code verfication blocked wallet');
            .select('name mobile email verfication blocked wallet');
        if (!client) {
            const error = new Error('seller not found');
            error.statusCode = 404;
            throw error;
        }

        const clientWallet = await ClientWallet.find({ client: client._id });

        const commingPay = await Pay.find({ client: client._id, cancel: false, deliver: false }).select('order offer');
        let ComOrderIdS = [];
        commingPay.forEach(item => {
            ComOrderIdS.push(item.order._id);
        });

        const ComOrders = await Offer.find({ client: client._id, order: { $in: ComOrderIdS }, selected: true })
            .select('order seller banana_delivery price offerProducts location')
            .populate({
                path: 'order',
                select: 'location stringAdress arriveDate products locationDetails pay',
                populate: {
                    path: 'products.product',
                    select: 'name name_en name_ar imageUrl'
                }
            })
            .populate({
                path: 'seller',
                select: 'name'
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            state: 1,
            client: client,
            clientWalletTransActions: clientWallet,
            CommingOrders: ComOrders,
            message: 'all client data'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.getSearch = async (req, res, next) => {
    const search = req.query.search;
    const type = req.query.type || "client";
    const page = req.query.page || 1;
    const itemPerPage = 10;
    let totalItems;
    let result;
    let searchQuiry;

    try {

        searchQuiry = [
            { name: new RegExp(search.trim(), 'i') },
            { mobile: new RegExp(search.trim(), 'i') },
            { email: new RegExp(search.trim(), 'i') },
            { code: new RegExp(search.trim(), 'i') },
        ];

        if (type == "client") {

            totalItems = await Client.find({
                $or: searchQuiry,
            }).countDocuments();
            result = await Client.find({
                $or: searchQuiry,
            })
                // .select('name mobile email blocked verfication code')
                .select('name mobile email blocked verfication')
                .skip((page - 1) * itemPerPage)
                .limit(itemPerPage);


        } else if (type == "seller") {

            totalItems = await Seller.find({
                $or: searchQuiry,
            }).countDocuments();
            result = await Seller.find({
                $or: searchQuiry,
            })
                // .select('name mobile email category blocked verfication code')
                .select('name mobile email category blocked verfication')
                .skip((page - 1) * itemPerPage)
                .limit(itemPerPage);
        }

        res.status(200).json({
            state: 1,
            data: result,
            total: totalItems,
            message: type,
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};