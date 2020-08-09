const MedicationData = require('../models/medication')
    , mongoose = require('mongoose')
    , dotenv = require('dotenv')
    , modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
    , Q = require("q");


const modelsJson = require('./../src/data_model/model-v2');

const model = modelInstanceGenerator(modelsJson.models.medication, "mongoose");
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
var email = process.env.EMAIL;

var promises = [];
for(var i = 0; i < count; i++) {
    let medicationInstance = modelInstanceGenerator(model, "instance");
    if (medicationInstance.email) {
        medicationInstance.email = email
    }

    let medicationData = new MedicationData(medicationInstance);
    var promise = medicationData.save(function(err, results){
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
