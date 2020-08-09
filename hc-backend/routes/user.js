"use strict";

const userController = require("../controllers/user")
, auth = require("./auth");

module.exports = app => {

	app.post("/api/login", userController.authUser);
	// app.post("/register", userController.createUser);

	// User endpoints
	app.get('/api/user', auth.isAuthenticated, userController.userList);
	app.get('/api/user/:id', auth.isAuthenticated, userController.userRead);
	app.post('/api/user', userController.userCreate);
	app.put('/api/user', auth.isAuthenticated, userController.userUpdate);
	app.del('/api/user', auth.isAuthenticated, userController.userDelete);

	app.post('/api/auth/email', auth.isAuthenticated, userController.email);
	app.post('/api/auth/passcode', auth.isAuthenticated, userController.passcode);
	app.get('/api/auth/settings', auth.isAuthenticated, userController.settingsRead);
	app.post('/api/auth/settings', auth.isAuthenticated, userController.settingsCreateUpdate);
	app.get('/api/auth/qrcode', auth.isAuthenticated, userController.qrcode);
	app.post('/api/auth/2factorauth/verify', auth.isAuthenticated, userController.verify);
	app.post('/api/auth/reset/password', userController.resetPassword);
	app.post('/api/auth/reset/password/verify', userController.resetPasswordVerify);

	// app.get("/user/:id", isAuthenticated, (req,res) => userController.hadPermission("user.read", req, res, userController.userRead));
	// app.del("/user/:id", isAuthenticated, (req,res) => userController.hadPermission("user.delete", req, res, userController.userDelete));
	// app.put("/user/:id", isAuthenticated, (req,res) => userController.hadPermission("user.update", req, res, userController.userUpdate));

	// app.get("/users", isAuthenticated, (req,res) => userController.hadPermission("users.read", req, res, userController.userList));
};
