const _ = require('lodash');

// default transformer
function def(doc) {
  return {
    ...doc, // for now just copy raw json into doc (there might be transformations)
    rawData: doc,
  };
}

function drug(doc) {
  return {
    ...doc,
    name: _.get(doc, 'openfda.brand_name.0', _.get(doc, 'openfda.generic_name.0')),
    rawData: doc,
  };
}

// used for first stage - pumping recall data, see 'open_fda/pump_device_recall_with_enforcements/pump_device_recall_with_enforcements.js'
function pumpDeviceRecallWithEnforcements(doc) {
  return {
    ...doc,
    rawDataRecall: doc,
  };
}

module.exports = {
  def,
  drug,
  pumpDeviceRecallWithEnforcements,
};
