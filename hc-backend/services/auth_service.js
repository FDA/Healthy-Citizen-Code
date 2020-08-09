const jwt = require("jsonwebtoken")
, User = require('../models/pii_data');

// module.exports.generateTokenAfterTwoFactorAuth = function (token) {
//     return jwt.sign(JSON.stringify({userID: token.userID, email: token.email, passcode: true}), process.env.JWT_SECRET)
// };

module.exports.generateTokenAfterTwoAuth = function (decoded) {
    return jwt.sign(JSON.stringify({
    	userID: decoded.userID,
    	email: decoded.email,
    	exp: getTokenExpires(30),
    	twoFactorAuth: true
    }), process.env.JWT_SECRET);
};

module.exports.generateTokenAfterLogin = function (_u) {
    return jwt.sign(JSON.stringify({
    	userID: _u.id,
    	email: _u.email,
    	exp: getTokenExpires(30)
    }), process.env.JWT_SECRET);
};


module.exports.setPhoneVerified = function (email) {
	let query = {email: email},
	update = {
		$set: {
			"settings.phoneVerified": true
		}
	},
	options = { upsert: true, new: false, setDefaultsOnInsert: true };

	return User.findOneAndUpdate(query, update, options);
};

module.exports.setTwoFactorAuth = function (email) {
	let query = {email: email},
	update = {
		$set: {
			"settings.twoFactorAuth": true
		}
	},
	options = { upsert: true, new: false, setDefaultsOnInsert: true };

	return User.findOneAndUpdate(query, update, options);
};

module.exports.getTwoFactorAuth = function (email) {
	let query = {email: email};

	return User.findOne(query).exec();
};


module.exports.getToken = function (req) {
	return req.query.token || req.headers["authorization"].split("Bearer: ")[1];
};

const getTokenExpires = days => {
	let d = new Date();
	d.setDate(d.getDate()+days);
	// d.setMinutes(d.getMinutes()+1);
	return d.getTime();
}
