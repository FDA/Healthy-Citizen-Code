const JSON5 = require('json5');
const GraphQlContext = require('./GraphQlContext');

module.exports = class FilterContext extends GraphQlContext {
  init() {
    const { sort = {}, filter, perPage, page } = this.args;
    const { limit, limitPlusOne, skip } = this._getLimitSkipForPagination(perPage, page);
    this.mongoParams = {
      conditions: filter,
      sort: JSON5.parse(sort),
      perPage: limit,
      limit: limitPlusOne,
      skip,
    };

    return this;
  }
};
