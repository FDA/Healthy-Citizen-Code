const mongoose = require('mongoose')
	, _ = require("lodash");


const model = {
	email: String,
	passcode: String,
	createdAt: { type: Date, default: Date.now, expires: 300}
};

const emailSchema = new mongoose.Schema(model, {versionKey: false});


const Email = mongoose.model('Email', emailSchema);
Email.getModel = () => {
	return _.cloneDeep(model);
};

Email.getModelJSON = () => {
	return _.cloneDeep(model);
};


module.exports = Email;
