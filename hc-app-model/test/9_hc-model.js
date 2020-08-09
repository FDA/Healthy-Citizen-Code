// test public folder
// test model validation (try to feed incorrect model spec)
// TODO: test validator on various strings
describe('V3 HC Schema', () => {
    it('Passes Metaschema validation', function(done) {
        process.env.APP_MODEL_DIR = "../hc-app-model";
        appLib.loadModel();
        let errors = mutil.validateAndCleanupAppModel();
        assert(errors.length == 0, errors.join("\n"));
        done();
    });
});

describe('V3 HC Schema Routes', () => {
    before(function () {
        process.env.MONGODB_URI = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/hc-test";
        process.env.APP_MODEL_DIR = "../hc-app-model";
        process.env.DEVELOPMENT = true;
        delete mongoose.connection.models['users'];
        delete mongoose.connection.models['piis'];
        delete mongoose.connection.models['phis'];
        delete mongoose.connection.models['files'];
        return new Promise((resolve, reject) => {
            appLib.loadModel();
            appLib.generateMongooseModels((err) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve();
                }
            });
        });
    });
    it('Generates HC core models', function (done) {
        mongoose.connection.readyState.should.equal(1);
        assert(_.indexOf(mongoose.modelNames(), 'users') >= 0);
        assert(_.indexOf(mongoose.modelNames(), 'phis') >= 0);
        assert(_.indexOf(mongoose.modelNames(), 'piis') >= 0);
        assert(_.indexOf(mongoose.modelNames(), 'files') >= 0);
        assert(_.keys(_.get(appModel, 'metaschema').length > 0));
        assert(_.keys(_.get(appModel, 'interface').length > 0));
        assert(_.keys(_.get(appModel, 'interface.main_menu').length > 0));
        done();
    });
});
