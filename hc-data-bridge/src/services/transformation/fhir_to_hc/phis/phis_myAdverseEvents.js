const moment = require('moment');
const _ = require('lodash');

module.exports = {
  extensionTo_id (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myAdverseEvents.id';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToSubject (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myAdverseEvents.subject';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToEventId (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myAdverseEvents.eventId';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToDetails (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myAdverseEvents.details';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToProductName (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myAdverseEvents.productName';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToProductType (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myAdverseEvents.productType';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToKey (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myAdverseEvents.key';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
};
