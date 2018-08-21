const _ = require('lodash');
const helper = require('./../../../lib/helper');

module.exports = {
  // pretransform
  splitMyAdverseEventsToArray (phis, inputSettings) {
    return _.map(phis.myAdverseEvents, (adverseEvent) => {
      const preparedObj = {};
      preparedObj._id = adverseEvent._id;
      preparedObj.myAdverseEvent = adverseEvent;
      preparedObj.guid = _.get(phis, 'guid') || _.get(inputSettings, 'guid');
      return preparedObj;
    });
  },
  guidToSubject (guid) {
    return guid ? { reference: `Patient/${guid}` } : null;
  },
  myAdverseEventToExtension (myAdverseEvent) {
    const extension = [];
    if (myAdverseEvent._id) {
      const idExtension = helper.buildStringExtension('phis.myAdverseEvents.id', myAdverseEvent._id);
      extension.push(idExtension);
    }
    if (myAdverseEvent.subject) {
      const subjectExtension = helper.buildStringExtension('phis.myAdverseEvents.subject', myAdverseEvent.subject);
      extension.push(subjectExtension);
    }
    if (myAdverseEvent.eventId) {
      const eventIdExtension = helper.buildStringExtension('phis.myAdverseEvents.eventId', myAdverseEvent.eventId);
      extension.push(eventIdExtension);
    }
    if (myAdverseEvent.key) {
      const keyExtension = helper.buildStringExtension('phis.myAdverseEvents.key', myAdverseEvent.key);
      extension.push(keyExtension);
    }
    if (myAdverseEvent.details) {
      const detailsExtension = helper.buildStringExtension('phis.myAdverseEvents.details', myAdverseEvent.details);
      extension.push(detailsExtension);
    }
    if (myAdverseEvent.productName) {
      const productNameExtension = helper.buildStringExtension('phis.myAdverseEvents.productName', myAdverseEvent.productName);
      extension.push(productNameExtension);
    }
    if (myAdverseEvent.productType) {
      const productTypeExtension = helper.buildStringExtension('phis.myAdverseEvents.productType', myAdverseEvent.productType);
      extension.push(productTypeExtension);
    }
    return extension.length ? extension : null;
  },
};
