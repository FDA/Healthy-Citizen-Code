const PhiData = require('../models/phi_data')
    , mongoose = require('mongoose')
    , dotenv = require('dotenv')
    , Q = require("q")
    , _ = require('lodash');

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

let subDocName = process.env.SUBDOC;
let email = process.env.EMAIL;

PhiData.findOne({email: email}, function (error, doc) {
    if (error) {
       console.log('Error: ', error);
    } else
    if (!doc) {
       console.log("Not found document");
    } else {
       if (!doc[subDocName]) {
           console.log('Not found sub document');
       } else {
           doc[subDocName] = [];
           _.each(doc[subDocName], function (item, index) {
               doc[subDocName].pull(item._id)
           });
           console.log(subDocName + " successfully deleted")
       }
    }
    doc.save(function (error) {
        if (error) {
            console.log('Save new document error: ', error)
        }
        process.exit();
    });
});


