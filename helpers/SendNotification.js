const Delivery = require('../models/delivery');
const sendNotifications = require('./send-notfication');

const informDeliveryOfNewOrders = async (deliveryType, order) => {
    try {
        if (!(deliveryType === 1 || deliveryType === 2))
            return
        const currentDelivery = await Delivery.find({deliveryType});
        const notification = {
            title_ar: 'طلبات توصيل جديدة',
            body_ar: "قم بتفحص الطلبات الجديدة",
            title_en: 'new orders',
            body_en: 'Check out new orders',
            title_urdu: 'نئی پیش کش',
            body_urdu: 'نئی پیش کش چیک کریں',
        };
        const data = {
            id: order._id.toString(),
            key: '1',
        };
        await sendNotifications.send(data, notification, currentDelivery, 'delivery');
    } catch (e) {

    }
}

exports.informDeliveryOfNewOrders = informDeliveryOfNewOrders;
//https://api.bananas.ae/client/myOrders?page=1&filter=ended
