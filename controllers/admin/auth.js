const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const path = require("path");
const jwt = require("jsonwebtoken");

const Admin = require("../../models/admin");

/*bcrypt.hash('admin',12).then(s=>{
    const newOne =  new Admin({
        email:'admin@admin.com',
        password:s
    });
    newOne.save().then(dd=>{
        console.log('done');
    })
})*/


exports.postLogin = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error("validation faild");
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
      }
  
      const email = req.body.email;
      const password = req.body.password;
  
      const admin = await Admin.findOne({ email: email });
  
      if (!admin) {
        const error = new Error("admin not found");
        error.statusCode = 404;
        throw error;
      }
      const isEqual = await bcrypt.compare(password, admin.password);
      if (!isEqual) {
        const error = new Error("wrong password");
        error.statusCode = 401;
        throw error;
      }
  
      const token = jwt.sign(
        {
          email: admin.email,
          adminId: admin._id.toString(),
        },
        process.env.JWT_PRIVATE_KEY_ADMIN,
        {expiresIn:'3h'}
      );
  
      res.status(200).json({
        state: 1,
        data:{
            token: token,
            token_expiresIn: Date.now() + 10000000,
            email:admin.email,
        },
        message:'admin logedin'
      });
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  };