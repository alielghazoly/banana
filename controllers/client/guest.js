const Products = require('../../models/products');


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
            find = { category: catigory }
        } else {
            find = { category: catigory, productType: { $in: filter } }
        }
        if (date == '1' && sold == '0') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .sort({ createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('category name_en name_ar name_urdu productType imageUrl');
        } else if (date == '1' && sold == '1') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .sort({ orders: -1, createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('category name_en name_ar name_urdu productType imageUrl');

        } else if (date == '0' && sold == '1') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .sort({ orders: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('category name_en name_ar name_urdu productType imageUrl');

        } else if (date == '0' && sold == '0') {
            totalProducts = await Products.find(find).countDocuments();
            products = await Products.find(find)
                .skip((page - 1) * productPerPage)
                .limit(productPerPage)
                .select('category name_en name_ar name_urdu productType imageUrl');

        }


        res.status(200).json({
            state: 1,
            data: products,
            total: totalProducts,
            cart:0,
            message: `products in page ${page}, filter ${filter}, date ${date} and sold ${sold}`
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


exports.getSearch = async (req, res, next) => {

    const page = req.query.page || 1;
    const productPerPage = 10;
    const searchQ = req.query.searchQ;
    const category = req.params.catigoryId;

    try {

        const totalItems = await Products.find({
            category: category,
            $or: [
                { name_en: new RegExp(searchQ.trim(), 'i') },
                { name_ar: new RegExp(searchQ.trim(), 'i') },
            ],
        }).countDocuments();
        const products = await Products.find({
            category: category,
            $or: [
                { name_en: new RegExp(searchQ.trim(), 'i') },
                { name_ar: new RegExp(searchQ.trim(), 'i') },
            ],
        })
            .select('category name_en name_ar name_urdu productType imageUrl')
            .skip((page - 1) * productPerPage)
            .limit(productPerPage);

        res.status(200).json({
            state: 1,
            data: products,
            total: totalItems,
            cart:0,
            message: `products with ur search (${searchQ})`
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}