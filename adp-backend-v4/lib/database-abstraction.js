/**
 * @module database-abstraction
 * This module was create in an attempt to abstract database access from the rest of the code.
 * The primary reason is that mongoose is doing terrible job with middleware, so we need to call
 * pre and post hooks manually.
 * Overall it would be great to get rid of mongoose completely and work directly with the driver.
 * This will be possible with further expansion of this module.
 */
module.exports = function () {

    const fs = require("fs");
    const _ = require('lodash');
    const async = require("async");
    const log = require('log4js').getLogger('lib/database-abstraction');
    const transformers = require('./transformers')();
    const butil = require('./backend-util')();

    butil.loadTransformers();
    butil.loadSynthesizers();
    butil.loadValidators();

    let m = {};

    /**
     * Updates ONE document based on mongoConditions
     * This method is tricky because it needs to call transformers and validations on the portion of the document
     * That only sits in the req.body.data
     * NOTE that the whole record needs to be updated because mongodb does not support updating nested arrays and objects as of 4.2
     * Some optimization includes using '$' placeholder for arrays, but it only allows diving 1 level down as there cannot
     * be more than one '$' per condition. Watch after mongodb enhancements in the future versions.
     * IDEA: if we limit the depth of the database structure to 3 levels we can optimize these queries
     * TODO: optimize queries using $, projection and other features available in mongo at the moment
     * @param action  operation to perform: $set, $push or $pull. Do not use these directly in mongodb query, read note above
     * @param model
     * @param mongoConditions
     * @param origData associative array containing the data to be updated
     * @param path the path to the element of appModel that's being updated ("" if the entire record is being updated)
     * @param cb
     */
    m.updateItem = (action, model, mongoConditions, origData, path, cb) => {
        let data = _.cloneDeep(origData);
        //log.trace(`${action} ${path} ${JSON.stringify(origData, null, 4)}`);
        async.series([
            (cb) => {
                //if (action == '$pull') {
                //    cb();
                //} else {
                    transformers.preSaveTransformData(model.modelName, data, /*[]*/path, cb);
                //}
            },
            (cb) => {
                model.findOneAndUpdate(mongoConditions, data, (err) => {
                    if( err ) {
                        log.error(`Unable to update data: ${err}`);
                        cb('Internal Server Error');
                    } else {
                        cb();
                    }
                });
            }
        ], (err) => {
            cb(err);
        });
    };

    /**
     * Creates/saves new item.
     * This creates whole new item, not just a submodel of existin element, so the transformers and validators should be applied to the whole item
     * @param item new mongoose model item
     * @param cb
     */
    m.createItem = (model, origData, cb) => {
        let data = _.cloneDeep(origData);
        transformers.preSaveTransformData(model.modelName, data, [], (err) => {
            if (err) {
                cb(err);
            } else {
                // Used for preserving key order in objects.
                // Recommendation from one of authors: https://github.com/Automattic/mongoose/issues/2749#issuecomment-234737744
                model.schema.options.retainKeyOrder = true;
                let record = new model(data);
                record.save(cb);
            }
        });
    };

    m.removeItem = (model, conditions, cb) => {
        model.remove({_id: conditions._id}, cb);
    };

    // TODO: rewrite using cursors?
    m.findItems = (model, processor, conditions = {}, projections = {}, sort = {}, skip = 0, limit = -1, runPostprocessing = true) => {
        model.find(conditions).sort(sort).skip(skip).limit(limit).lean().exec((err, data) => {
            if (runPostprocessing && data) { // some operations like putItems require postprocessing to be skipped
                data.forEach((el) => {
                    transformers.postInitTransformData(model.modelName, el);
                });
            }
            processor(err, data);
        });
    };

    return m;
};
