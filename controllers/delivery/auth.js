const bycript = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const Delivery = require('../../models/delivery');

exports.postLogin = async (req, res, next) => {
    const errors = validationResult(req);
    const emailOrPhone = req.body.mobile;
    const password = req.body.password;


    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const isEmail = emailOrPhone.search('@');

        let client;
        if (isEmail >= 0) {
            await check('mobile').isEmail().normalizeEmail().run(req);
            client = await Delivery.findOne({ email: req.body.mobile })
        } else {
            client = await Delivery.findOne({ mobile: emailOrPhone })
        }

        if (!client) {
            const error = new Error(`Client not found`);
            error.statusCode = 404;
            error.state = 7;
            throw error;
        }

        const isEqual = await bycript.compare(password, client.password);
        if (!isEqual) {
            const error = new Error('wrong password');
            error.statusCode = 401;
            error.state = 8;
            throw error;
        }
        if (client.blocked == true) {
            const error = new Error('client have been blocked');
            error.statusCode = 403;
            error.state = 4;
            throw error;
        }
        

        const token = jwt.sign(
            {
                mobile: client.mobile,
                userId: client._id.toString(),
            },
            process.env.JWT_PRIVATE_KEY_DELIVERY
        );

        res.status(200).json({
            state: 1,
            message: "logedin",
            data: {
                token: token,
                deliveryName: client.name,
                deliveryMobile: client.mobile,
                deliveryType: client.deliveryType,
                deliveryId: client._id,
            }
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}
