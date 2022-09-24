const bycript = require('bcryptjs');
const { validationResult } = require('express-validator');

const Delivery = require('../../models/delivery');

exports.putCreate = async (req, res, next) => {
    const errors = validationResult(req);

    const name = req.body.name;
    const password = req.body.password;
    const mobile = req.body.mobile;
    const email = req.body.email;
    // const code = req.body.code;
    const deliveryType = req.body.deliveryType;
 
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const checkClient = await Delivery.findOne({ mobile: mobile });

        if (checkClient) {
            const error = new Error(`This user is already registered with mobile`);
            error.statusCode = 409;
            error.state = 6;
            throw error;
        }
        const checkClientEmail = await Delivery.findOne({ email: email });

        if (checkClientEmail) {
            const error = new Error(`This user is already registered with email`);
            error.statusCode = 409;
            error.state = 26;
            throw error;
        }
        const hashedPass = await bycript.hash(password, 12);
        const newClient = new Delivery({
            name: name,
            mobile: mobile,
            email: email,
            // code: code,
            password: hashedPass,
            deliveryType: deliveryType,
        });

        const delivery = await newClient.save();

        res.status(201).json({
            state: 1,
            message: 'delivery created',
            data: {
                deliveryName: delivery.name,
                deliveryMobile: delivery.mobile,
                deliveryId: delivery._id,
                image: delivery.image,
                deliveryType: delivery.deliveryType,
            }
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.putUpdate = async (req, res, next) => {
    const errors = validationResult(req);

    const name = req.body.name;
    const mobile = req.body.mobile;
    const email = req.body.email;
    // const code = req.body.code;
    const deliveryType = req.body.deliveryType;

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation failed for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const currentDelivery = await Delivery.findOne({ mobile: mobile , email: email});

        if (!currentDelivery) {
            const error = new Error(`This user is not registered`);
            error.statusCode = 409;
            error.state = 6;
            throw error;
        }
        currentDelivery.name = name;
        currentDelivery.deliveryType = deliveryType;
        currentDelivery.email = email;
        // currentDelivery.code = code;
        currentDelivery.save();

        res.status(200).json({
            state: 1,
            message: 'delivery updated',
            data: {
                deliveryName: currentDelivery.name,
                deliveryType: currentDelivery.deliveryType,
                deliveryMobile: currentDelivery.mobile,
                deliveryId: currentDelivery._id,
                image: currentDelivery.image,
            }
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getDelivery = async (req, res, next) => {

    const page = req.query.page || 0;
    const productPerPage = 10;


    try {

        const delivery = await Delivery.find({})
        // .select('blocked name mobile email code')
        .select('blocked name mobile email')
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
        const total = await Delivery.find({}).countDocuments();


        res.status(200).json({
            state: 1,
            delivery: delivery,
            total: total,
            message: 'delivery accounts'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postBlock = async (req, res, next) => {
    const errors = validationResult(req);

    const deliveryId = req.body.deliveryId;
  

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const delivery = await Delivery.findById(deliveryId);

        if(!delivery){
            const error = new Error(`delivery not found`);
            error.statusCode = 404;
            throw error;
        }

        delivery.blocked = (!delivery.blocked) ;

        await delivery.save() ;

        res.status(200).json({
            state:1,
            message:'done'
        }) ;

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}
