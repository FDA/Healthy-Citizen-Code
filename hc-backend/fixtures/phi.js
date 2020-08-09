const PhiData = require('../models/phi_data')
, mongoose = require('mongoose')
, dotenv = require('dotenv')
, dependencies = require('./../src/data_model/model_dependencies').phiDependecies
, modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
, Q = require("q");


const modelsJson = require('./../src/data_model/model-v2');

const model = modelInstanceGenerator(modelsJson.models.phi, "mongoose");
dotenv.load({ path: '.env' });

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established!');
});
mongoose.connection.on('error', () => {
  console.log('MongoDB connection error. Please make sure MongoDB is running.');
  process.exit();
});

var count = process.env.NUMBER;
var email = process.env.USER_EMAIL;
// var encounterCount = process.enm?
var promises = [];

for(var i = 0; i < count; i++) {
	let phiInstance = modelInstanceGenerator(model, "instance", dependencies);
	
	if (phiInstance.email) {
		phiInstance.email = email
	}
	let phiData = new PhiData(phiInstance);
	var promise = phiData.save(function(err, results){
		if (err){
			console.log(err.errors);
			return err;
		}else{
			console.log('Success insert');
			console.log(results);
		}
	});

	promises.push(promise);
}

Q.all(promises).then(function(users){
	process.exit();    
});
