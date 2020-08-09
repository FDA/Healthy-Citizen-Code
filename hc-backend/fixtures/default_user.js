const PiiData = require('../models/pii_data')
    , mongoose = require('mongoose')
    , dotenv = require('dotenv')
    , modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
    , Q = require("q")
    , generateString = require('../lib/randomstring')
    , logger = require('log4js').getLogger()
    , emailService = require('./../services/email_service')
    , authService = require('./../services/auth_service');

let Chance = require('chance');
let chance = new Chance();

const modelsJson = require('./../src/data_model/model-v2');
const model = modelInstanceGenerator(modelsJson.models.pii, "mongoose");

dotenv.load({ path: '.env.example' });

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
mongoose.connection.on('connected', () => {
    console.log('MongoDB connection established!');
});
mongoose.connection.on('error', () => {
    console.log('MongoDB connection error. Please make sure MongoDB is running.');
    process.exit();
});

let email = process.env.EMAIL;
if (!email) {
    return logger.error("Please type your correct email, it need for authorisation.")
}

// create default user
let defaultPii = modelInstanceGenerator(model, "instance");
defaultPii.email = email;
defaultPii.password = "password";
defaultPii.firstName = "Tester";
defaultPii.lastName = "Pester";

let piiData = new PiiData(defaultPii);
logger.trace(piiData)
piiData.save(function(err, results) {
    if (err) {
        logger.error(err);
    } else {
        console.log(results);
    }
});

