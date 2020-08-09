const mongoose = require('mongoose')
	, bcrypt = require('bcrypt')
	, helpers = require('../lib/model_helpers')
	, _ = require('lodash')
	, generator = require('./../generators/model_instance_generator')
	, modelsJson = require('./../src/data_model/model-v2.json')
	, model = generator.modelInstanceGenerate(modelsJson.models.pii, "mongoose");

const userSchema = new mongoose.Schema(model, {strict: false, versionKey: false});

/**
 * Password hash middleware.
 */
userSchema.pre('save', function (next) {
	const user = this;
	if (!user.isModified('password')) { return next(); }
	bcrypt.genSalt(10, (err, salt) => {
		if (err) { return next(err); }
		bcrypt.hash(user.password, salt, (err, hash) => {
		  	if (err) { return next(err); }
		  	user.password = hash;
		  	user.salt = salt;
		  	next();
		});
	});
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch);
  });
};

// /**
//  * Helper method for getting user's gravatar.
//  */
// userSchema.methods.gravatar = function (size = 200) {
//   if (!this.email) {
//     return `https://gravatar.com/avatar/?s=${size}&d=retro`;
//   }
//   const md5 = crypto.createHash('md5').update(this.email).digest('hex');
//   return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
// };


const User = mongoose.model('User', userSchema);

User.normalize = (user) => {
	return helpers.objectNormalize(user, helpers.excludeListUser);
};
User.getModel = () => {
	return _.cloneDeep(model);
};
User.getModelJSON = () => {
	return _.cloneDeep(modelsJson.models.pii);
};

User.init = function(init) {
};


module.exports = User;
