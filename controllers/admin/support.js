const { validationResult } = require("express-validator");
const Policy = require('../../models/policy');
const Conditions = require('../../models/conditions');
const SupportMessages = require('../../models/supportMessages');
const Issue = require('../../models/issues');
const IssueRwasons = require('../../models/issue-reason');
const Pay = require('../../models/pay');
const ScadPay = require('../../models/seller-sccad-pay');
const Client = require('../../models/client');
const Seller = require('../../models/seller');
const ClientWalet = require('../../models/clientWallet');

const ObjectId = require('mongoose').Types.ObjectId;


const schedule = require('node-schedule');
const sendNotfication = require('../../helpers/send-notfication');



//policy
exports.getPolicy = async (req, res, next) => {


    try {

        const policy = await Policy.findOne({});

        res.status(200).json({
            state: 1,
            policy: policy
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postAddPolicy = async (req, res, next) => {
    const errors = validationResult(req);
    const EN = req.body.EN;
    const AR = req.body.AR;
    const urdu = req.body.urdu;

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild..${errors.array()[0].param} : ${errors.array()[0].msg}`);
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        const policy = await Policy.findOne({});
        if (!policy) {
            const newPolicy = new Policy({
                EN: EN,
                AR: AR,
                urdu:urdu
            });
            await newPolicy.save()
        } else {
            policy.EN = EN;
            policy.AR = AR;
            policy.urdu = urdu;
            await policy.save()
        }

        res.status(200).json({
            state: 1,
            message: 'added'
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
            conditions: conditions
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postConditions = async (req, res, next) => {
    const errors = validationResult(req);
    const EN = req.body.EN;
    const AR = req.body.AR;
    const urdu = req.body.urdu;

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild..${errors.array()[0].param} : ${errors.array()[0].msg}`);
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        const conditions = await Conditions.findOne({});
        if (!conditions) {
            const newConditions = new Conditions({
                EN: EN,
                AR: AR,
                urdu: urdu,
            });
            await newConditions.save()
        } else {
            conditions.EN = EN;
            conditions.AR = AR;
            conditions.urdu = urdu;
            await conditions.save();
        }

        res.status(200).json({
            state: 1,
            message: 'added'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getSupportMessages = async (req, res, next) => {

    const page = req.query.page || 1;
    const productPerPage = 10;

    try {
        const total = await SupportMessages.find({}).countDocuments();
        const messages = await SupportMessages.find({})
            // .populate({ path: 'user', select: 'name mobile email code' })
            .populate({ path: 'user', select: 'name mobile email' })
            .sort({ createdAt: -1 })
            .skip((page - 1) * productPerPage)
            .limit(productPerPage);

        res.status(200).json({
            state: 1,
            data: messages,
            total: total,
            message: `support messages in page ${page}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

//issues
exports.getIssues = async (req, res, next) => {

    const page = req.query.page || 1;
    const reason = req.query.reason || false;

    const filter = req.query.filter || 'binding';
    const issuePerPage = 10;
    find = {};
    try {
        if (reason) {
            find = {
                adminState: filter,
                reason: reason
            };
        } else {
            find = {
                adminState: filter
            };
        }

        const total = await Issue.find(find).countDocuments()
        const issues = await Issue.find(find)
            .sort({ createdAt: -1 })
            .skip((page - 1) * issuePerPage)
            .limit(issuePerPage)
            .select('order offer reason state imageUrl demands adminNotes')
            // .populate({
            //     path: 'order',
            //     select: 'products',
            //     populate: {
            //         path: 'products.product',
            //         select: 'name_ar name_en name'
            //     }
            // })
            .populate({
                path: 'offer',
                select: 'banana_delivery price selected offerProducts'
            })
            .populate({
                path: 'reason',
                select: 'reason_ar reason_en'
            });

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
};

//single issue
exports.getSingleIssue = async (req, res, next) => {

    const issueId = req.params.id;

    try {

        const issue = await Issue.findById(issueId)
            .select('order offer reason state imageUrl demands adminNotes adminState seller client')
            .populate({
                path: 'order',
                select: 'products',
                populate: {
                    path: 'products.product',
                    select: 'name_ar name_en name'
                }
            })
            .populate({
                path: 'offer',
                select: 'banana_delivery price selected offerProducts'
            })
            .populate({
                path: 'seller',
                // select: 'name mobile code'
                select: 'name mobile'
            })
            .populate({
                path: 'client',
                // select: 'name mobile code'
                select: 'name mobile'
            })
            .populate({
                path: 'reason',
                select: 'reason_ar reason_en'
            });

        const pay = await Pay.findOne({ offer: issue.offer._id, order: issue.order._id, client: issue.client._id })
            .select('payId arriveIn payId deliver method cancel refund refund_amount');

        res.status(200).json({
            state: 1,
            data: {
                issue: issue,
                PaymentTransaction: pay
            },
            message: `issue ${issueId}`
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};




//delete issue
exports.deleteIssue = async (req, res, next) => {
    const issueId = req.params.id;
    try {

        const issue = await Issue.findById(issueId)
        if (!issue) {
                const error = new Error('issue not found');
                error.statusCode = 404; 
                throw error;
        } 
        await Issue.deleteOne({ _id: issueId });
        res.status(200).json({
            state: 1,
            message: `issue ${issueId} deleted`
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

};






//approve and disapprove 
exports.postIssueApprove = async (req, res, next) => {

    const errors = validationResult(req);
    const issueId = req.body.issueId;
    const refund = Number(req.body.refund);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild..${errors.array()[0].param} : ${errors.array()[0].msg}`);
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        const issues = await Issue.findById(issueId).select('client state order reason demands offer seller adminState');
        if (!issues) {
            const error = new Error(`issues not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        if (issues.adminState != 'binding') {
            const error = new Error(`issue already revued`);
            error.statusCode = 409;
            error.state = 51;
            throw error;
        }

        const pay = await Pay.findOne({ order: issues.order._id, offer: issues.offer._id, seller: issues.seller._id })
            .populate({ path: 'offer', select: 'price' })
            .populate({ path: 'client', select: 'FCMJwt sendNotfication' })
            .populate({ path: 'seller', select: 'FCMJwt sendNotfication' });



        if (!pay) {
            const error = new Error(`payment required client didn't pay`);
            error.statusCode = 400;
            error.state = 41;
            throw error;
        }

        if (refund > pay.offer.price || refund < 0) {
            const error = new Error(`invalid refund value "less than zero or more than offer price"`);
            error.statusCode = 400;
            error.state = 42;
            throw error;
        }

        if (!pay.deliver) {
            const error = new Error(`order didn't delever`);
            error.statusCode = 409;
            error.state = 49;
            throw error;
        }

        if (pay.method == 'cash') {
            const error = new Error(`can't refund in cash pay`);
            error.statusCode = 400;
            error.state = 50;
            throw error;
        }

        const scadPay = await ScadPay.findOne({ seller: issues.seller._id, order: issues.order._id });

        if (!scadPay) {
            const error = new Error(`can't refund mony after 3 dayes..1`);
            error.statusCode = 409;
            error.state = 48;
            throw error;
        }
        if (new Date(scadPay.fireIn).getTime() < new Date().getTime()) {
            const error = new Error(`can't refund mony after 3 dayes..2`);
            error.statusCode = 409;
            error.state = 48;
            throw error;
        }
        if (scadPay.delever == true) {
            const error = new Error(`can't refund mony after 3 dayes..3`);
            error.statusCode = 409;
            error.state = 48;
            throw error;
        }

        //cancel scadual
        const my_job = schedule.scheduledJobs[scadPay._id.toString()];
        try {
            my_job.cancel();
        } catch (ERRORRR) {
            console.log('scadual null');
        }

        const client = await Client.findById(pay.client._id).select('wallet');

        const seller = await Seller.findById(pay.seller._id).select('bindingWallet');

        //client action
        client.wallet += refund;

        const walletTransaction = new ClientWalet({
            client: client._id,
            action: 'refund',
            amount: refund,
            method: 'visa',
            time: new Date().getTime().toString()
        });

        //seller wallet
        seller.bindingWallet = seller.bindingWallet - scadPay.price;

        //issue
        issues.adminState = 'ok';
        pay.refund = true;
        pay.refund_amount = refund;


        //savein

        await client.save();
        await walletTransaction.save();
        await seller.save();
        await issues.save();
        await pay.save();
        await ScadPay.deleteOne({ _id: scadPay._id });

        if (pay.client.sendNotfication.all == true) {
            const notification = {
                title_ar: 'قسم الشكاوي',
                body_ar: "تم الرد على الشكوي المقدمة",
                title_en: 'Complaints Department',
                body_en: 'The submitted complaint has been answered',
                title_urdu: 'شکایات کا محکمہ',
                body_urdu: 'پیش کی گئی شکایت کا جواب دیا گیا ہے'
            };
            const data = {
                id: issues._id.toString(),
                key: '2',
            };

            await sendNotfication.send(data, notification, [pay.client], 'client');
        }



        if (pay.seller.sendNotfication.all == true && pay.seller.sendNotfication.issues == true) {

            const notification2 = {
                title_ar: 'قسم الشكاوي',
                body_ar: "تم الرد على الشكوى",
                title_en: 'Complaints Department',
                body_en: 'The complaint has been answered',
                title_urdu: 'شکایات کا محکمہ',
                body_urdu: 'ایک نئی شکایت ہے'
            };
            const data2 = {
                id: issues._id.toString(),
                key: '2',
            };

            await sendNotfication.send(data2, notification2, [pay.seller], 'seller');
        }

        res.status(200).json({
            state: 1,
            message: 'issue accepted'
        });



    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postIssueDisApprove = async (req, res, next) => {

    const errors = validationResult(req);
    const issueId = req.body.issueId;
    const reason = req.body.reason;

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild..${errors.array()[0].param} : ${errors.array()[0].msg}`);
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        const issues = await Issue.findById(issueId).select('client state order reason demands offer seller adminState');
        if (!issues) {
            const error = new Error(`issues not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        if (issues.adminState != 'binding') {
            const error = new Error(`issue already revued`);
            error.statusCode = 409;
            error.state = 51;
            throw error;
        }

        issues.adminState = 'cancel';
        issues.adminNotes = reason;

        await issues.save();


        res.status(200).json({
            state: 1,
            message: 'canceld'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postIssueReasons = async (req, res, next) => {

    const errors = validationResult(req);
    const EN = req.body.EN;
    const AR = req.body.AR;
    const urdu = req.body.urdu;

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild..${errors.array()[0].param} : ${errors.array()[0].msg}`);
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }

        const reason = new IssueRwasons({
            reason_ar: AR,
            reason_en: EN,
            reason_urdu:urdu
        });

        const newIssueReason = await reason.save();

        res.status(201).json({
            state: 1,
            data: newIssueReason,
            message: 'created'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.getIssueReasons = async (req, res, next) => {



    try {

        const resons = await IssueRwasons.find({});

        res.status(201).json({
            state: 1,
            data: resons,
            message: 'created'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

//search
exports.getSearch = async (req, res, next) => {
    const search = req.query.search;
    const page = req.query.page || 1;
    const itemPerPage = 10;
    let totalItems;
    let result ;

    try {

        const isId = ObjectId.isValid(search.toString());


        if (isId) {
            result = await Issue.find({
                order: new ObjectId(search.toString())
            })
                .skip((page - 1) * itemPerPage)
                .limit(itemPerPage)
                .select('order offer reason state imageUrl demands adminNotes')
                .populate({
                    path: 'offer',
                    select: 'banana_delivery price selected offerProducts'
                })
                .populate({
                    path: 'reason',
                    select: 'reason_ar reason_en'
                });

                totalItems = await Issue.find({
                    order: new ObjectId(search.toString())
                }).countDocuments() ;

        } else {
            const client = await Client.findOne({
                $or: [
                    { name: new RegExp(search.trim(), 'i') },
                    { mobile: new RegExp(search.trim(), 'i') },
                    { email: new RegExp(search.trim(), 'i') },
                    // { code: new RegExp(search.trim(), 'i') },
                ]
            });
            console.log(client);

            if (client) {
                result = await Issue.find({
                    client: client._id
                })
                    .skip((page - 1) * itemPerPage)
                    .limit(itemPerPage)
                    .select('order offer reason state imageUrl demands adminNotes')
                    .populate({
                        path: 'offer',
                        select: 'banana_delivery price selected offerProducts'
                    })
                    .populate({
                        path: 'reason',
                        select: 'reason_ar reason_en'
                    });
                    totalItems = await Issue.find({
                        client: client._id
                    }).countDocuments() ;

            } else {
                result = [] ;
                totalItems = 0 ;
            }

        }


        res.status(200).json({
            state: 1,
            totalItems: totalItems,
            searchResulr: result,
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
