const _ = require('lodash');
const JSON5 = require('json5');
const { getLimit, getSkip } = require('../util');
const BaseContext = require('../BaseContext');

module.exports = class GraphQlContext extends BaseContext {
  constructor(appLib, req, modelName, args) {
    super(appLib, req);
    this.args = args;
    this.modelName = modelName;
    this.appModel = this._getAppModel();
  }

  init() {
    return this;
  }

  _getAppModel() {
    return _.get(this.appLib.appModel, `models.${this.modelName}`);
  }

  _getLimit(perPage) {
    return getLimit(this.appLib, this.appModel, perPage, this.userPermissions);
  }

  _getLimitSkipForPagination(perPage, page) {
    const limit = this._getLimit(perPage);
    const skip = getSkip(page, limit);
    // +1 is necessary to check next page presence
    const limitPlusOne = limit + 1;
    return { limit, limitPlusOne, skip };
  }

  _getSort(sort) {
    let sortObj;
    if (_.isString(sort)) {
      sortObj = JSON5.parse(sort);
    } else if (_.isPlainObject(sort)) {
      sortObj = sort;
    } else {
      sortObj = {};
    }

    _.each(sortObj, (val, fieldName) => {
      const fieldType = _.get(this.appModel, ['fields', fieldName, 'type']);
      if (fieldType === 'Html') {
        sortObj[`${fieldName}.htmlNoTags`] = val;
        delete sortObj[fieldName];
      }
    });

    return sortObj;
  }
};
