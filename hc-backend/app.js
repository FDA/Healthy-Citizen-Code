const restify = require('restify')
, mongoose = require('mongoose')
, EventEmitter = require('events')
, chalk = require('chalk')
, dotenv = require('dotenv');

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const generatorController = require('./controllers/generator');
// ------------------------------------------------------------------------------
// const userController = require('./controllers/user');
// const settingsController = require('./controllers/settings');
const phiDataController = require('./controllers/phi_data');
const piiDataController = require('./controllers/pii_data');
const medicationController = require('./controllers/medication');
// ------------------------------------------------------------------------------

// fhir controllers
// const fhirPiiClientWrapperController = require('./controllers/fhir/pii/client_wrapper');
// const fhirPhiClientWrapperController = require('./controllers/fhir/phi/client_wrapper');
// const fhirUserClientWrapperController = require('./controllers/fhir/user/client_wrapper');
// const fhirSettingsClientWrapperController = require('./controllers/fhir/settings/client_wrapper');
// const fhirMedicationsClientWrapperController = require('./controllers/fhir/medication/client_wrapper');

// // remote server controllers
const fhirPiiServerController = require('./controllers/fhir/pii/server');
const fhirPhiServerController = require('./controllers/fhir/phi/server');
// // const fhirUserServerController = require('./controllers/fhir/user/server');
// const fhirSettingsServerController = require('./controllers/fhir/settings/server');
// const fhirMedicationServerController = require('./controllers/fhir/medication/server');

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
mongoose.connection.on('connected', () => {
  console.log('%s MongoDB connection established!', chalk.green('✓'));
});
mongoose.connection.on('error', () => {
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});
// mongoose.set('debug', true);


dotenv.load({ path: '.env' });

/**
 * Restify configuration.
 */
var app = restify.createServer({
  name: 'Healthy Citizen',
});
app.use(restify.queryParser());
app.use(restify.bodyParser());
app.use(restify.CORS({
    origins: ['*'],
    credentials: false
}));

// FIX OPTIONS is not allowed bug!
restify.CORS.ALLOW_HEADERS.push("authorization");

app.on("MethodNotAllowed", (req, res) => {
  if(req.method.toUpperCase() === "OPTIONS" ) {
    // Send the CORS headers
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Access-Control-Allow-Headers", restify.CORS.ALLOW_HEADERS.join( ", " ));
    res.send(204);
  }
  else {
    res.send(new restify.MethodNotAllowedError());
  }
});

/**
 * Primary app routes.
 */
app.get('/', homeController.index);

require("./routes/user")(app);
require("./routes/settings")(app);
require("./routes/phi_data")(app);
// require("./routes/pii_data")(app);
require("./routes/alerts")(app);



//
// There added functionality for synchronization with FHIR real server
//
require("./routes/sync")(app);




require("./routes/side_effects")(app);
require("./routes/fhir_resources")(app);
require("./routes/medication")(app);
require("./routes/medical_devices")(app);

// app.post('/api/settings', generatorController.settingsCreate);
app.get('/api/schema/user', generatorController.userSchema);
app.get('/api/schema/phidata', generatorController.phiDataSchema);
app.get('/api/schema/piidata', generatorController.piiDataSchema);
app.get('/api/schema/piidata', generatorController.piiDataSchema);
app.get('/api/schema/settings', generatorController.settingsSchema);
app.get('/api/schema/medication', generatorController.medicationSchema);
app.get('/api/schema', generatorController.schema);


app.listen(process.env.APP_PORT);

module.exports = app;
