// TODO: depreciate this file and folder in favor of custom controllers
/**
 * Implements endpoints of research app methods
 * @returns {{}}
 */
module.exports = function (globalMongoose) {
    const mongoose = globalMongoose;
    const async = require('async');
    const log = require('log4js').getLogger('research-app-model/pool-controller');

    let m = {};

    m.init = (appLib) => {
        appLib.addRoute('post', `/create-pool`, [m.createPool]);
    };

    m.createPool = (req, res, next) => {
        let pool;
        async.series([
            (cb) => { // try to find pool with this ID
                mongoose.model('pools').find({
                    poolName: req.body.name
                }, (err, data) => {
                    if(err || !data) {
                        log.error(`Error while searching for pool: ${err}`);
                    } else {
                        pool = data[0];
                    }
                    cb(err);
                });
            },
            (cb) => { // create pool if necessary
                if (!pool) {
                    mongoose.model('pools').create({
                        poolName: req.body.name,
                        poolId: req.body.name
                    }, (err, data) => {
                        if (err) {
                            log.error(`Error while creating pool: ${err}`);
                        } else {
                            pool = data;
                        }
                        cb(err);
                    });
                } else {
                    cb();
                }
            },
            (cb) => { // create participants
                async.eachSeries(req.body.guids, (id, cb) => {
                    mongoose.model('poolParticipants').create({
                        poolId: pool._id,
                        poolId_label: pool.poolName,
                        guid: id,
                        statusCode: 1,
                        statusDate: new Date(),
                        activeDate: new Date()
                    }, (err, data) => {
                        if(err) {
                            log.error(`Error while creating pool participant: ${err}`);
                        }
                        cb(err);
                    });
                }, cb);
            }
        ],(err) => {
            if(err) {
                log.error(`Pool creating failed: ${err}`);
                res.json({
                    success: false,
                    message: err
                });
            } else {
                res.json({
                    success: true,
                    data: pool
                });
            }
            next();
        });
    };

    return m;
};