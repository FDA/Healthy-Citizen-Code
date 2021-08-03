const { ObjectId } = require('mongodb');
const _ = require('lodash');

const reDate = /^(?:new )?Date\("?([^"]+)"?\)$/;
const reObjectId = /^ObjectId\("?([^"]+)"?\)$/;

const filterReviver = function (key, value) {
  if (typeof value === 'string') {
    const execDate = reDate.exec(value);
    if (execDate) {
      return new Date(execDate[1]);
    }
    const execObjectId = reObjectId.exec(value);
    if (execObjectId) {
      return ObjectId(execObjectId[1]);
    }
  }
  return value;
};

function getLimit(appLib, model, perPage = Infinity, userPermissions) {
  const defaultRecordLimit = +_.get(appLib.appModel.metaschema, 'limitReturnedRecords.default', -1);
  let modelLimit;
  if (_.isPlainObject(model.limitReturnedRecords)) {
    const permissionLimits = _.map(model.limitReturnedRecords, (permLimit, permName) =>
      userPermissions.has(permName) ? permLimit : 0
    );
    modelLimit = _.isEmpty(permissionLimits) ? 0 : Math.max(...permissionLimits);
  } else {
    modelLimit = +model.limitReturnedRecords;
  }
  modelLimit = modelLimit || defaultRecordLimit;
  return Math.min(modelLimit, perPage || modelLimit);
}

function getSkip(page = 0, limit) {
  const pageNum = parseInt(page, 10);
  return pageNum > 0 ? (pageNum - 1) * limit : 0;
}

module.exports = {
  filterReviver,
  getLimit,
  getSkip,
};
