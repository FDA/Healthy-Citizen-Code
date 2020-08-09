const User = require('../models/pii_data')
    , Email = require('../models/email')
    , ResetPassword = require('../models/reset_password')
    , crypto = require("crypto")
    , bcrypt = require("bcrypt")
    , _ = require("lodash")
    , Q = require("q")
    , nodemailer = require('nodemailer')
    , emailService = require('./../services/email_service')
    , authService = require('./../services/auth_service')
    , enumsLikeObjectsPresenter = require('./../presenters/enum_like_objects')
    , modelJson = require('./../src/data_model/model-v2.json')
    , modelFieldsValidator = require('./../validators/model_fields_validator')
    , speakeasy = require('speakeasy')
    , QRCode = require('qrcode')
    , onlyVisibleFieldsPresenter = require('./../presenters/only_visible_fields_presenter')
    , emptyPhiGenerator = require('./../generators/empty_phi_generator')
    , randomHashGenerator = require('./../generators/random_hash_generator')
    , PhiData = require('./../models/phi_data')
    , logger = require('log4js').getLogger();

User.init();

function errorHandler(err){
  if (err && err.name === "ValidationError") {
    let r = new Array();
    for (let a in err.errors) {
      r.push({
        field: err.errors[a].path
        , type: err.errors[a].kind
        , value: err.errors[a].value
        , message: err.errors[a].message
      });
    }
    return r;
  }
  return err;
}

const generateSalt = function(length=32) {
    const deferred = Q.defer();
    crypto.randomBytes(length, function(err, buf) {
      if(err) deferred.reject(new Error(err));
      deferred.resolve(buf.toString());
    });
    return deferred.promise;
  }
  // , hashPassword = (password, salt) => {
  //   const deferred = Q.defer();
  //   bcrypt.hash(password, salt, (err, hash) => {
  //     if (err) deferred.reject(new Error(err));
  //     deferred.resolve(hash);
  //   });
  //   return deferred.promise;
  // }
  , hashPassword = function(password, salt) {
    const deferred = Q.defer();
    crypto.pbkdf2(password, salt, 12500, 512, "sha512", (err, key) => {
      if(err) deferred.reject(new Error(err));
      deferred.resolve(key.toString("hex"));
    });
    return deferred.promise;
  }
  , comparePassword = (newPassword, oldPassword, salt) => {

    var deferred = Q.defer();
  
    hashPassword(newPassword, salt).then((hash) => {
      if(hash === oldPassword){
        deferred.resolve();
      }else{
        deferred.reject("Invalid password.");
      }

    });
    return deferred.promise;
  };

