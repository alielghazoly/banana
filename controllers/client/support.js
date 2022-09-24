const { validationResult } = require('express-validator');

const Order = require('../../models/order');
const Offer = require('../../models/offer');
const Pay = require('../../models/pay');
const Issue = require('../../models/issues');
const IssueResons = require('../../models/issue-reason');
const SupportMessage = require('../../models/supportMessages');
const Policy = require('../../models/policy');
const Conditions               = require('../../models/conditions');
const Client               = require('../../models/client');
const sendNotfication = require('../../helpers/send-notfication');
const deleteFile = require("../../helpers/file");

exports.postIssue = async (req, res, next) => {

    const orderId = req.body.orderId;
    const reason = req.body.reason;
    const demands = req.body.demands;
    const image = req.files || []; 
    const errors = validationResult(req);
    let imageUrl = [];

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            error.state = 5;
            throw error;
        }
        
        const order = await Order.findById(orderId).select('client status');
        if (!order) {
            const error = new Error(`order not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        if(order.client._id != req.userId){
            const error = new Error(`not the order owner`);
            error.statusCode = 403;
            error.state = 11;
            throw error;
        }
        if (order.status != 'ended') {
            const error = new Error(`wanna put issue for not ended order`);
            error.statusCode = 422;
            error.state = 14;
            throw error;
        }
        
        const offer = await Offer.findOne({order:order._id,selected:true,status:'ended'}).select('seller');

        if(!offer){
            const error = new Error(`can't find selected offer for the order`);
            error.statusCode = 404;
            error.state = 24;
            throw error;
        }

        const checkIssue = await Issue.findOne({order:order._id,client:req.userId});
        if(checkIssue){
            const error = new Error(`issue allready creted`);
            error.statusCode = 409;
            error.state = 25;
            throw error;
        }

        const pay = await Pay.findOne({ order: order._id, offer: offer._id, seller: offer.seller._id})
        .select('deliver arriveIn seller')
        .populate({path:'seller',select:'FCMJwt sendNotfication'});
        
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

        if (new Date(pay.arriveIn).getTime + 259200000 < Date.now() ) {
            const error = new Error(`can't but issue after 3 dayes`);
            error.statusCode = 409;
            error.state = 49;
            throw error;
        }

        const re = await IssueResons.findById(reason);
        if(!re){
            const error = new Error(`reason not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }
        let temp ;
        if (image.length > 0) {
            image.forEach(element => {
                imageUrl.push(element.path);
            });    
            temp = {
                client: req.userId,
                order: order._id,
                reason: reason,
                demands: demands,
                imageUrl: imageUrl,
                seller:offer.seller._id,
                offer:offer._id
            };
        }else{
            temp = {
                client: req.userId,
                order: order._id,
                reason: reason,
                demands: demands,
                seller:offer.seller._id,
                offer:offer._id
            };
        }

        const issue = new Issue(temp);
        const iii     = await issue.save();

        const client = await Client.findById(req.userId).select('FCMJwt sendNotfication')

        if(client.sendNotfication.all == true){
            const notification = {
                title_ar: 'قسم الشكاوي',
                body_ar: "تم ارسال الشكوى بنجاح",
                title_en: 'Complaints Department',
                body_en: 'The complaint has been sent successfully',
                body_urdu:'شکایت کامیابی کے ساتھ بھیجی گئی ہے',
                title_urdu:'شکایات کا محکمہ'
            };
            const data = {
                id: iii._id.toString(),
                key: '2',
            };
    
            await sendNotfication.send(data,notification,[client],'client');
        }

        if(pay.seller.sendNotfication.all == true && pay.seller.sendNotfication.issues == true ){
            const notification2 = {
                title_ar: 'قسم الشكاوي',
                body_ar: "هنالك شكوى جديدة",
                title_en: 'Complaints Department',
                body_en: 'There is a new complaint',
                title_urdu:'شکایات کا محکمہ',
                body_urdu:'ایک نئی شکایت ہے',
            };
            const data2 = {
                id: iii._id.toString(),
                key: '2',
            };
    
            await sendNotfication.send(data2, notification2, [pay.seller], 'seller');
        }
        
        

        res.status(201).json({
            state: 1,
            message: 'issue created'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
}


exports.getSingleIssue = async (req, res, next) => {
    
    const id = req.params.id ;
    
    try {
        
        let issue = await Issue.findById(id)
        .select('order reason demands imageUrl state adminState adminNotes')
        .populate({
            path:'reason'
        })
        .populate({
            path:'order',
            select:'products'
        });

        if(!issue){
            const error = new Error(`issue not found`);
            error.statusCode = 404;
            error.state = 9;
            throw error;
        }

        if(issue.adminState=='ok'){
            const pay = await Pay.findOne({order:issue.order._id,client:req.userId}).select('refund refund_amount');
            const tempIssue = issue ;
            issue = {
                issue:tempIssue,
                pay:pay
            };
        }
        
        res.status(200).json({
            state:1,
            data:issue,
            message:'issue data'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


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
            user:req.userId,
            user_type:'client'
        });

        const m = await mm.save(); 

        res.status(201).json({
            state:1,
            message:'support message sent'
        });
        

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        console.log(err);
        next(err);
    }
}


exports.getIssueReasons = async (req, res, next) => {

    

    try {
        const issuesReson = await IssueResons.find({});

        res.status(200).json({
            state:1,
            data:issuesReson,
            message:'issue reasons'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        console.log(err);
        next(err);
    }
}

//policy 
exports.getPolicy = async (req, res, next) => {
    
    
    try {
        
        const policy = await Policy.findOne({});
        
        res.status(200).json({
            state:1,
            data:policy,
            message:'policy'
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
            state:1,
            data:conditions
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


