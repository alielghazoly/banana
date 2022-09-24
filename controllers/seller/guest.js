const Order = require('../../models/order');

exports.getOrders = async (req, res, next) => {

    const page = req.query.page || 1;
    const filter = req.query.filter || 0;    //0=>for date //1=>amount //2=>location
    const sellerOffered = false;

    const productPerPage = 10;

    let orders;
    let total;
    let finalOrders = [];

    try {


        if (filter == 0) {
            total = await Order.find({ status: 'started' }).countDocuments();
            orders = await Order.find({
                status: 'started'
            })
                .select('location category createdAt client products amount_count stringAdress arriveDate')
                .populate({ path: 'products.product', select: 'category name_urdu name name_en name_ar' })
                .sort({ createdAt: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);
        } else if (filter == 1) {
            total = await Order.find({ status: 'started' }).countDocuments();

            orders = await Order.find({
                status: 'started'
            })
                .select('location createdAt category client products amount_count stringAdress arriveDate')
                .populate({ path: 'products.product', select: 'category  name_urdu name name_en name_ar' })
                .sort({ amount_count: -1 })
                .skip((page - 1) * productPerPage)
                .limit(productPerPage);
        }
        else {
            const error = new Error(`authantication required`);
            error.statusCode = 401;
            error.state = 54;
            throw error;
        }
        for (let element of orders) {
            const total_client_orders = await Order.find({ client: element.client._id }).countDocuments();
            const ended_client_orders = await Order.find({ client: element.client._id, status: 'ended' }).countDocuments();
            finalOrders.push({
                order: element,
                client: {
                    total_client_orders: total_client_orders,
                    ended_client_orders: ended_client_orders
                },
                sellerOffered: sellerOffered
            });
        }

        res.status(200).json({
            state: 1,
            data: finalOrders,
            total: total,
            message: `orders in ${page} and filter ${filter}`
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}