const userController = {

  authUser: (req, res) => {
    if(req.body.password === undefined || req.body.password.length == 0){
      return res.json(403, { success: false, message: "Empty password."});
    }
    let _u;
    User
    .findOne({email: req.body.email})
    .then(user => {
      _u = user;
      return user;
    })
    .then(user => comparePassword(req.body.password, user.password, user.salt))
    .then(() => {
      return res.json(200, {
        success: true
        , message: "token generated successfully"
        , token: authService.generateTokenAfterLogin(_u)
        , user: {
          email: _u.email
          , _id: _u._id
          , created: _u.created
          , lastName: _u.lastName
          , firstName: _u.firstName
          , twoFactorAuth: _u.settings.twoFactorAuth
          , phoneVerified: _u.settings.phoneVerified
        }
      });

    })
    .catch(err => {
      return res.json(403, { success: false, message: "Authentication failed. Wrong email/password."});
    });
  }
  , hadPermission: function (perm, req, res, next) {
    const deferred = Q.defer();
    User.findById(req.decoded.mySelf)
    .then((r)=>{
      if(r.permissions.indexOf(perm)>-1)
        next(req,res);
      else deferred.reject(new Error());
    })
    .catch(()=> res.json(403,{ success: false, message: "You doesn\"t have permission to do it."}));
  }

  // ----------------------------

  /**
   * GET /api/useronlyVisibleFieldsPresenter
   * Login page.
   */
  , userList: (req, res) => {
    var promise = User.findOne({email: req.decoded.email}).lean().exec();
    
    promise
      .then(piiData => {
        if (piiData === null) {
          return res.json(201, {error: "Pii not found"});
        }

        piiData = User.normalize(piiData);
        piiData = enumsLikeObjectsPresenter(modelJson.models.pii, piiData);
        piiData = onlyVisibleFieldsPresenter(modelJson.models.pii, piiData);
        res.json(piiData)
      }, err => {
        console.log(err);
        res.json(err);
      });

    // User.find({email: req.decoded.email}, (err, users) => {
    //   var userMap = {};

    //   users.forEach((data) => {
    //     data = User.normalize(data);
    //     userMap[data._id] = data;
    //   });

    //   res.json(200, userMap);  
    // }).lean();
  }

  /**
   * GET /api/user/:id
   * Login page.
   */
  , userRead: (req, res) => {
    // unused
    var _id = req.params.id;

    var promise = User.findById(_id).lean().exec();
    promise
      .then((user) => {
        if (user === null) {
          return res.json(200, null);
        }
        user = User.normalize(user);
        user = enumsLikeObjectsPresenter(modelJson.models.pii, user);
        user = onlyVisibleFieldsPresenter(modelJson.models.pii, user);
        res.json(200, user);
      })
      .catch((err) => {
        let response = {
          code: 500,
          error: err
        };
        res.json(500, response);
      });
  }

  /**
   * POST /api/user
   * Create user
   */
  , userCreate: (req, res, next) => {
    const userJSON = req.body;
    // SET citizenPiiId => email
    userJSON.citizenPiiId = userJSON.email;
    const validatedUser = modelFieldsValidator.validate(User.getModel(), userJSON);
    var user = new User(validatedUser);
    
    // TODO refactor it with services and promises. WE MUST DELETE PHI IF PII CAN NOT CREATE!
    // create empty phi for all new users.
    let phiInstance = emptyPhiGenerator();
    phiInstance.email = userJSON.email;
    phiInstance.citizenPhiId = userJSON.email;
    let phiData = new PhiData(phiInstance);

    generateSalt(32).then(salt => {
      user.salt = salt;
      hashPassword(userJSON.password, user.salt)
        .then(newPassword => {
          user.password = newPassword;
          phiData.save(function (error, phi) {
              if (error) {
                  logger.error('Can not create empty phi for new user: ', error);
                  res.json({status: 500, error: "Internal server error"});
              } else {
                  user.save((err, results) => {
                      if (err){
                          console.log(err);
                          res.json(500, err);
                      }else{
                          res.end(JSON.stringify(results));
                      }
                  });
              }
          });
        })
        .catch((err)=> res.json(501, errorHandler(err)));
    })
    .catch((err)=> res.json(501, errorHandler(err)));
  }

  /**
   * PUT /api/user/:id
   * Update user.
   */
  , userUpdate: (req, res) => {
    let userJSON = req.body;

    // TODO: remove to mongoose validator!!!
    delete userJSON._id;
    delete userJSON.repeatPassword;
    delete userJSON.__v;
    delete userJSON.password;

    User.findOneAndUpdate(
      {email: req.decoded.email},
      userJSON,
      {upsert: true},
      (err, obj) => {
        if(err){
          res.json(500, err);
        }
        res.json(200, {
          status: 'ok',
          message: 'user updated.',
          user: obj
        })
      }
    );
  }

  /**
   * DELETE /api/user/:id
   * remove user
   */
  , userDelete: (req, res) => {
    const email = req.decoded.email;

    var promise = User.findOne({email: email}).exec();
    promise
      .then((obj) => {
        if (obj === null) {
          res.json(404, {
            status: 'error',
            message: 'User (Pii) not found'
          });
        }else{
          obj.remove();

          res.json(200, {
            status: 'ok',
            message: 'User deleted.'
          });
        }
      })
      .catch((err) => {
        res.json(500, err);
      });    
  }
  
  /**
   * POST /api/email
   * authorization by email and passcode
   */
  , email: (req, res) => {
    const email = req.decoded.email;

    var promise = Email.findOne({email: email}).exec();
    promise
      .then((obj) => {
        if (obj === null) {
          sendMail(res, email);
        }else{
          res.json(404, {
            message: 'Passcode already sent.'
          });
        }
      })
      .catch((err) => {
        res.json(500, err);
      });
  }
  
  /**
   * POST /api/passcode
   * finish 2 factor authorization
   */
  , passcode: (req, res) => {
    const email = req.decoded.email;
    const passcodeJSON = req.body;

    let promise = Email.findOne({email: email}).exec();
    promise
      .then((obj) => {
        if (obj === null) {
          return res.json(404, {
            status: 'error',
            message: 'no passcode for this user'
          });
        }
        if (obj.passcode == passcodeJSON.passcode) {
          obj.remove();

          let promiseAuth = authService.setPhoneVerified(email);
          promiseAuth
            .then(obj => {
              res.json(200, {
                status: 'ok',
                message: 'passcode correct',
              });              
            })
            .catch(err => {
              res.json(500, err);
            });
        }else{
          res.json(404, {
            status: 'error',
            message: 'passcode incorrect'
          });
        }
      })
      .catch((err) => {
        res.json(500, err);
      });
  }

  /**
   * GET /api/auth/settings
   * finish 2 factor authorization
   * - twoFactorAuth on/off
   * - twoFactorAuth_secret_base32 string
   * {
   *   "twoFactorAuth": 0,
   *   "twoFactorAuth_secret_base32": "string"
   * }
   */
  , settingsRead: (req, res) => {
    const email = req.decoded.email;
    let promise = User.findOne({email: email}).exec();
    promise
      .then((obj) => {
        if (obj === null) {
          return res.json(404, {
            status: 'error',
            message: 'no settings 2factorAuth for this user'
          });
        }
        res.json(200, {
          twoFactorAuth: obj.settings.twoFactorAuth,
          phoneVerified: obj.settings.phoneVerified,
        });
      })
      .catch((err) => {
        res.json(500, err);
      });    
  }

  /**
   * POST /api/auth/settings
   * finish 2 factor authorization
   * - twoFactorAuth on/off
   * - twoFactorAuth_secret_base32 string
   * {
   *   "twoFactorAuth": 0,
   *   "twoFactorAuth_secret_base32": "string"
   * }
   */
  , settingsCreateUpdate: (req, res) => {
    const email = req.decoded.email;
    let settings = req.body;

    let query = {email: email},
    update = {
      $set: {
        "settings.twoFactorAuth": settings.twoFactorAuth,
        "settings.phoneVerified": settings.phoneVerified
      }
    },
    options = { upsert: true, new: false, setDefaultsOnInsert: true };

    User.findOneAndUpdate(query, update, options, (err, result) => {
      if (err) {
        res.json(500, err);
      }else{
        res.json(200, update);
      }
    });
  }

  /**
   * GET /api/auth/qrcode
   * 2 factor authorization - QRcode
   */
  , qrcode: (req, res) => {
    let email = req.decoded.email;
    let secret = speakeasy.generateSecret({length: 20});
    let url = speakeasy.otpauthURL({ secret: secret.base32, label: "HealthyCitizen%20-%20" + email, algorithm: 'sha1', encoding: 'base32' });

    QRCode.toDataURL(url, function(err, data_url) {
      let query = {email: email},
      update = {
        $set: {"settings.twoFactorAuthSecretBase32": secret.base32}
      },
      options = { upsert: true, new: false, setDefaultsOnInsert: false };

      User.findOneAndUpdate(query, update, options, (err, result) => {
        if (err) {
          res.json(500, err);
        }else{
          let html = '<img src="'+ data_url +'" />';

          res.writeHead(200, {
            'Content-Length': html.length,
            'Content-Type': 'text/html'
          });
          res.write(html);
          res.end();
        }
      });
    });

  }

  /**
   * POST /api/auth/2factorauth/verify
   * 2 factor authorization - verify
   */
  , verify: (req, res) => {
    let key = req.body.key;
    let email = req.decoded.email;

    let promise = User.findOne({email: email}).lean().exec();
    promise
      .then((obj) => {
        if (obj === null) {
          return res.json(404, {
            status: 'error',
            message: 'no settings 2factorAuth for this user'
          });
        }

        var tokenDelta = speakeasy.totp.verify({
          secret: obj.settings.twoFactorAuthSecretBase32, //secret.base32
          encoding: 'base32',
          token: key,
          window: 6
        });

        if(tokenDelta === true){
          let promiseAuth = authService.setTwoFactorAuth(email);
          promiseAuth
            .then(obj => {
              let token = authService.generateTokenAfterTwoAuth(req.decoded);

              res.json(200, {
                status: 'ok',
                key: key,
                verified: tokenDelta,
                token: token
              })
            })
            .catch(err => {
              res.json(500, err);
            });
        }else{
          res.json(400, {
            status: 'error',
            key: key,
            verified: tokenDelta,
            message: "token is invalid"
          })
        }
      })
      .catch((err) => {
        res.json(500, err);
      });
  }

  , resetPassword: (req, res) => {
    let email = req.body.email;
    let query = {email: email},

    update = {
      $set: {
        "hash": randomHashGenerator.generate(50)
      }
    },
    options = { upsert: true, new: false, setDefaultsOnInsert: true };

    ResetPassword.findOneAndUpdate(query, update, options, (err, result) => {
      if (err) {
        res.json(500, err);
      }else{
        sendMailResetPassword(req, res, email, update.$set.hash);
        res.json(200, {
          status: "ok",
          email: email,
          hash: update.$set.hash
        })
      }
    });
  }

  , resetPasswordVerify: (req, res) => {
    let email = req.body.email;
    let hash = req.body.hash;
    let password = req.body.password;
    let promise = ResetPassword.findOne({email: email}).exec();
    promise
      .then((obj) => {
        if(obj.hash === hash){

          let promiseUser = User.findOne({email: email}).lean().exec();

          promiseUser
            .then(obj => {
              hashPassword(password, obj.salt)
                .then(newPassword => {
                  let query = {email: email},
                  update = {
                    $set: {
                      "password": newPassword
                    }
                  },
                  options = { upsert: true, new: false, setDefaultsOnInsert: true };

                  User.findOneAndUpdate(query, update, options, (err, result) => {
                    if (err) {
                      res.json(500, err);
                    }else{
                      sendMailResetPassword(req, res, email, update.$set.hash);
                      res.json(200, {
                        status: "ok",
                        email: email,
                        message: "password was updated successfully"
                      })
                    }
                  });

                })
                .catch((err)=> res.json(501, errorHandler(err)));
            })
            .catch(err => {
              res.json(500, err);
            });

        }else{
          res.json(500, {
            status: "error",
            message: "reset link is not equal we send you."
          });
        }
      })
      .catch((err) => {
        // res.json(500, err);
        res.json(500, {
          status: "error",
          message: "reset link is not valid."
        });

      });

  }

};

