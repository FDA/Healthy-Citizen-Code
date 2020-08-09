"use strict";

const jwt = require("jsonwebtoken")
	, authService = require('./../services/auth_service')
	, logger = require('log4js').getLogger();

/**
 * Check if User authentificated
 */

module.exports.isAuthenticated = (req, res, next) => {
	try{
		let token = req.query.token || req.headers["authorization"].split("Bearer: ")[1];
		if (token) {
			jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
				if (err) return res.json(403, { success: false, message: "Failed to authenticate token." });

				if(decoded.exp < (new Date).getTime()) return res.json(403, { success: false, message: "Token has been expired." });

				let promise = authService.getTwoFactorAuth(decoded.email);
				promise
					.then(obj => {
						if(obj.settings.twoFactorAuth === true) {
							if(req.url == "/api/auth/2factorauth/verify"){
								req.decoded = decoded;
								next();
							}else{
								if(decoded.twoFactorAuth !== true){
									return res.json(403, { success: false, message: "2 factor authentication is not passed." });
								}
							}
						}
					})
					.catch(error => {
						// TODO add functionality here
						logger.error(error)
					});

				// if ((decoded.passcode === undefined) && (decoded.passcode !== true)) return res.json(403, { success: false, message: "2 factor authentication is not passed." });
				req.decoded = decoded;
				next();
			});
		} else {
			res.json(403,{
				success: false
				, message: "No token provided."
			});
		}
	}
	catch(err){
		res.json(403,{
			success: false
			, message: "No token provided."
		});
	}
}
