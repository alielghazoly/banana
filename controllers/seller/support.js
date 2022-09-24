const { validationResult } = require('express-validator');

const Issue = require('../../models/issues');
const SupportMessage = require('../../models/supportMessages');
const Policy = require('../../models/policy');
const Conditions = require('../../models/conditions');
const Pay = require('../../models/pay');
const ScadPay = require('../../models/seller-sccad-pay');
const order = require('../../models/order');
const Client = require('../../models/client');
const Seller = require('../../models/seller');
const ClientWalet = require('../../models/clientWallet');


const schedule = require('node-schedule');




exports.postContactUs = async (req, res, next) => {

    const name = req.body.name;
    const email = req.body.email;
    const message = req.body.message;

    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const mm = new SupportMessage({
            name: name,
            email: email,
            message: message,
            user: req.userId,
            user_type: 'seller'
        });

        const m = await mm.save();

        res.status(201).json({
            state: 1,
            message: 'support message sent'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getIssues = async (req, res, next) => {
    const page = req.query.page || 1;
    const filter = req.query.filter || 'binding';
    const issuePerPage = 10;
    try {
 
        const total = await Issue.find({ seller: req.userId, state: filter }).countDocuments()
        const issues = await Issue.find({ seller: req.userId, state: filter })
            .sort({ createdAt: -1 })
            .skip((page - 1) * issuePerPage)
            .limit(issuePerPage)
            .select('imageUrl demands reason')
            .populate({path:'reason'});

        res.status(200).json({
            state: 1,
            data: issues,
            total: total,
            message: `issues in page ${page} and filter ${filter}`
        })


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getSingleIssue = async (req, res, next) => {
    const issueId = req.params.id;

    try {

        const issues = await Issue.findById(issueId)
            .select('imageUrl state order reason demands offer')
            .populate({ path: 'offer', select: 'price' });
        if (!issues) {
            const error = new Error(`issues not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        res.status(200).json({
            state: 1,
            data: issues,
            message: `issues with id ${issueId}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
}

exports.postIssueAccept = async (req, res, next) => {
    const issueId = req.body.issueId;

    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const issues = await Issue.findById(issueId).select('client state order reason demands offer');
        if (!issues) {
            const error = new Error(`issues not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        const pay = await Pay.findOne({ order: issues.order._id, offer: issues.offer._id, seller: req.userId });
        if (!pay) {
            const error = new Error(`payment required client didn't pay`);
            error.statusCode = 400;
            error.state = 41;
            throw error;
        }


        if (!pay.deliver) {
            const error = new Error(`order didn't delever`);
            error.statusCode = 409;
            error.state = 49;
            throw error;
        }

        // const scadPay = await ScadPay.findOne({ seller: req.userId, order: issues.order._id });

        // if (!scadPay) {
        //     const error = new Error(`can't refund mony after 3 dayes..1`);
        //     error.statusCode = 409;
        //     error.state = 48;
        //     throw error;
        // }
        // if (new Date(scadPay.fireIn).getTime() < new Date().getTime()) {
        //     const error = new Error(`can't refund mony after 3 dayes..2`);
        //     error.statusCode = 409;
        //     error.state = 48;
        //     throw error;
        // }
        // if (scadPay.delever == true) {
        //     const error = new Error(`can't refund mony after 3 dayes..3`);
        //     error.statusCode = 409;
        //     error.state = 48;
        //     throw error;
        // }

        // //cancel scadual
        // const my_job = schedule.scheduledJobs[scadPay._id.toString()];
        // my_job.cancel();

        // const client = await Client.findById(pay.client._id).select('wallet');

        // const seller = await Seller.findById(pay.seller._id).select('bindingWallet');

        // //client action
        // client.wallet += scadPay.price ;

        // const walletTransaction = new ClientWalet({
        //     client: client._id,
        //     action: 'refund',
        //     amount: scadPay.price,
        //     method: 'visa',
        //     time:new Date().getTime().toString()
        // });

        // //seller wallet
        // seller.bindingWallet = seller.bindingWallet - scadPay.price ;

        //issue
        issues.state = 'ok' ;


        //savein

        // await client.save();
        // await walletTransaction.save();
        // await seller.save();
        await issues.save();
        // await ScadPay.deleteOne({_id:scadPay._id}) ;
        

        res.status(200).json({
            state:1,
            message:'issue accepted'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
}

exports.postIssueRefuse = async (req, res, next) => {
    const issueId = req.body.issueId;

    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }

        const issues = await Issue.findById(issueId).select('imageUrl state order reason demands');
        if (!issues) {
            const error = new Error(`issues not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        issues.state = 'cancel';

        await issues.save();

        res.status(200).json({
            state: 1,
            message: 'issue canceld'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
}


//policy
exports.getPolicy = async (req, res, next) => {


    try {

        const policy = await Policy.findOne({});

        res.status(200).json({
            state: 1,
            data: policy,
            message: 'policy'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

//conditions
exports.getConditions = async (req, res, next) => {


    try {

        const conditions = await Conditions.findOne({});

        res.status(200).json({
            state: 1,
            data: conditions,
            message: 'conditiond'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};