// TODO: move this into single email service with appropriate options and types
var sendMailResetPassword = function(req, res, email, hash){
  // TODO: move this into settings
  const transporter = nodemailer.createTransport('smtps://healthcityzen@gmail.com:5xqnBkqeAABHFCHF@smtp.gmail.com');

  var host = req.headers.host;
  var mailOptions = {
    from: '"Health Cityzen" <healthcityzen@gmail.com>',
    to: email,
    subject: 'Reset your password',
    text: 'to reset password goto link: '+ host + req.url + "?hash="+ hash
  };

  return new Promise(function (resolve, reject) {

    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        return reject(err);
      }
      resolve({
        message: 'Message sent: ' + info.response,
        email: email,
      });
    });

  });
}

// TODO move this into email service
// internal function to Send email
var sendMail = function(res, email){
  // TODO: move this into settings
  const transporter = nodemailer.createTransport('smtps://healthcityzen@gmail.com:5xqnBkqeAABHFCHF@smtp.gmail.com');

  emailService.generateEmailModel(email)
      .then(function (emailModel) {
        var mailOptions = {
          from: '"Health Cityzen" <healthcityzen@gmail.com>',
          to: email,
          subject: 'Hello',
          text: 'Hello world',
          html: '<b>passcode: '+ emailModel.passcode +'</b>'
        };
  
        transporter.sendMail(mailOptions, function(error, info){
          if(error){
            res.json(500, error);
          }
          res.json(200, {
            message: 'Message sent: ' + info.response,
            email: emailModel.email,
          });
        });
      })
}

module.exports = userController;
