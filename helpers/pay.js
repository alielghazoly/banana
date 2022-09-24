const https = require('https');
const querystring = require('querystring');
const unirest = require('unirest');
 
exports.createCheckOut = async (price) => {
    try {
        var data = querystring.stringify({
            'entityId': process.env.HYPERPAY_ENTITYID,
            'amount': price,
            'currency': 'EUR',
            'paymentType': 'DB'
        });
        const { body, status } = await unirest
            .post(process.env.HYPERPAY_URL + '/v1/checkouts')
            .headers({
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': data.length,
                'Authorization': process.env.HYPERPAY_AUTHRIZATION
            })
            .send(data);
        return { body, status };

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        throw err
    }

}

exports.getStatus = async (checkoutId) => {
    try {

        const { body, status } = await unirest
            .get(process.env.HYPERPAY_URL + `/v1/checkouts/${checkoutId}/payment?entityId=${process.env.HYPERPAY_ENTITYID}`)
            .headers({
                'Authorization': process.env.HYPERPAY_AUTHRIZATION
            })
        return { body, status };

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        throw err
    }

}


exports.getPaymentReport = async (transactionId) => {
    try {

        const { body, status } = await unirest
            .get(process.env.HYPERPAY_URL + `/v1/query/${transactionId}?entityId=${process.env.HYPERPAY_ENTITYID}`)
            .headers({
                'Authorization': process.env.HYPERPAY_AUTHRIZATION
            })
        return { body, status };

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        throw err
    }
}

