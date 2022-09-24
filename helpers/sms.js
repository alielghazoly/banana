const unirest = require('unirest');

exports.send = async (mobile,message) => {
    try {
        const { body, status } = await unirest 
            .get(`https://globalsms.wisoftsolutions.com:1111/API/SendSMS?username=${process.env.SMS_NAME}&apiId=${process.env.SMS_API_ID}&json=True&destination=${mobile}&source=${process.env.SMS_SOURCE}&text=${message}`);
        

        if((body.ErrorCode == -4)){
            const error = new Error(`invalid mobile number`);
            error.statusCode = 422;
            error.state = 32;
            throw error;
        }
        if((body.ErrorCode == -6)){
            const error = new Error(`no sms Credit`);
            error.statusCode = 422;
            error.state = 33;
            throw error;
        }
        if ((body.ErrorCode != 0) || (status != 200 && status != 201)) {
            const error = new Error(`can't send SMS message`);
            error.statusCode = 405;
            error.state = 31;
            throw error;
        }

        return {body,status} ;

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        throw err
    }
}