const PullRequests = require("../../models/pullRequests");
const Seller = require("../../models/seller");
const SellerWallet = require("../../models/sellerWallet");
const bananaDlivry = require("../../models/bananaDelivery");

const { validationResult } = require("express-validator");

const pay = require('../../helpers/pay');

exports.getPullRequests = async (req, res, next) => {
    const page = req.query.page || 1;
    const filter = req.query.filter || 'binding';
    const productPerPage = 10;


    try {

        const requests = await PullRequests.find({ state: filter })
            // .populate({ path: 'seller', select: 'name mobile code wallet' })
            .populate({ path: 'seller', select: 'name mobile wallet' })
            .sort({ createdAt: -1 })
            .skip((page - 1) * productPerPage)
            .limit(productPerPage);
        const total = await PullRequests.find({ state: filter }).countDocuments();

        res.status(200).json({
            state: 1,
            data: requests,
            total: total,
            messatge: `requests in page ${page} and filter ${filter}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postAccept = async (req, res, next) => {

    const requestId = req.body.requestId;

    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }
        const request = await PullRequests.findById(requestId);

        if (!request) {
            const error = new Error('pull request not found');
            error.statusCode = 404;
            throw error;
        }
        if (request.state != 'binding') {
            const error = new Error('request allready aproved or canceld');
            error.statusCode = 409;
            throw error;
        }

        const seller = await Seller.findById(request.seller._id).select('wallet');



        seller.wallet = seller.wallet - request.amount;

        request.state = 'ok';

        const trans = new SellerWallet({
            seller: seller._id,
            action: 'pay',
            amount: request.amount,
            method: 'visa',
            time: new Date().getTime().toString(),
        });

        await seller.save();
        await request.save();
        await trans.save();

        res.status(200).json({
            state: 1,
            message: 'request accepted'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postRefuse = async (req, res, next) => {

    const requestId = req.body.requestId;
    const adminNotes = req.body.adminNotes;

    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }
        const request = await PullRequests.findById(requestId);

        if (!request) {
            const error = new Error('pull request not found');
            error.statusCode = 404;
            throw error;
        }

        if (request.state != 'binding') {
            const error = new Error('request allready aproved or canceld');
            error.statusCode = 409;
            throw error;
        }

        request.state = 'cancel';
        request.adminNotes = adminNotes;

        await request.save();

        res.status(200).json({
            state: 1,
            message: 'request refused'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.getBananaDeliveryPrice = async (req, res, next) => {


    try {
        const data = await bananaDlivry.findOne({}).select('price motorcyclePrice');


        res.status(200).json({
            state: 1,
            data: data,
            message: 'banana delivery'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.postEditBananaDelivery = async (req, res, next) => {

    const price = Number(req.body.price);
    const motorcyclePrice = Number(req.body.motorcyclePrice);

    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }
        const data = await bananaDlivry.findOne({}).select('price motorcyclePrice');

        if (!data) {
            const newBanana = new bananaDlivry({
                price: price,
                motorcyclePrice: motorcyclePrice
            });
            await newBanana.save();
        } else {
            data.price = price ;
            data.motorcyclePrice = motorcyclePrice ;
            await data.save();
        }


        res.status(200).json({
            state: 1,
            message: 'banana delivery updated'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.getReport = async (req, res, next) => {

    const payId = req.params.id ;

    try {
        const {body,stat} = await pay.getPaymentReport(payId);

        res.status(200).json({
            state:1,
            data:{
                body:body,
                status:stat
            },
            message:'payment repory'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
