const Offer = require('../../models/offer');
const Pay = require('../../models/pay');
const Seller = require('../../models/seller');
const crypto = require('crypto');
const SellerWallet = require('../../models/sellerWallet');
const Notfications = require('../../models/notfications');
const PullRequest = require('../../models/pullRequests');

const bycript = require('bcryptjs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const  Mongoose  = require('mongoose');
const seller = require('../../models/seller');
const SMS = require('../../helpers/sms');



exports.getMyOrders = async (req, res, next) => {
    const page = req.query.page || 1;
    const filter = req.query.filter || 'started';  //filter = started for binging //filter = comming for must be dlever //ended for delevered //cancel for canceld 
    let orderIdS = [];
    const offerPerPage = 10;
    let total;
    let offers;

    try {

        if (filter == 'started') {

            total = await Offer.find({ seller: req.userId, status: 'started' }).countDocuments();

            offers = await Offer.find({ seller: req.userId, status: 'started' })
                .select('offerProducts isPickedUp order seller banana_delivery price createdAt')
                .populate({
                    path: 'order', select: 'locationDetails.stringAdress arriveDate'
                })
                .populate({
                    path: 'offerProducts.product', select: 'name_en name_ar name name_urdu'
                })
                .sort({createdAt : -1})
                .skip((page - 1) * offerPerPage)
                .limit(offerPerPage);
        } else if (filter == 'comming') {
            const pay = await Pay.find({ seller: req.userId, deliver: false, cancel: false });

            pay.forEach(i => {
                orderIdS.push(i.order._id);
            });


            total = await Offer.find({ seller: req.userId, selected: true, order: { $in: orderIdS } }).countDocuments();

            offers = await Offer.find({ seller: req.userId, selected: true, order: { $in: orderIdS } })
                .select('offerProducts isPickedUp order seller banana_delivery price createdAt')
                .populate({
                    path: 'order', select: 'locationDetails.stringAdress arriveDate'
                })
                .populate({
                    path: 'offerProducts.product', select: 'name_en name_ar name name_urdu'
                })
                .sort({createdAt : -1})
                .skip((page - 1) * offerPerPage)
                .limit(offerPerPage);
        } else if (filter == 'ended') {
            const pay = await Pay.find({ seller: req.userId, deliver: true, cancel: false });

            pay.forEach(i => {
                orderIdS.push(i.order._id);
            });


            total = await Offer.find({ seller: req.userId, selected: true, order: { $in: orderIdS } }).countDocuments();

            offers = await Offer.find({ seller: req.userId, selected: true, order: { $in: orderIdS } })
                .select('offerProducts order seller banana_delivery price createdAt')
                .populate({
                    path: 'order', select: 'locationDetails.stringAdress arriveDate'
                })
                .populate({
                    path: 'offerProducts.product', select: 'name_en name_ar name name_urdu'
                })
                .skip((page - 1) * offerPerPage)
                .limit(offerPerPage);
        } else if (filter == 'cancel') {
            const pay = await Pay.find({ seller: req.userId, deliver: false, cancel: true });

            pay.forEach(i => {
                orderIdS.push(i.order._id);
            });


            total = await Offer.find({ seller: req.userId, selected: true, order: { $in: orderIdS } }).countDocuments();

            offers = await Offer.find({ seller: req.userId, selected: true, order: { $in: orderIdS } })
                .select('offerProducts order seller banana_delivery price createdAt')
                .populate({
                    path: 'order', select: 'locationDetails.stringAdress arriveDate'
                })
                .populate({
                    path: 'offerProducts.product', select: 'name_en name_ar name name_urdu'
                })
                .skip((page - 1) * offerPerPage)
                .limit(offerPerPage);
        }


        res.status(200).json({
            state: 1,
            data: offers,
            total: total,
            message: `orders in page ${page} and filter ${filter}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}

exports.getSingleOrderDetails = async (req, res, next) => {
    const offerId = req.params.offer;
    try {

        let offer = await Offer.findOne({ _id: offerId, seller: req.userId })
            .select('order client')
            .populate({
                path: 'order',
                select: 'locationDetails location arriveDate'
            })
            .populate({
                path:   'client',
                // select: 'name mobile image code'
                select: 'name mobile image'
            });
        if (!offer) {
            const error = new Error(`offer not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        if (offer.selected == false) {
            const error = new Error(`client didn't select the seller's offer`);
            error.statusCode = 403;
            error.state = 21;
            throw error;
        }

        const pay = await Pay.findOne({offer:offer._id})
        .select('method'); 

        res.status(200).json({
            state: 1,
            data: {
                mobile: offer.order.locationDetails.mobile2,
                adress: offer.order.locationDetails.stringAdress,
                name: offer.client.name,
                location: offer.order.location,
                date: offer.order.arriveDate,
                payMathod:pay.method,
                // accountMobile:offer.client.code,
                accountMobile:offer.client.mobile,
                image:offer.client.image
            },
            message: 'client details for delever order'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}




exports.postEditName = async (req, res, next) => {
    const name = req.body.name;
    const imagePath = Number(req.body.imagePath);


    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const seller = await Seller.findById(req.userId).select('name image');

        seller.image = imagePath;
        seller.name = name;

        const updatedSeller = await seller.save();

        res.status(200).json({
            state: 1,
            data: {
                name: updatedSeller.name,
                image: updatedSeller.image,
            },
            message: 'seller profile changed'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postEditPassword = async (req, res, next) => {

    const oldPassword = req.body.oldPassword;
    const password = req.body.password;
    const logout = req.body.logout || false;
    let token;
    let message = 'password changed';

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const seller = await Seller.findById(req.userId).select('password');

        const isEqual = await bycript.compare(oldPassword, seller.password);
        if (!isEqual) {
            const error = new Error('wrong password');
            error.statusCode = 401;
            error.state = 8;
            throw error;
        }

        const isEqualNew = await bycript.compare(password, seller.password);

        if (isEqualNew) {
            const error = new Error('new password must be defferent from old password');
            error.statusCode = 409;
            error.state = 15;
            throw error;
        }

        const hashedPass = await bycript.hash(password, 12);

        seller.password = hashedPass;
        //logout from other devices

        if (logout) {
            seller.updated = Date.now().toString();
        }

        const updatedClient = await seller.save();

        if (logout) {
            token = jwt.sign(
                {
                    mobile: updatedClient.mobile,
                    userId: updatedClient._id.toString(),
                    updated: updatedClient.updated.toString()
                },
                process.env.JWT_PRIVATE_KEY_SELLER
            );
            message += ' and loged out from other devices';
        }

        res.status(200).json({
            state: 1,
            data: token,
            message: message
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}



exports.postAddCertificate = async (req, res, next) => {

    const expiresAt = Number(req.body.expiresAt);
    const StringAdress = req.body.StringAdress;
    const long = Number(req.body.long1);
    const lat = Number(req.body.lat1);
    const openFrom = req.body.openFrom;
    const openTo = req.body.openTo;

    const image = req.files;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        if (image.length == 0) {
            const error = new Error(`you shold insert image!!`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        let imageUrl = [];
        image.forEach(i => {
            imageUrl.push(i.path)
        })

        const seller = await Seller.findById(req.userId).select('category certificate');

        const updatedseller = await seller.addSert(imageUrl, expiresAt, long, lat, StringAdress, openFrom, openTo);

        res.status(201).json({
            state: 1,
            data: updatedseller.certificate,
            message: 'Certificate added'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


exports.postAddCCategory = async (req, res, next) => {
    const name = req.body.name;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        if (name != 'F-V' && name != 'B' && name != 'F-M' && name != 'F') {
            const error = new Error(`validation faild for category in body.. not allowed value`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const seller = await Seller.findById(req.userId).select('category');

        const updatedseller = await seller.addCategory(name);

        res.status(201).json({
            state: 1,
            data: updatedseller.category,
            message: 'category added'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postDeleteCategory = async (req, res, next) => {

    const name = req.body.name;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }


        const seller = await Seller.findById(req.userId).select('category');

        const updatedseller = await seller.deleteCategory(name);

        res.status(201).json({
            state: 1,
            data: updatedseller.category,
            message: 'category added'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postDeleteOldCategoryAndAddTheNewOne = async (req, res, next) => {
 
    const name = req.body.name;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
 
        const seller = await Seller.findById(req.userId).select('category');
        const DeleteTheOldOne = await seller.deleteOldCategory();
        const AddTheNewOne = await seller.addCategory(name);
        res.status(201).json({
            state: 1,
            data: AddTheNewOne.category,
            message: 'category swaped'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}



//notfications
exports.postManageSendNotfication = async (req, res, next) => {

    const all = Boolean(req.body.all) ;
    const nearOrders = Boolean(req.body.nearOrders) ;
    const issues = Boolean(req.body.issues) ;
    const orderStatus = Boolean(req.body.orderStatus) ;
    const update = Boolean(req.body.update) ;

    const errors = validationResult(req);
    try {

        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const seller = await Seller.findById(req.userId).select('sendNotfication');

        seller.sendNotfication ={
            all:all,
            nearOrders:nearOrders,
            issues:issues,
            orderStatus:orderStatus,
            update:update
        };

        const updatedClient = await seller.save();

        res.status(200).json({
            state: 1,
            message: `notfication action ${updatedClient.sendNotfication}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getNotficationSettings = async (req, res, next) => {

    
    try {

        const seller = await Seller.findById(req.userId)
        .select('sendNotfication');

        res.status(200).json({
            state:1,
            data:seller,
            message:'notfications sittings'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

//mobile
exports.postEditMobile = async (req, res, next) => {

    const mobile = req.body.mobile;
    // const code = req.body.code;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        // const seller = await Seller.findById(req.userId).select('mobile tempMobile tempCode');
        const seller = await Seller.findById(req.userId).select('mobile tempMobile');
        const checkClient = await Seller.findOne({ mobile: mobile });

        if (checkClient) {
            const error = new Error(`This user is already registered with mobile`);
            error.statusCode = 409;
            error.state = 6;
            throw error;
        }
        if (mobile == seller.mobile) {
            const error = new Error('new mobile must be defferent from old mobile');
            error.statusCode = 409;
            error.state = 16;
            throw error;
        }

        seller.tempMobile = mobile;
        // seller.tempCode = code;

        const updatedClient = await seller.save();

        res.status(200).json({
            state: 1,
            // data: updatedClient.tempCode,
            data: updatedClient.tempMobile,
            message: 'mobile changed'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postSendSMS = async (req, res, next) => {

    try {
        const seller = await Seller.findById(req.userId);

        const buf = crypto.randomBytes(2).toString('hex');
        const hashedCode = await bycript.hash(buf, 12)
        seller.verficationCode = hashedCode;
        seller.codeExpireDate = Date.now() + 900000;

        const message = `your verification code is ${buf}`;

        // const {body,status} = await SMS.send(seller.tempCode, message);
        const {body,status} = await SMS.send(seller.tempMobile, message);

        await seller.save();

        res.status(200).json({
            state: 1,
            data:body,
            //code: buf,
            message: 'code sent'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postCheckCode = async (req, res, next) => {
    const code = req.body.code;

    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        // const seller = await Seller.findById(req.userId).select('verficationCode codeExpireDate tempMobile mobile tempCode code');
        const seller = await Seller.findById(req.userId).select('verficationCode codeExpireDate tempMobile mobile');

        const isEqual = await bycript.compare(code, seller.verficationCode);

        if (!isEqual) {
            const error = new Error('wrong code!!');
            error.statusCode = 403;
            error.state = 36;
            throw error;
        }
        if (seller.codeExpireDate <= Date.now()) {
            const error = new Error('verfication code expired');
            error.statusCode = 403;
            error.state = 37;
            throw error;
        }

        seller.mobile = seller.tempMobile;
        // seller.code = seller.tempCode;
        const updatedClient = await seller.save();

        res.status(200).json({
            state: 1,
            // data: updatedClient.code,
            data: updatedClient.mobile,
            messaage: 'mobile changed'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


exports.getWallet = async (req, res, next) => {

    const page = req.query.page || 1;
    const itemPerPage = 10;
    try {
        const data = await SellerWallet.find({ seller: req.userId })
            .populate({ path: 'client', select: 'name' })
            .sort({ createdAt: -1 })
            .skip((page - 1) * itemPerPage)
            .limit(itemPerPage);

        const total = await SellerWallet.find({ seller: req.userId })
            .countDocuments();

        const client = await Seller.findById(req.userId)
            .select('wallet bindingWallet');


        res.status(200).json({
            state: 1,
            data: data,
            total: total,
            wallet: client,
            message: 'seller wallet transactions'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

//pullMony


exports.postPullMony = async (req, res, next) => {
    const amount = Number(req.body.amount) ;
    const fullName = req.body.fullName;
    const banckAccount = req.body.banckAccount;
    const IBAN = req.body.IBAN;
    const banckName = req.body.banckName;
 
    const errors = validationResult(req);
 
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const seller = await Seller.findById(req.userId).select('wallet');

        if (seller.wallet < amount) {
            const error = new Error(`amount is biggeer than seller wallet`);
            error.statusCode = 409;
            error.state = 48;
            throw error;
        }

        const request = new PullRequest({
            seller: seller._id,
            amount:amount,
            fullName:fullName,
            banckAccount:banckAccount,
            IBAN:IBAN,
            banckName:banckName,
        });

        await request.save();

        res.status(201).json({
            state:1,
            message:'pull request created'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

//get notfications

exports.getNotfications = async (req, res, next) => {
    const page = req.query.page || 1;
    const productPerPage = 10;

    try {
        console.log(req.userId);
        const total = await Notfications.find({path:'seller',user:Mongoose.Types.ObjectId(req.userId)}).countDocuments();
        const notfications = await Notfications.find({path:'seller',user:Mongoose.Types.ObjectId(req.userId)})
            .select('data notification date createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * productPerPage)
            .limit(productPerPage)
            .populate({path:'user'});
            console.log(total);

        res.status(200).json({
            state: 1,
            data: notfications,
            total: total,
            message: `Notification in page ${page}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postEditLang = async (req, res, next) => {
    const lang = req.body.lang;
    const FCM = req.body.FCM;

    const errors = validationResult(req);
    try {

        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        if(lang!='ar'&&lang!='en' && lang!='urdu'){
            const error = new Error(`validation faild for lang.. must be 'ar' or 'en`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const seller = await Seller.findById(req.userId).select('FCMJwt');

        let index = -1 ;
        seller.FCMJwt.forEach((element,ind) => {
            if(element.token==FCM){
                index = ind
            }
        });
        if(index == -1){
            const error = new Error(`FCM not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        seller.FCMJwt[index].lang = lang ;

        const updatedClient = await seller.save();

        res.status(200).json({
            state: 1,
            message: `language ${updatedClient.FCMJwt[index].lang}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}
