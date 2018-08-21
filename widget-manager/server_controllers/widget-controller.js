/**
 * Implements endpoints for questionnaire widget
 * @returns {{}}
 */
module.exports = function (globalMongoose) {
  const _ = require("lodash");
  const log = require('log4js').getLogger('widget-manager/widget-controller');
  const ObjectID = require('mongodb').ObjectID;

  const mongoose = globalMongoose;

  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('get', `/widgets/:id`, [m.getWidget]);
  };

  m.getWidget = (req, res, next) => {
    const widgetId = req.params.id;
    return mongoose.model('widgets').findOne({id: widgetId})
      .then((widgetData) => {
        res.json({success: true, data: widgetData});
      })
      .catch(err => {
        log.log(err.message);
        res.json({success: false, message: 'Unable to get widget params.'});
      });
  };

  return m;
};
