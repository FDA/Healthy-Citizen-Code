/**
 * Implements endpoints for questionnaire widget
 * @returns {{}}
 */
module.exports = function (globalMongoose) {
  const fs = require('fs');
  const _ = require("lodash");
  const async = require('async');
  const log = require('log4js').getLogger('research-app-model/questionnaire-controller');
  const ObjectID = require('mongodb').ObjectID;
  const axios = require('axios');
  const Promise = require("bluebird");
  const mongoose = Promise.promisifyAll(globalMongoose);

  let m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('post', `/findDrugInteractionsForNdcs`, [m.findDrugInteractionsForNdcs]);
  };

  const findInteractionsFromList = (rxcuis) => {
    return axios(`https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join('+')}`)
  };

  const findRxcuiByNdc = (ndc) => {
    return axios(`https://rxnav.nlm.nih.gov/REST/rxcui.json?idtype=NDC&id=${ndc}`)
  };

  m.findDrugInteractionsForNdcs = (req, res, next) => {
    let ndcs = req.body.ndcs;
    if (!Array.isArray(ndcs)) {
      return res.json({success: false, message: `Body should contain 'ndcs' - array of ndc codes.`});
    }

    ndcs = _.uniq(ndcs);
    if (ndcs.length < 2) {
      return res.json({success: false, message: 'Should contain more than 1 ndc code to find drug interactions.'});
    }

    let rxcuis = [];
    // 1. Find rxcui for all specified ndc codes.
    return Promise.map(ndcs, (ndc) => {
      return findRxcuiByNdc(ndc)
        .then((response) => {
          const ndcRxcuis = _.get(response.data, 'idGroup.rxnormId');
          if (ndcRxcuis) {
            rxcuis = rxcuis.concat(ndcRxcuis);
          }
        })
        .catch((err) => {
          // Rxcui is not found for current NDC
          console.log(`Error occurred while getting rxcui by ndc: ${ndc}`);
        });
    })
      .then(() => {
        return findInteractionsFromList(rxcuis);
      })
      .catch((err) => {
        console.log(`Error occurred while searching for drugInteraction. rxcuis: ${rxcuis}. ${err}`);
        return res.json({
          success: false,
          message: `Error occurred while searching for drugInteraction.`
        });
      })
      .then((response) => {
        const results = [];
        // 4. Get drug interaction info
        const fullInteractionTypeGroup = response.data.fullInteractionTypeGroup;
        _.forEach(fullInteractionTypeGroup, group => {
          _.forEach(group.fullInteractionType, interactionType=> {
            _.forEach(interactionType.interactionPair, interactionPair => {
              results.push({
                severity: interactionPair.severity,
                description: interactionPair.description,
              });
            })
          })
        });
        const count = results.length;
        const list = results.slice(0, 20);
        return res.json({
          success: true,
          data: {
            list,
            count
          }
        });
      })
      .catch((err) => {
        if (_.isString(err)) {
          return res.json({
            success: false,
            message: err
          });
        }
        return res.json({
          success: false,
          message: err.message
        });
      });
  };

  return m;
};
