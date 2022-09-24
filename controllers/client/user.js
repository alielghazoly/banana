const bycript = require('bcryptjs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const io = require("../../socket.io/socket");
const crypto = require('crypto');

const Client = require('../../models/client');
const Order = require('../../models/order');
const Products = require('../../models/products');
const Locations = require('../../models/location');
const Notfications = require('../../models/notfications');
const Pay = require('../../models/pay');
const clientWallet = require('../../models/clientWallet');
const Offer = require('../../models/offer');
const  Mongoose  = require('mongoose');


const SMS = require('../../helpers/sms');
const order = require('../../models/order');
// for (var i=0;i<10;i++){
//     const not = new Notfications({
//         user:'5f36fd4c7f02aa0004fd247d',
//         data:{
//             id:'5',
//             key:'String',
//         },
//         notification:{
//             title_ar:'عنوان',
//             body_ar:'مش عنوان',
//             title_en:'title',
//             body_en:'not title'
//         },
//         date:new Date().getTime().toString()
//     });

//     not.save().then(i=>{
//         console.log(i);
//     })
//     .catch(err=>{
//         console.log(err);
//     })
// }


exports.getOrders = async (req, res, next) => {
    const page = req.query.page || 1;
    const productPerPage = 10;
    const filter = req.query.filter || 'started';
    let orders;
    let total;
    try { 
        if (filter == 'started' || filter == 'cancel') {
            total = await Order.find({ client: req.userId, status: filter }).countDocuments();
            orders = await Order.find({ client: req.userId, status: filter })
                .select('location stringAdress arriveDate products locationDetails createdAt pay reted price')
                .populate({ path: 'products.product', select: 'name name_en name_ar name_urdu imageUrl' })
                .sort({ createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);
        } else if (filter == 'comming') {
            const pay = await Pay.find({ client: req.userId, cancel: false, deliver: false }).select('order offer');
            let orderIdS = [];
            pay.forEach(item => {
                orderIdS.push(item.order._id);
            });
            total = await Order.find({ client: req.userId, _id: { $in: orderIdS } }).countDocuments();
            orders = await Order.find({ client: req.userId, _id: { $in: orderIdS } })
                .select('location stringAdress arriveDate isPickedUp products locationDetails createdAt pay reted price')
                .populate({ path: 'products.product', select: 'name name_en name_ar name_urdu imageUrl' })

                .sort({ createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);

        } else if (filter == 'ended') {
            const pay = await Pay.find({ client: req.userId, cancel: false, deliver: true }).select('order offer');
            let orderIdS = [];
            pay.forEach(item => {
                orderIdS.push(item.order._id);
            });
            total = await Order.find({ client: req.userId, _id: { $in: orderIdS } }).countDocuments();
            orders = await Order.find({ client: req.userId, _id: { $in: orderIdS } })
                .select('location stringAdress arriveDate products isPickedUp locationDetails createdAt pay reted price')
                .populate({ path: 'products.product', select: 'name name_en name_ar name_urdu imageUrl' })
                .sort({ createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);
        }


        res.status(200).json({
            state: 1,
            data: orders,
            total: total,
            message: `orders in page ${page} sortder by date with filter ${filter}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postCancelOrder = async (req, res, next) => {
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
        if (order.client.toString() !== req.userId.toString()) {
            const error = new Error('you are not the order owner!!');
            error.statusCode = 403;
            error.state = 11;
            throw error;
        }
        if (order.status != 'started') {
            const error = new Error('the order status != started');
            error.statusCode = 409;
            error.state = 12;
            throw error;
        }
        await order.cancelOrder();
        await Offer.updateMany({ order: order._id }, { status: 'ended' });


        res.status(200).json({
            state: 1,
            message: 'order canceled'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getMyFevList = async (req, res, next) => {
    let list = [];
    try {
        const client = await Client.findById(req.userId).select('fevProducts');
        client.fevProducts.forEach(i => {
            list.push({
                _id: i._id,
                name: i.list.name
            });
        });

        res.status(200).json({
            state: 1,
            data: list,
            message: 'client fev lists'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getMyfevProducts = async (req, res, next) => {
    const listId = req.params.id;

    try {
        const client = await Client.findById(req.userId).select('fevProducts');


        const ListProducts = client.fevProducts.filter(f => {
            return f._id.toString() === listId.toString();
        });
        if (ListProducts.length == 0) {
            const error = new Error(`list not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        const products = await Products.find({ _id: { $in: ListProducts[0].list.product } })
            .select('category name_en name_ar name_urdu productType imageUrl');
        res.status(200).json({
            state: 1,
            data: products,
            message: `products in list ${listId}`
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
    const image = req.body.imageIndex;

    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const client = await Client.findById(req.userId).select('name');

        client.name = name;
        if (image) {
            client.image = image;
        }

        const updatedClient = await client.save();

        //start socket event
        io.getIO().emit("name", {
            action: "edit",
            userId: updatedClient._id,
            newName: updatedClient.name
        });

        res.status(200).json({
            state: 1,
            data: updatedClient.name,
            message: 'client name changed'
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

        const client = await Client.findById(req.userId).select('password');
        const isEqual = await bycript.compare(oldPassword, client.password);
        if (!isEqual) {
            const error = new Error('wrong password');
            error.statusCode = 401;
            error.state = 8;
            throw error;
        }

        const isEqualNew = await bycript.compare(password, client.password);
        if (isEqualNew) {
            const error = new Error('new password must be defferent from old password');
            error.statusCode = 409;
            error.state = 15;
            throw error;
        }

        const hashedPass = await bycript.hash(password, 12);

        client.password = hashedPass;
        //logout from other devices

        if (logout) {
            client.updated = Date.now().toString();
        }

        const updatedClient = await client.save();

        if (logout) {
            token = jwt.sign(
                {
                    mobile: updatedClient.mobile,
                    userId: updatedClient._id.toString(),
                    updated: updatedClient.updated.toString()
                },
                process.env.JWT_PRIVATE_KEY_CLIENT
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

        // const client = await Client.findById(req.userId).select('mobile tempMobile tempCode');
        const client = await Client.findById(req.userId).select('mobile tempMobile');
        const checkClient = await Client.findOne({ mobile: mobile });

        if (checkClient) {
            const error = new Error(`This user is already registered with mobile`);
            error.statusCode = 409;
            error.state = 6;
            throw error;
        }
        if (mobile == client.mobile) {
            const error = new Error('new mobile must be defferent from old mobile');
            error.statusCode = 409;
            error.state = 16;
            throw error;
        }

        client.tempMobile = mobile;
        // client.tempCode = code;

        const updatedClient = await client.save();

        res.status(200).json({
            state: 1,
            // data: updatedClient.tempCode + updatedClient.tempMobile,
            data:updatedClient.tempMobile,
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
        const client = await Client.findById(req.userId);

        const buf = crypto.randomBytes(2).toString('hex');
        const hashedCode = await bycript.hash(buf, 12)
        client.verficationCode = hashedCode;
        client.codeExpireDate = Date.now() + 900000;

        const message = `your verification code is ${buf}`;

        // const {body,status} = await SMS.send(client.tempCode, message);
        const {body,status} = await SMS.send(client.tempMobile, message);

        await client.save();

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
        // const client = await Client.findById(req.userId).select('verficationCode codeExpireDate tempMobile mobile tempCode code');
        const client = await Client.findById(req.userId).select('verficationCode codeExpireDate tempMobile mobile');

        const isEqual = await bycript.compare(code, client.verficationCode);

        if (!isEqual) {
            const error = new Error('wrong code!!');
            error.statusCode = 403;
            error.state = 36;
            throw error;
        }
        if (client.codeExpireDate <= Date.now()) {
            const error = new Error('verfication code expired');
            error.statusCode = 403;
            error.state = 37;
            throw error;
        }

        client.mobile = client.tempMobile;
        // client.code   = client.tempCode;
        const updatedClient = await client.save();

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


exports.postAddLocation = async (req, res, next) => {

    const mobile = req.body.mobile;
    const name = req.body.name;
    const stringAdress = req.body.stringAdress;
    const long = req.body.long1;
    const lat = req.body.lat1;

    const errors = validationResult(req);
    try {

        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const newLoc = new Locations({
            client: req.userId,
            Location: {
                type: "Point",
                coordinates: [long, lat]
            },
            name: name,
            mobile: mobile,
            stringAdress: stringAdress
        });

        const loc = await newLoc.save();

        res.status(201).json({
            state: 1,
            data: loc,
            message: 'location added'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getLocations = async (req, res, next) => {


    try {
        const location = await Locations.find({ client: req.userId }).select('Location name mobile stringAdress');

        res.status(200).json({
            state: 1,
            data: location,
            message: 'client locations'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.deleteLocation = async (req, res, next) => {
    const locationId = req.body.locationId;

    const errors = validationResult(req);
    try {

        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const location = await Locations.findById(locationId);
        if (!location) {
            const error = new Error(`location not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        await Locations.deleteOne({ _id: location._id });

        const allLocations = await Locations.find({ client: req.userId }).select('Location name mobile stringAdress');

        res.status(200).json({
            state: 1,
            data: allLocations,
            message: 'client locations'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

//notfications
exports.getNotfications = async (req, res, next) => {
    const page = req.query.page || 1;
    const productPerPage = 10;

    try {
        const total = await Notfications.find({path:'client',user:Mongoose.Types.ObjectId(req.userId)}).countDocuments();
        const notfications = await Notfications.find({path:'client',user:Mongoose.Types.ObjectId(req.userId)})
            .select('data notification date createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * productPerPage)
            .limit(productPerPage);

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


exports.postManageSendNotfication = async (req, res, next) => {
    const all = Boolean(req.body.all) ;
    const newOffer = Boolean(req.body.newOffer) ;
    const offerStatus = Boolean(req.body.offerStatus) ;
    const update =Boolean(req.body.update) ;

    const errors = validationResult(req);
    try {

        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const client = await Client.findById(req.userId).select('sendNotfication');

        client.sendNotfication ={
            all:all,
            newOffer:newOffer,
            offerStatus:offerStatus,
            update:update
        };

        const updatedClient = await client.save();

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

        const client = await Client.findById(req.userId).select('sendNotfication');

        res.status(200).json({
            state: 1,
            data:client,
            message: `notficatiosn settings`
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
        const data = await clientWallet.find({ client: req.userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * itemPerPage)
            .limit(itemPerPage);

        const total = await clientWallet.find({ client: req.userId })
            .countDocuments();
        
        const client = await Client.findById(req.userId)
        .select('wallet');

        
        res.status(200).json({
            state:1,
            data:data,
            total:total,
            wallet:client.wallet,
            message:'client wallet transactions'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getSingleOrderOffer = async (req, res, next) => {
    
    const orderId = req.params.orderId ;

    try {
        const offer = await Offer.findOne({order:orderId,client:req.userId,status:'ended',selected:true})
        .select('location status seller banana_delivery price offerProducts')
        .populate({path:'seller',select:'name mobile code rate'});

        
        res.status(200).json({
            state:1,
            data:offer,
            message:`offer with orderId = ${orderId}  (if no offfer then the order status!=ended)`
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
        if(lang!='ar'&&lang!='en'&&lang!='urdu'){
            const error = new Error(`validation faild for lang.. must be 'ar' or 'en`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        const client = await Client.findById(req.userId).select('FCMJwt');

        let index = -1 ;
        client.FCMJwt.forEach((element,ind) => {
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

        client.FCMJwt[index].lang = lang ;

        const updatedClient = await client.save();

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


