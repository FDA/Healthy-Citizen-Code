const Hospital = require('../models/hospital');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

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

var url = process.env.URL;
var name = process.env.NAME;

var hospital = new Hospital({
    name: name,
    url: url
});

hospital.save(function(err, results){
    if (err){
        console.log(err.errors);
        return done(err)
    }else{
        console.log(results);
    }
});

// process.exit();
