/**
 * Implements endpoints for questionnaire widget
 * @returns {{}}
 */
const _ = require('lodash');
const axios = require('axios');
const Promise = require('bluebird');
const log = require('log4js').getLogger('research-app-model/dashboard-controller');

module.exports = function () {
  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('post', `/findDrugInteractionsForNdcs`, [m.findDrugInteractionsForNdcs]);
  };

  const findInteractionsFromList = (rxcuis) =>
    axios(`https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join('+')}`);

  const findRxcuiByNdc = (ndc) => axios(`https://rxnav.nlm.nih.gov/REST/rxcui.json?idtype=NDC&id=${ndc}`);

  m.findDrugInteractionsForNdcs = async (req, res) => {
    let { ndcs } = req.body;
    if (!Array.isArray(ndcs)) {
      return res.json({ success: false, message: `Body should contain 'ndcs' - array of ndc codes.` });
    }

    ndcs = _.uniq(ndcs);
    if (ndcs.length < 2) {
      return res.json({ success: false, message: 'Should contain more than 1 ndc code to find drug interactions.' });
    }

    const rxcuis = [];
    // Find rxcui for all specified ndc codes.
    await Promise.map(ndcs, async (ndc) => {
      try {
        const response = await findRxcuiByNdc(ndc);
        const ndcRxcuis = _.get(response.data, 'idGroup.rxnormId');
        if (_.isArray(ndcRxcuis)) {
          rxcuis.push(...ndcRxcuis);
        }
      } catch (e) {
        // Rxcui is not found for current NDC
        log.error(`Error occurred while getting rxcui by ndc: ${ndc}`);
      }
    });

    try {
      const interactionResponse = await findInteractionsFromList(rxcuis);
      const results = [];
      // Get drug interaction info
      const { fullInteractionTypeGroup } = interactionResponse.data;
      _.forEach(fullInteractionTypeGroup, (group) => {
        _.forEach(group.fullInteractionType, (interactionType) => {
          _.forEach(interactionType.interactionPair, (interactionPair) => {
            results.push({
              severity: interactionPair.severity,
              description: interactionPair.description,
            });
          });
        });
      });
      const count = results.length;
      const list = results.slice(0, 20);

      return res.json({
        success: true,
        data: { list, count },
      });
    } catch (e) {
      log.error(`Error occurred while searching for drugInteraction. rxcuis: ${rxcuis}. ${e.stack}`);
      return res.json({
        success: false,
        message: `Error occurred while searching for drugInteraction.`,
      });
    }
  };

  return m;
};
