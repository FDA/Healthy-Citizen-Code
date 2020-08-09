const mongoose = require('mongoose')
	, _ = require("lodash");


const model = {
	email: String,
	hash: String,
	createdAt: { type: Date, default: Date.now, expires: 300}
};

const resetPasswordSchema = new mongoose.Schema(model, {versionKey: false});


const ResetPassword = mongoose.model('ResetPassword', resetPasswordSchema);
ResetPassword.getModel = () => {
	return _.cloneDeep(model);
};

module.exports = ResetPassword;
