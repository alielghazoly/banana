const { validationResult } = require("express-validator");
const schedule = require('node-schedule');
const path = require("path");

const deleteFile = require("../../helpers/file");
const Pay = require("../../models/pay");
const Products = require("../../models/products");
const Offers = require("../../models/offer");
const Scad = require("../../models/cert-expire");
const Order = require("../../models/order");
const Issue = require("../../models/issues");
const Seller = require("../../models/seller");


exports.getHome = async (req, res, next) => {
   
    
    try {

        let totalRevinue  = 0 ;

        const totalProducts = await Products.find({}).countDocuments();
        const totalIssues = await Issue.find({adminState:'binding'}).countDocuments();
        const totalOrders_avilable = await Order.find({status:'started'}).countDocuments();
        const totalOrders = await Order.find({}).countDocuments();
        const seller_not_avilable = await Seller.find({ 'certificate.review': false }).countDocuments();

        const pay = await Pay.find({refund:false,cancel:false,deliver:true,method:{$ne:'cash'}})
        .select('offer')
        .populate({path:'offer',select:'price banana_delivery banana_delivery_price'});

        pay.forEach(i=>{
            totalRevinue += ( ((i.offer.price * 5 ) /100) );
        });

        const payRefund = await Pay.find({cancel:true,refund:true,method:{$ne:'cash'}})
        .select('offer refund_amount')
        .populate({path:'offer',select:'price banana_delivery banana_delivery_price'});

        payRefund.forEach(i=>{
            totalRevinue += i.offer.price - i.refund_amount ; 
        });

        res.status(200).json({
            state:0,
            data:{
                totalProducts:totalProducts,
                totalIssues:totalIssues,
                totalOrders_avilable:totalOrders_avilable,
                totalOrders:totalOrders,
                seller_not_avilable:seller_not_avilable,
                totalRevinue:totalRevinue.toFixed(1)
            },
            message:'home data'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getProducts = async (req, res, next) => {
    const catigory = req.params.catigoryId;
    const page = req.query.page || 1;
    const productPerPage = 10;
    const filter = req.query.filter || false;
    const date = req.query.date || "0";
    const sold = req.query.sold || "0";
    let totalProducts;
    let products;
    let find = {};

    try {
        if (!filter) {
            find = { category: catigory };
        } else {
            find = { category: catigory, productType: { $in: filter } };

        }
        if (date == '1' && sold == '0') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .sort({ createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);
        } else if (date == '1' && sold == '1') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .sort({ orders: -1, createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);
        } else if (date == '0' && sold == '1') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .sort({ orders: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);
        } else if (date == '0' && sold == '0') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);
        }


        res.status(200).json({
            state: 1,
            data: {
                products: products
            },
            totalProducts: totalProducts,
            message: `products in page ${page}, filter ${filter}, date ${date} and sold ${sold}`
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.putProduct = async (req, res, next) => {
    const imageUrl = req.files;
    const name_en = req.body.nameEn;
    const name_ar = req.body.nameAr;
    const name_urdu = req.body.name_urdu;
    const productType = req.body.productType;
    const category = req.body.category;
    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }
        if (category != 'F-V' && category != 'B' && category != 'F-M' && category != 'F') {
            const error = new Error(`invalid category input`);
            error.statusCode = 422;
            throw error;
        }
        if (imageUrl.length == 0) {
            const error = new Error(`validation faild for imageUrl you must insert image`);
            error.statusCode = 422;
            throw error;
        }
        const newProduct = new Products({
            category: category,
            name_en: name_en,
            name_ar: name_ar,
            name_urdu:name_urdu,
            productType: productType,
            imageUrl: imageUrl[0].path
        });
        const product = await newProduct.save();
        res.status(201).json({
            state: 1,
            data: {
                product: product
            },
            message: 'product created'
        })

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postEditProduct = async (req, res, next) => {
    const imageUrl = req.files;
    const name_en = req.body.nameEn;
    const name_ar = req.body.nameAr;
    const name_urdu = req.body.name_urdu;
    const productType = req.body.productType;
    const category = req.body.category;
    const productId = req.body.productId;
    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }
        if (category != 'F-V' && category != 'B' && category != 'F-M' && category != 'F') {
            const error = new Error(`invalid category input`);
            error.statusCode = 422;
            throw error;
        }
        if (Number(productType) > 13 || Number(productType) < 1) {
            const error = new Error(`invalid productType input`);
            error.statusCode = 422;
            throw error;
        }
        const product = await Products.findById(productId);
        if (!product) {
            const error = new Error(`product not found`);
            error.statusCode = 404;
            throw error;
        }
        product.name_ar = name_ar;
        product.name_en = name_en;
        product.name_urdu = name_urdu;
        product.productType = productType;
        product.category = category;

        if (imageUrl.length > 0) {
            deleteFile.deleteFile(path.join(__dirname + '/../../' + product.imageUrl));
            product.imageUrl = imageUrl[0].path;
        }
// gfgf
        const editedProduct = await product.save();

        res.status(200).json({
            state: 1,
            data: {
                product: editedProduct
            },
            message: 'product edited'
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteProduct = async (req, res, next) => {

    const productId = req.body.productId;
    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error(`validation faild for ${errors.array()[0].param} in ${errors.array()[0].location}`);
            error.statusCode = 422;
            throw error;
        }
        if (!Array.isArray(productId)) {
            const error = new Error(`productId must be array of IDs`);
            error.statusCode = 422;
            throw error;
        }
        const product = await Products.find({ _id: { $in: productId } });
        if (product.length != productId.length) {
            const error = new Error(`products not found`);
            error.statusCode = 404;
            throw error;
        }
        product.forEach(p => {
            deleteFile.deleteFile(path.join(__dirname + '/../../' + p.imageUrl));
        });

        await Products.deleteMany({ _id: { $in: productId } });

        res.status(200).json({
            state: 1,
            message: `${productId.length} items deleted`,
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getSingleProduct = async (req, res, next) => {

    const productId = req.params.id;

    try {
        const product = await Products.findById(productId);
        if (!product) {
            const error = new Error('product not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            state: 1,
            data: product,
            message: 'all product data'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

//orders

exports.getOrders = async (req, res, next) => {

    const page = req.query.page || 1;
    const productPerPage = 10;
    const filter = req.query.filter || 'started';
    const arrived = Boolean(Number(req.query.arrived)) || false;
    const cancel = Boolean(Number(req.query.cancel)) || false;
    const banana_delivery = Boolean(Number(req.query.bananaDelivery)) || false;
    const payMethod = req.query.payMethod || false;
    let orders;
    let total;
    let pay;
    let offer;

    try {
        if (filter != 'ended') {
            orders = await Order.find({ status: filter })
                .select('client products amount_count createdAt arriveDate location pay')
                .populate({ path: 'client', select: 'name mobile' })
                .populate({ path: 'products.product', select: 'name name_en name_ar' })
                .sort({ createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);

            total = await Order.find({ status: filter }).countDocuments();
        } else {
            let tempId = [];
            if (!payMethod) {
                pay = await Pay.find({ deliver: arrived, cancel: cancel }).select('order');
            } else {
                pay = await Pay.find({ deliver: arrived, cancel: cancel, method:payMethod }).select('order');
            }
            
            pay.forEach(i => {
                tempId.push(i.order._id);
            });

            offer = await Offers.find({ order: { $in: tempId }, selected: true, banana_delivery: banana_delivery })
                .select('order');

            tempId = [];
            offer.forEach(i => {
                tempId.push(i.order._id);
            });
            orders = await Order.find({ _id: { $in: tempId } })
                .select('client products amount_count createdAt arriveDate location pay')
                .populate({ path: 'client', select: 'name mobile' })
                .populate({ path: 'products.product', select: 'name name_en name_ar' })
                .sort({ createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);

            total = await Order.find({ _id: { $in: tempId } }).countDocuments();
        }


        res.status(200).json({
            state: 1,
            data: orders,
            total: total,
            message: `orders with filter ${filter}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.getSingleOrder = async (req, res, next) => {

    const orderId = req.params.id ; 

    try {
        const order = await Order.findById(orderId)
        .select('client category products arriveDate location locationDetails status pay reted')
        .populate({path:'client',select:'name mobile'})
        .populate({path:'products.product',select:'name name_en name_ar'});
        
        if(!order){
            const error = new Error('order not found');
            error.statusCode = 404;
            throw error;
        }

        const selectedOffer = await Offers.findOne({order:order._id,selected:true})
        .select('seller banana_delivery price status offerProducts location')
        .populate({path:'seller',select:'name mobile'})
        .populate({path:'offerProducts.product',select:'name name_en name_ar'});

        const payMent = await Pay.findOne({order:order})
        .select('arriveIn client seller payId deliver method cancel')
        .populate({path:'client',select:'name'})
        .populate({path:'seller',select:'name'});

        res.status(200).json({
            state:1,
            order:order,
            selectedOffer:selectedOffer,
            payMent:payMent,
            message:'all order data'
        });


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
