const admin = require("firebase-admin");

const io = require("../socket.io/socket");

const Notfication = require('../models/notfications');

const Client = require('../models/client');

const Seller = require('../models/seller');

const send = async (data, notfi, user, path) => {
  try {

    let token_en = [];
    let token_ar = [];
    let token_urdu = [];
    let index = -1;
    admin.apps.forEach((app, ind) => {
      if (app.name == path) {
        index = ind;
      }
    });

    for (i of user) {
      const notfication = new Notfication({
        path: path,
        user: i._id,
        data: data,
        notification: notfi,
        date: new Date().getTime().toString()
      });

      await notfication.save();

      io.getIO().emit("notfication", {
        action: "notfication",
        userId: i._id,
        notfications: {
          data: data,
          notification: notfi,
        },
      });

      i.FCMJwt.forEach(tok => {
        if (tok.lang == 'ar') {
          token_ar.push(tok.token);
        } else if (tok.lang == 'en') {
          token_en.push(tok.token);
        } else if (tok.lang == 'urdu') {
          token_urdu.push(tok.token);
        }
      });

    }

    const message_ar = {
      notification: {
        title: notfi.title_ar,
        body: notfi.body_ar,
      },
      data: data,
      android: {
        notification: {
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      topic: "X",
      tokens: token_ar,
    };
    const message_en = {
      notification: {
        title: notfi.title_en,
        body: notfi.body_en,
      },
      data: data,
      android: {
        notification: {
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      topic: "X",
      tokens: token_en,
    };
    const message_urdu = {
      notification: {
        title: notfi.title_urdu,
        body: notfi.body_urdu,
      },
      data: data,
      android: {
        notification: {
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      topic: "X",
      tokens: token_urdu,
    };

    if (message_en.tokens.length > 0) {
      const messageRes = await admin.apps[index].messaging().sendMulticast(message_en);
      console.log(messageRes);
    }
    if (message_ar.tokens.length > 0) {
      const messageRes = await admin.apps[index].messaging().sendMulticast(message_ar);
      console.log(messageRes);
    }
    if (message_urdu.tokens.length > 0) {
      const messageRes = await admin.apps[index].messaging().sendMulticast(message_urdu);
      console.log(messageRes);
    }

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

const sendAll = async (data, notfi, path) => {
  try {
    const userPerOperation = 100;
    let users;

    if (path == 'client') {
      const total = await Client.find({}).countDocuments();
      for (let i = 1; i <= Math.ceil(total / 100); i++) {
        users = await Client.find({}).select('FCMJwt')
          .skip((i - 1) * userPerOperation)
          .limit(userPerOperation);
        await send(data, notfi, users, path);

      }

    } else if (path == 'seller') {
      const total = await Seller.find({}).countDocuments();
      for (let i = 1; i <= Math.ceil(total / 100); i++) {
        users = await Seller.find({}).select('FCMJwt')
          .skip((i - 1) * userPerOperation)
          .limit(userPerOperation);
        await send(data, notfi, users, path);

      }
    }

    return 'done';

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.send = send;
exports.sendAll = sendAll;
