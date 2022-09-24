const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const schedule = require('node-schedule');
const admin = require("firebase-admin");



require('dotenv').config();

const app = express();
const MONGODB_URI = process.env.MONGODB_URI;
// const MONGODB_URI = "mongodb+srv://alielghazoly:99887766554422a@banana.sditz.mongodb.net/banana?retryWrites=true&w=majority";

const port = process.env.PORT || 8080;

//multer
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname);
    }
});




const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

//meddleWere
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//FCM client app
admin.initializeApp({
    credential: admin.credential.cert({
      clientEmail: process.env.FCM_CLINT_EMAIL,
      privateKey:  process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      projectId:   process.env.FCM_PROJ_ID ,
  }),
},'client');

//FCM seller app
admin.initializeApp({
    credential: admin.credential.cert({
      clientEmail: process.env.SELLER_FCM_CLINT_EMAIL,
      privateKey:  process.env.SELLER_FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      projectId:   process.env.SELLER_FCM_PROJ_ID ,
  }),
},'seller');

//console.log(admin.apps[0]);


//multer meddlewere
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).array('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

//headers meddlewere
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    next();
});

//routes
const router = require('./routes/router');
const erorrMeddlewere = require('./helpers/errors');


app.use('/client', router.client.auth, router.client.shop, router.client.user, router.client.support);
app.use('/client/guest', router.client.guest);
app.use('/seller', router.seller.auth, router.seller.shop, router.seller.user, router.seller.support, router.seller.guest);
app.use('/delivery', router.delivery.auth, router.delivery.shop );
app.use('/admin', router.admin.auth, router.admin.shop, router.admin.user,router.admin.support, router.admin.mony ,router.admin.delivery);



//error handle meddlewere
app.use(erorrMeddlewere);


mongoose
    .connect(
        MONGODB_URI, {
        useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false
    })
    .then(result => {
        const server = app.listen(port);
        const io = require('./socket.io/socket').init(server);
        io.on('connection', socket => {
            console.log("Clint connected");
        })
        //run scadual stuff
        const Scad = mongoose.model('scheduleCert');
        return Scad.find({ expiresin: { $gt: new Date().getTime() } })
    })
    .then(s => {
        //console.log(s);
        const Scad = mongoose.model('scheduleCert');
        s.forEach(task => {
            const Seller = mongoose.model('seller');
            schedule.scheduleJob(new Date(task.expiresin).getTime(), async (fireDate) => {
                console.log('scadual');
                const seller = await Seller.findById(task.seller._id).select('category')
                await seller.certExpired();
            });
        })
        return Scad.deleteMany({ expiresin: { $lt: new Date().getTime() } })

    })
    .then(result => {
        const SccadPay = mongoose.model('ScadPay');
        return SccadPay.find({ fireIn: { $gt: new Date().getTime() } })
    })
    .then(er => {
        const Seller = mongoose.model('seller');
        const SccadPay = mongoose.model('ScadPay');
        er.forEach(item => {


            schedule.scheduleJob(item._id.toString(), new Date(item.fireIn).getTime(), async function () {
                const seller = await Seller.findById(item.seller._id).select('wallet bindingWallet');
                if (seller.bindingWallet >= item.price && item.delever==false) {
                    seller.bindingWallet = seller.bindingWallet - item.price;
                    seller.wallet += item.price;
                    await seller.save();
                    const sss = await SccadPay.findById(item._id)
                    sss.delever = true;
                    await sss.save();
                }
            });
        })
        console.log('schedule activated');
    })
    .catch(err => {
        console.log(err);
    });