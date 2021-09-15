const _ = require('lodash');
const JSON5 = require('json5');
const { ObjectId } = require('mongodb');
const { filterReviver } = require('../util');
const GraphQlContext = require('./GraphQlContext');

module.exports = class MongoQueryContext extends GraphQlContext {
  init() {
    const queryStr = _.get(this.args, 'filter.mongoQuery') || '{}';
    const query = JSON5.parse(queryStr, filterReviver);
    if (query._id) {
      query._id = ObjectId(query._id);
    }
    const { sort, perPage, page } = this.args;
    const { limit, limitPlusOne, skip } = this._getLimitSkipForPagination(perPage, page);
    this.mongoParams = {
      conditions: query,
      sort: this._getSort(sort),
      perPage: limit,
      limit: limitPlusOne,
      skip,
    };

    return this;
  }
};
