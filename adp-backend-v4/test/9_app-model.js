const glob = require("glob");
const fs = require('fs');

describe('App Model Routes', () => {
    before(function () {
        delete process.env.APP_MODEL_DIR;
        delete process.env.APP_ID;
        delete process.env.MONGODB_URI;
        const dotenv = require('dotenv').load({path: '.env'});
        process.env.DEVELOPMENT = true;
        _.forOwn( mongoose.connection.models, (val, key) => {
            delete mongoose.connection.models[key];
        });
        return new Promise((resolve, reject) => {
            appLib.loadModel();
            let errors = mutil.validateAndCleanupAppModel();
            assert(errors.length == 0, errors.join("\n"));
            appLib.generateMongooseModels((err) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve();
                }
            });
        });
    });
    it('Generates core models', function (done) {
        mongoose.connection.readyState.should.equal(1);
        assert(_.indexOf(mongoose.modelNames(), 'users') >= 0);
        assert(_.keys(_.get(appModel, 'metaschema').length > 0));
        assert(_.keys(_.get(appModel, 'interface').length > 0));
        assert(_.keys(_.get(appModel, 'interface.mainMenu').length > 0));
        done();
    });
    it('Passes app-model specific tests', function(done) {
        const files = glob.sync(`${process.env.APP_MODEL_DIR}/test/**/*.js`);
        if(files.length > 0) {
            console.log(`Running model-specific tests in ${process.env.APP_MODEL_DIR}`);
            files.forEach((file) => {
                eval(fs.readFileSync(file, 'utf8'));
            });
            done();
        } else {
            console.log('No app-model-specific tests are specified');
            done();
        }
    })
});
