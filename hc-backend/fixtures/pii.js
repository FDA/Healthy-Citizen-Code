const PiiData = require('../models/pii_data')
, mongoose = require('mongoose')
, dotenv = require('dotenv')
, modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
, Q = require("q")
, generateString = require('../lib/randomstring');
let Chance = require('chance');
let chance = new Chance();

const modelsJson = require('./../src/data_model/model-v2');
const model = modelInstanceGenerator(modelsJson.models.pii, "mongoose");

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
var promises = [];

for(var i = 0; i < count; i++){
	let piiInstance = modelInstanceGenerator(model, "instance");
	if (piiInstance.email && email) {
		piiInstance.email = email
	}
	else {
		piiInstance.email += generateString.generate() + "@gmail.com"
	}
	piiInstance.firstName = chance.first();
	piiInstance.lastName = chance.last();
		
	piiInstance.password = '111';
	let piiData = new PiiData(piiInstance);
	var promise = piiData.save(function(err, results){
		if (err){
			console.log(err);
		}else{
			console.log(results);
		}
	});
	promises.push(promise);
}

Q.all(promises).then(function(users){
	process.exit();    
});
