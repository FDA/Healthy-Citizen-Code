const User = require('../models/user')
, mongoose = require('mongoose')
, dotenv = require('dotenv')
, generateString = require('../lib/randomstring')
, Q = require("q");
let Chance = require('chance');
let chance = new Chance();

dotenv.load({ path: '.env' });

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
mongoose.connection.on('connected', () => {
  console.log('%s MongoDB connection established!');
});
mongoose.connection.on('error', () => {
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.');
  process.exit();
});

var userCount = process.env.NUMBER;
var userEmail = process.env.USER_EMAIL;
var promises = [];

for(var i = 0; i < userCount; i++){
	let email = generateString.generate();
	if (userEmail) {
		email = userEmail
	}
	var user = new User({
		firstName: chance.first(),
		lastName: chance.last(),
		email: generateString.generate() + "@gmail.com",
		provider: email,
		password: "111"
	});
	console.log(user);
	
	var promise = user.save(function(err, results){
		if (err){
			console.log(err.errors);
			return done(err)
		}else{
			console.log(results);
		}
	});

	promises.push(promise);
}

Q.all(promises).then(function(users){
	process.exit();    
});
