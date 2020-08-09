const Settings = require('../models/settings')
, mongoose = require('mongoose')
, dotenv = require('dotenv')
, generateString = require('../lib/randomstring')
, Q = require("q");

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
var promises = [];

for(var i = 0; i < count; i++){
	var settings = new Settings({
		key: generateString.generate(),
		value: generateString.generate()
	});

	var promise = settings.save(function(err, results){
		if (err) {
			console.log(err.errors);
			return done(err)
		} else {
			console.log(results);
		}
	});

	promises.push(promise);
}

Q.all(promises).then(function(users){
	process.exit();    
});
