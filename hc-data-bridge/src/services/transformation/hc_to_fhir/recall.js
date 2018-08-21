const _ = require('lodash');

module.exports = {
  splitMyRecallsToArray (phis, inputSettings) {
    return _.map(phis.myRecalls, (recall) => {
      const preparedObj = {};
      preparedObj._id = recall._id;
      preparedObj.myRecall = recall;
      preparedObj.guid = _.get(phis, 'guid') || _.get(inputSettings, 'guid');
      return preparedObj;
    });
  },
};
