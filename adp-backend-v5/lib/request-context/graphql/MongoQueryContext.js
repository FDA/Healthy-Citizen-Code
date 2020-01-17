const _ = require('lodash');
const RJSON = require('relaxed-json');
const { ObjectId } = require('mongodb');
const { filterReviver } = require('../util');
const GraphQlContext = require('./GraphQlContext');

module.exports = class MongoQueryContext extends GraphQlContext {
  init() {
    const queryStr = _.get(this.args, 'filter.mongoQuery') || '{}';
    const query = RJSON.parse(queryStr, filterReviver);
    if (query._id) {
      query._id = ObjectId(query._id);
    }
    const { sort, perPage, page } = this.args;
    const { limit, limitPlusOne, skip } = this._getLimitSkipForPagination(perPage, page);
    this.mongoParams = {
      conditions: query,
      sort: sort ? RJSON.parse(sort) : {},
      perPage: limit,
      limit: limitPlusOne,
      skip,
    };

    return this;
  }
};
