const AlertData = require('../models/alerts')
    , mongoose = require('mongoose')
    , dotenv = require('dotenv')
    , modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
    , Q = require("q");


const modelsJson = require('./../src/data_model/model-v2');

const model = modelInstanceGenerator(modelsJson.models.alerts, "mongoose");

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

var count = process.env.NUMBER;
var promises = [];
for(var i = 0; i < count; i++) {
    let alertInstance = modelInstanceGenerator(model, "instance");

    let alertData = new AlertData(alertInstance);
    var promise = alertData.save(function(err, results){
        if (err){
            console.log(err);
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
